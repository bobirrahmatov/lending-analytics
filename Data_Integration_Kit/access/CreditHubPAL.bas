Attribute VB_Name = "CreditHubPAL"
Option Compare Database
Option Explicit

'PAL-dashboard.html business filters, prepared locally before JSON publication.
Public Sub PreparePAL(ByVal db As DAO.Database)
    Dim r As DAO.Recordset, a As Date, m As Date, horizon As Date, due As Variant
    Dim eligible As Boolean, spreadOK As Boolean, days As Long, approval As Variant
    Dim business As Variant, prevStart As Date, prevEnd As Date, priorYearEnd As Date
    Dim excluded As String, sbl As Boolean
    Dim qStart As Date, pqStart As Date, pqEnd As Date, wStart As Date, wEnd As Date
    Dim periods As Variant, starts As Variant, i As Long, inPeriod As Boolean
    excluded = "|Cash Management-DOL|Cash Management-ACH|Settlement|Overdraft Line|Collateral Monitoring Line|Outgoing TPC|Credit Card|Guaranty|" & _
        "Cash Management-Other|B&I Margin Loan|Cash Management-BACS|SAFE - Prime Finance|Clearing|Agency Clearing|SAFE - Financing|B&I Short Market Values|" & _
        "Residential First Mortgage-Standard|B&I Non-Purpose Loan|Unallocated|"
    Set r = db.OpenRecordset("pub_Portfolio", dbOpenDynaset)
    Do Until r.EOF
        a = DateValue(r!as_of_date): m = DateSerial(Year(a), Month(a), 1): horizon = DateAdd("m", 3, m)
        eligible = Nz(r!management_status, "") = "CM" And (r!region <> "EMEA" Or LCase$(Trim$(Nz(r!ca_review, ""))) = "yes")
        r.Edit
        r!unused_uncommitted = r!total_undrawn - r!unused_commitment
        r!pal_ca_expired = False: r!pal_ca_month = Null
        due = r!ca_expiration_date
        If eligible And Not IsNull(due) Then
            r!pal_ca_expired = DateValue(due) < a
            If DateValue(due) >= a And DateValue(due) < horizon Then r!pal_ca_month = Format$(due, "yyyy-mm")
        End If
        r!pal_facility_expired = False: r!pal_facility_month = Null
        due = r!maturity_date
        If Not IsNull(due) Then
            r!pal_facility_expired = DateValue(due) < a
            If DateValue(due) >= a And DateValue(due) < horizon Then r!pal_facility_month = Format$(due, "yyyy-mm")
        End If
        approval = r!facility_first_approval_date: r!pal_approval_period = Null: r!pal_pipeline_bucket = Null
        If Not IsNull(approval) Then
            If InStr("|NAM|LATAM|EMEA|", "|" & r!region & "|") > 0 Then
                If Format$(approval, "yyyy-mm") = Format$(a, "yyyy-mm") Then r!pal_approval_period = "CURRENT"
                If Format$(approval, "yyyy-mm") = Format$(DateAdd("m", -1, m), "yyyy-mm") Then r!pal_approval_period = "PREVIOUS"
            End If
            If Not r!pse And (r!region = "NAM" Or r!region = "LATAM") And IsNull(r!origination_date) And Year(approval) = Year(a) Then
                If InStr(1, excluded, "|" & Nz(r!facility_type, "") & "|", vbBinaryCompare) = 0 Then
                    days = DateDiff("d", approval, a)
                    Select Case days
                    Case 1 To 30: r!pal_pipeline_bucket = "1-30"
                    Case 31 To 60: r!pal_pipeline_bucket = "31-60"
                    Case 61 To 90: r!pal_pipeline_bucket = "61-90"
                    Case Is > 90: r!pal_pipeline_bucket = ">90"
                    End Select
                End If
            End If
        End If
        sbl = r!product = "Securities Based Lending" And r!direct_os > 0
        spreadOK = sbl And Not IsNull(r!loan_spread)
        r!pal_spread_bucket = Null: r!pal_spread_weight = Null: r!pal_spread_os = 0
        r!pal_pricing_exception = sbl And LCase$(Trim$(Nz(r!pricing_exception, ""))) = "yes"
        If spreadOK Then
            Select Case r!loan_spread
            Case Is <= 70: r!pal_spread_bucket = "<=70"
            Case Is <= 125: r!pal_spread_bucket = "70-125"
            Case Else: r!pal_spread_bucket = ">125"
            End Select
            r!pal_spread_weight = r!loan_spread * r!direct_os: r!pal_spread_os = r!direct_os
        End If
        business = r!origination_date: If IsNull(business) Then business = r!renewal_date
        prevStart = DateAdd("m", -1, m): prevEnd = DateAdd("m", -1, a): priorYearEnd = DateAdd("yyyy", -1, a)
        r!pal_prior_ytd = False: r!pal_prior_mtd = False
        If Not IsNull(business) And Not r!pse Then
            r!pal_prior_ytd = DateValue(business) >= DateSerial(Year(a) - 1, 1, 1) And DateValue(business) <= priorYearEnd
            r!pal_prior_mtd = DateValue(business) >= prevStart And DateValue(business) <= prevEnd
        End If
        qStart = DateSerial(Year(a), ((Month(a) - 1) \ 3) * 3 + 1, 1)
        pqStart = DateAdd("m", -3, qStart): pqEnd = DateAdd("d", DateDiff("d", qStart, a), pqStart)
        If pqEnd >= qStart Then pqEnd = DateAdd("d", -1, qStart)
        wStart = DateAdd("d", 1 - Weekday(a, vbMonday), a)
        wEnd = DateAdd("d", -7, a)
        If Weekday(a, vbMonday) > 5 Then wEnd = DateAdd("d", -3, wStart)
        periods = Array("ytd", "qtd", "mtd", "wtd")
        starts = Array(DateSerial(Year(a), 1, 1), qStart, m, wStart)
        For i = 0 To 3
            r.Fields("pal_new_" & periods(i)) = False
            If Not IsNull(business) And Not r!pse Then r.Fields("pal_new_" & periods(i)) = DateValue(business) >= starts(i) And DateValue(business) <= a
            inPeriod = False
            If Not IsNull(approval) Then inPeriod = DateValue(approval) >= starts(i) And DateValue(approval) <= a
            r.Fields("pal_approved_" & periods(i)) = inPeriod And InStr("|NAM|LATAM|EMEA|", "|" & r!region & "|") > 0
            r.Fields("pal_pending_" & periods(i)) = inPeriod And Not IsNull(r!pal_pipeline_bucket)
        Next i
        r!pal_prior_qtd = False: r!pal_prior_wtd = False
        If Not IsNull(business) And Not r!pse Then
            r!pal_prior_qtd = DateValue(business) >= pqStart And DateValue(business) <= pqEnd
            r!pal_prior_wtd = DateValue(business) >= DateAdd("d", -7, wStart) And DateValue(business) <= wEnd
        End If
        r.Update: r.MoveNext
    Loop
    r.Close
    Set r = db.OpenRecordset("pub_Monitoring", dbOpenDynaset)
    Do Until r.EOF
        r.Edit: r!pal_covenant_bucket = Null: r!pal_due30 = False
        If r!category = "COVENANTS" Then
            If r!status = "PAST_DUE" And Nz(r!days_past_due, 0) > 0 Then
                Select Case r!days_past_due
                Case 1 To 45: r!pal_covenant_bucket = "1-45"
                Case 46 To 90: r!pal_covenant_bucket = "46-90"
                Case Is > 90: r!pal_covenant_bucket = ">90"
                End Select
            End If
            If r!status = "COMING_DUE" And Not IsNull(r!effective_due_date) Then
                days = DateDiff("d", r!as_of_date, r!effective_due_date)
                r!pal_due30 = days >= 0 And days <= 30
            End If
        End If
        If r!category = "CCM" Then
            If InStr("|PAST_DUE|COMING_DUE|OPEN|", "|" & Nz(r!ccm_status, "") & "|") = 0 Then
                Err.Raise vbObjectError + 160, "PreparePAL", "Map the original CCM_Status before publication"
            End If
        End If
        r.Update: r.MoveNext
    Loop
    r.Close
End Sub
