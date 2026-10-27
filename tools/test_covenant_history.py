import json,tempfile,unittest
from pathlib import Path
from build_covenant_history import build,read_release
class HistoryTests(unittest.TestCase):
 def test_roundtrip_and_reconciliation(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp)
   def release(name,date,count,portfolio=False):
    folder=root/name;folder.mkdir();files={}
    source={'source_id':'COV','domain':'COVENANTS','as_of_date':date,'record_count':count,'coverage':'ALL_OBLIGATIONS'}
    rows=[{'item_id':str(i),'category':'COVENANTS','source_id':'COV','as_of_date':date,'status':'PAST_DUE'} for i in range(count)]
    datasets=[('monitoring',rows),('sources',[source])]
    if portfolio:
     datasets[1][1].append({'source_id':'PORT','domain':'PORTFOLIO','as_of_date':date,'record_count':1,'coverage':'ALL_OBLIGATIONS'})
     datasets.append(('portfolio',[{'facility_key':'F1','source_id':'PORT','as_of_date':date,'tfa':count*100,'osuc':count*80,'banker_name':'Alex Banker'}]))
    for kind,rs in datasets:
     filename=kind+'.json';(folder/filename).write_text(json.dumps({'schema_version':2,'bundle_id':name,'rows':rs}));files[kind]={'filename':filename,'rows':len(rs)}
    manifest=folder/'credit-manifest.json';manifest.write_text(json.dumps({'schema_version':2,'bundle_id':name,'is_demo':False,'files':files}));return manifest
   friday=release('friday','2026-10-23',2);monday=release('monday','2026-10-26',3)
   fp=release('friday-finance','2026-10-23',2,True);mp=release('monday-finance','2026-10-26',3,True)
   self.assertEqual(build(mp,[fp],root/'finance','finance-v1'),2)
   _,finance=read_release(root/'finance'/'credit-manifest.json')
   self.assertEqual([r['tfa'] for r in finance['covenant_history']['portfolio_rows']],[200,300])
   self.assertEqual([r['osuc'] for r in finance['covenant_history']['portfolio_rows']],[160,240])
   self.assertTrue(all(s['portfolio_sources'][0]['source_id']=='PORT' for s in finance['covenant_history']['snapshots']))
   build(root/'finance'/'credit-manifest.json',[],root/'finance-next','finance-v2')
   _,carried=read_release(root/'finance-next'/'credit-manifest.json')
   self.assertEqual(carried['covenant_history']['portfolio_rows'],finance['covenant_history']['portfolio_rows'])
   before=monday.read_bytes();out=root/'release'
   self.assertEqual(build(monday,[friday],out,'risk-v1'),2);self.assertEqual(monday.read_bytes(),before)
   m,p=read_release(out/'credit-manifest.json');self.assertEqual(len(p['covenant_history']['rows']),5)
   self.assertEqual(build(out/'credit-manifest.json',[],root/'next','risk-v2'),2)
   with self.assertRaises(ValueError):build(monday,[],out,'risk-v3')
   with self.assertRaises(ValueError):build(friday,[monday],root/'future','risk-v4')
   source=root/'monday'/'sources.json';broken=json.loads(source.read_text());broken['rows'][0]['record_count']=4;source.write_text(json.dumps(broken))
   with self.assertRaises(ValueError):build(monday,[],root/'bad','risk-v5')
if __name__=='__main__':unittest.main()
