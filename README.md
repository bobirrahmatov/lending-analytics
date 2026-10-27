# Lending Analytics

Standalone credit monitoring dashboards for Confluence space `wcs`. The application runs in native pages through HTML macro fragments and shared attachments, with no required backend, separate login, entitlement checks or access-request pages. Everyone with access through the Confluence space can use the dashboards; Confluence remains responsible for page and attachment permissions.

## Start here

- [Download the latest complete release](https://github.com/bobirrahmatov/lending-analytics/releases/latest)
- [Current installation contract](Lending_Analytics_Deployment.txt)
- [Developer/operator handoff index](Start_Here.html)
- [Data files, primary keys and page sources](All_Pages_Data_Handoff.txt)
- [Detailed data integration kit](https://github.com/bobirrahmatov/lending-analytics/releases/latest) (also generated locally by `npm run package`)
- [License and asset notices](LICENSES.txt)
- [Current release verification](qa/Standalone_Dashboard_Verification.txt)

The Confluence page IDs are configured for space `wcs`, with Lending Analytics at `3782729579` and attachments at `3845862527`. The repository includes synthetic sample workbooks. The supplied native macros explicitly enable `allowSampleData:true` for the requested walkthrough; production otherwise rejects sample releases. For approved live records, set it to `false` and publish validated `is_demo:false` inputs. Keep the applicable Highcharts license and validate access in the actual Confluence environment.

## Preview

With Python 3.10 or later, run from this folder:

```sh
python3 -m http.server 8769 --bind 127.0.0.1
```

Open `http://127.0.0.1:8769/pages/lendinganalytics.html`. This is the user-facing landing: an explanation of the dashboard, people-free Citi imagery and subject cards linking to every dashboard, with navigation provided by the sidebar. `Start_Here.html` is a separate developer/operator guide. If the port is in use, choose another port. Opening files directly with `file://` is not the supported preview path.

| View | Preview / matching macro filename | Native page ID |
| --- | --- | --- |
| Lending Analytics | `lendinganalytics.html` | `3782729579` |
| Portfolio Overview | `portfolio.html` | `3977008171` |
| Underwriter Summary | `overview.html` | `3977008198` |
| Underwriter Workload | `workload.html` | `3977008221` |
| Relationship Deep Dive | `deepdive.html` | `3977008237` |
| Covenants | `covenants.html` | `3977008265` |
| Covenants Activity | `activity.html` | `3977008280` |
| CCM | `ccm.html` | `3977008303` |
| CA Expiration | `ca.html` | `3977008325` |
| Facility Maturity | `facility.html` | `3977008340` |
| Insurances | `insurance.html` | `3977008348` |
| Appraisals | `appraisals.html` | `3977008352` |

Local previews live in `pages/`; production fragments live in `confluence-pages/`. `trends.html` is a compatibility route to Portfolio. There is no Sources page; the source-control dataset remains required for validation.

## Build and verify

Use Node.js 22 or later and Python 3.10 or later. Node is a development/test dependency, not a deployment service.

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run package
```

The build uses only this repository. `source/dashboard/` holds the controls CSS, dashboard CSS, UI and loading helper. `attachments/credit-*.js` contains the shared dashboard modules; per-page `*Page.js` and `*HTMLPage.js` files are generated. Edit the shared sources, then rebuild. Do not hand-edit generated page bundles. There is no dependency on WCSpedia or Microsoft Access.

`npm test` covers page loading and expansions, local drills, supporting data, table controls, Reset/tab races, chart lifecycle, native sidebar behavior, cache/data validation, matching rules and partitioned releases. Selected browser layout evidence is retained in `qa/`; these automated checks do not prove live Confluence behavior.

## Release files

`npm run package` produces:

- `Credit_Monitoring_Package.zip`: complete source, previews, deployment files, data integration kit, runtime Excel samples and selected QA evidence.
- `Confluence_Deployment.zip`: application scripts, the shared stylesheet, macro fragments and installation documents; sample datasets are packaged separately.
- `Data_Integration_Kit.zip`: source/key/page mapping, typed schemas, examples and operator handoff.
- `SHA256SUMS`: checksums for the three archives.

The sample upload folder is separate from the application deployment ZIP. Its source files are in `excel/runtime/`. Every archive and deployed attachment is checked against the 10,000,000-byte limit. Release archives are distributed through GitHub Releases and regenerated locally; they are not committed to Git. Download the complete package for the final handoff.

## Repository contents

Git contains the dashboard source, required vendor assets and licenses, deployable
page pairs, native macro fragments, schemas, maintained tests and the sample inputs
needed by previews and regression checks. `excel/runtime/` is the default sample
upload set; the JSON/JavaScript fixtures support comparison and loader tests.

`Data_Integration_Kit/` is generated by `npm run package` and stays out of Git to
avoid duplicate workbooks, schemas and sample releases. The complete release ZIP
still includes it. Retired scripts, duplicate per-page data exports and superseded
QA artifacts are excluded. Local production inputs, credentials, exports, backups,
logs and dependency folders must not be committed. Review `git diff --cached`
before pushing any new source data.

## Confluence installation

Follow [Lending_Analytics_Deployment.txt](Lending_Analytics_Deployment.txt). Each content-only macro loads its own dashboard dependencies from attachment page `3845862527`, using the single `credit-style.css` stylesheet. No WCSpedia navbar or shared portal include is required. The native Confluence title, breadcrumb and sidebar remain in place; only configured dashboard links receive their dashboard icons.

For the space-wide sidebar skin, upload `credit-native-sidebar.js`, `credit-pages.js` and `credit-style.css`, then paste [Space_Navigation.html](Space_Navigation.html) into the existing **wcs space header/include once**. This activates on matching wcs reader pages even without a dashboard macro. It styles the existing tree, supplies distinct dashboard icons and preserves them in the collapsed rail. Native navigation, collapse preferences and permissions remain in charge. Do not simply attach the HTML and expect it to execute. Editors and other spaces are excluded.

All dashboard main containers and the landing share theme-aware backgrounds. Confluence theme tokens take priority; local previews follow the explicit or system theme.

`Space_File_Drop_Guard.html` is an optional independent space-wide include for the requested accidental-drop protection. It does not upload or redirect files and is not required to run a dashboard. Upload deliberately through the attachment host page.

All default script, image and workbook references use exact stable filenames on attachment page `3845862527`, without `?v=` parameters or version/hash suffixes. The global CSS inherits the space font family and protects scoped dashboard typography, tables and scrolling surfaces from host resets.

## Runtime workbooks and publication

Upload the six files from `excel/runtime/`: `Portfolio.xlsx`, `Monitoring.xlsx`, `Activity.xlsx`, `History.xlsx`, `Sources.xlsx` and `Documents.xlsx`, together with `credit-manifest.json`. Each workbook has `Data` and `Metadata` sheets. Metadata records `schema_version`, `bundle_id`, `dataset`, `rows` and `is_demo`; all files must agree with the manifest. Optional `credit-previous.json` and `credit-covenant-history.json` provide declared comparison/history detail.

The browser reads these attachments with the viewer's same-origin Confluence session. It validates complete data before display, coalesces reads and reuses per-page indexes. It does not persist financial records in browser storage or fall back to cached data after permission failures. The sample identity stays in the files and documentation even though dashboard demo banners and repeated sample wording are removed.

Prepare one validated bundle, upload the workbooks and declared optional files first, then replace the manifest last. Fixed filenames do **not** provide an atomic multi-file update: a visitor loading during replacement can receive a clear mixed-release error and must retry after publication. An already-loaded page keeps its validated snapshot until reload. Do not overwrite live attachments with the sample files.

Standalone JSON validation and partitioning utilities remain available for larger prepared releases. These are separate from the default Excel workflow. Exact facility/date/CA joins, separate obligation/event/facility grains, unmatched-record visibility and the prohibition on summing historical balances or ROTCE ratios still apply.

Local checks and browser evidence are recorded in `qa/`. The recorded 75,000-row JSON processing benchmark does not establish XLSX parsing performance or a five-second live loading guarantee. Confluence permissions, network transfer, and host styling require validation in the target environment.
