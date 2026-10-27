from pathlib import Path
import json,copy
P=Path(__file__).resolve().parents[1];Q=P/'qa/fixtures';Q.mkdir(exist_ok=True)
manifest=json.loads((P/'attachments/credit-manifest.json').read_text());datasets={k:json.loads((P/'attachments'/v['filename']).read_text()) for k,v in manifest['files'].items()}
base=(P/'Credit_Monitoring_Demo.html').read_text().replace('href="attachments/','href="../../attachments/').replace('src="attachments/','src="../../attachments/').replace("url('attachments/","url('../../attachments/")
base=base.replace('<script src="../../attachments/credit-demo-data.js"></script>','')
for name in ['valid','demo','mixed','wrong-count','wrong-type','missing']:
 folder=Q/name;folder.mkdir(exist_ok=True);m=copy.deepcopy(manifest);m['is_demo']=name=='demo';ds=copy.deepcopy(datasets)
 if name=='mixed':ds['portfolio']['bundle_id']='wrong-release'
 if name=='wrong-count':m['files']['monitoring']['rows']+=1
 if name=='wrong-type':ds['portfolio']['rows'][0]['pal_ca_expired']='true'
 for k,body in ds.items():(folder/m['files'][k]['filename']).write_text(json.dumps(body))
 if name!='missing':(folder/'credit-manifest.json').write_text(json.dumps(m))
 (Q/(name+'.html')).write_text(base.replace("mode:'demo',showHeader:true,baseUrl:'./attachments/'","mode:'production',showHeader:false,baseUrl:'./"+name+"/'"))
(Q/'mobile.html').write_text('<!doctype html><title>390px layout check</title><style>body{margin:0}iframe{width:390px;height:844px;border:1px solid #ccc}</style><iframe title="Mobile dashboard" src="../../Credit_Monitoring_Demo.html"></iframe>')
