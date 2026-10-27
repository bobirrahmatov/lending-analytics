# Lending Analytics

Credit monitoring dashboards for an existing WCSpedia Confluence space. The application runs in native pages through HTML macro fragments and shared attachments, with no required backend or plugin installation.

## Start here

- [Download the latest complete release](https://github.com/bobirrahmatov/lending-analytics/releases/latest)
- [Current installation contract](Lending_Analytics_Deployment.txt)
- [Visual handoff index](Start_Here.html)
- [Data files, primary keys and page sources](Data_Integration_Kit/README.txt)
- [Detailed integration guide](Data_Integration_Kit/index.html)
- [License and asset notices](LICENSES.txt)
- [Final release verification](qa/Final_Release_Verification.txt)

The repository contains illustrative data. Live deployment requires real Confluence page/attachment IDs, validated source releases and the applicable Highcharts license. Production mode rejects releases marked as demo. Native Confluence and Windows Access execution must be validated in the target environment.

## Preview

With Python 3.10 or later, run from this folder:

```sh
python3 -m http.server 8769 --bind 127.0.0.1
```

Open `http://127.0.0.1:8769/pages/lendinganalytics.html`. If the port is in use, choose another port. Opening the files directly with `file://` is not the supported preview path.

| View | Preview / matching macro filename |
| --- | --- |
| Lending Analytics parent | `lendinganalytics.html` |
| Portfolio | `portfolio.html` |
| Underwriters Summary | `overview.html` |
| Underwriter workload | `workload.html` |
| Relationship deep dive | `deepdive.html` |
| Covenants | `covenants.html` |
| CA expiration | `ca.html` |
| Facility maturity | `facility.html` |
| CCM | `ccm.html` |
| Insurance | `insurance.html` |
| Appraisals | `appraisals.html` |
| Covenant activity | `activity.html` |

Local previews live in `pages/`; production fragments live in `confluence-pages/`. `trends.html` is a compatibility route to Portfolio. There is no Sources page; source-control JSON remains required for validation.

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

- `Credit_Monitoring_Package.zip`: complete source, previews, deployment bundle, data integration kit, Excel/Access artifacts and selected QA evidence.
- `Confluence_Deployment.zip`: production scripts, stylesheet, macro fragments and installation documents; no demo dataset.
- `Data_Integration_Kit.zip`: source/key/page mapping, typed schemas, examples and operator handoff.
- `SHA256SUMS`: checksums for the three archives.

Every archive and deployed attachment is checked against the 10,000,000-byte limit. Release archives are distributed through GitHub Releases and regenerated locally; they are not committed to Git. Download the complete package for the final handoff.

## Confluence installation

Follow `Lending_Analytics_Deployment.txt`. Keep the existing `{include:wcspedia:navBar}`, native title and sidebar. Update the single shared stylesheet/UI include, configure `attachments/credit-pages.js`, replace the attachment-page placeholder in the fragments, and install each matching settings → logic → HTMLPage pair. Never replace live JSON with the supplied illustrative fixtures. Publish validated immutable data payloads before publishing their manifest.

The data contract preserves separate facility snapshots, monitoring obligations/associations and activity events. Joins require exact keys and compatible dates; missing links remain visible. Historical balances and ROTCE ratios are not summed across incompatible grains.

Local processing and regression results are recorded in `qa/`. A five-second live loading guarantee is not established; network transfer and the target Confluence/Horizon environment require separate measurement.
