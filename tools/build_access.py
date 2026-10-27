from pathlib import Path
import json
P=Path(__file__).resolve().parents[1]; S=json.loads((P/'tools/schema.json').read_text())
derived={'Monitoring':['effective_due_date','days_past_due','aging_bucket','action_required','critical','coming_due'],'Portfolio':['total_os','total_undrawn','ytd_new','mtd_new'],'Activity':['month'],'Sources':['record_count']}
import pal_contract
derived['Portfolio'] += [f[0] for f in pal_contract.PORT_FIELDS]
derived['Monitoring'] += ['pal_covenant_bucket','pal_due30']
# Input workbook fields are a strict typed staging contract, not arbitrary regional headers.
inputs={k:[x for x in v if x['field'] not in derived.get(k,[])] for k,v in S.items() if k!='History'}
inputs['Product_Map']=[{'field':f,'type':'text','required':True,'definition':d} for f,d in [('region','Source region'),('raw_product','Raw Facility Type for EMEA; raw Product Program for NAM/APAC'),('product','Approved product program')]]
inputs['Region_Map']=[{'field':f,'type':'text','required':True,'definition':d} for f,d in [('control_unit','Exact raw Control Unit'),('region','Approved region; no unknown default')]]
inputs['Owner_Map']=[{'field':f,'type':'text','required':True,'definition':d} for f,d in [('raw_owner','Exact source person alias'),('owner_id','Stable staff ID'),('owner_name','Approved display name'),('team_lead','Approved team lead')]]
(P/'tools/input-schema.json').write_text(json.dumps(inputs,indent=2))
typ={'text':'TEXT(255)','date':'DATETIME','number':'DOUBLE','integer':'LONG','boolean':'YESNO'}
lines=['Attribute VB_Name = "CreditHubInstall"','Option Compare Database','Option Explicit','','Public Sub InstallCreditHub()','    Dim db As DAO.Database','    Set db = CurrentDb']
for pref,ss in [('stg_',inputs),('pub_',S)]:
 for k,fields in ss.items():
  fields_sql=', '.join('['+f['field']+'] '+('LONGTEXT' if f['field'] in ['description','remarks','quality_note','url'] else typ[f['type']]) for f in fields)
  sql='CREATE TABLE ['+pref+k+'] ('+fields_sql+')'
  # split long VBA lines under the 1023-character limit
  chunks=[sql[i:i+160] for i in range(0,len(sql),160)]
  lines.append('    db.Execute '+(' & _\n        '.join('"'+c+'"' for c in chunks))+', dbFailOnError')
lines+=['    MsgBox "Credit Hub tables installed. Import the input workbook next.", vbInformation','End Sub','','Public Sub ImportCreditInputs(ByVal WorkbookPath As String)','    Dim names As Variant, n As Variant','    names = Array('+','.join('"'+k+'"' for k in inputs)+')','    If Len(Dir$(WorkbookPath)) = 0 Then Err.Raise vbObjectError + 100, , "Input workbook not found"','    For Each n In names','        CurrentDb.Execute "DELETE FROM [stg_" & n & "]", dbFailOnError','        DoCmd.TransferSpreadsheet acImport, acSpreadsheetTypeExcel12Xml, "stg_" & n, WorkbookPath, True, n & "$"','    Next n','    MsgBox "Staging imported. Review row counts and source controls before BuildCreditRelease.", vbInformation','End Sub']
(P/'access/CreditHubInstall.bas').write_text('\n'.join(lines)+'\n')

upgrade=['', 'Public Sub UpgradeCreditDashboardSchema()', '    Dim db As DAO.Database', '    Set db = CurrentDb']
for entity in ['Portfolio','History']:
 for field in S[entity]:
  if (entity=='Portfolio' and field['field'].startswith(('pal_new_','pal_approved_','pal_pending_')) or entity=='Portfolio' and field['field'] in ['pal_prior_qtd','pal_prior_wtd'] or entity=='History' and field['field'] in [f[0] for f in pal_contract.HISTORY_FIELDS]):
   upgrade.append('    AddCreditField db, "pub_'+entity+'", "'+field['field']+'", "'+typ[field['type']]+'"')
for entity in ['Monitoring','Portfolio']:
 for prefix in ['stg_','pub_']:
  upgrade.append('    AddCreditField db, "'+prefix+entity+'", "banker_name", "TEXT(255)"')
upgrade += ['End Sub', '', 'Private Sub AddCreditField(ByVal db As DAO.Database, ByVal tableName As String, ByVal fieldName As String, ByVal fieldType As String)', '    Dim f As DAO.Field', '    For Each f In db.TableDefs(tableName).Fields', '        If f.Name = fieldName Then Exit Sub', '    Next f', '    db.Execute "ALTER TABLE [" & tableName & "] ADD COLUMN [" & fieldName & "] " & fieldType, dbFailOnError', 'End Sub']
with (P/'access/CreditHubInstall.bas').open('a') as file:file.write('\n'.join(upgrade)+'\n')
