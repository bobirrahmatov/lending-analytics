"""Read-only validation of a prepared release. python validate_release.py FOLDER [--allow-demo]"""
import json,sys,datetime,calendar,re,copy,math,tempfile
import pal_contract
from pathlib import Path

def run(folder, allow_demo=False):
    folder=Path(folder);manifest=json.loads((folder/'credit-manifest.json').read_text(encoding='utf-8-sig'))
    assert manifest['schema_version']==2,'Unsupported schema version'
    assert allow_demo or manifest['is_demo'] is False,'Demo must not be published'
    schema=json.loads((Path(__file__).resolve().parent/'schema.json').read_text());data={}
    keys={'monitoring':'item_id','portfolio':'facility_key','history':'history_id','activity':'event_id','sources':'source_id','documents':'document_id'}
    def date(s):return datetime.date.fromisoformat(s)
    def add_months(d,m):
        month=d.month-1+m;y=d.year+month//12;month=month%12+1
        return datetime.date(y,month,min(d.day,calendar.monthrange(y,month)[1]))
    for entity,fields in schema.items():
        name=entity.lower();entry=manifest['files'][name]
        assert not (entry.get('parts') and entry.get('filename')), 'Ambiguous descriptor'
        parts=entry.get('parts',[entry]);assert 0<len(parts)<=512,'Invalid part count'
        rows=[];filenames=set()
        for part in parts:
            assert re.fullmatch(r'[A-Za-z0-9_.-]+',part['filename']), 'Unsafe filename'
            assert part['filename'] not in filenames,'Repeated part';filenames.add(part['filename'])
            file=folder/part['filename'];assert file.stat().st_size<10000000,'Attachment too large'
            envelope=json.loads(file.read_text(encoding='utf-8-sig'));assert envelope['schema_version']==2 and envelope['bundle_id']==manifest['bundle_id'],'Mixed release'
            assert allow_demo or not envelope.get('is_demo'), 'Demo payload must not be published'
            assert len(envelope['rows'])==part['rows'],'Part count mismatch'
            rows.extend(envelope['rows'])
        assert len(rows)==entry['rows'],'Count mismatch';seen=set()
        for r in rows:
            assert r[keys[name]] not in seen,'Duplicate '+keys[name];seen.add(r[keys[name]])
            for f in fields:
                assert f['field'] in r, 'Missing field '+f['field']
                v=r[f['field']]
                if v is None:assert not f['required'], 'Required null '+f['field'];continue
                assert not f['required'] or v!='','Required blank '+f['field']
                if f['type']=='text':assert isinstance(v,str),'Expected text '+f['field']
                elif f['type']=='date':assert re.fullmatch(r'\d{4}-\d{2}-\d{2}',v) and date(v),'Invalid date'
                elif f['type']=='boolean':assert type(v)==bool,'Expected boolean'
                elif f['type']=='integer':assert type(v)==int,'Expected integer'
                else:assert type(v) in [int,float] and math.isfinite(v),'Expected finite number'
        data[name]=rows
    sources={r['source_id']:r for r in data['sources']}
    for name in ['monitoring','portfolio','activity']:
        for r in data[name]:
            src=sources[r['source_id']];assert r['as_of_date']==src['as_of_date'],'Source date mismatch'
    for sid,src in sources.items():
        count=sum(1 for name in ['monitoring','portfolio','activity'] for r in data[name] if r['source_id']==sid)
        assert count==src['record_count'],'Source row count mismatch: '+sid
    cats={'COVENANTS','CA','FACILITY','CCM','INSURANCE','APPRAISALS'}
    for r in data['monitoring']:
        assert r['category'] in cats
        due=r['deferred_date'] if r['deferral_approved'] else r['due_date'];assert due==r['effective_due_date']
        days=max(0,(date(r['as_of_date'])-date(due)).days) if due else None
        assert days==r['days_past_due'],'Days past due mismatch'
        expected='UNKNOWN' if days is None else next((b for n,b in [(0,'CURRENT'),(30,'1-30'),(45,'31-45'),(60,'46-60'),(90,'61-90'),(199,'91-199')] if days<=n),'200+')
        assert r['aging_bucket']==expected,'Aging mismatch'
        if r['status']=='PAST_DUE':assert days and days>0,'Past-due status conflicts with due date'
        action=r['status'] in ['PAST_DUE','PENDING_AUTH','OPEN','AWAITING_CERTIFICATE','PENDING_REVIEW'];assert r['action_required']==action
        critical=action and ((r['category']=='COVENANTS' and (days or 0)>=31)or(r['category']=='FACILITY' and (days or 0)>=60)or(r['category']=='APPRAISALS' and (days or 0)>=90)or(r['category']=='INSURANCE' and r['status']=='AWAITING_CERTIFICATE')or(r['category']=='CCM' and r['classification']=='SUBSTANDARD'))
        assert r['critical']==bool(critical),'Critical mismatch'
        coming=bool(r['status']=='COMING_DUE' and due and date(r['as_of_date'])<=date(due)<=add_months(date(r['as_of_date']),3));assert r['coming_due']==coming
    seen=set();returns={}
    for r in data['portfolio']:
        assert r['facility_id'] not in seen,'Cross-source duplicate facility';seen.add(r['facility_id'])
        assert r['reporting_currency']=='USD'
        assert abs(r['total_os']-r['direct_os']-r['contingent_os']-r['pse_os'])<.01
        assert abs(r['total_undrawn']-r['tfa']+r['total_os'])<.01
        if r['region'] in ['EMEA','APAC']:assert r['osuc']==(r['tfa'] if r['commitment']=='COMMITTED' else r['total_os'])
        if r['rotce'] is not None:
            if r['relationship_id'] in returns:assert returns[r['relationship_id']]==r['rotce'],'Conflicting relationship ROTCE'
            returns[r['relationship_id']]=r['rotce']
        business=r['origination_date'] or r['renewal_date'];end=date(r['as_of_date']);start=date(business) if business else None
        assert r['ytd_new']==bool(start and not r['pse'] and start.year==end.year and start<=end)
        assert r['mtd_new']==bool(start and not r['pse'] and start.year==end.year and start.month==end.month and start<=end)
    daily={}
    for r in data['history']:
        if r.get('comparison_ready') is True:
            assert r['facility_key'] and r['facility_count']==1,'Daily history must retain facility grain'
            for f in ['owner_id','owner_name','team_lead']:assert r[f], 'Missing daily scope '+f
            for f in ['unused_commitment','unused_uncommitted']:assert type(r[f]) in [float,int] and math.isfinite(r[f]),'Missing daily balance '+f
            key=(r['as_of_date'],r['facility_key']);assert key not in daily,'Duplicate daily facility snapshot';daily[key]=r
    for r in data['portfolio']:
        h=daily.get((r['as_of_date'],r['facility_key']))
        if h:
            for f in ['tfa','total_os','osuc','unused_commitment','unused_uncommitted']:assert abs(h[f]-r[f])<.01,'Current history balance mismatch'
    for r in data['activity']:assert r['month']==r['event_date'][:7]
    expected=copy.deepcopy(data['portfolio']);pal_contract.prepare(expected)
    for actual,want in zip(data['portfolio'],expected):
        for field,_,_ in pal_contract.PORT_FIELDS:assert actual[field]==want[field], 'PAL output mismatch: '+field
    expected=copy.deepcopy(data['monitoring']);pal_contract.monitoring(expected)
    for actual,want in zip(data['monitoring'],expected):
        for field in ['pal_covenant_bucket','pal_due30']:assert actual[field]==want[field], 'PAL covenant output mismatch'
        if actual['category']=='CCM':assert actual['ccm_status'] in ['PAST_DUE','COMING_DUE','OPEN'],'Invalid source CCM status'
    if 'previous' in manifest['files']:
        entry=manifest['files']['previous'];assert re.fullmatch(r'[A-Za-z0-9_.-]+',entry['filename']), 'Unsafe previous filename'
        file=folder/entry['filename'];assert file.stat().st_size<=10000000,'Previous attachment too large'
        previous=json.loads(file.read_text(encoding='utf-8-sig'));assert previous['schema_version']==2 and previous['bundle_id']==manifest['bundle_id'],'Mixed previous release'
        assert len(previous['rows'])==entry['rows'],'Previous count mismatch'
        assert previous['rows']==previous['datasets']['monitoring'],'Previous monitoring envelope mismatch'
        # Run the same business/field checks on the four retained datasets. There is no nested previous entry.
        with tempfile.TemporaryDirectory(prefix='credit-previous-validation-') as temp:
            prior_manifest={**manifest,'files':{}}
            for name in keys:
                rows=previous['datasets'].get(name,[]) if name in ['history','documents'] else previous['datasets'][name]
                filename=name+'.json';prior_manifest['files'][name]={'filename':filename,'rows':len(rows)}
                Path(temp,filename).write_text(json.dumps({'schema_version':2,'bundle_id':manifest['bundle_id'],'rows':rows}))
            Path(temp,'credit-manifest.json').write_text(json.dumps(prior_manifest))
            run(temp,allow_demo)
    result={'bundle':manifest['bundle_id'],'rows':{k:len(v) for k,v in data.items()},'actionable':sum(r['action_required'] for r in data['monitoring']),'critical':sum(r['critical'] for r in data['monitoring']),'validation':'passed'}
    print(json.dumps(result,indent=2));return result
if __name__=='__main__':run(sys.argv[1], '--allow-demo' in sys.argv)
