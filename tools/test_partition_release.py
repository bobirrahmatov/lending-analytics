"""Real publisher/validator roundtrip, with small parts to test all boundaries."""
import copy, json, tempfile
from pathlib import Path
import partition_release as publisher
import validate_release
P=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as temp:
    target=Path(temp)/'release'
    publisher.LIMIT=15_000
    manifest=publisher.partition(P/'demo-comparison',target,allow_demo=True)
    parts=manifest['files']['portfolio']['parts']
    assert len(parts)>1 and all((target/e['filename']).stat().st_size<15_000 for e in parts)
    original=json.loads((P/'demo-comparison/credit-manifest.json').read_text())
    for name in publisher.DATASETS:
        entry=manifest['files'][name]
        rows=[r for part in entry.get('parts',[entry]) for r in json.loads((target/part['filename']).read_text())['rows']]
        assert rows==json.loads((P/'demo-comparison'/original['files'][name]['filename']).read_text())['rows']
    second=target/parts[1]['filename'];payload=json.loads(second.read_text())
    payload['rows'][0]['facility_key']=json.loads((target/parts[0]['filename']).read_text())['rows'][0]['facility_key']
    second.write_text(json.dumps(payload))
    try:validate_release.run(target,allow_demo=True)
    except AssertionError as e:assert 'Duplicate' in str(e)
    else:raise AssertionError('Cross-part duplicate was accepted')
    try:publisher.partition(P/'demo-comparison',target,allow_demo=True)
    except ValueError:pass
    else:raise AssertionError('Existing destination was overwritten')
print('PASS: partitioning preserves all fields/order, validates combined datasets, rejects cross-part duplicates and refuses existing destinations.')
