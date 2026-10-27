Attribute VB_Name = "CreditHubInstall"
Option Compare Database
Option Explicit

Public Sub InstallCreditHub()
    Dim db As DAO.Database
    Set db = CurrentDb
    db.Execute "CREATE TABLE [stg_Monitoring] ([item_id] TEXT(255), [category] TEXT(255), [source_id] TEXT(255), [source_record_id] TEXT(255), [as_of_date] DATETIME, [region] T" & _
        "EXT(255), [owner_id] TEXT(255), [owner_name] TEXT(255), [team_lead] TEXT(255), [product] TEXT(255), [relationship_id] TEXT(255), [relationship_name] TEXT(255), " & _
        "[owner_role] TEXT(255), [ca_id] TEXT(255), [facility_id] TEXT(255), [covenant_id] TEXT(255), [status] TEXT(255), [due_date] DATETIME, [deferred_date] DATETIME, " & _
        "[deferral_approved] YESNO, [classification] TEXT(255), [next_month_end] DATETIME, [expired_bucket] TEXT(255), [deficiency_bucket] TEXT(255), [description] LONGT" & _
        "EXT, [remarks] LONGTEXT, [origination_unit] TEXT(255), [control_unit] TEXT(255), [ou_expense_code] TEXT(255), [cu_expense_code] TEXT(255), [borrowers_name] TEXT" & _
        "(255), [product_underwriter] TEXT(255), [facility_type] TEXT(255), [frequency] TEXT(255), [source_aging_bucket] TEXT(255), [day45_date] DATETIME, [ccm_status] T" & _
        "EXT(255), [banker_name] TEXT(255))", dbFailOnError
    db.Execute "CREATE TABLE [stg_Portfolio] ([facility_key] TEXT(255), [source_id] TEXT(255), [source_record_id] TEXT(255), [as_of_date] DATETIME, [region] TEXT(255), [owner_i" & _
        "d] TEXT(255), [owner_name] TEXT(255), [team_lead] TEXT(255), [product] TEXT(255), [relationship_id] TEXT(255), [relationship_name] TEXT(255), [facility_id] TEXT" & _
        "(255), [parent_facility_id] TEXT(255), [ca_id] TEXT(255), [commitment] TEXT(255), [pse] YESNO, [sft] YESNO, [classification] TEXT(255), [tfa] DOUBLE, [direct_os" & _
        "] DOUBLE, [contingent_os] DOUBLE, [pse_os] DOUBLE, [osuc] DOUBLE, [unused_commitment] DOUBLE, [rotce] DOUBLE, [maturity_date] DATETIME, [maturity_basis] TEXT(25" & _
        "5), [ca_expiration_date] DATETIME, [origination_date] DATETIME, [renewal_date] DATETIME, [product_subprogram] TEXT(255), [management_status] TEXT(255), [facilit" & _
        "y_type] TEXT(255), [risk_category] TEXT(255), [control_unit] TEXT(255), [product_underwriter] TEXT(255), [facility_first_approval_date] DATETIME, [ca_review] TE" & _
        "XT(255), [loan_spread] DOUBLE, [pricing_exception] TEXT(255), [total_comm_exposure] DOUBLE, [reporting_currency] TEXT(255), [rotce_period] TEXT(255), [banker_na" & _
        "me] TEXT(255))", dbFailOnError
    db.Execute "CREATE TABLE [stg_Activity] ([event_id] TEXT(255), [source_id] TEXT(255), [source_record_id] TEXT(255), [as_of_date] DATETIME, [region] TEXT(255), [owner_id] TE" & _
        "XT(255), [owner_name] TEXT(255), [team_lead] TEXT(255), [product] TEXT(255), [relationship_id] TEXT(255), [relationship_name] TEXT(255), [covenant_id] TEXT(255)" & _
        ", [event_date] DATETIME, [event_type] TEXT(255))", dbFailOnError
    db.Execute "CREATE TABLE [stg_Sources] ([source_id] TEXT(255), [domain] TEXT(255), [source_name] TEXT(255), [source_file] TEXT(255), [as_of_date] DATETIME, [coverage] TEXT(" & _
        "255), [source_owner] TEXT(255), [quality_note] LONGTEXT)", dbFailOnError
    db.Execute "CREATE TABLE [stg_Documents] ([document_id] TEXT(255), [category] TEXT(255), [title] TEXT(255), [url] LONGTEXT, [as_of_date] DATETIME)", dbFailOnError
    db.Execute "CREATE TABLE [stg_Product_Map] ([region] TEXT(255), [raw_product] TEXT(255), [product] TEXT(255))", dbFailOnError
    db.Execute "CREATE TABLE [stg_Region_Map] ([control_unit] TEXT(255), [region] TEXT(255))", dbFailOnError
    db.Execute "CREATE TABLE [stg_Owner_Map] ([raw_owner] TEXT(255), [owner_id] TEXT(255), [owner_name] TEXT(255), [team_lead] TEXT(255))", dbFailOnError
    db.Execute "CREATE TABLE [pub_Monitoring] ([item_id] TEXT(255), [category] TEXT(255), [source_id] TEXT(255), [source_record_id] TEXT(255), [as_of_date] DATETIME, [region] T" & _
        "EXT(255), [owner_id] TEXT(255), [owner_name] TEXT(255), [team_lead] TEXT(255), [product] TEXT(255), [relationship_id] TEXT(255), [relationship_name] TEXT(255), " & _
        "[owner_role] TEXT(255), [ca_id] TEXT(255), [facility_id] TEXT(255), [covenant_id] TEXT(255), [status] TEXT(255), [due_date] DATETIME, [deferred_date] DATETIME, " & _
        "[deferral_approved] YESNO, [effective_due_date] DATETIME, [days_past_due] LONG, [aging_bucket] TEXT(255), [action_required] YESNO, [critical] YESNO, [coming_due" & _
        "] YESNO, [classification] TEXT(255), [next_month_end] DATETIME, [expired_bucket] TEXT(255), [deficiency_bucket] TEXT(255), [description] LONGTEXT, [remarks] LON" & _
        "GTEXT, [origination_unit] TEXT(255), [control_unit] TEXT(255), [ou_expense_code] TEXT(255), [cu_expense_code] TEXT(255), [borrowers_name] TEXT(255), [product_un" & _
        "derwriter] TEXT(255), [facility_type] TEXT(255), [frequency] TEXT(255), [source_aging_bucket] TEXT(255), [day45_date] DATETIME, [pal_covenant_bucket] TEXT(255)," & _
        " [pal_due30] YESNO, [ccm_status] TEXT(255), [banker_name] TEXT(255))", dbFailOnError
    db.Execute "CREATE TABLE [pub_Portfolio] ([facility_key] TEXT(255), [source_id] TEXT(255), [source_record_id] TEXT(255), [as_of_date] DATETIME, [region] TEXT(255), [owner_i" & _
        "d] TEXT(255), [owner_name] TEXT(255), [team_lead] TEXT(255), [product] TEXT(255), [relationship_id] TEXT(255), [relationship_name] TEXT(255), [facility_id] TEXT" & _
        "(255), [parent_facility_id] TEXT(255), [ca_id] TEXT(255), [commitment] TEXT(255), [pse] YESNO, [sft] YESNO, [classification] TEXT(255), [tfa] DOUBLE, [direct_os" & _
        "] DOUBLE, [contingent_os] DOUBLE, [pse_os] DOUBLE, [osuc] DOUBLE, [total_os] DOUBLE, [unused_commitment] DOUBLE, [total_undrawn] DOUBLE, [rotce] DOUBLE, [maturi" & _
        "ty_date] DATETIME, [maturity_basis] TEXT(255), [ca_expiration_date] DATETIME, [origination_date] DATETIME, [renewal_date] DATETIME, [ytd_new] YESNO, [mtd_new] Y" & _
        "ESNO, [product_subprogram] TEXT(255), [management_status] TEXT(255), [facility_type] TEXT(255), [risk_category] TEXT(255), [control_unit] TEXT(255), [product_un" & _
        "derwriter] TEXT(255), [facility_first_approval_date] DATETIME, [ca_review] TEXT(255), [loan_spread] DOUBLE, [pricing_exception] TEXT(255), [total_comm_exposure]" & _
        " DOUBLE, [reporting_currency] TEXT(255), [unused_uncommitted] DOUBLE, [pal_ca_expired] YESNO, [pal_ca_month] TEXT(255), [pal_facility_expired] YESNO, [pal_facil" & _
        "ity_month] TEXT(255), [pal_approval_period] TEXT(255), [pal_pipeline_bucket] TEXT(255), [pal_spread_bucket] TEXT(255), [pal_spread_weight] DOUBLE, [pal_spread_o" & _
        "s] DOUBLE, [pal_pricing_exception] YESNO, [pal_prior_ytd] YESNO, [pal_prior_mtd] YESNO, [pal_new_ytd] YESNO, [pal_approved_ytd] YESNO, [pal_pending_ytd] YESNO, " & _
        "[pal_new_qtd] YESNO, [pal_approved_qtd] YESNO, [pal_pending_qtd] YESNO, [pal_new_mtd] YESNO, [pal_approved_mtd] YESNO, [pal_pending_mtd] YESNO, [pal_new_wtd] YE" & _
        "SNO, [pal_approved_wtd] YESNO, [pal_pending_wtd] YESNO, [pal_prior_qtd] YESNO, [pal_prior_wtd] YESNO, [rotce_period] TEXT(255), [banker_name] TEXT(255))", dbFailOnError
    db.Execute "CREATE TABLE [pub_History] ([history_id] TEXT(255), [as_of_date] DATETIME, [region] TEXT(255), [product] TEXT(255), [commitment] TEXT(255), [pse] YESNO, [tfa] D" & _
        "OUBLE, [total_os] DOUBLE, [osuc] DOUBLE, [facility_count] LONG, [facility_key] TEXT(255), [owner_id] TEXT(255), [owner_name] TEXT(255), [team_lead] TEXT(255), [" & _
        "management_status] TEXT(255), [product_subprogram] TEXT(255), [facility_type] TEXT(255), [unused_commitment] DOUBLE, [unused_uncommitted] DOUBLE, [comparison_re" & _
        "ady] YESNO)", dbFailOnError
    db.Execute "CREATE TABLE [pub_Activity] ([event_id] TEXT(255), [source_id] TEXT(255), [source_record_id] TEXT(255), [as_of_date] DATETIME, [region] TEXT(255), [owner_id] TE" & _
        "XT(255), [owner_name] TEXT(255), [team_lead] TEXT(255), [product] TEXT(255), [relationship_id] TEXT(255), [relationship_name] TEXT(255), [covenant_id] TEXT(255)" & _
        ", [event_date] DATETIME, [month] TEXT(255), [event_type] TEXT(255))", dbFailOnError
    db.Execute "CREATE TABLE [pub_Sources] ([source_id] TEXT(255), [domain] TEXT(255), [source_name] TEXT(255), [source_file] TEXT(255), [as_of_date] DATETIME, [coverage] TEXT(" & _
        "255), [record_count] LONG, [source_owner] TEXT(255), [quality_note] LONGTEXT)", dbFailOnError
    db.Execute "CREATE TABLE [pub_Documents] ([document_id] TEXT(255), [category] TEXT(255), [title] TEXT(255), [url] LONGTEXT, [as_of_date] DATETIME)", dbFailOnError
    MsgBox "Credit Hub tables installed. Import the input workbook next.", vbInformation
