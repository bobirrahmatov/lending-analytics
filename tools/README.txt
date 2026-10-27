LENDING ANALYTICS TOOLS

Run commands from the project root. All application build inputs are contained
in this repository. No WCSpedia checkout, Microsoft Access, backend, service
account or application entitlement system is required.

BUILD AND RELEASE

  npm ci --ignore-scripts
  npm run build
  npm test
  npm run package

Node.js 22+ and Python 3.10+ are development dependencies only. The deployed
application runs in the browser. Python tools use the standard library.

build_pages.py composes source/dashboard/controls.css and dashboard.css into one
credit-style.css. It copies the owned UI/loading helpers, bundles maintained
attachments/credit-*.js modules into matching page pairs, and produces native
macro fragments and local previews. The landing and 11 dashboards share these
components; trends remains a compatibility route. Every macro loads its own
dependencies and does not require a portal navbar include.

verify_page_package.py checks page/renderer pairing, JavaScript syntax, native
Confluence ownership, scoped dashboard assets, removed-page boundaries and
attachment sizes. build_integration_kit.py creates the source/key/page guide,
canonical schemas, examples and runtime workbooks. package_release.py creates
application/deployment/data ZIPs and checks archive integrity and the 10 MB limit.

DIRECT EXCEL INPUTS

Upload the six prepared files in excel/runtime/ to attachment page 3845862527:
Portfolio.xlsx, Monitoring.xlsx, Activity.xlsx, History.xlsx, Sources.xlsx and
Documents.xlsx. Each workbook has Data and Metadata sheets; preserve schema field
names, typed IDs, schema_version, bundle_id, dataset, rows and is_demo. Publish
validated workbooks and declared optional files first, credit-manifest.json last.
Stable names have no version/query/hash suffix. Mixed release identities fail
validation rather than mixing records. Financial records are not persisted in
browser storage. Confluence's current session governs attachment reads.

The supplied inputs are synthetic samples. Native macros explicitly allow them
for the requested walkthrough; set allowSampleData:false for an approved live
release with is_demo:false. Never overwrite live attachments with sample files.
credit-previous.json and credit-covenant-history.json provide optional declared
comparison/history context. Missing data is unavailable, never invented.

create_excel_samples.mjs intentionally authors synthetic samples only. It uses
@oai/artifact-tool from the authoring environment selected by
CREDIT_ARTIFACT_DEPENDENCIES. This is not a normal runtime/build dependency.
The checked-in runtime workbooks let the app build/test/package without that
authoring package. Do not use this sample generator to prepare live records.

OPTIONAL PREPARED JSON UTILITIES

validate_release.py RELEASE_DIRECTORY validates JSON envelopes, field types,
primary keys, dates, source controls and manifest counts. --allow-demo applies
only to synthetic examples. It does not validate a directory of XLSX workbooks
and does not upload files. Runtime XLSX validation is tested separately.

partition_release.py SOURCE_DIRECTORY NEW_DESTINATION_DIRECTORY splits a
validated JSON release into attachment-sized parts. build_covenant_history.py
combines reconciled retained releases into a new dated history release; use its
--help for arguments. Neither tool invents missing history or requires Access.

pal_contract.py, schema.json, input-schema.json, legacy-mappings.json and
source-catalog.json preserve the field/key/lineage contract. The integration kit
explains each page's input files and joins. Source systems can prepare these
canonical inputs with their existing approved tools.

REGRESSION AND BROWSER CHECKS

run_checks.py runs package validation, maintained test_*.cjs and test_*.py suites,
and validates prepared JSON samples. Tests cover all dashboard pages, expanded
analyses, chart/table drills, reset/tab races, controls, exact dated joins, native
sidebar isolation, startup cleanup, loading errors and partition validation.
Most CJS tests use jsdom; calculation tests use Node primitives. Real browser
layout checks remain necessary for CSS, responsive geometry and focus behavior.

qa/ contains local evidence and browser fixtures. Historical reports describe
the build they tested, not a current live deployment. Local checks do not prove
Confluence hosting/network behavior. The recorded 75,000-row JSON processing
benchmark is not a five-second end-to-end Excel/network guarantee.

REPOSITORY CONTENTS

Data_Integration_Kit/ is generated locally by npm run package and is deliberately
not tracked in Git; the complete release ZIP includes it. The per-page excerpts
under demo-comparison/pages/ and Dashboard_Preview.html are optional generated
inspection output and remain ignored. Core comparison inputs are retained for
current tests and integration-kit generation.

Retired one-time source import/rewrite generators and old browser harnesses were
removed from the maintained repository. The checked-in schemas and fixture inputs
let normal builds run without the original external workspace. Current CJS/Python
tests and retained browser fixtures are the maintained validation path.

build_comparison_demo.py authors synthetic comparison fixtures only and needs
review/validation before publication. Do not use it to prepare live records.

DEPLOYMENT

Follow Lending_Analytics_Deployment.txt. Native Confluence permissions provide
access to the dashboard and its attachments. No separate access pages or app
entitlements are included. Space_File_Drop_Guard.html is an optional independent
space-wide accidental-upload guard and is not needed for dashboard startup.
Preserve LICENSES.txt and all vendor notices in distributed packages.
