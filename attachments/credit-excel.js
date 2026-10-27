/* Prepared workbook adapter. Calculation and joining remain in the canonical
 * credit modules; this reader only preserves typed, validated source values. */
(function(w){'use strict';
 const MAX_ROWS=200000,MAX_COLUMNS=256,REQUIRED_METADATA=['schema_version','bundle_id','dataset','rows','is_demo'];
 const validName=value=>typeof value==='string'&&/^[a-z][a-z0-9_]*$/.test(value)&&!['constructor','prototype','__proto__'].includes(value);
 const validColumn=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_]*$/.test(value)&&!['constructor','prototype','__proto__'].includes(value);
 const blank=cell=>!cell||cell.t==='z'||cell.v===undefined||cell.v===null||cell.v==='';
 const error=(message,sheet,address)=>Error('Workbook '+sheet+(address?'!'+address:'')+': '+message);
 function dimensions(sheet,name,xlsx){
  if(!sheet||!sheet['!ref'])throw error('sheet is missing or empty',name);
  const range=xlsx.utils.decode_range(sheet['!fullref']||sheet['!ref']);
  if(range.s.r!==0||range.s.c!==0||range.e.c>=MAX_COLUMNS||range.e.r>MAX_ROWS)throw error('sheet must start at A1 and stay within '+MAX_ROWS+' data rows / '+MAX_COLUMNS+' columns',name);
  if(sheet['!merges']?.length)throw error('merged cells are not supported',name);
  return range;
 }
 function scalar(cell,sheet,address){
  if(cell?.f!==undefined||cell?.F!==undefined)throw error('formulas are not allowed; publish prepared values',sheet,address);
  if(cell?.t==='e')throw error('Excel error value',sheet,address);
  if(blank(cell))return null;
  if(!['s','str','n','b','d'].includes(cell.t))throw error('unsupported cell type',sheet,address);
  return cell.v;
 }
 function calendarDate(cell,value,workbook,xlsx,sheet,address){
  if(typeof value==='string'){
   if(/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value)return value;
   throw error('date must be YYYY-MM-DD or an Excel calendar date',sheet,address);
  }
  if(typeof value==='number'&&Number.isInteger(value)&&xlsx.SSF.is_date(cell.z||'')){
   const date1904=workbook.Workbook?.WBProps?.date1904===true||workbook.Workbook?.WBProps?.date1904===1;
   const d=xlsx.SSF.parse_date_code(value,{date1904});
   if(d&&d.y>=1900&&d.y<=9999){
    const iso=String(d.y).padStart(4,'0')+'-'+String(d.m).padStart(2,'0')+'-'+String(d.d).padStart(2,'0');
    if(!Number.isNaN(Date.parse(iso))&&new Date(iso).toISOString().slice(0,10)===iso)return iso;
   }
  }
  throw error('date has an invalid value or missing date format',sheet,address);
 }
 function typedValue(cell,type,workbook,xlsx,address){
  const value=scalar(cell,'Data',address);if(value===null)return null;
  if(type==='date')return calendarDate(cell,value,workbook,xlsx,'Data',address);
  if(type==='text'&&typeof value!=='string')throw error('text field must use an Excel text cell; preserve identifier leading zeros','Data',address);
  if(type==='boolean'&&typeof value!=='boolean')throw error('boolean field must use TRUE or FALSE','Data',address);
  if((type==='number'||type==='integer')&&(typeof value!=='number'||!Number.isFinite(value)||(type==='integer'&&!Number.isInteger(value))))throw error('numeric field must contain a finite '+type,'Data',address);
  // Extension fields are preserved without guessing identifiers from numbers.
  if(!type&&typeof value==='number'&&xlsx.SSF.is_date(cell.z||''))return calendarDate(cell,value,workbook,xlsx,'Data',address);
  if(!type&&(!['string','number','boolean'].includes(typeof value)||(typeof value==='number'&&!Number.isFinite(value))))throw error('extension field must contain a scalar value','Data',address);
  return value;
 }
 async function parse(buffer,{dataset,fields}={}){
  const xlsx=w.XLSX;if(!xlsx?.read||!xlsx?.utils||!xlsx?.SSF)throw Error('The local Excel reader is unavailable');
  if(!validName(dataset)||!Array.isArray(fields)||!fields.length)throw Error('Workbook schema is unavailable for '+String(dataset));
  const bytes=new Uint8Array(buffer);
  if(bytes.byteLength>=10000000)throw Error('Attachment must be smaller than 10 MB');
  if(bytes.length<4||bytes[0]!==0x50||bytes[1]!==0x4b||bytes[2]!==3||bytes[3]!==4)throw Error('Attachment is not an XLSX workbook. Check sign-in and filename.');
  const started=Date.now();
  await new Promise(resolve=>setTimeout(resolve,0));
  let workbook;try{workbook=xlsx.read(bytes,{type:'array',cellDates:false,cellNF:true,cellText:false,cellStyles:false,cellFormula:true,bookVBA:false,sheetRows:MAX_ROWS+2});}catch{throw Error('Attachment is not a readable XLSX workbook');}
  if(Date.now()-started>30000)throw Error('Workbook processing timed out');
  const metaSheet=workbook.Sheets.Metadata,metaRange=dimensions(metaSheet,'Metadata',xlsx),metadata=Object.create(null);
  if(metaRange.e.c!==1||scalar(metaSheet.A1,'Metadata','A1')!=='key'||scalar(metaSheet.B1,'Metadata','B1')!=='value')throw error('use key and value headers in A1:B1','Metadata');
  for(let row=1;row<=metaRange.e.r;row++){
   const a='A'+(row+1),b='B'+(row+1),key=scalar(metaSheet[a],'Metadata',a),value=scalar(metaSheet[b],'Metadata',b);
   if(key===null&&value===null)continue;
   if(!validName(key)||Object.hasOwn(metadata,key))throw error('invalid or duplicate metadata key','Metadata',a);
   metadata[key]=value;
  }
  for(const key of REQUIRED_METADATA)if(!Object.hasOwn(metadata,key))throw error('missing '+key,'Metadata');
  if(metadata.schema_version!==2||typeof metadata.bundle_id!=='string'||!metadata.bundle_id.trim()||metadata.dataset!==dataset||!Number.isSafeInteger(metadata.rows)||metadata.rows<0||metadata.rows>MAX_ROWS||typeof metadata.is_demo!=='boolean')throw error('invalid schema, release, dataset, row count or sample identity','Metadata');
  const sheet=workbook.Sheets.Data,range=dimensions(sheet,'Data',xlsx),headers=[],known=new Map(fields.map(([name,type])=>[name,type]));
  for(let col=0;col<=range.e.c;col++){
   const address=xlsx.utils.encode_cell({r:0,c:col}),header=scalar(sheet[address],'Data',address);
   if(!validColumn(header)||headers.includes(header))throw error('invalid, empty or duplicate column header','Data',address);
   headers.push(header);
  }
  for(const field of known.keys())if(!headers.includes(field))throw error('missing column '+field,'Data');
  const rows=[];
  for(let row=1;row<=range.e.r;row++){
   const record=Object.create(null);let present=false;
   for(let col=0;col<headers.length;col++){
    const address=xlsx.utils.encode_cell({r:row,c:col}),value=typedValue(sheet[address],known.get(headers[col]),workbook,xlsx,address);
    record[headers[col]]=value;if(value!==null)present=true;
   }
   if(present)rows.push(record);
   if(row%1000===0){await new Promise(resolve=>setTimeout(resolve,0));if(Date.now()-started>30000)throw Error('Workbook processing timed out');}
  }
  if(rows.length!==metadata.rows)throw error('row count does not match Metadata','Data');
  if(Date.now()-started>30000)throw Error('Workbook processing timed out');
  return {...metadata,rows};
 }
 w.CreditExcel={parse};
})(window);
