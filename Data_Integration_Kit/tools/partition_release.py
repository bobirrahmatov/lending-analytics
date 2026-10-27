"""Prepare a new upload directory from a prepared JSON release; never change the input.
python partition_release.py EXPORT NEW_DIRECTORY [--allow-demo]
Required datasets are split into immutable, hashed attachments below 8 MB.
Validation runs on the combined records before the output manifest is published.
"""
import argparse, hashlib, json, re, shutil
from pathlib import Path
import validate_release

LIMIT = 8_000_000
DATASETS = {'monitoring','portfolio','history','activity','sources','documents'}

def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8')

def partition(source, destination, allow_demo=False):
    source, destination = Path(source), Path(destination)
    if destination.exists():
        raise ValueError('Use a new output directory; existing releases are never overwritten.')
    manifest = json.loads((source/'credit-manifest.json').read_text(encoding='utf-8-sig'))
    destination.mkdir(parents=True)
    try:
        for name, entry in manifest['files'].items():
            if name not in DATASETS | {'previous','covenant_history'}:
                raise ValueError('Unknown dataset: '+name)
            filename = entry.get('filename','')
            if not re.fullmatch(r'[A-Za-z0-9_.-]+', filename):
                raise ValueError('Expected an unsplit export with a safe filename: '+name)
            raw = (source/filename).read_bytes()
            envelope = json.loads(raw.decode('utf-8-sig'))
            if envelope['bundle_id'] != manifest['bundle_id'] or envelope['schema_version'] != 2:
                raise ValueError('Mixed release: '+name)
            if name not in DATASETS:
                if len(raw) >= 10_000_000:
                    raise ValueError('Optional '+name+' exceeds the attachment limit; reduce its snapshot window before export.')
                # Hash optional files too: publication never overwrites an active payload.
                hashed = name+'-'+hashlib.sha256(raw).hexdigest()[:16]+'.json'
                (destination/hashed).write_bytes(raw)
                entry['filename'] = hashed
                continue
            rows = envelope.pop('rows')
            if len(rows) != entry['rows']:
                raise ValueError('Count mismatch: '+name)
            prefix = encode(envelope)[:-1]+b',"rows":['
            parts, batch, size = [], [], len(prefix)+2
            def write_part():
                payload = prefix+b','.join(batch)+b']}'
                filename = name+'-'+hashlib.sha256(payload).hexdigest()[:16]+'.json'
                if any(p['filename']==filename for p in parts):
                    raise ValueError('Repeated identical part: '+name)
                (destination/filename).write_bytes(payload)
                parts.append({'filename':filename,'rows':len(batch)})
            for row in rows:
                record = encode(row)
                if len(record)+len(prefix)+2 >= LIMIT:
                    raise ValueError('A single record exceeds the part limit: '+name)
                if batch and size+len(record)+1 >= LIMIT:
                    write_part();batch=[];size=len(prefix)+2
                batch.append(record);size += len(record)+1
            if batch or not rows:
                write_part()
            manifest['files'][name] = ({**parts[0]} if len(parts)==1 else {'rows':len(rows),'parts':parts})
        # Validation sees all parts as one dataset, including cross-part PKs.
        (destination/'credit-manifest.json').write_bytes(encode(manifest))
        validate_release.run(destination, allow_demo=allow_demo)
        return manifest
    except Exception:
        shutil.rmtree(destination)
        raise

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source');parser.add_argument('destination');parser.add_argument('--allow-demo',action='store_true')
    args=parser.parse_args();result=partition(args.source,args.destination,args.allow_demo)
    print('Validated',sum(e['rows'] for n,e in result['files'].items() if n in DATASETS),'records. Upload payloads first and credit-manifest.json last.')
