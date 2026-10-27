# Lending Analytics

Credit monitoring dashboards for an existing WCSpedia Confluence space. The application runs in native pages through HTML macro fragments and shared attachments, with no required backend or plugin installation.

## Start here

- [Download the latest complete release](https://github.com/bobirrahmatov/lending-analytics/releases/latest)
- [Current installation contract](Lending_Analytics_Deployment.txt)
- [Developer/operator handoff index](Start_Here.html)
- [Data files, primary keys and page sources](Data_Integration_Kit/README.txt)
- [Detailed integration guide](Data_Integration_Kit/index.html)
- [License and asset notices](LICENSES.txt)
- [Final release verification](qa/Landing_Excel_Verification.txt)

The Confluence page IDs are configured for space `wcs`, with Lending Analytics at `3782729579` and attachments at `3845862527`. The repository includes synthetic sample workbooks. The supplied native macros explicitly enable `allowSampleData:true` for the requested walkthrough; production otherwise rejects sample releases. For approved live records, set it to `false` and publish validated `is_demo:false` inputs. Keep the applicable Highcharts license and validate access in the actual Confluence environment.

## Preview

With Python 3.10 or later, run from this folder:

```sh
python3 -m http.server 8769 --bind 127.0.0.1
```

Open `http://127.0.0.1:8769/pages/lendinganalytics.html`. This is the user-facing landing: an explanation of the dashboard, a Citi wealth image and simple links, with navigation provided by the sidebar. `Start_Here.html` is a separate developer/operator guide. If the port is in use, choose another port. Opening files directly with `file://` is not the supported preview path.

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

The build uses only this repository. `source/wcspedia/` holds the shared CSS, UI and loading-helper sources. `attachments/credit-*.js` contains the shared dashboard modules; per-page `*Page.js` and `*HTMLPage.js` files are generated. Edit the shared modules and `source/wcspedia/credit-dashboard.css`, then rebuild. Do not hand-edit generated page bundles.

To deliberately synchronize newer shared WCSpedia files from another checkout:

```sh
python3 tools/sync_shared_ui.py /path/to/wcspedia
```

This copies the four required sources into this project before rebuilding. The checked-in Excel templates, schemas, examples and VBA modules are ready-made handoff artifacts. Historical fixture/workbook generators are documented separately in [tools/README.txt](tools/README.txt); they are not part of the normal app build.

`npm test` covers page loading and expansions, local drills, supporting data, table controls, Reset/tab races, chart lifecycle, native sidebar behavior, cache/data validation, matching rules and partitioned releases. Browser layout evidence is retained in `qa/`; these automated checks do not prove live Confluence behavior or Windows Access compilation.

## Release files

`npm run package` produces:

- `Credit_Monitoring_Package.zip`: complete source, previews, deployment files, data integration kit, Excel/Access artifacts and selected QA evidence.
- `Confluence_Deployment.zip`: application scripts, the shared stylesheet, macro fragments and installation documents; sample datasets are packaged separately.
- `Data_Integration_Kit.zip`: source/key/page mapping, typed schemas, examples and operator handoff.
- `SHA256SUMS`: checksums for the three archives.

The sample upload folder is separate from the application deployment ZIP. Its source files are in `excel/runtime/`. Every archive and deployed attachment is checked against the 10,000,000-byte limit. Release archives are distributed through GitHub Releases and regenerated locally; they are not committed to Git. Download the complete package for the final handoff.

## Confluence installation

Follow [Lending_Analytics_Deployment.txt](Lending_Analytics_Deployment.txt). Keep the existing `{include:wcs:navBar}`, native title and sidebar. Use one global `wcspedia-style.css`, the shared `wcs` space guard and the existing WCSpedia loading helper with the 12 configured page IDs. Install each matching settings → logic → HTMLPage fragment on its native page. The shared file-drop protection suppresses incidental native attachment drops; it does not upload or redirect dropped files. Upload deliberately through the attachment host page.

All default script, image and workbook references use exact stable filenames on attachment page `3845862527`, without `?v=` parameters or version/hash suffixes. The global CSS inherits the space font family and protects scoped dashboard typography, tables and scrolling surfaces from host resets.

## Runtime workbooks and publication

Upload the six files from `excel/runtime/`: `Portfolio.xlsx`, `Monitoring.xlsx`, `Activity.xlsx`, `History.xlsx`, `Sources.xlsx` and `Documents.xlsx`, together with `credit-manifest.json`. Each workbook has `Data` and `Metadata` sheets. Metadata records `schema_version`, `bundle_id`, `dataset`, `rows` and `is_demo`; all files must agree with the manifest. Optional `credit-previous.json` and `credit-covenant-history.json` provide declared comparison/history detail.

The browser reads these attachments with the viewer's same-origin Confluence session. It validates complete data before display, coalesces reads and reuses per-page indexes. It does not persist financial records in browser storage or fall back to cached data after permission failures. The sample identity stays in the files and documentation even though dashboard demo banners and repeated sample wording are removed.

Prepare one validated bundle, upload the workbooks and declared optional files first, then replace the manifest last. Fixed filenames do **not** provide an atomic multi-file update: a visitor loading during replacement can receive a clear mixed-release error and must retry after publication. An already-loaded page keeps its validated snapshot until reload. Do not overwrite live attachments with the sample files.

The existing immutable, partitioned JSON/Access workflow remains an optional path for larger releases. It is not the default Excel workflow. Exact facility/date/CA joins, separate obligation/event/facility grains, unmatched-record visibility and the prohibition on summing historical balances or ROTCE ratios still apply.

Local checks and browser evidence are recorded in `qa/`. The recorded 75,000-row JSON processing benchmark does not establish XLSX parsing performance or a five-second live loading guarantee. Confluence permissions, network transfer, host styling and Windows Access execution require validation in the target environment.
