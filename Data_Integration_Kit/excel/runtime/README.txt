LENDING ANALYTICS — PREPARED EXCEL ATTACHMENTS

These six fixed-name files contain a coherent sample release for the dashboard
loader. They are prepared datasets, not the original CCM, covenant or facility
source workbooks. Their data comes from the local demo-comparison release.
Names in display fields are neutral; the sample provenance remains explicit in
Metadata and credit-manifest.json as is_demo=true. Production loading must not
accept these files unless sample mode is explicitly enabled.

UPLOAD SET
Upload Sources.xlsx, Monitoring.xlsx, Portfolio.xlsx, Activity.xlsx,
History.xlsx, Documents.xlsx, credit-previous.json and credit-covenant-history.json to attachment page
3845862527. Upload credit-manifest.json after those data files. Keep the exact
filenames: the loader uses native same-origin attachment URLs, without a version
suffix or cache-busting query parameter. These instructions do not upload files.
Keep this README and Verification.json with the handoff, not in the runtime
manifest. Every workbook is below the 10,000,000-byte attachment limit.

DATA CONTRACT
Each workbook contains:
  Data      Row 1: exact canonical field names. One data record per later row.
            Every required and optional schema column is present. Additional
            supplied domain fields are retained for complete drill-through.
  Metadata  Row 1: key,value. The following rows contain:
              schema_version  numeric 2
              bundle_id       text demo-comparison-20261025
              dataset         lowercase logical dataset name
              rows            integer count of Data records
              is_demo         actual boolean TRUE

IDs and ISO YYYY-MM-DD dates are text. Amounts and counts are numeric. Boolean
fields use actual Excel booleans. Empty optional cells mean unavailable, not
zero. Prepared values contain no formulas. Keep canonical headers unchanged;
sorting or filtering the Excel Table does not change a record's key.

FILES AND GRAINS
  Sources.xlsx     8 records, source_id key. Each source defines its reporting
                   date, coverage and expected record count.
  Monitoring.xlsx  444 records, item_id key. Includes every obligation-to-entity
                   association across Covenants, CCM, CA, Facility, Insurance
                   and Appraisals. A repeated facility is not duplicate debt.
  Portfolio.xlsx   120 records, facility_key key. One current facility snapshot.
                   Facility exposure must be counted once at its valid date.
  Activity.xlsx    420 records, event_id key. Events stay distinct from obligations.
  History.xlsx     600 records, history_id key. Historical facility observations
                   retain facility_key and date; do not add balances across dates.
  Documents.xlsx   1 record, document_id key. A native Lending Analytics page
                   reference; no invented reporting date or financial content.

source_id on Monitoring, Portfolio and Activity joins Sources.source_id. Their
as_of_date must equal the corresponding source date and their row counts must
reconcile to Sources.record_count. Related data uses stable relationship_id,
facility_id and covenant_id with compatible reporting dates and CA context.
History uses facility_key + as_of_date for a facility snapshot. Name/owner fields
are display attributes, not join keys. Documents has no source-control total.

COMPARISON AND PUBLICATION
credit-previous.json is the previous snapshot from the same prepared release.
It remains a separate JSON envelope because it contains several datasets and
their independent grains. Current and previous display names use the same
neutral labels. No historical values are invented by the Excel conversion.
credit-covenant-history.json retains the same current and previous covenant
associations with reconciled source and facility controls for each reporting
date. Its canonical snapshot helper checks exact dates and counts. The manifest
uses the logical name covenant_history and the fixed filename above.

For a real release, build all six prepared workbooks from approved source files,
retain their types and keys, assign one new bundle_id to every Metadata sheet
and the manifest, update all row counts, and set is_demo=false only when the
records genuinely come from production. The existing source preparation and
validation rules still apply. Publish all files together and the manifest last.
The loader rejects mixed bundle IDs and invalid fields; fixed filenames alone
cannot make a multi-file update atomic. Existing open pages retain their already
validated snapshot; a new load must validate the current complete set.

VERIFICATION
The authoring tool checked every prepared cell against its source value, typed
metadata, source-control counts and attachment sizes. Both sheets of all six
workbooks were rendered and reviewed. Formula-error scans returned no matches.
Verification.json records counts, retained extra columns and sizes.
The local runtime-parser checks validate the saved XLSX files separately.
No claim is made that these files have been uploaded or tested in live Confluence.
