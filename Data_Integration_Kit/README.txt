LENDING ANALYTICS — DATA GUIDE
Open index.html for each dashboard’s sources, stable filenames, primary keys, joins, field dictionaries and examples.

UPLOAD INPUTS: excel/runtime/ contains the six prepared fixed-name workbooks, credit-manifest.json and optional same-release comparison/history JSON. Data and Metadata sheets retain typed identifiers, source dates and release identity. These samples use is_demo=true; use the explicit sample installation only.

examples/ and page-examples/ are inspection excerpts, not complete upload bundles. page-source-map.json lists every dashboard’s dependencies. source-catalog.json records upstream source lineage. schema/ retains canonical fields and source mappings.

release/ contains a coherent prepared JSON example for standalone validation. tools/ contains validators and history/partition utilities; these do not validate XLSX files and require no database integration.

Dashboard viewers use the existing Confluence wcs space permissions. There is no separate access request, entitlement application or account setup. Landing page: 3782729579. Attachment page: 3845862527. Prepare the six shared files once for all 11 dashboards; do not maintain separate page-specific datasets.

The included examples are synthetic. Validate real source fields, coverage and live Confluence loading before publishing approved records. Upload data first and manifest last; mismatched bundles are rejected.
