"""Build a NEW publication folder with reconciled covenant history. No network writes."""
import argparse, datetime, json, re
from pathlib import Path

LIMIT=10_000_000

def read_release(manifest_path):
    m=json.loads(manifest_path.read_text(encoding='utf-8-sig'))
    if m.get('schema_version')!=2 or not m.get('bundle_id'): raise ValueError('Unsupported release manifest')
    payloads={}
    for name,f in m['files'].items():
        if f.get('parts') and f.get('filename'): raise ValueError('Ambiguous descriptor')
        parts=f.get('parts',[f]);combined=[];seen=set();p=None
        for part in parts:
            filename=part['filename']
            if not re.fullmatch(r'[A-Za-z0-9_.-]+',filename) or filename in seen: raise ValueError('Unsafe or repeated attachment filename')
            seen.add(filename);file=manifest_path.parent/filename
            if file.stat().st_size>=LIMIT: raise ValueError('Attachment limit exceeded')
            payload=json.loads(file.read_text(encoding='utf-8-sig'))
            if payload.get('bundle_id')!=m['bundle_id'] or payload.get('schema_version')!=2 or len(payload.get('rows',[]))!=part['rows']: raise ValueError('Mixed release or control count: '+name)
            if p is None:p=payload
            combined.extend(payload['rows'])
        if p is None or len(combined)!=f['rows']: raise ValueError('Dataset count mismatch: '+name)
        p['rows']=combined
        payloads[name]=p
    return m,payloads

def snapshot(payloads):
    controls=[s for s in payloads['sources']['rows'] if s['domain']=='COVENANTS']
    rows=[r for r in payloads['monitoring']['rows'] if r['category']=='COVENANTS']
    dates={s['as_of_date'] for s in controls}
    if len(dates)!=1: raise ValueError('Covenant sources must share one report date for daily comparison')
    date=next(iter(dates));datetime.date.fromisoformat(date)
    ids=[s['source_id'] for s in controls]
    if len(set(ids))!=len(ids): raise ValueError('Duplicate source controls')
    keys=set()
    for r in rows:
        if r['as_of_date']!=date or r['source_id'] not in ids or not r.get('item_id') or r['item_id'] in keys: raise ValueError('Invalid covenant date/source/key')
        keys.add(r['item_id'])
    for s in controls:
        if s['coverage'] not in ('ALL_OBLIGATIONS','EXCEPTIONS_ONLY') or sum(r['source_id']==s['source_id'] for r in rows)!=s['record_count']: raise ValueError('Unreconciled covenant source: '+s['source_id'])
    control={'as_of_date':date,'complete':True,'sources':[{k:s[k] for k in ('source_id','coverage','record_count')} for s in controls]}
    pc=[s for s in payloads['sources']['rows'] if s['domain']=='PORTFOLIO']
    if pc and all(c['as_of_date']==date for c in pc) and 'portfolio' in payloads:
        pr=payloads['portfolio']['rows'];ids=[c['source_id'] for c in pc]
        if len(set(ids))!=len(ids) or len({r['facility_key'] for r in pr})!=len(pr): raise ValueError('Duplicate portfolio source/facility keys')
        if any(r['as_of_date']!=date or r['source_id'] not in ids for r in pr): raise ValueError('Uncontrolled portfolio date/source')
        if any(c['coverage'] not in ('ALL_OBLIGATIONS','EXCEPTIONS_ONLY') or sum(r['source_id']==c['source_id'] for r in pr)!=c['record_count'] for c in pc): raise ValueError('Unreconciled portfolio controls')
        control['portfolio_sources']=[{k:c[k] for k in ('source_id','coverage','record_count')} for c in pc]
        control['_portfolio_rows']=pr
    return control, rows

