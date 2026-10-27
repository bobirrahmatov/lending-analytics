"""Package content-only native pages and the shared WCSpedia design system."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import hashlib
P=Path(__file__).resolve().parents[1]
assets=['wcspedia-style.css','wcspedia-ui.js','credit-pages.js','wcspedia-loading-overlay.js','highcharts.js','highcharts-accessibility.js']
assets += [f.name for f in sorted((P/'attachments').glob('credit-*Page.js')) if f.name!='credit-dashboardHTMLPage.js']
instructions='''CREDIT DASHBOARDS — NATIVE CONFLUENCE PAGES

1. Upload attachments/ to the intended attachment page. Keep every attachment below 10 MB.
2. Update the ONE existing wcspedia-style.css inclusion in navBar using
   Shared_WCSpedia_Include.html. Retain navBar and its other widgets. WCSUI
   reuses an existing runtime. Do not load older dashboard/UI/loading CSS separately.
3. Create native Confluence pages for the 11 distinct dashboards. Skip trends.html
   for new installs: Trends is now part of Portfolio. The old fragment remains a
   compatibility alias for existing links.
   Keep the native title and sidebar enabled. The native page tree owns navigation;
   collapse/expand and branch handlers are preserved. No custom shell is injected.
4. Create/use the native Lending Analytics parent page and place all dashboards
   beneath it. Configure its lendingAnalytics ID and dashboard IDs in
   attachments/credit-pages.js. Replace every
   REPLACE_WITH_ATTACHMENTS_PAGE_ID in shared/page fragments. Page IDs enable
   drill-through shortcuts and native collapsed collection icons.
5. Paste each fragment in its matching page's approved HTML macro, preserving
   settings -> logic -> HTMLPage order. Never combine multiple page pairs.
6. Upload six validated live data files plus optional previous/history data, then credit-manifest.json LAST.
   Production mode rejects demo data. This ZIP contains no demo records.
7. Verify on the internal host with normal viewer access. Native collapse/expand
   has been checked with a local host fixture, not the actual Confluence instance.

All pages share one global CSS, existing host fonts, WCSpedia dropdowns/popovers/
dialogs, and native sidebar skin. Published layouts are fixed and shared by all viewers; browser-only Layout/Widgets
preferences and per-card customization have been removed. Charts, calculations, source dates and prepared data are retained.
Portfolio charts now use the supplied Citi palette. Filters use a rounded modal drawer
with draft/apply/cancel, matching counts and removable chips. When an existing WCSpedia
runtime is present, update its shared ui.js bundle from the current WCSpedia upload kit
as well as the global CSS; do not retain an older dialog implementation.
Dashboard controls use WCSpedia brand blue and shared table/dropdown components;
Citi chart series colors remain. Portfolio counts share one compact four-row table; YTD/QTD/MTD/This week
segments compare current and prior new-deal periods. Approvals and pending closure
use first-approval period segments. Balance KPIs compare the previous weekday,
Monday against Friday, retaining every scope filter. Missing history is unavailable. The portfolio facility register is omitted.
Methodology uses the shared top-layer right drawer. Each chart has Expand
and Methodology controls. credit-chart-details.js is the single maintained controller,
bundled into each generated page logic file. Expansion opens the chart-specific
analysis in a modal dialog and restores the dashboard on close.
Last updated is the latest source as-of date, matching PAL behavior. Download data
exports the filtered portfolio/register, or the expanded chart source/values and search scope.
For existing databases from the preceding release, import the updated three VBA
modules and run UpgradeCreditDashboardSchema once before BuildCreditRelease. It
adds fields without deleting retained history. Publish a fresh complete six-file
release and its manifest. Legacy aggregate history cannot supply daily variances.
BuildHistory now retains one actual facility record per report date; no prior-day
balance is estimated. Daily publication is an operator workflow, not an installed
scheduler. The preview includes an explicitly illustrative August 28 comparison.
See Start_Here.html, qa/Framed_Layout_Verification.txt and
qa/Daily_Portfolio_Verification.txt in the full package.

PORTFOLIO COVERAGE AND DONUTS
Only Facilities, Relationships, CAs expired and Facilities expired appear in the
compact Portfolio coverage table immediately right of New Facilities Approved in
the default desktop layout. Pending Closure uses Expand and Methodology, with
PAL regional, aging, product, facility-type, owner and relationship analyses.
The four balance KPIs also open their PAL financial analyses. Every pie uses
one shared donut component with centered totals and right-side values/shares.
Expanded KPI cards reuse colored inline SVG tiles. No comparison is fabricated.
See qa/Coverage_Donut_Verification.txt.

TABLE COLUMN CONTROLS
Detailed and expanded tables have a top-right global search and a shared Show per page selector
(default 10; options 25 and 50), matching-row range, page count and Previous/Next
buttons, numbered page links and ellipses. Search, filter and page-size changes
reset pagination to page one. Tables fill their cards without nested frames;
redundant count/spacer rows are removed. Supporting-record category controls
use the chart-style segmented group before search on the same desktop toolbar.
Each detailed-table column includes search, a value-filter popover and ascending/descending
sorting. Numeric and date columns support inclusive ranges. Column filters combine
with global search before pagination. Registers and expanded supporting-record
downloads include all matching rows. Analytical summary-table filters are local
to that table and are labelled accordingly; they do not change chart populations.
Active filter chips can be removed individually; Reset table clears column filters
and sort order. The shared credit-tables.js is bundled into each page logic file.
Overview and expanded summary tables remain simple: no search, column controls,
sorting or pagination. This includes Past/Coming Due Covenants by Region, Regional
Distribution, period comparisons, top-ten summaries and pending-closure aging.
They remain visible within their original chart grid with methodology available.
Only bottom detail tables receive full data-table controls. Where multiple detail
views exist, chart-style tabs precede search and retain each view's state.
Covenant detail tabs are Relationship & Underwriter and Supporting records;
regional summaries are not included in these tabs. Chart point selection opens
Supporting records. Closing restores the original overview card and actions.
See qa/Table_Controls_Verification.txt and qa/Expanded_Table_Views_Verification.txt.

PAL EXPANDED ANALYSIS
Seven portfolio insights restore chart-specific PAL metrics, regional breakdowns,
charts and tables in the full-page workspace. Missing prior CCM history is shown
as unavailable. New deals uses facility counts; approval legends sit right of the
borderless donut; section summaries are centered; exposure bars and ROTCE
markers share one ranked chart with separate USD / percent axes and a 12% target; covenants
use Past due / Coming due segments. Both views and their expanded tables use
1–30, 31–45, 46–60, 61–90 and over 90 days. Coming due includes all COMING_DUE source records,
not only the legacy pal_due30 window. Map the file aging category to the existing
source_aging_bucket field: exact categories take precedence for both views; otherwise
use days_past_due or days until effective_due_date. Coarse legacy bands are not
arbitrarily split. Due today belongs to the first band; missing
aging is shown separately. Supporting records retain the source category.
See qa/PAL_Expanded_Verification.txt and qa/Coming_Due_Verification.txt.

MONITORING SUMMARY
Top Relationships & ROTCE occupies half of the default desktop row, beside
Monitoring priorities. The companion Highcharts stacked bars cover Covenants,
CA expiration, Facility maturity, CCM, Insurance and Appraisals. Critical and
other action-required records plus upcoming non-actionable records are mutually
exclusive. Critical remains a subset of the headline action count. This is an
obligation queue, not a risk score or a portfolio health percentage. Shared
business filters apply; portfolio-only filters do not. Dates remain source-specific.
Expand and Methodology preserve record inspection and scoped exports.
See qa/Monitoring_Summary_Verification.txt and qa/Portfolio-priorities-pair.png.

LAYOUT REFINEMENT
Chart cards share one WCSpedia frame and 40px controls. Portfolio defaults pair
New Facilities Approved with Portfolio coverage, New deals with Deals Pending
Closure, Top Relationships with Monitoring priorities, and Covenants with CCM.
At wide desktop widths Expiring shares the first row with Approvals and Coverage;
at narrower desktop widths it fills the preceding row. Mobile cards stack.
All viewers receive the published arrangement. Previous browser-local customization is ignored. Summary figures derive from filtered chart populations, with
calculation notes in each chart methodology drawer.
Expanded analyses place four KPI cards first, followed by equal-width 50/50 chart pairs. Detailed registers retain full width. Original PAL
regional/product/owner/aging/return breakdowns are retained. Expanded donuts use
the same centered total and right-side labels as portfolio charts. Added monthly
approval volume and top-ten balance concentration use supplied fields only.
A calculation-backed insight card accompanies each analysis. Methodology is
available for KPIs, charts, tables and insights. The page canvas is transparent
for the native Confluence background. See qa/Expanded_Layout_Verification.txt.
'''
instructions+='''
COVENANTS PAGE
The Covenants page now uses the original covenant and activity field mappings,
KPIs, past/coming-due views, regional aging, product distribution, activity history,
and relationship/underwriter details, rendered through the shared Highcharts UI.
Both statuses use portfolio bands 1–30, 31–45, 46–60, 61–90 and >90. Coming due
includes all explicitly supplied coming-due records, replacing the old 3-month cap.
Missing aging is separate. Deferred dates override contractual dates only with an
explicit prepared approval flag. Activity windows use the latest three months
present for the selected event type and filtered scope, matching the legacy page.

Every KPI, chart, summary table, detail table and insight has a calculation drawer.
Full-page expansions use KPI cards and paired charts. Bottom detail tables share
one tabbed area; summary tables remain simple. Source exports retain original
fields; equivalent source headers use canonical columns on screen.

Production still reads the validated monitoring/activity attachments. Retain the
optional original covenant columns in those JSON rows to expose all source detail;
fields absent from a published file cannot be recovered in the browser. See
Covenants_Field_Parity.txt for field aliases and scope differences. No production
JSON or original covenant source files are replaced by the preview fixture.
The default preview uses a separate synthetic, aligned August 31/August 28 scenario
with current and previous files for all 13 pages. covenants_source=local restores
the original November 2024 example; covenants_source=workbook shows the separate
workbook samples. All are illustrative. See All_Pages_Data_Handoff.txt for the
optional previous prepared-workbook argument to BuildCreditRelease.
'''
instructions+='\nCOVENANT RISK REPORTING\nSee Covenants_Risk_Reporting.txt for exact facility joins, coverage controls and daily comparisons.\nThe full package includes tools/build_covenant_history.py to prepare a NEW seven-file release with retained covenant snapshots and same-date portfolio balances for TFA/OSUC variances.\nOriginal six-file releases still work; missing history displays unavailable. No prior values are estimated.\n'
instructions+='\nALL PAGES AND PREVIOUS RELEASES\nSee All_Pages_Data_Handoff.txt and Dashboard_Preview.html in the complete package.\n'
instructions+='\nEXPANDED NAVIGATION\nRegional severity, aging mix and What needs attention share one desktop row in covenant aging expansions. Expanded and drill-down headers include a prominent Back to dashboard button. Table toolbars do not duplicate navigation. Nested drills use only Back to dashboard. Activity expansions place Monthly Activity Trend, Activity by Region and What needs attention in one desktop row; KPI cards share the compact frame and aligned value slots. Return preserves existing dashboard filters. See qa/Expanded_Navigation_Verification.txt.\n'
instructions+='\nPAGE NAMES AND DATA HANDOFF — 27 OCTOBER 2026\nThe stable overview route now displays Monitoring & Actions, distinct from Portfolio overview. Rename the corresponding native Confluence page title; the adapter does not rewrite stored page titles. Real IDs in credit-pages.js are still required for cross-page shortcuts. Set lendingAnalytics to the native Lending Analytics parent page ID. The content breadcrumb uses this parent and the current dashboard; native sidebar icons are distinct per dashboard and remain the same in expanded/compact states, using the WCSpedia skin and keyboard tooltips. Data_Integration_Kit.zip is a separate companion download with the complete source/key/page guide, typed schemas, illustrative releases, page examples and Access workbooks/modules. See qa/Navigation_Data_Handoff_Verification.txt.\n'
instructions+='\nCURRENT COVENANT LAYOUT\nCovenant KPI cards now match the compact cards on other pages: headline value, variance and comparison date. Linked facility counts, TFA, OSUC and their comparisons remain in KPI methodology and supporting records. Deferred/Waived/Deleted activity and its regional summary use equal-width, equal-height cards. Layout and Widgets controls have been removed across all pages because this package has no verified Confluence account-backed preference storage. All viewers get the fixed published layout; old browser-local settings are ignored. See qa/Covenants_Compact_Layout_Verification.txt.\n'
instructions+='\nBENTO COMPOSITION\nMetric deltas sit beside headline values. Covenant methodology and supporting records retain linked facility counts, TFA and OSUC. Domain-specific analytical layouts preserve the shared outer card frames. See qa/Bento_Verification.txt in the complete package.\n'
instructions+='\nCONTROLS AND PAL LAYOUT REFINEMENTS\nSegmented selections use short motion and update only affected cards. Deep Dive follows PAL regional presence and performance indicators; its facility/covenant details share one tabbed register. Table search precedes methodology when no view tabs exist. Portfolio includes the latest-four-snapshot trend table with true calendar MoM/QoQ/YoY baselines. Historical owner/team filters are unavailable when the source aggregate lacks those attributes. Domain expansions use source-specific charts and retain exact supporting cohorts. See qa/Controls_PAL_Verification.txt in the complete package.\n'
instructions+='\nDRILL DOWN AND METRIC ALIGNMENT\nClick chart points, donut labels, KPI cards and linked summary counts for source records. Expand buttons retain full chart analysis. Drill-down supports all supplied fields, search, column filters, sorting, 10-row default pagination and download of every matching row. Back preserves the previous view. See qa/Drill_Down_Verification.txt.\n'
instructions+='\nDEEP DIVE ENTRY\nOpen pages/deepdive.html. Open the Relationship dropdown and search R0033 or Illustrative relationship 033, then select the ID - name option. The sample button also opens R0033. Regional exposure bars and product donut retain selected relationship scope; a compact risk row links to supporting records. Table title, view tabs, search and methodology share one toolbar. See qa/Deep_Dive_Refinement_Verification.txt.\n'
instructions+='\nSEMANTIC PILLS\nIncreases are green, decreases red and unchanged amber. Past-due table statuses/counts are red, coming-due green, and open/unspecified counts amber. Amounts and identifiers stay plain. See qa/Semantic_Pills_Verification.txt.\n'
instructions+='\nSTABLE CONTROL HEADERS\nTrends controls share the title row. Partial updates preserve the widget grid; only the activated indicator animates. Repeated insight insertion and card-height growth are fixed. See qa/Stable_Controls_Verification.txt.\n'
instructions+='\nTABLE SEGMENTS AND NUMERIC PILLS\nPortfolio Trends uses segmented Exposure, PSE and Commitment controls. Shared table counts and variances use neutral number pills, including total rows. Currency balances and identifiers remain plain. Formatting does not modify source values or exports. See qa/Table_Tabs_Pills_Verification.txt.\n'
instructions+='\nPORTFOLIO LOCAL JOURNEY PILOT\nThis section supersedes earlier interaction descriptions. Expand opens the original chart-specific detailed dialog on every page, with a dim backdrop, a fixed Close control, KPIs, relevant charts, methodology and the supporting table. Portfolio bar/slice clicks drill within a single active widget that spans a full grid row, using explicit business paths and preserving the metric; they do not open a dialog or filter unrelated charts. All/breadcrumbs restore earlier levels and the original card layout. Chart/Data, search and methodology share the widget title row. Page controls are ordered Charts/Data, Filters, Reset, Download. Reset clears page filters and active drills. Data is optional and stays in the active widget. Remaining widgets dynamically fill complete rows; Portfolio singleton cards also fill the available width. Terminal Portfolio drills show ownership, same-date facility balances, relevant dates and linked monitoring. Supporting dataset tabs retain selected records, facilities and each available monitoring domain at separate grains, with full matching exports. Related records require exact facility keys, reporting dates and compatible CA identifiers. Expand resets a local drill and opens the full current chart scope, retaining page filters and chart controls. Within expanded dialogs, chart drills remain within their cards and Close restores the dashboard. There is no Open analysis intermediate action. Entity/KPI details retain their existing contextual data views. Source dates, facility-key deduplication and same-date linkage rules remain unchanged. Data table tabs, search and methodology share a single title row; narrow screens wrap, and long tab groups scroll. The duplicate Show all chart data action is removed. Drill tables reach the inner card edges. Dataset tabs and action controls align to the trailing edge. Detail sections use borderless pale metadata groups, whitespace and strong headings instead of section separators. Breadcrumbs use a high-contrast current step and remain sticky within the active card; switching to a shorter dataset restores the widget to view when needed. See qa/Drill_Table_Breadcrumb_Verification.txt.\n'
instructions+='\nOTHER PAGES: SELECTION EXPLORER AND IN-CARD DRILL\nChart points and donut labels drill inside the original card. Each further bar click selects the next available breakdown, preserving the surrounding dashboard or expanded view. Breadcrumbs restore prior cohorts; All restores the original chart. Records at the top toggles the selected source table inside that card. Bottom group dropdown and action buttons are removed. KPI and source-table selections retain the analytical selection explorer. Downloads follow the selected cohort and all filtered record pages. This supersedes earlier chart-click behavior. See qa/Inline_Drill_Verification.txt.\n'
instructions+='\nSHARED RELATED-DATA JOURNEY — CURRENT BEHAVIOR\nThe related-data component now serves local chart drills and selection dialogs on all dashboard pages. Expand retains the chart-specific analysis in the same native overlay; bar/slice drills stay in one full-row widget with visible breadcrumbs and Chart/Data. Supporting records preserves the exact clicked population and offers separate available datasets for facilities, each monitoring domain, activity, previous snapshots, covenant history, linked documents and source coverage. Tabs sit at the right of the table title with search and methodology; long tab groups scroll. Current relationships use exact region/relationship/facility/date keys and compatible CA IDs. Events lacking a facility ID can follow explicit dated covenant associations; names and owners never supply missing links. Historical records retain their own date and grain; aggregate portfolio history is labelled as unsuitable for entity attribution. Missing or ambiguous balances remain unavailable while exact monitoring links remain visible. Optional enrichment failures appear in Source coverage without suppressing the primary monitoring page. Downloads use all matching rows of the active dataset. No new backend or persistence is required. Only supplied, accessible prepared sources can be linked; omitted source fields are not reconstructed. Local tests and browser proof are documented in qa/Shared_Related_Data_Verification.txt; live Confluence and Windows Access execution remain separate validation steps.\n'
instructions+='\nEXPANDED ANALYSIS OVERLAY — CURRENT PRESENTATION\nAll expanded charts and selection explorer workspaces now use a native modal dialog above the host navigation and sidebar. The overlay has equal 16px margins (8px on small screens), a dimmed backdrop, independent scrolling, and a persistent Close / Download data header. Close or Escape returns to the dashboard; nested Back returns to the parent analysis with its table state and scroll retained. Methodology drawers and column filters remain usable above the analysis. This supersedes earlier in-page expanded presentation descriptions. Inline chart drill behavior and data calculations are unchanged. Native top-layer behavior was verified locally; live Confluence remains to be checked. See qa/Analysis_Overlay_Verification.txt.\n'
instructions+='\nSHARED ANALYSIS CONTROLS — CURRENT PRESENTATION\nThis section supersedes older presentation and pagination descriptions. Expanded analyses keep their supporting-record table visible below the charts. Calculated summaries appear with the visible In this selection label as compact text above the KPI cards, without an information button or reporting/comparison date. Expanded KPI headings omit the standalone Methodology button. Methodology remains available on the relevant charts, KPIs and data tables. The same summary normalization applies to chart expansions and nonterminal selection dialogs; they no longer occupy a chart-sized card. Analytical charts use paired desktop columns with responsive wrapping. Covenants retains regional severity beside aging mix, and its activity analysis pairs the selected event type by month with regional distribution. Older three-card attention layouts are removed. Recognized Covenant and monitoring KPI clicks now open the full domain analysis instead of the generic single-chart selection explorer. Every chart expansion has at least two analytical charts above the supporting records. Covenant status charts share readable labels and consistent past-due/coming-due colors; Over 90 days metrics retain the past-due population. See qa/Expanded_KPI_Layout_Verification.txt (supersedes the summary-button and KPI presentation in qa/Unified_Summary_Verification.txt). Terminal chart drills display related entity context followed by the shared supporting-record table. Terminal section backgrounds and summary tables fill the complete inner card width on every page; chart-only margins are removed when the shared entity profile is rendered, while headings, facts and cells retain text padding. Data remains a focused table-only view. Tabs, search and methodology remain aligned at the right of the table title. Search focus surrounds the complete rounded field rather than the inner input, and table refreshes preserve typing focus. The overlay header stays visible while its body scrolls, with a primary blue Download data button and a round, icon-only Close analysis button. Popovers use the same round close treatment. Search fields share a dark SVG clear icon and accessible labels. Detailed-table footers appear only when the filtered total exceeds 10 records. Pagination preserves Previous/Next, the first three and last three pages, the current neighborhood and ellipses. Exports include every matching row. Activity uses stacked columns by Maker Date month and Covenant Compliance. Deferred events are not completed or cleared covenants. The expanded Cumulative deferred days chart includes only DEFERRED events and uses the supplied duration, keeping zero and missing values distinct. Covenant Deferred Date remains separate from Maker Date and is visible with other supplied activity fields in the detailed table. See qa/Compact_Summary_Activity_Verification.txt.\n'
instructions='CURRENT PORTFOLIO PILOT: read the PORTFOLIO LOCAL JOURNEY PILOT section below; it supersedes historical Portfolio interaction descriptions.\n\n'+instructions
instructions=(P/'Lending_Analytics_Deployment.txt').read_text()+'\n\nHISTORICAL FEATURE NOTES (current deployment contract above takes precedence)\n\n'+instructions
(P/'INSTALL.txt').write_text(instructions)
with ZipFile(P/'Confluence_Deployment.zip','w',ZIP_DEFLATED) as z:
 for name in assets:
  f=P/'attachments'/name;assert f.stat().st_size<10_000_000;z.write(f,'attachments/'+name)
 for f in sorted((P/'confluence-pages').glob('*.html')):z.write(f,'confluence-pages/'+f.name)
 for name in ['Shared_WCSpedia_Include.html','INSTALL.txt','LICENSES.txt','Covenants_Field_Parity.txt','Covenants_Risk_Reporting.txt','All_Pages_Data_Handoff.txt','Lending_Analytics_Deployment.txt']:z.write(P/name,name)
keep_qa={'Data_Linkage_Verification.json','Navigation_Data_Handoff_Verification.txt','Monitoring-Sidebar-Expanded.png','Full-Width-Drill-Details.png','Full_Width_Drill_Verification.txt','Covenants-KPI-Full-Analysis.png','Covenants-Expanded-Chart-Pair.png','Covenants-KPI-Chart-Pair.png','Expanded_KPI_Layout_Verification.txt','Unified_Summary_Verification.txt','Rounded-Search-Focus.png','Compact_Summary_Activity_Verification.txt','Expanded-Table-Pagination.png','Terminal-Supporting-Records.png','Expanded_Controls_Verification.txt','Shared_Related_Data_Verification.txt','Drill_Section_Grouping_Verification.txt','Drill_Table_Breadcrumb_Verification.txt','Complete_Drill_Verification.txt','Dynamic_Drill_Layout_Verification.txt','Analysis_Overlay_Verification.txt','Portfolio_Journey_Verification.txt','Inline_Drill_Verification.txt','Selection_Explorer_Verification.txt','Aligned-Table-Info.png','Table_Info_Alignment_Verification.txt','Workload-Aging-Priorities.png','Workload_Priorities_Verification.txt','Shared-Register-Frame.png','Shared_Table_Frame_Verification.txt','Expanded-Aging-Attention.png','Expanded_Navigation_Verification.txt','Covenants-Compact-KPIs.png','Covenants-Equal-Activity.png','Covenants_Compact_Layout_Verification.txt','Unified-Table-Record.png','Unified_Table_Record_Verification.txt','Drill_Down_Verification.txt','Aligned-Pills-CCM.png','Drill-Down-CCM.png','Deep-Dive-Redesign.png','Deep-Dive-Search.png','Deep_Dive_Refinement_Verification.txt','Deep_Dive_Entry_Verification.txt','Deep-Dive-Empty.png','Deep-Dive-Sample.png','Semantic_Pills_Verification.txt','Semantic-Pills-Trends.png','Semantic-Pills-CCM.png','Semantic-Pills-Covenants.png','Stable_Controls_Verification.txt','Stable-Trends-Controls.png','stable-controls-browser.json','Table_Tabs_Pills_Verification.txt','Table-Tabs-Pills.png','Controls_PAL_Verification.txt','Controls-Deep-Dive.png','Controls-Trends.png','Controls-Table.png','controls-browser.json','Bento_Verification.txt','Bento-covenant-kpis.png','Bento-activity.png','Bento-expanded.png','bento-browser.json','All_Pages_Verification.txt','all-pages-browser.json','All-pages-covenant-kpis.png','All-pages-expanded.png','Contract-Monitoring.png','Contract-Portfolio.png','Contract-Field_Dictionary.png','Contract-Access_Workflow.png','Covenants-exposure-kpis.png','Covenants-exposure-expanded.png','Covenants_Exposure_Verification.txt','Covenants-risk-layout.png','Covenants-facility-analysis.png','Covenants-coming-layout.png','Covenants_Risk_Verification.txt','Covenants-overview.png','Covenants-expanded.png','Covenants-methodology.png','Covenants_Verification.txt','Table-fill-card.png','Expanded-table-card-frame.png','Expanded-simple-summaries.png','Expanded_Table_Views_Verification.txt','Five-band-table-views.png','Coming_Due_Verification.txt','Coming-due-aging-tables.png','Portfolio-compact-tables-restored.png','Table-flush-expiry-tabs.png','Table-pagination.png','Table-column-filters.png','Table_Controls_Verification.txt','Expanded-equal-expiry.png','Expanded_Layout_Verification.txt','Expanded-balanced-approvals.png','Expanded-table-methodology.png','Monitoring_Summary_Verification.txt','Portfolio-priorities-pair.png','Combined_Chart_Verification.txt','Portfolio-equal-deal-cards.png','Portfolio-combined-relationships.png','Coverage_Donut_Verification.txt','Portfolio-coverage-row.png','Portfolio-donut-labels.png','Action_Snapshot_Verification.txt','Portfolio-action-snapshot.png','Expanded-colored-kpis.png','PAL_Expanded_Verification.txt','pal-expanded-results.json','PAL-portfolio-refinements.png','PAL-expanded-new-deals.png','Framed_Layout_Verification.txt','framed-layout-results.json','Portfolio-framed-layout.png','Workload-framed-layout.png','Daily_Portfolio_Verification.txt','Portfolio-daily-overview.png','Portfolio_Refinement_Verification.txt','Portfolio-refined-overview.png','Portfolio-refined-new-deals.png','Portfolio-refined-methodology.png','Chart_Workspace_Verification.txt','chart-workspace-results.json','Chart-workspace-overview.png','Chart-workspace-expanded.png','Chart-workspace-methodology.png','Portfolio_Verification.txt','Portfolio-overview.png','Portfolio-filters.png','Portfolio-applied.png','Native_Pages_Verification.txt','native-page-results.json','Native-pages-overview.png','Native-pages-widgets.png','Native-pages-register.png','PAL_Chart_Traceability.txt','Verification.txt'}
# Keep current screenshot evidence in the upload archive; older proofs stay on disk.
keep_qa={name for name in keep_qa if not name.endswith('.png')}|{'Layout_Repair_Verification.txt','Layout_Regression_Browser.json','layout-regression.html','Summary-Chart-Layout-Fixed.png','Portfolio-Approvals-Coverage-Fixed.png','Portfolio-Covenants-CCM-Fixed.png','Underwriters-Summary-Restored.png','Portfolio-Retained.png','View_Identity_Verification.txt','Lending-Analytics-Landing.png','Monitoring-Sidebar-Expanded.png','Performance_75000.json','Lending_Analytics_Verification.txt','performance-75000.html'}
keep_qa |= {'Table_Drill_Adaptive_Verification.txt','Adaptive-Drill-Donut.png','Expanded-Table-Inline-Drill.png'}
keep_qa |= {'Reset_Tab_Performance_Verification.txt','Related_Scope_Performance.txt','Reset_Tabs_Browser.json','Reset-Tabs-Verified.png'}
keep_qa |= {'Portfolio_Three_Card_Row_Verification.txt','Portfolio-Three-Card-Row.png'}
keep_qa |= {'Table_Typography_Verification.txt','Table_Typography_Browser.json','Table-Typography-Portfolio.png'}
keep_qa |= {'Final_Release_Verification.txt'}
with ZipFile(P/'Credit_Monitoring_Package.zip','w',ZIP_DEFLATED) as z:
 for f in sorted(P.rglob('*')):
  if not f.is_file():continue
  rel=f.relative_to(P)
  if any(x in rel.parts for x in ['.git','node_modules','__pycache__','fixtures','styles']) or f.suffix in ['.ndjson','.pyc'] or f.name in ['.DS_Store','Credit_Monitoring_Package.zip','Confluence_With_Header_Macro.html','SHA256SUMS']:continue
  if f.name=='.env' or f.name.startswith('.env.'):continue
  if rel.parts[0]=='qa' and f.name not in keep_qa:continue
  z.write(f,rel.as_posix())
for name in ['Confluence_Deployment.zip','Credit_Monitoring_Package.zip','Data_Integration_Kit.zip']:
 with ZipFile(P/name) as z:
  assert z.testzip() is None;assert (P/name).stat().st_size<10_000_000;print(name,len(z.namelist()),'files', (P/name).stat().st_size,'bytes')
(P/'SHA256SUMS').write_text(''.join(hashlib.sha256((P/name).read_bytes()).hexdigest()+'  '+name+'\n' for name in ['Credit_Monitoring_Package.zip','Confluence_Deployment.zip','Data_Integration_Kit.zip']))
