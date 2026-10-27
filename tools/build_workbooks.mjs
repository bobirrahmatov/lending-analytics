import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const out=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const schema=JSON.parse(await fs.readFile(path.join(out,'tools/schema.json'),'utf8'));
const inputSchema=JSON.parse(await fs.readFile(path.join(out,'tools/input-schema.json'),'utf8'));
const content=JSON.parse(await fs.readFile(path.join(out,'tools/workbook-content.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(out,'attachments/credit-manifest.json'),'utf8'));
const datasets={};for(const [k,v]of Object.entries(manifest.files))datasets[k]=JSON.parse(await fs.readFile(path.join(out,'attachments',v.filename),'utf8')).rows;
const col=n=>{let s='';for(let x=n;x;x=Math.floor((x-1)/26))s=String.fromCharCode(65+(x-1)%26)+s;return s;};
async function make(name,tabs){const w=Workbook.create();let index=0;for(const [sheetName,spec]of Object.entries(tabs)){const s=w.worksheets.add(sheetName);s.showGridLines=false;const rows=[spec.headers,...spec.rows];const end=col(spec.headers.length);s.getRange(`A1:${end}${Math.max(2,rows.length)}`).format.font={name:'Arial',size:10,color:'#0F1632'};s.getRange(`A1:${end}${rows.length}`).values=rows;
s.getRange(`A1:${end}1`).format={fill:'#0F1632',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},rowHeight:32,verticalAlignment:'center',horizontalAlignment:'center'};
s.getRange(`A2:${end}${Math.max(rows.length,2)}`).format.rowHeight=28;
s.getRange(`A1:${end}${Math.max(rows.length,2)}`).format.verticalAlignment='center';
for(let i=0;i<spec.headers.length;i++){s.getRange(`${col(i+1)}1:${col(i+1)}${Math.max(rows.length,2)}`).format.columnWidth=spec.widths?.[i]||Math.min(34,Math.max(20,spec.headers[i].length+3));}
for(let i=2;i<=rows.length;i+=2)s.getRange(`A${i}:${end}${i}`).format.fill='#F0F5F7';
if(spec.types){spec.types.forEach((t,i)=>{const r=s.getRange(`${col(i+1)}2:${col(i+1)}${Math.max(rows.length,2)}`);r.setNumberFormat(t==='date'?'yyyy-mm-dd':t==='number'?'#,##0.00':t==='integer'?'#,##0':t==='text'?'@':'General');if(spec.headers[i]==='rotce')r.setNumberFormat('0.0%');});}
{s.getRange(`A2:${end}${Math.max(rows.length,2)}`).format.wrapText=true;for(let ri=1;ri<rows.length;ri++){const lines=Math.max(...rows[ri].map((v,ci)=>Math.ceil((v instanceof Date?10:String(v??'').length)/((spec.widths?.[ci]||Math.min(34,Math.max(20,spec.headers[ci].length+3)))*.92))));s.getRange(`A${ri+1}:${end}${ri+1}`).format.rowHeight=Math.max(30,lines*15+10);}}
const table=s.tables.add(`A1:${end}${Math.max(rows.length,2)}`,true,'CreditTable'+(++index));table.showBandedRows=true;s.freezePanes.freezeRows(1);s.freezePanes.freezeColumns(Math.min(2,spec.headers.length));if(index===1)s.tabColor='#0F1632';
}
w.recalculate();const inspect=await w.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!',options:{useRegex:true,maxResults:10},maxChars:1200});await fs.writeFile(path.join(out,'qa',name+'.inspect.txt'),inspect.ndjson);
for(const s of w.worksheets.items){const cols=Math.min(6,tabs[s.name].headers.length);const blob=await w.render({sheetName:s.name,range:`A1:${col(cols)}${Math.min(9,tabs[s.name].rows.length+2)}`,scale:1,format:'png'});await fs.writeFile(path.join(out,'qa',name+'-'+s.name.replaceAll(' ','_')+'.png'),new Uint8Array(await blob.arrayBuffer()));}
for(const [sheetName,range] of (name==='Credit_Data_Contract'?[['Metric Rules','A18:E27'],['Field Dictionary','A88:F105'],['Taxonomy','A16:D19']]:name==='Credit_Prepared_Example'?[['Portfolio','AU1:BH6'],['Monitoring','AQ1:AS6']]:[['Portfolio','AK1:AT2']])){const blob=await w.render({sheetName,range,scale:1,format:'png'});await fs.writeFile(path.join(out,'qa',name+'-PAL-'+sheetName.replaceAll(' ','_')+'.png'),new Uint8Array(await blob.arrayBuffer()));}
await(await SpreadsheetFile.exportXlsx(w)).save(path.join(out,'excel',name+'.xlsx'));console.log(name,':',w.worksheets.items.length,'sheets exported and rendered');}
await make('Credit_Data_Contract',content);
const inputs={};for(const [k,fields]of Object.entries(inputSchema))inputs[k]={headers:fields.map(f=>f.field),types:fields.map(f=>f.type),rows:[]};if(!process.argv.includes('--daily'))await make('Credit_Input_Template',inputs);
const prepared={};for(const [k,fields]of Object.entries(schema)){let rows=datasets[k.toLowerCase()]||[];prepared[k]={headers:fields.map(f=>f.field),types:fields.map(f=>f.type),rows:rows.map(r=>fields.map(f=>f.type==='date'&&r[f.field]?new Date(r[f.field]+'T00:00:00Z'):r[f.field]??null))};}await make('Credit_Prepared_Example',prepared);
