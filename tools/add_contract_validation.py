from pathlib import Path
import json,re
P=Path(__file__).resolve().parents[1]
p=P/'attachments/credit-dashboard.js';s=p.read_text()
schema=json.loads((P/'tools/schema.json').read_text())
contracts={k.lower():[[x['field'],x['type'],x['required']] for x in fields] for k,fields in schema.items()}
code='const contracts='+json.dumps(contracts,separators=(',',':'))+';\n'
s=s.replace("const categories=",code+"const categories=",1)
s=s.replace("function validateRows(name,rows){",'''function validateRows(name,rows){
if(!Array.isArray(rows))throw Error(name+': missing rows array');
for(const [i,r]of rows.entries()){for(const [field,type,required]of contracts[name]){if(!Object.hasOwn(r,field))throw Error(name+': missing '+field+' at row '+(i+1));const v=r[field];if(v===null){if(required)throw Error(name+': required '+field+' is null');continue;}if(required&&v==='')throw Error(name+': required '+field+' is blank');let ok=type==='text'?typeof v==='string':type==='boolean'?typeof v==='boolean':type==='integer'?Number.isInteger(v):type==='number'?typeof v==='number'&&Number.isFinite(v):typeof v==='string'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;if(!ok)throw Error(name+': invalid '+field+' at row '+(i+1));}}
''')
s=s.replace("const ids=new Set(data.sources.map(r=>r.source_id));", "const sourceMap=new Map(data.sources.map(r=>[r.source_id,r]));for(const r of data.monitoring){const source=sourceMap.get(r.source_id);if(!source||source.as_of_date!==r.as_of_date||source.domain!==r.category)throw Error('Monitoring source/date/domain mismatch');}for(const source of data.sources.filter(s=>categories[s.domain])){if(data.monitoring.filter(r=>r.source_id===source.source_id).length!==source.record_count)throw Error('Source control count mismatch: '+source.source_id);}const ids=new Set(data.sources.map(r=>r.source_id));")
p.write_text(s)
