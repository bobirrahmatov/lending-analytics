Attribute VB_Name = "CreditHubBuild"
Option Compare Database
Option Explicit

'Run in a NEW Access .accdb after importing CreditHubInstall and running InstallCreditHub.
'Canonical staging fields are defined in Credit_Input_Template.xlsx and the contract workbook.
'No Confluence network call or upload is performed by this module.
Public Sub BuildCreditRelease(ByVal OutputFolder As String, ByVal ReleaseID As String, Optional ByVal PreviousPreparedWorkbook As String = "")
    Dim ws As DAO.Workspace, db As DAO.Database, names As Variant, n As Variant
    Dim insideTransaction As Boolean, files As String, fileName As String, countRows As Long
    Dim e As Long, msg As String
    On Error GoTo Failed
    CheckReleaseID ReleaseID
    If Right$(OutputFolder, 1) <> "\" Then OutputFolder = OutputFolder & "\"
    If Len(Dir$(OutputFolder, vbDirectory)) = 0 Then Err.Raise vbObjectError + 101, , "Create the output folder first"
    If Len(Dir$(OutputFolder & "credit-monitoring-" & ReleaseID & "*.json")) > 0 Then _
        Err.Raise vbObjectError + 102, , "Use a new release ID; existing release files are immutable"
    Set ws = DBEngine.Workspaces(0): Set db = CurrentDb
    ValidateStage db
    ws.BeginTrans: insideTransaction = True
    names = Array("Monitoring", "Portfolio", "Activity", "Sources", "Documents")
    For Each n In names
        db.Execute "DELETE FROM [pub_" & n & "]", dbFailOnError
    Next n
    BuildMonitoring db
    BuildPortfolio db
    BuildActivity db
    PreparePAL db
    db.Execute "INSERT INTO pub_Sources SELECT source_id,domain,source_name,source_file,as_of_date,coverage,0,source_owner,quality_note FROM stg_Sources", dbFailOnError
    db.Execute "INSERT INTO pub_Documents SELECT * FROM stg_Documents", dbFailOnError
    ReconcileSources db
    BuildHistory db
    If Len(PreviousPreparedWorkbook) > 0 Then ImportPreviousPrepared db, PreviousPreparedWorkbook
    ws.CommitTrans: insideTransaction = False
    names = Array("Monitoring", "Portfolio", "History", "Activity", "Sources", "Documents")
    files = ""
    For Each n In names
        fileName = "credit-" & LCase$(n) & "-" & ReleaseID & ".json"
        If Len(files) > 0 Then files = files & ","
        files = files & J(LCase$(n)) & ":" & WriteTableParts(db, "pub_" & n, OutputFolder, "credit-" & LCase$(n) & "-" & ReleaseID, ReleaseID)
        'Excel is an operator handoff. The browser only reads the JSON files.
        DoCmd.TransferSpreadsheet acExport, acSpreadsheetTypeExcel12Xml, "pub_" & n, OutputFolder & "Credit_Prepared_" & ReleaseID & ".xlsx", True
    Next n
    If Len(PreviousPreparedWorkbook) > 0 Then
        fileName = "credit-previous-" & ReleaseID & ".json"
        countRows = WritePreviousJSON(db, OutputFolder & fileName, ReleaseID)
        files = files & "," & J("previous") & ":{""filename"":" & J(fileName) & ",""rows"":" & CStr(countRows) & "}"
    End If
    WriteUTF8 OutputFolder & "credit-manifest.json", "{""schema_version"":2,""bundle_id"":" & J(ReleaseID) & _
        ",""is_demo"":false,""published_at"":" & J(Format$(Date, "yyyy-mm-dd")) & _
        ",""rule_version"":""proposed-1"",""files"":{" & files & "}}"
    MsgBox "Export complete. Review results and proposed-1 rules. Upload release JSON first and manifest last. No files have been uploaded.", vbInformation
    Exit Sub
Failed:
    e = Err.Number: msg = Err.Description
    If insideTransaction Then ws.Rollback
    Err.Raise e, "BuildCreditRelease", msg & ". Do not publish any partial output folder. Retry with a NEW release ID."
End Sub