End Sub

Public Sub ImportCreditInputs(ByVal WorkbookPath As String)
    Dim names As Variant, n As Variant
    names = Array("Monitoring","Portfolio","Activity","Sources","Documents","Product_Map","Region_Map","Owner_Map")
    If Len(Dir$(WorkbookPath)) = 0 Then Err.Raise vbObjectError + 100, , "Input workbook not found"
    For Each n In names
        CurrentDb.Execute "DELETE FROM [stg_" & n & "]", dbFailOnError
        DoCmd.TransferSpreadsheet acImport, acSpreadsheetTypeExcel12Xml, "stg_" & n, WorkbookPath, True, n & "$"
    Next n
    MsgBox "Staging imported. Review row counts and source controls before BuildCreditRelease.", vbInformation
End Sub

Public Sub UpgradeCreditDashboardSchema()
    Dim db As DAO.Database
    Set db = CurrentDb
    AddCreditField db, "pub_Portfolio", "pal_new_ytd", "YESNO"
    AddCreditField db, "pub_Portfolio", "pal_approved_ytd", "YESNO"
    AddCreditField db, "pub_Portfolio", "pal_pending_ytd", "YESNO"
    AddCreditField db, "pub_Portfolio", "pal_new_qtd", "YESNO"
    AddCreditField db, "pub_Portfolio", "pal_approved_qtd", "YESNO"
    AddCreditField db, "pub_Portfolio", "pal_pending_qtd", "YESNO"
    AddCreditField db, "pub_Portfolio", "pal_new_mtd", "YESNO"
    AddCreditField db, "pub_Portfolio", "pal_approved_mtd", "YESNO"
    AddCreditField db, "pub_Portfolio", "pal_pending_mtd", "YESNO"
    AddCreditField db, "pub_Portfolio", "pal_new_wtd", "YESNO"
    AddCreditField db, "pub_Portfolio", "pal_approved_wtd", "YESNO"
    AddCreditField db, "pub_Portfolio", "pal_pending_wtd", "YESNO"
    AddCreditField db, "pub_Portfolio", "pal_prior_qtd", "YESNO"
    AddCreditField db, "pub_Portfolio", "pal_prior_wtd", "YESNO"
    AddCreditField db, "pub_History", "facility_key", "TEXT(255)"
    AddCreditField db, "pub_History", "owner_id", "TEXT(255)"
    AddCreditField db, "pub_History", "owner_name", "TEXT(255)"
    AddCreditField db, "pub_History", "team_lead", "TEXT(255)"
    AddCreditField db, "pub_History", "management_status", "TEXT(255)"
    AddCreditField db, "pub_History", "product_subprogram", "TEXT(255)"
    AddCreditField db, "pub_History", "facility_type", "TEXT(255)"
    AddCreditField db, "pub_History", "unused_commitment", "DOUBLE"
    AddCreditField db, "pub_History", "unused_uncommitted", "DOUBLE"
    AddCreditField db, "pub_History", "comparison_ready", "YESNO"
    AddCreditField db, "stg_Monitoring", "banker_name", "TEXT(255)"
    AddCreditField db, "pub_Monitoring", "banker_name", "TEXT(255)"
    AddCreditField db, "stg_Portfolio", "banker_name", "TEXT(255)"
    AddCreditField db, "pub_Portfolio", "banker_name", "TEXT(255)"
End Sub

Private Sub AddCreditField(ByVal db As DAO.Database, ByVal tableName As String, ByVal fieldName As String, ByVal fieldType As String)
    Dim f As DAO.Field
    For Each f In db.TableDefs(tableName).Fields
        If f.Name = fieldName Then Exit Sub
    Next f
    db.Execute "ALTER TABLE [" & tableName & "] ADD COLUMN [" & fieldName & "] " & fieldType, dbFailOnError
End Sub