def build(current, priors, output, release_id, keep=32):
    if output.exists(): raise ValueError('Output folder must not exist; published releases are immutable')
    if not re.fullmatch(r'[A-Za-z0-9_-]{4,80}',release_id): raise ValueError('Use a safe new release ID (4–80 characters)')
    if keep<1: raise ValueError('keep must be positive')
    manifest,data=read_release(current)
    if release_id==manifest['bundle_id']: raise ValueError('Use a NEW release ID')
    snapshots={}
    for source in [*priors,current]:
        m,p=read_release(source)
        if m.get('is_demo')!=manifest.get('is_demo'): raise ValueError('Cannot mix demo and production history')
        retained=p.get('covenant_history')
        if retained:
            controlled=set()
            for snap in retained.get('snapshots',[]):
                day=snap['as_of_date']
                if day in controlled or snap.get('complete') is not True: raise ValueError('Invalid retained snapshot control')
                controlled.add(day)
                rs=[r for r in retained['rows'] if r['as_of_date']==day]
                source_rows=[{**c,'domain':'COVENANTS','as_of_date':day} for c in snap['sources']]
                historical={'sources':{'rows':source_rows},'monitoring':{'rows':rs}}
                if snap.get('portfolio_sources'):
                    historical['sources']['rows'] += [{**c,'domain':'PORTFOLIO','as_of_date':day} for c in snap['portfolio_sources']]
                    historical['portfolio']={'rows':[r for r in retained.get('portfolio_rows',[]) if r['as_of_date']==day]}
                checked=snapshot(historical)
                if day in snapshots and snapshots[day]!=checked: raise ValueError('Conflicting retained history for '+day)
                snapshots[day]=checked
            if any(r['as_of_date'] not in controlled for r in retained['rows']): raise ValueError('Uncontrolled retained history rows')
            portfolio_dates={s['as_of_date'] for s in retained['snapshots'] if s.get('portfolio_sources')}
            if any(r['as_of_date'] not in portfolio_dates for r in retained.get('portfolio_rows',[])): raise ValueError('Uncontrolled retained portfolio rows')
        control,rows=snapshot(p);date=control['as_of_date']
        if date in snapshots and snapshots[date]!=(control,rows): raise ValueError('Conflicting releases for '+date)
        snapshots[date]=(control,rows)
    latest=max(snapshots);current_date=snapshot(data)[0]['as_of_date']
    if latest!=current_date: raise ValueError('Prior releases cannot be newer than current')
    chosen=[snapshots[d] for d in sorted(snapshots)[-keep:]]
    data.pop('covenant_history',None)
    data['covenant_history']={'rows':[r for _,rs in chosen for r in rs],'snapshots':[{k:v for k,v in c.items() if k!='_portfolio_rows'} for c,_ in chosen],'portfolio_rows':[r for c,_ in chosen for r in c.get('_portfolio_rows',[])]}
    files={};encoded={}
    for name,p in data.items():
        p={**p,'schema_version':2,'bundle_id':release_id};filename=f'credit-{name}-{release_id}.json'
        content=json.dumps(p,ensure_ascii=False,separators=(',',':')).encode('utf-8')
        if len(content)>=LIMIT: raise ValueError(name+' exceeds attachment limit; reduce retained snapshots')
        encoded[filename]=content;files[name]={'filename':filename,'rows':len(p['rows'])}
    new_manifest={**manifest,'bundle_id':release_id,'files':files,'published_at':datetime.date.today().isoformat()}
    output.mkdir(parents=True)
    for filename,content in encoded.items(): (output/filename).write_bytes(content)
    (output/'credit-manifest.json').write_text(json.dumps(new_manifest,indent=2),encoding='utf-8')
    return len(chosen)

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--current-manifest',type=Path,required=True);ap.add_argument('--prior-manifest',type=Path,action='append',default=[])
    ap.add_argument('--output-dir',type=Path,required=True);ap.add_argument('--release-id',required=True);ap.add_argument('--keep',type=int,default=32)
    a=ap.parse_args()
    if a.keep<1: ap.error('--keep must be positive')
    print('Prepared',build(a.current_manifest,a.prior_manifest,a.output_dir,a.release_id,a.keep),'reconciled covenant snapshots in',a.output_dir)