Private Sub CheckReleaseID(ByVal s As String)
    Dim i As Long, c As String
    If Len(s) < 4 Or Len(s) > 80 Then Err.Raise vbObjectError + 103, , "Release ID must have 4-80 characters"
    For i = 1 To Len(s)
        c = Mid$(s, i, 1)
        If InStr(1, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_", c, vbBinaryCompare) = 0 Then _
            Err.Raise vbObjectError + 104, , "Release ID contains unsafe characters"
    Next i
End Sub
Private Sub Require(ByVal ok As Boolean, ByVal message As String)
    If Not ok Then Err.Raise vbObjectError + 110, "CreditHub validation", message
End Sub
Private Function T(ByVal v As Variant) As String
    T = Trim$(Nz(v, ""))
End Function
Private Function Allowed(ByVal v As Variant, ByVal list As String) As Boolean
    Allowed = InStr(1, "|" & list & "|", "|" & T(v) & "|", vbBinaryCompare) > 0
End Function
Private Sub ValidateStage(ByVal db As DAO.Database)
    Dim n As Variant, r As DAO.Recordset, keys As Object, keyName As String
    Dim sources As Object, sourceKey As String, sourceRow As Variant, f As Variant
    Set sources = CreateObject("Scripting.Dictionary")
    Set r = db.OpenRecordset("stg_Sources", dbOpenSnapshot)
    Require Not r.EOF, "Sources table is empty"
    Do Until r.EOF
        sourceKey = T(r!source_id)
        Require Len(sourceKey) > 0 And Not sources.Exists(sourceKey), "Duplicate/blank source ID: " & sourceKey
        Require Not IsNull(r!as_of_date), "Source date missing: " & sourceKey
        Require Allowed(r!domain, "PORTFOLIO|ACTIVITY|COVENANTS|CA|FACILITY|CCM|INSURANCE|APPRAISALS"), "Invalid previous source domain"
        Require Allowed(r!coverage, "ALL_OBLIGATIONS|EXCEPTIONS_ONLY"), "Invalid coverage: " & sourceKey
        Require Allowed(r!domain, "COVENANTS|CA|FACILITY|CCM|INSURANCE|APPRAISALS|PORTFOLIO|ACTIVITY"), "Invalid source domain"
        Require Len(T(r!source_file)) > 0 And Len(T(r!source_owner)) > 0, "Source filename/owner missing"
        sources.Add sourceKey, Array(CDate(r!as_of_date), T(r!domain))
        r.MoveNext
    Loop
    r.Close
    For Each n In Array("Monitoring", "Portfolio", "Activity")
        Select Case n
        Case "Monitoring": keyName = "item_id"
        Case "Portfolio": keyName = "facility_key"
        Case "Activity": keyName = "event_id"
        End Select
        Set keys = CreateObject("Scripting.Dictionary")
        Set r = db.OpenRecordset("stg_" & n, dbOpenSnapshot)
        Do Until r.EOF
            sourceKey = T(r!source_id)
            Require sources.Exists(sourceKey), "Unknown source in " & n & ": " & sourceKey
            sourceRow = sources(sourceKey)
            Require Not IsNull(r!as_of_date), "Missing as-of date"
            Require DateValue(r!as_of_date) = DateValue(sourceRow(0)), "Mixed dates inside source " & sourceKey
            Require Len(T(r(keyName))) > 0 And Not keys.Exists(T(r(keyName))), "Duplicate/blank " & keyName
            keys.Add T(r(keyName)), True
            For Each f In Array("source_record_id", "owner_id", "owner_name", "team_lead", "product", "relationship_id", "relationship_name")
                Require Len(T(r(f))) > 0, n & ": required field " & f & " missing"
            Next f
            Require Allowed(r!region, "NAM|LATAM|EMEA|APAC|IPB|SARG|CROSS_REGION|UNMAPPED"), "Invalid region"
            Require T(r!region) <> "UNMAPPED" And T(r!product) <> "UNMAPPED", "Resolve region/product mapping before publication"
            If n = "Monitoring" Then
                Require T(r!category) = sourceRow(1), "Source domain does not match monitoring category"
                Require Allowed(r!category, "COVENANTS|CA|FACILITY|CCM|INSURANCE|APPRAISALS"), "Unknown category"
                Require Allowed(r!owner_role, "UNDERWRITER|SPECIALIST"), "Unknown owner role"
                Require Allowed(r!status, "PAST_DUE|COMING_DUE|PENDING_AUTH|OPEN|AWAITING_CERTIFICATE|PENDING_REVIEW|CLEARED"), "Resolve unknown status"
                If T(r!category) = "COVENANTS" Then Require Len(T(r!covenant_id)) > 0, "Missing covenant key"
                If T(r!category) = "CA" Then Require Len(T(r!ca_id)) > 0, "Missing CA ID"
                If Allowed(r!category, "FACILITY|INSURANCE|APPRAISALS") Then Require Len(T(r!facility_id)) > 0, "Missing facility ID"
                If T(r!category) <> "INSURANCE" Then Require Not IsNull(r!due_date), "Missing due date"
                If Nz(r!deferral_approved, False) Then Require Not IsNull(r!deferred_date), "Approved deferral date missing"
            ElseIf n = "Portfolio" Then
                Require sourceRow(1) = "PORTFOLIO", "Portfolio source domain mismatch"
                Require Len(T(r!facility_id)) > 0, "Missing facility ID"
                Require T(r!reporting_currency) = "USD", "Only USD reporting amounts can be published"
                Require Allowed(r!commitment, "COMMITTED|UNCOMMITTED"), "Invalid commitment"
                Require Allowed(r!maturity_basis, "DATED|DEMAND|UNKNOWN"), "Invalid maturity basis"
                For Each f In Array("tfa", "direct_os", "contingent_os", "pse_os")
                    Require Not IsNull(r(f)), "Missing amount: " & f
                Next f
                If Not Allowed(r!region, "EMEA|APAC") Then
                    Require Not IsNull(r!osuc) And Not IsNull(r!unused_commitment), "Missing supplied Americas exposure"
                End If
            Else
                Require sourceRow(1) = "ACTIVITY", "Activity source domain mismatch"
                Require Not IsNull(r!event_date), "Missing activity maker date"
                Require Allowed(r!event_type, "DEFERRED|WAIVED|DELETED|DEACTIVATED"), "Unknown activity type"
                Require Len(T(r!covenant_id)) > 0, "Missing activity covenant ID"
            End If
            r.MoveNext
        Loop
        r.Close
    Next n
    'Reject ambiguous facility grain; do not silently deduplicate balances.
    Set r = db.OpenRecordset("SELECT source_id,facility_id,Count(*) AS N FROM stg_Portfolio GROUP BY source_id,facility_id HAVING Count(*)>1", dbOpenSnapshot)
    Require r.EOF, "Duplicate facility within a source snapshot"
    r.Close
    Set r = db.OpenRecordset("SELECT facility_id,Count(*) AS N FROM stg_Portfolio GROUP BY facility_id HAVING Count(*)>1", dbOpenSnapshot)
    Require r.EOF, "Facility repeats across source files; reconcile cross-booking before publication"
    r.Close
    Set r = db.OpenRecordset("SELECT relationship_id,Min(rotce) AS Lo,Max(rotce) AS Hi FROM stg_Portfolio WHERE rotce Is Not Null GROUP BY relationship_id HAVING Min(rotce)<>Max(rotce)", dbOpenSnapshot)
    Require r.EOF, "Conflicting ROTCE values for one relationship"
    r.Close
    Set r = db.OpenRecordset("SELECT DISTINCT as_of_date FROM stg_Portfolio", dbOpenSnapshot)
    If Not r.EOF Then
        r.MoveLast: Require r.RecordCount = 1, "Portfolio must use one common snapshot date; do not mix stocks"
    End If
    r.Close
End Sub

Private Sub CopyShared(ByVal src As DAO.Recordset, ByVal dst As DAO.Recordset)
    Dim f As DAO.Field, v As Variant, hasField As Boolean
    For Each f In src.Fields
        On Error Resume Next
        Err.Clear: v = dst.Fields(f.Name).Name: hasField = (Err.Number = 0)
        On Error GoTo 0
        If hasField Then dst(f.Name) = f.Value
    Next f
End Sub
Private Function Bucket(ByVal days As Variant) As String
    If IsNull(days) Then Bucket = "UNKNOWN": Exit Function
    Select Case CLng(days)
    Case 0: Bucket = "CURRENT"
    Case 1 To 30: Bucket = "1-30"
    Case 31 To 45: Bucket = "31-45"
    Case 46 To 60: Bucket = "46-60"
    Case 61 To 90: Bucket = "61-90"
    Case 91 To 199: Bucket = "91-199"
    Case Else: Bucket = "200+"
    End Select
End Function
Private Sub BuildMonitoring(ByVal db As DAO.Database)
    Dim s As DAO.Recordset, d As DAO.Recordset, due As Variant, days As Variant
    Dim cat As String, status As String, action As Boolean, critical As Boolean, coming As Boolean, excluded As Boolean
    Set s = db.OpenRecordset("stg_Monitoring", dbOpenSnapshot)
    Set d = db.OpenRecordset("pub_Monitoring", dbOpenDynaset)
    Do Until s.EOF
        cat = T(s!category): status = T(s!status)
        excluded = cat = "COVENANTS" And (LCase$(Left$(T(s!description), 8)) = "internal" Or LCase$(Left$(T(s!remarks), 8)) = "internal")
        If Not excluded Then
            due = s!due_date
            If Nz(s!deferral_approved, False) Then due = s!deferred_date
            days = Null: coming = False
            If Not IsNull(due) Then
                days = DateDiff("d", DateValue(due), DateValue(s!as_of_date))
                If days < 0 Then days = 0
                coming = status = "COMING_DUE" And DateValue(due) >= DateValue(s!as_of_date) And DateValue(due) <= DateAdd("m", 3, DateValue(s!as_of_date))
            End If
            action = False
            Select Case cat
            Case "COVENANTS", "FACILITY", "APPRAISALS"
                Require Allowed(status, "PAST_DUE|COMING_DUE|CLEARED"), "Invalid date-based status for " & T(s!item_id)
                action = status = "PAST_DUE"
            Case "CA"
                Require Allowed(status, "PAST_DUE|COMING_DUE|PENDING_AUTH|CLEARED"), "Invalid CA status"
                action = status = "PAST_DUE" Or status = "PENDING_AUTH"
            Case "CCM"
                Require Allowed(status, "OPEN|CLEARED"), "Invalid CCM status"
                action = status = "OPEN"
            Case "INSURANCE"
                Require Allowed(status, "AWAITING_CERTIFICATE|PENDING_REVIEW|CLEARED"), "Invalid insurance status"
                action = status = "AWAITING_CERTIFICATE" Or status = "PENDING_REVIEW"
            End Select
            If status = "PAST_DUE" Then Require Nz(days, 0) > 0, "Past due status conflicts with effective due date: " & T(s!item_id)
            critical = False
            If action Then
                Select Case cat
                Case "COVENANTS": critical = Nz(days, 0) >= 31
                Case "FACILITY": critical = Nz(days, 0) >= 60
                Case "APPRAISALS": critical = Nz(days, 0) >= 90
                Case "CCM": critical = T(s!classification) = "SUBSTANDARD"
                Case "INSURANCE": critical = status = "AWAITING_CERTIFICATE"
                End Select
            End If
            d.AddNew: CopyShared s, d
            d!effective_due_date = due: d!days_past_due = days: d!aging_bucket = Bucket(days)
            d!action_required = action: d!critical = critical: d!coming_due = coming
            d.Update
        End If
        s.MoveNext
    Loop
    s.Close: d.Close
End Sub
Private Sub BuildPortfolio(ByVal db As DAO.Database)
    Dim s As DAO.Recordset, d As DAO.Recordset, total As Double, businessDate As Variant, committed As Boolean
    Set s = db.OpenRecordset("stg_Portfolio", dbOpenSnapshot): Set d = db.OpenRecordset("pub_Portfolio", dbOpenDynaset)
    Do Until s.EOF
        total = s!direct_os + s!contingent_os + s!pse_os
        committed = T(s!commitment) = "COMMITTED"
        businessDate = s!origination_date
        If IsNull(businessDate) Then businessDate = s!renewal_date
        d.AddNew: CopyShared s, d
        d!total_os = total: d!total_undrawn = s!tfa - total
        If Allowed(s!region, "EMEA|APAC") Then
            If committed Then
                d!osuc = s!tfa: d!unused_commitment = s!tfa - total
            Else
                d!osuc = total: d!unused_commitment = 0
            End If
        End If
        d!ytd_new = False: d!mtd_new = False
        If Not IsNull(businessDate) And Not Nz(s!pse, False) Then
            If DateValue(businessDate) <= DateValue(s!as_of_date) Then
                d!ytd_new = Year(businessDate) = Year(s!as_of_date)
                d!mtd_new = Year(businessDate) = Year(s!as_of_date) And Month(businessDate) = Month(s!as_of_date)
            End If
        End If
        d.Update: s.MoveNext
    Loop
    s.Close: d.Close
End Sub
Private Sub BuildActivity(ByVal db As DAO.Database)
    Dim s As DAO.Recordset, d As DAO.Recordset
    Set s = db.OpenRecordset("stg_Activity", dbOpenSnapshot): Set d = db.OpenRecordset("pub_Activity", dbOpenDynaset)
    Do Until s.EOF
        d.AddNew: CopyShared s, d
        d!month = Format$(s!event_date, "yyyy-mm")
        If T(s!event_type) = "DEACTIVATED" Then d!event_type = "DELETED"
        d.Update: s.MoveNext
    Loop
    s.Close: d.Close
End Sub
Private Sub ReconcileSources(ByVal db As DAO.Database)
    Dim s As DAO.Recordset, r As DAO.Recordset, tableName As String
    Set s = db.OpenRecordset("pub_Sources", dbOpenDynaset)
    Do Until s.EOF
        Select Case T(s!domain)
        Case "PORTFOLIO": tableName = "pub_Portfolio"
        Case "ACTIVITY": tableName = "pub_Activity"
        Case Else: tableName = "pub_Monitoring"
        End Select
        Set r = db.OpenRecordset("SELECT Count(*) AS N FROM [" & tableName & "] WHERE source_id='" & Replace(s!source_id, "'", "''") & "'", dbOpenSnapshot)
        s.Edit: s!record_count = r!N: s.Update: r.Close: s.MoveNext
    Loop
    s.Close
End Sub
Private Sub BuildHistory(ByVal db As DAO.Database)
    Dim r As DAO.Recordset, snapshot As Date, q As String
    Set r = db.OpenRecordset("SELECT TOP 1 as_of_date FROM pub_Portfolio", dbOpenSnapshot)
    If r.EOF Then r.Close: Exit Sub
    snapshot = r!as_of_date: r.Close
    db.Execute "DELETE FROM pub_History WHERE as_of_date=#" & Format$(snapshot, "yyyy-mm-dd") & "#", dbFailOnError
    q = "INSERT INTO pub_History (history_id,facility_count,comparison_ready," & _
        "as_of_date,region,product,commitment,pse,tfa,total_os,osuc," & _
        "facility_key,owner_id,owner_name,team_lead,management_status,product_subprogram,facility_type,unused_commitment,unused_uncommitted) " & _
        "SELECT Format(as_of_date,'yyyy-mm-dd') & '|' & facility_key,1,True," & _
        "as_of_date,region,product,commitment,pse,tfa,total_os,osuc," & _
        "facility_key,owner_id,owner_name,team_lead,management_status,product_subprogram,facility_type,unused_commitment,unused_uncommitted FROM pub_Portfolio"
    db.Execute q, dbFailOnError
End Sub

Private Function J(ByVal text As String) As String
    Dim i As Long, c As String, code As Long, out As String
    For i = 1 To Len(text)
        c = Mid$(text, i, 1): code = AscW(c)
        Select Case code
        Case 34: out = out & "\" & Chr$(34)
        Case 92: out = out & "\\"
        Case 0 To 31: out = out & "\u" & Right$("0000" & Hex$(code), 4)
        Case Else: out = out & c
        End Select
    Next i
    J = Chr$(34) & out & Chr$(34)
End Function
Private Function JSONValue(ByVal f As DAO.Field) As String
    If IsNull(f.Value) Then JSONValue = "null": Exit Function
    Select Case f.Type
    Case dbBoolean
        If f.Value Then JSONValue = "true" Else JSONValue = "false"
    Case dbDate: JSONValue = J(Format$(f.Value, "yyyy-mm-dd"))
    Case dbByte, dbInteger, dbLong, dbSingle, dbDouble, dbCurrency, dbDecimal
        JSONValue = Trim$(Str$(f.Value))
        If Left$(JSONValue, 1) = "." Then JSONValue = "0" & JSONValue
        If Left$(JSONValue, 2) = "-." Then JSONValue = "-0" & Mid$(JSONValue, 2)
    Case Else: JSONValue = J(CStr(f.Value))
    End Select
End Function
Private Function NewJSONPart(ByVal prefix As String) As Object
    Dim stream As Object
    Set stream = CreateObject("ADODB.Stream")
    stream.Type = 2: stream.Charset = "utf-8": stream.Open
    stream.WriteText prefix
    Set NewJSONPart = stream
End Function

Private Function SaveJSONPart(ByVal stream As Object, ByVal folder As String, ByVal stem As String, ByVal part As Long, ByVal rows As Long) As String
    Dim fileName As String
    fileName = stem & "-part-" & Format$(part, "0000") & ".json"
    stream.WriteText "]}"
    'adSaveCreateNotExist = 1. Never replace a payload used by an existing manifest.
    stream.SaveToFile folder & fileName, 1: stream.Close
    Require FileLen(folder & fileName) < 10000000, "Attachment exceeds the limit"
    SaveJSONPart = "{""filename"":" & J(fileName) & ",""rows"":" & CStr(rows) & "}"
End Function

Private Function WriteTableParts(ByVal db As DAO.Database, ByVal tableName As String, ByVal folder As String, ByVal stem As String, ByVal release As String) As String
    Dim r As DAO.Recordset, f As DAO.Field, stream As Object, row As String, prefix As String
    Dim parts As String, part As Long, partRows As Long, total As Long, e As Long, message As String
    On Error GoTo FailedPart
    prefix = "{""schema_version"":2,""bundle_id"":" & J(release) & ",""rows"":["
    Set stream = NewJSONPart(prefix): part = 1
    Set r = db.OpenRecordset(tableName, dbOpenSnapshot)
    Do Until r.EOF
        row = ""
        For Each f In r.Fields
            If Len(row) > 0 Then row = row & ","
            row = row & J(f.Name) & ":" & JSONValue(f)
        Next f
        row = "{" & row & "}"
        'Three bytes per UTF-16 code unit is a conservative UTF-8 upper bound.
        'ADODB reports actual stream bytes; keep room for delimiters and BOM.
        Require CDbl(Len(row)) * 3 + Len(prefix) * 3 + 10 < 8000000, "A single record is too large"
        If partRows > 0 And stream.Size + CDbl(Len(row)) * 3 + 3 >= 8000000 Then
            If Len(parts) > 0 Then parts = parts & ","
            parts = parts & SaveJSONPart(stream, folder, stem, part, partRows)
            part = part + 1: partRows = 0
            Require part <= 512, "Too many attachment parts"
            Set stream = NewJSONPart(prefix)
        End If
        If partRows > 0 Then stream.WriteText ","
        stream.WriteText row
        partRows = partRows + 1: total = total + 1: r.MoveNext
    Loop
    r.Close
    If Len(parts) > 0 Then parts = parts & ","
    parts = parts & SaveJSONPart(stream, folder, stem, part, partRows)
    WriteTableParts = "{""rows"":" & CStr(total) & ",""parts"":[" & parts & "]}"
    Exit Function
FailedPart:
    e = Err.Number: message = Err.Description
    On Error Resume Next
    If Not r Is Nothing Then r.Close
    If Not stream Is Nothing Then stream.Close
    On Error GoTo 0
    Err.Raise e, "WriteTableParts", message
End Function
Private Sub WriteUTF8(ByVal path As String, ByVal value As String)
    Dim stream As Object
    Set stream = CreateObject("ADODB.Stream")
    stream.Type = 2: stream.Charset = "utf-8": stream.Open
    stream.WriteText value: stream.SaveToFile path, 2: stream.Close
End Sub

'An explicit previously prepared workbook supplies comparisons; never estimate a prior balance.
Private Sub ImportPreviousPrepared(ByVal db As DAO.Database, ByVal workbook As String)
    Dim n As Variant, td As DAO.TableDef, exists As Boolean, r As DAO.Recordset
    Dim kind As String, key As String, q As String, src As String
    Require Len(Dir$(workbook)) > 0, "Previous prepared workbook not found"
    For Each n In Array("Monitoring", "Portfolio", "Activity", "Sources")
        exists = False
        For Each td In db.TableDefs
            If td.Name = "prev_" & n Then exists = True
        Next td
        If Not exists Then db.Execute "SELECT * INTO [prev_" & n & "] FROM [pub_" & n & "] WHERE 1=0", dbFailOnError
        db.Execute "DELETE FROM [prev_" & n & "]", dbFailOnError
        DoCmd.TransferSpreadsheet acImport, acSpreadsheetTypeExcel12Xml, "prev_" & n, workbook, True, "pub_" & n & "$"
        key = IIf(n = "Monitoring", "item_id", IIf(n = "Portfolio", "facility_key", IIf(n = "Activity", "event_id", "source_id")))
        q = "SELECT [" & key & "] FROM [prev_" & n & "] GROUP BY [" & key & "] HAVING Count(*)>1 OR [" & key & "] Is Null"
        Set r = db.OpenRecordset(q, dbOpenSnapshot)
        Require r.EOF, "Duplicate or missing previous key in " & n
        r.Close
    Next n
    Set r = db.OpenRecordset("prev_Sources", dbOpenSnapshot)
    Require Not r.EOF, "Previous source controls missing"
    Do Until r.EOF
        src = Replace(T(r!source_id), "'", "''")
        kind = IIf(r!domain = "PORTFOLIO", "Portfolio", IIf(r!domain = "ACTIVITY", "Activity", "Monitoring"))
        Require Allowed(r!domain, "PORTFOLIO|ACTIVITY|COVENANTS|CA|FACILITY|CCM|INSURANCE|APPRAISALS"), "Invalid previous source domain"
        Require Allowed(r!coverage, "ALL_OBLIGATIONS|EXCEPTIONS_ONLY"), "Invalid previous coverage"
        Require DCount("*", "prev_" & kind, "source_id='" & src & "'") = r!record_count, "Previous control count mismatch: " & src
        r.MoveNext
    Loop
    r.Close
    For Each n In Array("Monitoring", "Portfolio", "Activity")
        q = "SELECT p.source_id FROM [prev_" & n & "] AS p LEFT JOIN prev_Sources AS s ON p.source_id=s.source_id " & _
            "WHERE s.source_id Is Null OR p.as_of_date<>s.as_of_date OR p.as_of_date Is Null"
        If n = "Monitoring" Then
            q = q & " OR s.domain<>p.category"
        Else
            q = q & " OR s.domain<>'" & UCase$(n) & "'"
        End If
        Set r = db.OpenRecordset(q, dbOpenSnapshot)
        Require r.EOF, "Previous source/date mismatch in " & n
        r.Close
    Next n
End Sub

Private Function PreviousRowsJSON(ByVal db As DAO.Database, ByVal tableName As String) As String
    Dim r As DAO.Recordset, f As DAO.Field, body As String, row As String
    Set r = db.OpenRecordset(tableName, dbOpenSnapshot)
    Do Until r.EOF
        row = ""
        For Each f In r.Fields
            If Len(row) > 0 Then row = row & ","
            row = row & J(f.Name) & ":" & JSONValue(f)
        Next f
        If Len(body) > 0 Then body = body & ","
        body = body & "{" & row & "}"
        r.MoveNext
    Loop
    r.Close
    PreviousRowsJSON = "[" & body & "]"
End Function

Private Function WritePreviousJSON(ByVal db As DAO.Database, ByVal path As String, ByVal release As String) As Long
    Dim n As Variant, body As String, records As String
    records = PreviousRowsJSON(db, "prev_Monitoring")
    For Each n In Array("Monitoring", "Portfolio", "Activity", "Sources")
        If Len(body) > 0 Then body = body & ","
        body = body & J(LCase$(n)) & ":" & PreviousRowsJSON(db, "prev_" & n)
    Next n
    WriteUTF8 path, "{""schema_version"":2,""bundle_id"":" & J(release) & ",""rows"":" & records & ",""datasets"":{" & body & "}}"
    Require FileLen(path) < 10000000, "Previous snapshot exceeds 10 MB; do not publish a partial release"
    WritePreviousJSON = DCount("*", "prev_Monitoring")
End Function
