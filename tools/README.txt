LENDING ANALYTICS TOOLS

Run commands from the project root. These tools have different purposes; do not
run every generator as a build step. The maintained application sources, shared
WCSpedia inputs, illustrative datasets, schemas, VBA modules and Excel workbooks
are already included.

APPLICATION BUILD AND RELEASE

  python3 tools/build_pages.py
  python3 tools/verify_page_package.py
  python3 tools/build_integration_kit.py
  python3 tools/package_release.py

build_pages.py reads the shared source snapshot in source/wcspedia/ and the
maintained JavaScript components in attachments/. It generates the 13 preview
pages, content-only Confluence fragments, paired page scripts and one shared
stylesheet. To intentionally use another approved WCSpedia checkout, supply
--wcspedia PATH. No parent wealth workspace is needed for the default build.

verify_page_package.py checks page/script pairing, JavaScript syntax, retired
page removal, native Confluence ownership and attachment sizes. It uses Python
standard-library modules and the node executable.

build_integration_kit.py assembles the current data contract, examples, supplied
workbooks, VBA modules and illustrative release. package_release.py writes the
deployment and complete-project ZIPs and checks archive integrity and sizes.
Python 3.10 or newer is sufficient for these commands; no Python packages are
required. Node.js is used for JavaScript checks and local regression tests only.
The deployed application itself runs in the browser without a Node service.

sync_shared_ui.py PATH is an explicit alternative for importing shared UI code
from an approved WCSpedia checkout. It copies the four shared sources into this
project before calling build_pages.py with the bundled snapshot.
It is not required when using the bundled source snapshot.

DATA PUBLICATION TOOLS

validate_release.py RELEASE_DIRECTORY validates prepared dataset envelopes,
types, primary keys, dates, source controls and manifest counts. Add --allow-demo
only when validating the included illustrative release. Real production inputs
must pass without that option. This validator does not upload any files.

partition_release.py SOURCE_DIRECTORY NEW_DESTINATION_DIRECTORY splits a
validated release into attachment-sized parts and validates the result. Its
--allow-demo option has the same illustrative-data-only purpose.

build_covenant_history.py combines reconciled current and retained releases into
a new release with dated covenant history. Run it with --help for its required
manifest, output-directory and release-ID arguments. It does not infer missing
history, and writes to a new output directory.

pal_contract.py and schema.json support validation and the data tools. Preserve
them together. input-schema.json and legacy-mappings.json describe staging and
source mapping. The Access installation/export modules are supplied in access/;
Windows Access compilation and source-system validation remain separate checks.

LOCAL REGRESSION CHECKS

The maintained test_*.cjs files exercise application calculations, shared UI,
drill paths, controls, table behavior, cache behavior and asynchronous rendering.
Most use jsdom 26.1.0; the pure model tests use Node's built-in modules. Follow the
repository's documented test command for the current supported suite. Do not
discover and execute every historical .mjs script as part of that suite.

Python unit tests test_pal_rules.py, test_covenant_history.py and
test_partition_release.py use the standard library and adjacent project tools.
Current QA reports and browser fixtures are in qa/. Local fixture success does
not establish live Confluence behavior, Windows Access execution, or a network
and host-independent 75,000-row performance guarantee.

RETAINED GENERATORS AND HISTORICAL HARNESS FILES

These are source/provenance utilities, not prerequisites for running the supplied
pages, rebuilding application bundles, validating a release or packaging the
project. Retained generated artifacts make those workflows self-contained.

- build_data.py bootstrapped schemas, synthetic data and legacy mapping extracts.
  It reads LPTM-Hub/PAL-ETL.html from the original wealth workspace outside this
  repository. It writes existing contract/data artifacts. Do not run it as a
  routine application build or against production files.

- capture_covenants_fixture.cjs captures the original seeded local dummy-data
  generator from covenants.js in the original wealth workspace. That external
  historical source is not required by the runtime. The generated
  attachments/credit-covenants-demo.js is included, and the supplied workbook
  samples remain in covenants-workbook-samples.json.

- build_workbooks.mjs uses the authoring-environment package @oai/artifact-tool
  to create and render the Excel deliverables. This is an optional workbook
  authoring dependency, not a browser/runtime or ordinary build dependency.
  The reviewed .xlsx deliverables are included in excel/. Do not assume the
  artifact tool is available through an ordinary public npm installation.

- workbook_content.py regenerates workbook-content.json from the schemas and
  retained documentation. build_access.py regenerates Access module content.
  build_comparison_demo.py regenerates the illustrative comparison dataset and
  preview artifacts. These intentionally write generated assets and require
  review and the corresponding validation before replacing a release.

- add_contract_validation.py is a historical one-time source rewrite. The
  application already contains its validation logic; repeated execution can
  insert duplicate code. Do not run it as a build or migration step.

- test_dashboard.mjs and test_production_loader.mjs are historical Playwright
  harnesses for the former single-page tab shell. They expect retired selectors
  and a full Credit_Monitoring_Demo.html, which is now a compatibility redirect.
  They do not verify the current native-page architecture and are not supported
  release checks. Their Playwright/Chrome dependencies are not needed by the
  current application build or CJS regression suite.

- build_qa_fixtures.py also targets that former full demo HTML and is retained
  for provenance, not current release verification. build_sidebar_fixture.py
  and build_performance_fixture.py generate local browser inspection fixtures;
  inspect their output before using them as evidence for a current build.

DEPLOYMENT BOUNDARY

Use Lending_Analytics_Deployment.txt as the current deployment contract. Keep
the existing WCSpedia navBar and native sidebar, configure actual page and
attachment IDs, and publish validated live data before its manifest. The
included demo data is illustrative and must not replace live production data.
Keep LICENSES.txt with all distributed artifacts; no broader rights to internal
Citi/WCSpedia assets or Highcharts are asserted by this package.
