const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{JSDOM}=require('jsdom');
const P=path.resolve(__dirname,'..'),dir=path.join(P,'demo-comparison'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'credit-manifest.json')));
const data=Object.fromEntries(Object.entries(manifest.files).map(([key,entry])=>[key,JSON.parse(fs.readFileSync(path.join(dir,entry.filename)))]));
const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window;
w.eval(fs.readFileSync(path.join(P,'attachments/credit-portfolio-journey.js'),'utf8'));
const scope=w.CreditPortfolioJourneyModel.detailScope,monitoring=data.monitoring.rows,portfolio=data.portfolio.rows,activity=data.activity.rows;
const extras={activity,previous:data.previous.datasets,sources:data.sources.rows,history:data.history.rows};
const report={is_demo:true,release:manifest.bundle_id,monitoring:{},activity:{},limitations:[]};
for(const category of [...new Set(monitoring.map(r=>r.category))]){
 const rows=monitoring.filter(r=>r.category===category),s=scope(rows,portfolio,monitoring,extras);
 report.monitoring[category]={rows:rows.length,matched:s.linked.matched,unmatched:s.linked.total-s.linked.matched,unique_facilities:s.linked.facilities.length};
 assert.equal(s.datasets.records.length,rows.length);
 for(const r of s.linked.records.filter(r=>r.match_status==='Matched')){const matches=portfolio.filter(p=>p.region===r.region&&p.relationship_id===r.relationship_id&&p.facility_id===r.facility_id&&p.as_of_date===r.as_of_date);assert.equal(matches.length,1);assert.equal(r.tfa_usd,matches[0].tfa);}
}
let linkedEvents=0;for(const e of activity){const s=scope([e],portfolio,monitoring,extras);if(s.linked.facilities.length)linkedEvents++;}
report.activity={rows:activity.length,events_with_related_facility:linkedEvents};
const seed=monitoring.find(r=>scope([r],portfolio,monitoring,extras).linked.matched===1),match=portfolio.find(p=>p.region===seed.region&&p.relationship_id===seed.relationship_id&&p.facility_id===seed.facility_id&&p.as_of_date===seed.as_of_date);
assert.ok(seed&&match);
for(const [name,rows] of [['date mismatch',[{...match,as_of_date:'2000-01-01'}]],['ambiguous',[match,{...match,facility_key:'DUPLICATE'}]],['CA mismatch',[{...match,ca_id:'DIFFERENT'}]],['non USD',[{...match,reporting_currency:'EUR'}]]]){const s=scope([seed],rows,monitoring,extras);assert.equal(s.linked.matched,0,name);assert.equal(s.linked.records[0].tfa_usd,null,name);assert.equal(s.datasets.records.length,1,name+' retains source');}
const repeated=scope([seed,{...seed,item_id:seed.item_id+'-association'}],portfolio,monitoring,extras);assert.equal(repeated.linked.facilities.length,1,'Repeated association does not duplicate balance');
report.negative_checks=['date mismatch','ambiguous portfolio match','CA mismatch','non-USD exposure','repeated covenant association'];
report.limitations=['Synthetic records only; not source-system reconciliation.','Production file and page IDs remain unconfigured.','Base Activity schema omits facility/CA and richer activity fields; preserve them through an explicitly extended ETL contract.','Base Documents schema supports a reference list, not entity linkage without optional entity/date fields.','Daily history lacks relationship_id/facility_id for current terminal related-history matching; do not claim full historical entity drill-through.','Release validator currently requires globally unique facility_id, stricter than the UI composite join.'];
fs.writeFileSync(path.join(P,'qa/Data_Linkage_Verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));dom.window.close();
