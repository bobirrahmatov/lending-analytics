(function(){
const root=document.getElementById('credit-hub');if(!root)return;if(window.CREDIT_CONFIG?.page!=="lendingAnalytics"){root.textContent='This page needs its matching dashboard settings and scripts.';return;}
/* Dashboard icons on Confluence's existing navigation. Native URLs, titles,
 * tree controls, dimensions and collapse preferences stay native. The optional
 * space include also styles ordinary reader pages in the configured space. */
(function (w, d) {
  'use strict';
  if (w.CreditSidebar) { w.CreditSidebar.refresh(); return; }
  var host = null, observer = null, resizeObserver = null, queued = false, destroyed = false, ownsHostClass = false, revealOwned = false;
  var decorations = new Map(), createdClassAttributes = new Set(), presentation = new Map(), nativeFooters = new Set();
  var systemTheme = w.matchMedia?.('(prefers-color-scheme: dark)');
  var links = new Map(), toggles = new Map(), tooltip = null, tooltipLink = null, previousDescription = null;
  var topToggle = null, topToggleSlot = null, topToggleTarget = null;
  var requestedFonts = new Set(), chartFonts = new WeakMap(), fontGeneration = 0;
  // Filled SVG paths from the supplied TailAdmin sidebar (see LICENSES.txt).
  var iconPaths = {
    "lendingAnalytics": "M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V8.99998C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 8.99998V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H9C9.41421 4.75 9.75 5.08579 9.75 5.5V8.99998C9.75 9.41419 9.41421 9.74998 9 9.74998H5.5C5.08579 9.74998 4.75 9.41419 4.75 8.99998V5.5ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7427 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM4.75 15C4.75 14.5858 5.08579 14.25 5.5 14.25H9C9.41421 14.25 9.75 14.5858 9.75 15V18.5C9.75 18.9142 9.41421 19.25 9 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V15ZM12.75 5.5C12.75 4.25736 13.7574 3.25 15 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V8.99998C20.75 10.2426 19.7426 11.25 18.5 11.25H15C13.7574 11.25 12.75 10.2426 12.75 8.99998V5.5ZM15 4.75C14.5858 4.75 14.25 5.08579 14.25 5.5V8.99998C14.25 9.41419 14.5858 9.74998 15 9.74998H18.5C18.9142 9.74998 19.25 9.41419 19.25 8.99998V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H15ZM15 12.75C13.7574 12.75 12.75 13.7574 12.75 15V18.5C12.75 19.7426 13.7574 20.75 15 20.75H18.5C19.7426 20.75 20.75 19.7427 20.75 18.5V15C20.75 13.7574 19.7426 12.75 18.5 12.75H15ZM14.25 15C14.25 14.5858 14.5858 14.25 15 14.25H18.5C18.9142 14.25 19.25 14.5858 19.25 15V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15C14.5858 19.25 14.25 18.9142 14.25 18.5V15Z",
    "portfolio": "M12 2C11.5858 2 11.25 2.33579 11.25 2.75V12C11.25 12.4142 11.5858 12.75 12 12.75H21.25C21.6642 12.75 22 12.4142 22 12C22 6.47715 17.5228 2 12 2ZM12.75 11.25V3.53263C13.2645 3.57761 13.7659 3.66843 14.25 3.80098V3.80099C15.6929 4.19606 16.9827 4.96184 18.0104 5.98959C19.0382 7.01734 19.8039 8.30707 20.199 9.75C20.3316 10.2341 20.4224 10.7355 20.4674 11.25H12.75ZM2 12C2 7.25083 5.31065 3.27489 9.75 2.25415V3.80099C6.14748 4.78734 3.5 8.0845 3.5 12C3.5 16.6944 7.30558 20.5 12 20.5C15.9155 20.5 19.2127 17.8525 20.199 14.25H21.7459C20.7251 18.6894 16.7492 22 12 22C6.47715 22 2 17.5229 2 12Z",
    "trends": "M6.06462 1.62393C6.20193 1.47072 6.40135 1.37432 6.62329 1.37432C6.6236 1.37432 6.62391 1.37432 6.62422 1.37432C6.81631 1.37415 7.00845 1.44731 7.15505 1.5938L10.1551 4.5918C10.4481 4.88459 10.4483 5.35946 10.1555 5.65246C9.86273 5.94546 9.38785 5.94562 9.09486 5.65283L7.37329 3.93247L7.37329 10.125C7.37329 10.5392 7.03751 10.875 6.62329 10.875C6.20908 10.875 5.87329 10.5392 5.87329 10.125L5.87329 3.93578L4.15516 5.65281C3.86218 5.94561 3.3873 5.94546 3.0945 5.65248C2.8017 5.35949 2.80185 4.88462 3.09484 4.59182L6.06462 1.62393Z",
    "deepdive": "M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z",
    "overview": "M3.25 5.5C3.25 4.25736 4.25736 3.25 5.5 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V18.5C20.75 19.7426 19.7426 20.75 18.5 20.75H5.5C4.25736 20.75 3.25 19.7426 3.25 18.5V5.5ZM5.5 4.75C5.08579 4.75 4.75 5.08579 4.75 5.5V8.58325L19.25 8.58325V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H5.5ZM19.25 10.0833H15.416V13.9165H19.25V10.0833ZM13.916 10.0833L10.083 10.0833V13.9165L13.916 13.9165V10.0833ZM8.58301 10.0833H4.75V13.9165H8.58301V10.0833ZM4.75 18.5V15.4165H8.58301V19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5ZM10.083 19.25V15.4165L13.916 15.4165V19.25H10.083ZM15.416 19.25V15.4165H19.25V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15.416Z",
    "workload": "M8.80443 5.60156C7.59109 5.60156 6.60749 6.58517 6.60749 7.79851C6.60749 9.01185 7.59109 9.99545 8.80443 9.99545C10.0178 9.99545 11.0014 9.01185 11.0014 7.79851C11.0014 6.58517 10.0178 5.60156 8.80443 5.60156ZM5.10749 7.79851C5.10749 5.75674 6.76267 4.10156 8.80443 4.10156C10.8462 4.10156 12.5014 5.75674 12.5014 7.79851C12.5014 9.84027 10.8462 11.4955 8.80443 11.4955C6.76267 11.4955 5.10749 9.84027 5.10749 7.79851ZM4.86252 15.3208C4.08769 16.0881 3.70377 17.0608 3.51705 17.8611C3.48384 18.0034 3.5211 18.1175 3.60712 18.2112C3.70161 18.3141 3.86659 18.3987 4.07591 18.3987H13.4249C13.6343 18.3987 13.7992 18.3141 13.8937 18.2112C13.9797 18.1175 14.017 18.0034 13.9838 17.8611C13.7971 17.0608 13.4132 16.0881 12.6383 15.3208C11.8821 14.572 10.6899 13.955 8.75042 13.955C6.81096 13.955 5.61877 14.572 4.86252 15.3208ZM3.8071 14.2549C4.87163 13.2009 6.45602 12.455 8.75042 12.455C11.0448 12.455 12.6292 13.2009 13.6937 14.2549C14.7397 15.2906 15.2207 16.5607 15.4446 17.5202C15.7658 18.8971 14.6071 19.8987 13.4249 19.8987H4.07591C2.89369 19.8987 1.73504 18.8971 2.05628 17.5202C2.28015 16.5607 2.76117 15.2906 3.8071 14.2549ZM15.3042 11.4955C14.4702 11.4955 13.7006 11.2193 13.0821 10.7533C13.3742 10.3314 13.6054 9.86419 13.7632 9.36432C14.1597 9.75463 14.7039 9.99545 15.3042 9.99545C16.5176 9.99545 17.5012 9.01185 17.5012 7.79851C17.5012 6.58517 16.5176 5.60156 15.3042 5.60156C14.7039 5.60156 14.1597 5.84239 13.7632 6.23271C13.6054 5.73284 13.3741 5.26561 13.082 4.84371C13.7006 4.37777 14.4702 4.10156 15.3042 4.10156C17.346 4.10156 19.0012 5.75674 19.0012 7.79851C19.0012 9.84027 17.346 11.4955 15.3042 11.4955ZM19.9248 19.8987H16.3901C16.7014 19.4736 16.9159 18.969 16.9827 18.3987H19.9248C20.1341 18.3987 20.2991 18.3141 20.3936 18.2112C20.4796 18.1175 20.5169 18.0034 20.4837 17.861C20.2969 17.0607 19.913 16.088 19.1382 15.3208C18.4047 14.5945 17.261 13.9921 15.4231 13.9566C15.2232 13.6945 14.9995 13.437 14.7491 13.1891C14.5144 12.9566 14.262 12.7384 13.9916 12.5362C14.3853 12.4831 14.8044 12.4549 15.2503 12.4549C17.5447 12.4549 19.1291 13.2008 20.1936 14.2549C21.2395 15.2906 21.7206 16.5607 21.9444 17.5202C22.2657 18.8971 21.107 19.8987 19.9248 19.8987Z",
    "COVENANTS": "M7.75586 5.50098C7.75586 5.08676 8.09165 4.75098 8.50586 4.75098H18.4985C18.9127 4.75098 19.2485 5.08676 19.2485 5.50098L19.2485 15.4956C19.2485 15.9098 18.9127 16.2456 18.4985 16.2456H8.50586C8.09165 16.2456 7.75586 15.9098 7.75586 15.4956V5.50098ZM8.50586 3.25098C7.26322 3.25098 6.25586 4.25834 6.25586 5.50098V6.26318H5.50195C4.25931 6.26318 3.25195 7.27054 3.25195 8.51318V18.4995C3.25195 19.7422 4.25931 20.7495 5.50195 20.7495H15.4883C16.7309 20.7495 17.7383 19.7421 17.7383 18.4995L17.7383 17.7456H18.4985C19.7411 17.7456 20.7485 16.7382 20.7485 15.4956L20.7485 5.50097C20.7485 4.25833 19.7411 3.25098 18.4985 3.25098H8.50586ZM16.2383 17.7456H8.50586C7.26322 17.7456 6.25586 16.7382 6.25586 15.4956V7.76318H5.50195C5.08774 7.76318 4.75195 8.09897 4.75195 8.51318V18.4995C4.75195 18.9137 5.08774 19.2495 5.50195 19.2495H15.4883C15.9025 19.2495 16.2383 18.9137 16.2383 18.4995L16.2383 17.7456Z",
    "CA": "M8 2C8.41421 2 8.75 2.33579 8.75 2.75V3.75H15.25V2.75C15.25 2.33579 15.5858 2 16 2C16.4142 2 16.75 2.33579 16.75 2.75V3.75H18.5C19.7426 3.75 20.75 4.75736 20.75 6V9V19C20.75 20.2426 19.7426 21.25 18.5 21.25H5.5C4.25736 21.25 3.25 20.2426 3.25 19V9V6C3.25 4.75736 4.25736 3.75 5.5 3.75H7.25V2.75C7.25 2.33579 7.58579 2 8 2ZM8 5.25H5.5C5.08579 5.25 4.75 5.58579 4.75 6V8.25H19.25V6C19.25 5.58579 18.9142 5.25 18.5 5.25H16H8ZM19.25 9.75H4.75V19C4.75 19.4142 5.08579 19.75 5.5 19.75H18.5C18.9142 19.75 19.25 19.4142 19.25 19V9.75Z",
    "FACILITY": "M8.50391 4.25C8.50391 3.83579 8.83969 3.5 9.25391 3.5H15.2777C15.4766 3.5 15.6674 3.57902 15.8081 3.71967L18.2807 6.19234C18.4214 6.333 18.5004 6.52376 18.5004 6.72268V16.75C18.5004 17.1642 18.1646 17.5 17.7504 17.5H16.248V17.4993H14.748V17.5H9.25391C8.83969 17.5 8.50391 17.1642 8.50391 16.75V4.25ZM14.748 19H9.25391C8.01126 19 7.00391 17.9926 7.00391 16.75V6.49854H6.24805C5.83383 6.49854 5.49805 6.83432 5.49805 7.24854V19.75C5.49805 20.1642 5.83383 20.5 6.24805 20.5H13.998C14.4123 20.5 14.748 20.1642 14.748 19.75L14.748 19ZM7.00391 4.99854V4.25C7.00391 3.00736 8.01127 2 9.25391 2H15.2777C15.8745 2 16.4468 2.23705 16.8687 2.659L19.3414 5.13168C19.7634 5.55364 20.0004 6.12594 20.0004 6.72268V16.75C20.0004 17.9926 18.9931 19 17.7504 19H16.248L16.248 19.75C16.248 20.9926 15.2407 22 13.998 22H6.24805C5.00541 22 3.99805 20.9926 3.99805 19.75V7.24854C3.99805 6.00589 5.00541 4.99854 6.24805 4.99854H7.00391Z",
    "CCM": "M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H18.5001C19.7427 20.75 20.7501 19.7426 20.7501 18.5V5.5C20.7501 4.25736 19.7427 3.25 18.5001 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H18.5001C18.9143 4.75 19.2501 5.08579 19.2501 5.5V18.5C19.2501 18.9142 18.9143 19.25 18.5001 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V5.5ZM6.25005 9.7143C6.25005 9.30008 6.58583 8.9643 7.00005 8.9643L17 8.96429C17.4143 8.96429 17.75 9.30008 17.75 9.71429C17.75 10.1285 17.4143 10.4643 17 10.4643L7.00005 10.4643C6.58583 10.4643 6.25005 10.1285 6.25005 9.7143ZM6.25005 14.2857C6.25005 13.8715 6.58583 13.5357 7.00005 13.5357H17C17.4143 13.5357 17.75 13.8715 17.75 14.2857C17.75 14.6999 17.4143 15.0357 17 15.0357H7.00005C6.58583 15.0357 6.25005 14.6999 6.25005 14.2857Z",
    "INSURANCE": "M3.70186 12.0001C3.70186 7.41711 7.41711 3.70186 12.0001 3.70186C16.5831 3.70186 20.2984 7.41711 20.2984 12.0001C20.2984 16.5831 16.5831 20.2984 12.0001 20.2984C7.41711 20.2984 3.70186 16.5831 3.70186 12.0001ZM12.0001 1.90186C6.423 1.90186 1.90186 6.423 1.90186 12.0001C1.90186 17.5772 6.423 22.0984 12.0001 22.0984C17.5772 22.0984 22.0984 17.5772 22.0984 12.0001C22.0984 6.423 17.5772 1.90186 12.0001 1.90186ZM15.6197 10.7395C15.9712 10.388 15.9712 9.81819 15.6197 9.46672C15.2683 9.11525 14.6984 9.11525 14.347 9.46672L11.1894 12.6243L9.6533 11.0883C9.30183 10.7368 8.73198 10.7368 8.38051 11.0883C8.02904 11.4397 8.02904 12.0096 8.38051 12.3611L10.553 14.5335C10.7217 14.7023 10.9507 14.7971 11.1894 14.7971C11.428 14.7971 11.657 14.7023 11.8257 14.5335L15.6197 10.7395Z",
    "APPRAISALS": "M20.3662 1.11216C20.6592 0.8193 21.134 0.819349 21.4269 1.11227C21.7198 1.4052 21.7197 1.88007 21.4268 2.17293L17.0308 6.56803C16.7379 6.8609 16.263 6.86085 15.9701 6.56792C15.6773 6.275 15.6773 5.80013 15.9702 5.50726L20.3662 1.11216ZM16.6592 2.696C16.952 2.40308 16.952 1.9282 16.659 1.63534C16.3661 1.34248 15.8913 1.34253 15.5984 1.63545L14.0987 3.13545C13.8058 3.42837 13.8059 3.90325 14.0988 4.19611C14.3917 4.48897 14.8666 4.48892 15.1595 4.196L16.6592 2.696ZM11.8343 3.45488C11.7079 3.19888 11.4472 3.0368 11.1617 3.0368C10.8762 3.0368 10.6155 3.19888 10.4892 3.45488L8.06431 8.36817L2.64217 9.15605C2.35966 9.19711 2.12495 9.39499 2.03673 9.6665C1.94851 9.93801 2.02208 10.2361 2.22651 10.4353L6.15001 14.2598L5.2238 19.66C5.17554 19.9414 5.29121 20.2258 5.52216 20.3936C5.75312 20.5614 6.05932 20.5835 6.31201 20.4506L11.1617 17.901L16.0114 20.4506C16.2641 20.5835 16.5703 20.5614 16.8013 20.3936C17.0322 20.2258 17.1479 19.9414 17.0996 19.66L16.1734 14.2598L20.0969 10.4353C20.3014 10.2361 20.3749 9.93801 20.2867 9.6665C20.1985 9.39499 19.9638 9.19711 19.6813 9.15605L14.2591 8.36817L11.8343 3.45488ZM9.23491 9.3856L11.1617 5.48147L13.0885 9.3856C13.1978 9.60696 13.4089 9.76039 13.6532 9.79588L17.9617 10.4219L14.8441 13.4609C14.6673 13.6332 14.5866 13.8814 14.6284 14.1247L15.3643 18.4158L11.5107 16.3898C11.2922 16.275 11.0312 16.275 10.8127 16.3898L6.9591 18.4158L7.69508 14.1247C7.7368 13.8814 7.65614 13.6332 7.47938 13.4609L4.36174 10.4219L8.67021 9.79588C8.91449 9.76039 9.12567 9.60696 9.23491 9.3856ZM21.6514 5.12825C21.9443 5.42111 21.9444 5.89598 21.6515 6.18891L20.1518 7.68891C19.8589 7.98183 19.3841 7.98188 19.0912 7.68901C18.7982 7.39615 18.7982 6.92128 19.091 6.62836L20.5907 5.12836C20.8836 4.83543 21.3585 4.83538 21.6514 5.12825Z",
    "activity": "M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
};
  var iconViewBoxes = {"trends": "0 0 13 12", "deepdive": "0 0 20 20", "workload": "0 0 24 24", "INSURANCE": "0 0 24 24", "APPRAISALS": "0 0 24 24", "activity": "0 0 20 20"};
  function configuredPages() {
    var pages = w.CREDIT_CONFIG?.pageIds || w.CREDIT_PAGE_IDS || {}, result = new Map();
    Object.keys(iconPaths).forEach(function (key) {
      var id = String(pages[key] || '');
      // The Portfolio identity wins when the legacy Trends route shares its ID.
      if (/^[1-9]\d*$/.test(id) && !result.has(id)) result.set(id, key);
    });
    return result;
  }
  function pageId(a) {
    try {
      var url = new URL(a.getAttribute('href'), w.location.href);
      if (url.origin !== w.location.origin || url.hash) return null;
      if (/\/pages\/viewpage\.action$/.test(url.pathname)) {
        var id = url.searchParams.get('pageId') || '';
        return /^[1-9]\d*$/.test(id) ? id : null;
      }
      var pathId = (url.pathname.match(/\/spaces\/[^/]+\/pages\/([1-9]\d*)(?:\/|$)/) || [])[1];
      if (pathId) return pathId;
      if (url.pathname.includes('/display/')) return (a.closest('.plugin_pagetree_children_span')?.id.match(/^childrenspan([1-9]\d*)-/) || [])[1] || null;
    } catch (_) {}
    return null;
  }
  function active() {
    if (!w.location) return false;
    if (d.querySelector('#editpageform,#content-editor,body.contenteditor') || /\/(?:admin|spaces\/edit|pages\/(?:edit|create)|login)/.test(w.location.pathname) || /[?&](?:pageVersion=|preview=)/.test(w.location.search)) return false;
    var configured = String(w.CREDIT_NAV_CONFIG?.spaceKey || w.CREDIT_CONFIG?.spaceKey || 'wcs').toLowerCase();
    var meta = d.querySelector('meta[name="ajs-space-key"]')?.content || d.querySelector('meta[name="confluence-space-key"]')?.content;
    var route = (w.location.pathname.match(/\/(?:display|spaces)\/([^/]+)/) || [])[1];
    var space = String(meta || route || '').toLowerCase();
    if (space && space !== configured) return false;
    return !!d.getElementById('credit-hub') || !!(w.CREDIT_NAV_CONFIG?.spaceKey && space === configured);
  }
  // Only add presentation classes to existing native nodes. Track ownership so
  // rerenders, retargeted links and editor transitions can restore them exactly.
  var sidebarToggle = '.acs-side-bar-toggle,.ia-toggle-button,.expand-collapse-trigger,[aria-label="Expand sidebar"],[aria-label="Collapse sidebar"],[title="Expand sidebar"],[title="Collapse sidebar"]';
  var sidebarFooter = '.acs-side-bar-footer,.acs-side-bar-bottom';
  var spaceToolsTrigger = '[aria-controls="space-tools-menu"],[aria-owns="space-tools-menu"],#space-tools-menu-trigger';
  var nativeMenu = 'aui-dropdown-menu,.aui-dropdown2,.aui-layer,[role="menu"],[role="listbox"],[role="dialog"]';
  function nativeControls(selector) {
    return Array.from(host.querySelectorAll(selector)).filter(function (el) {
      return !el.closest(nativeMenu + ',[data-credit-sidebar-owned]');
    });
  }
  function isSpaceTools(control) {
    if (control.matches(sidebarToggle) || control.closest(nativeMenu)) return false;
    var name = (control.getAttribute('aria-label') || control.getAttribute('title') || control.textContent).trim().replace(/\s+/g, ' ');
    return control.matches(spaceToolsTrigger) || /^space tools$/i.test(name);
  }
  function restoreToggle(control, record) {
    record.icon.remove();
    if (control.getAttribute('aria-label') === record.generatedLabel) restoreAttribute(control, 'aria-label', record.ariaLabel);
    toggles.delete(control);
  }
  function enhanceToggles() {
    toggles.forEach(function (record, control) {
      if (!host.contains(control) || !control.matches(sidebarToggle) || control.closest(nativeMenu)) restoreToggle(control, record);
    });
    nativeControls(sidebarToggle).forEach(function (control) {
      var record = toggles.get(control);
      if (!record) {
        var icon = d.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('width', '20'); icon.setAttribute('height', '20');
        icon.setAttribute('aria-hidden', 'true'); icon.setAttribute('focusable', 'false'); icon.setAttribute('class', 'credit-native-toggle-icon');
        var path = d.createElementNS(icon.namespaceURI, 'path'); path.setAttribute('d', 'M14.25 5.25 7.5 12l6.75 6.75'); icon.append(path);
        record = {icon: icon, ariaLabel: control.getAttribute('aria-label'), generatedLabel: null}; toggles.set(control, record);
      }
      // Native handlers sometimes replace inner text when state changes. Restore
      // only our glyph; keep the original control, listeners and hit target.
      if (record.icon.parentElement !== control) control.append(record.icon);
    });
  }
  function removeTopToggle() {
    topToggleSlot?.remove(); topToggle = null; topToggleSlot = null; topToggleTarget = null;
  }
  function enhanceTopToggle() {
    var controls = nativeControls(sidebarToggle);
    var target = controls.find(function (el) { return el.matches('.expand-collapse-trigger'); }) || controls[0];
    if (!target) { removeTopToggle(); return; }
    topToggleTarget = target;
    if (!topToggle) {
      topToggleSlot = d.createElement('div'); topToggleSlot.className = 'credit-native-toggle-slot';
      topToggleSlot.setAttribute('data-credit-sidebar-owned', 'true');
      topToggle = d.createElement('button'); topToggle.type = 'button'; topToggle.className = 'credit-native-top-toggle';
      var icon = toggles.get(target).icon.cloneNode(true);
      var label = d.createElement('span'); label.className = 'credit-native-top-toggle-label';
      topToggle.append(icon, label); topToggleSlot.append(topToggle);
      topToggle.addEventListener('click', function () {
        // Keep Confluence's native handler, persisted preference and layout work.
        // The original control remains mounted in its now-hidden footer.
        if (topToggleTarget?.isConnected && host?.contains(topToggleTarget)) {
          topToggleTarget.click(); schedule();
        }
      });
    }
    var rail = host.matches('.acs-side-bar') ? host : host.querySelector('.acs-side-bar') || host;
    if (topToggleSlot.parentElement !== rail || rail.firstElementChild !== topToggleSlot) rail.prepend(topToggleSlot);
  }
  function findFooters() {
    nativeFooters = new Set(Array.from(host.querySelectorAll(sidebarFooter)).filter(function (el) { return !el.closest(nativeMenu); }));
    var controls = nativeControls(sidebarToggle + ',' + spaceToolsTrigger);
    var toggle = controls.find(function (el) { return el.matches(sidebarToggle); });
    var tools = controls.find(function (el) { return el.matches(spaceToolsTrigger); });
    var common = tools?.parentElement;
    while (common && common !== host && toggle && !common.contains(toggle)) common = common.parentElement;
    controls.forEach(function (control) {
      var footer = control.closest(sidebarFooter) || (toggle && tools && common !== host ? common : control.parentElement);
      if (footer && footer !== host) nativeFooters.add(footer);
    });
  }
  function eligibleLink(a) {
    return !a.matches('[role=button],[aria-expanded],.plugin_pagetree_childtoggle,[data-type=toggle]') && !a.closest(sidebarFooter + ',' + nativeMenu) && !Array.from(nativeFooters).some(function (footer) { return footer.contains(a); });
  }
  function restoreClassAttribute(el) {
    if (!createdClassAttributes.has(el)) return;
    if (el.getAttribute('class') === '') el.removeAttribute('class');
    createdClassAttributes.delete(el);
  }
  function setPresentation(el, name, value) {
    if (!el || !value || el.style.getPropertyValue(name) === value) return;
    if (!presentation.has(el)) presentation.set(el, new Map());
    var properties = presentation.get(el);
    if (!properties.has(name)) properties.set(name, [el.style.getPropertyValue(name), el.style.getPropertyPriority(name)]);
    el.style.setProperty(name, value);
  }
  function registeredFont(role) {
    var found = '';
    if (d.fonts?.forEach) d.fonts.forEach(function (face) {
      var name = face.family.replace(/["']/g, '');
      if (new RegExp('^citi[ -]sans[ -]' + role + '$', 'i').test(name)) found = name;
    });
    return found;
  }
  function requestSpaceFont(name) {
    if (!name || !d.fonts?.load) return;
    ['400', '700'].forEach(function (weight) {
      var descriptor = weight + ' 16px ' + JSON.stringify(name);
      if (requestedFonts.has(descriptor)) return;
      requestedFonts.add(descriptor);
      // The space owns the @font-face URLs. Request only its existing regular
      // and bold faces, without blocking the dashboard or inventing font assets.
      d.fonts.load(descriptor).then(fontsSettled, function () {});
    });
  }
  function fontsSettled() { if (!destroyed) { fontGeneration++; schedule(); } }
  function syncChartFonts(ui, family) {
    if (!ui || !family) return;
    var key = family + ':' + fontGeneration;
    (w.Highcharts?.charts || []).forEach(function (chart) {
      if (!chart?.renderTo || !ui.contains(chart.renderTo) || chartFonts.get(chart) === key) return;
      chartFonts.set(chart, key);
      // A font arriving after the first SVG layout changes text measurements.
      // Re-layout only dashboard charts through Highcharts' public update API.
      if (typeof chart.update === 'function') chart.update({chart: {style: {fontFamily: family}}}, true, false, false);
    });
  }
  function syncPresentation() {
    var ui = d.getElementById('credit-ui');
    // Confluence can override even body typography. Prefer the Citi faces
    // already registered by the space and keep the body stack as its fallback.
    var bodyFamily = w.getComputedStyle(d.body).fontFamily;
    var textName = registeredFont('text'), displayName = registeredFont('display');
    var family = textName ? JSON.stringify(textName) + ', ' + bodyFamily : bodyFamily;
    setPresentation(host, '--credit-resolved-space-font', family);
    setPresentation(ui, '--credit-resolved-space-font', family);
    var nativeTitle = Array.from(d.querySelectorAll('h1,.font-display')).find(function (el) { return !el.closest('#credit-ui,.credit-native-navigation'); });
    var displayFamily = displayName ? JSON.stringify(displayName) + ', ' + family : nativeTitle ? w.getComputedStyle(nativeTitle).fontFamily : family;
    setPresentation(ui, '--credit-resolved-space-display-font', displayFamily);
    requestSpaceFont(textName); requestSpaceFont(displayName);
    syncChartFonts(ui, w.getComputedStyle(ui || d.body).fontFamily || family);
    // Match the main dashboard panel, with the native canvas as the fallback
    // on ordinary space pages. The entire rail/footer uses this one surface.
    var canvas = ui || d.querySelector('.ia-splitter-right,#main') || d.body;
    var background = '';
    for (var el = canvas; el; el = el.parentElement) {
      var color = w.getComputedStyle(el).backgroundColor;
      if (color && color !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(color)) { background = color; break; }
    }
    setPresentation(host, '--credit-resolved-sidebar-background', background || 'var(--ds-surface, var(--credit-theme-surface, #fff))');
  }
  function decorateTree() {
    var desired = new Map();
    function mark(el, name) { if (!el) return; if (!desired.has(el)) desired.set(el, new Set()); desired.get(el).add(name); }
    if (topToggle) mark(host, 'credit-native-has-top-toggle');
    links.forEach(function (record, a) {
      if (!eligibleLink(a)) return;
      for (var parent = a.parentElement; parent && parent !== host; parent = parent.parentElement) mark(parent, 'credit-native-compact-path');
      mark(a.closest('li'), 'credit-native-link-row');
      if (topToggle && record.key === 'lendingAnalytics') mark(a.closest('.plugin_pagetree_children_content') || a, 'credit-native-landing-label');
      // Hide only redundant native decoration, never a native interactive control.
      a.querySelectorAll('.credit-native-page-label :is(svg,img,.icon,.aui-icon,[class*="aui-iconfont-"])').forEach(function (el) {
        if (!el.closest('button,[role=button]') && !el.querySelector('a,button,[role=button]')) mark(el, 'credit-native-replaced-icon');
      });
      var content = a.closest('.plugin_pagetree_children_content'), row = content?.parentElement;
      if (!row) return;
      mark(content, 'credit-native-page-content');
      content.querySelectorAll('.icon,.aui-icon,[class*="aui-iconfont-"]').forEach(function (el) {
        if (!el.closest('a,button,[role=button]') && !el.querySelector('a,button,[role=button]')) mark(el, 'credit-native-replaced-icon');
      });
      var toggle = Array.from(row.children).find(function (el) { return el.classList.contains('plugin_pagetree_childtoggle_container'); });
      if (toggle) {
        mark(row, 'credit-native-tree-row');
        if (!toggle.querySelector('a,button,[role=button],[data-type=toggle]')) mark(toggle, 'credit-native-leaf-marker');
      }
    });
    // Confluence themes can put the configuration action beside the native
    // toggle, or use a bottom section instead of the standard footer wrapper.
    var footers = new Set(nativeFooters);
    // Native themes use different footer wrappers. Derive those paths from the
    // existing controls, stopping before any container holding the page tree.
    nativeControls(sidebarToggle + ',' + spaceToolsTrigger).forEach(function (control) {
      mark(control, 'credit-native-toolbar-control');
      if (control.matches(sidebarToggle)) mark(control, 'credit-native-sidebar-toggle');
      if (isSpaceTools(control)) mark(control, 'credit-native-space-tools');
      for (var parent = control.parentElement; parent && parent !== host && !parent.querySelector('[data-credit-native-page-link]'); parent = parent.parentElement) {
        if (parent.matches(nativeMenu)) break;
        footers.add(parent);
        mark(parent, 'credit-native-surface');
      }
    });
    nativeControls('a,button,[role="button"]').forEach(function (el) {
      if (isSpaceTools(el)) mark(el, 'credit-native-space-tools');
      var name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent).trim().replace(/\s+/g, ' ');
      if (!/^configure sidebar$/i.test(name) || el.matches(sidebarToggle)) return;
      mark(el, 'credit-native-configure');
      var parent = el.parentElement;
      if (parent !== host && parent.textContent.trim().replace(/\s+/g, ' ') === name && !parent.querySelector(sidebarToggle)) footers.add(parent);
    });
    footers.forEach(function (footer) {
      mark(footer, 'credit-native-footer');
      footer.querySelectorAll(sidebarToggle).forEach(function (toggle) {
        mark(toggle, 'credit-native-toggle-path');
        for (var parent = toggle.parentElement; parent && parent !== footer; parent = parent.parentElement) mark(parent, 'credit-native-toggle-path');
      });
    });
    decorations.forEach(function (names, el) {
      names.forEach(function (name) { if (!desired.get(el)?.has(name)) { el.classList.remove(name); names.delete(name); } });
      if (!names.size) { decorations.delete(el); restoreClassAttribute(el); }
    });
    desired.forEach(function (names, el) {
      names.forEach(function (name) {
        if (el.classList.contains(name)) return;
        if (!el.hasAttribute('class')) createdClassAttributes.add(el);
        el.classList.add(name); if (!decorations.has(el)) decorations.set(el, new Set()); decorations.get(el).add(name);
      });
    });
  }
  function restoreAttribute(element, name, value) {
    if (value === null) element.removeAttribute(name); else element.setAttribute(name, value);
  }
  function hideTooltip() {
    if (tooltipLink) restoreAttribute(tooltipLink, 'aria-describedby', previousDescription);
    tooltip?.remove(); tooltip = null; tooltipLink = null; previousDescription = null;
  }
  function restoreLink(a, record) {
    if (tooltipLink === a) hideTooltip();
    record.icon.remove();
    if (record.label.parentNode === a) record.label.replaceWith(...Array.from(record.label.childNodes));
    if (record.ariaLabel === null && a.getAttribute('aria-label') === record.generatedLabel) a.removeAttribute('aria-label');
    restoreAttribute(a, 'data-credit-native-page-link', record.pageMarker);
    restoreAttribute(a, 'data-credit-native-current', record.currentMarker);
    links.delete(a);
  }
  function enhance() {
    var pages = configuredPages();
    links.forEach(function (record, a) {
      if (!host.contains(a) || !eligibleLink(a) || pages.get(pageId(a)) !== record.key || record.icon.parentNode !== a || record.label.parentNode !== a) restoreLink(a, record);
    });
    host.querySelectorAll('a[href]').forEach(function (a) {
      if (!eligibleLink(a)) return;
      var key = pages.get(pageId(a));
      if (!key) return;
      if (!links.has(a)) {
        var icon = d.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', iconViewBoxes[key] || '0 0 24 24'); icon.setAttribute('width', '16'); icon.setAttribute('height', '16');
        icon.setAttribute('aria-hidden', 'true'); icon.setAttribute('focusable', 'false'); icon.setAttribute('class', 'credit-native-page-icon');
        icon.setAttribute('data-credit-native-page-icon', key);
        var path = d.createElementNS(icon.namespaceURI, 'path'); path.setAttribute('d', iconPaths[key]); path.setAttribute('fill-rule', 'evenodd'); path.setAttribute('clip-rule', 'evenodd'); icon.append(path);
        var label = d.createElement('span'); label.className = 'credit-native-page-label';
        var record = {key: key, icon: icon, label: label, ariaLabel: a.getAttribute('aria-label'), generatedLabel: a.textContent.trim(), pageMarker: a.getAttribute('data-credit-native-page-link'), currentMarker: a.getAttribute('data-credit-native-current')};
        while (a.firstChild) label.append(a.firstChild);
        a.append(label); a.prepend(icon); links.set(a, record);
        a.setAttribute('data-credit-native-page-link', key);
        if (record.ariaLabel === null) a.setAttribute('aria-label', record.generatedLabel);
      }
      var row = a.closest('li');
      var selected = a.matches('[aria-current="page"]') || !!a.closest('.plugin_pagetree_children_span.plugin_pagetree_current') || !!row && row.matches('.plugin_pagetree_current');
      if (a.getAttribute('data-credit-native-current') !== String(selected)) a.setAttribute('data-credit-native-current', String(selected));
    });
    enhanceToggles(); enhanceTopToggle(); decorateTree();
  }
  function showTooltip(event) {
    var a = event.target.closest?.('a[data-credit-native-page-link]');
    if (!host || host.getAttribute('data-credit-native-compact') !== 'true' || !a || !links.has(a)) return;
    if (tooltipLink === a) return;
    hideTooltip();
    tooltip = d.createElement('div'); tooltip.id = 'credit-native-sidebar-tooltip'; tooltip.className = 'credit-native-sidebar-tooltip';
    tooltip.setAttribute('role', 'tooltip'); tooltip.style.fontFamily = w.getComputedStyle(host).fontFamily; tooltip.textContent = a.getAttribute('aria-label') || a.textContent.trim(); d.body.append(tooltip);
    tooltipLink = a; previousDescription = a.getAttribute('aria-describedby');
    a.setAttribute('aria-describedby', [previousDescription, tooltip.id].filter(Boolean).join(' '));
    var box = a.getBoundingClientRect(), tip = tooltip.getBoundingClientRect();
    tooltip.style.left = Math.max(8, Math.min(box.right + 12, w.innerWidth - tip.width - 8)) + 'px';
    tooltip.style.top = Math.max(8, Math.min(box.top + (box.height - tip.height) / 2, w.innerHeight - tip.height - 8)) + 'px';
  }
  function leaveTooltip(event) { if (tooltipLink && !tooltipLink.contains(event.relatedTarget) && !tooltip?.contains(event.relatedTarget)) hideTooltip(); }
  function escapeTooltip(event) { if (event.key === 'Escape') hideTooltip(); }
  function compactState() {
    if (!host) return;
    var rail = host.matches('.acs-side-bar') ? host : host.querySelector('.acs-side-bar') || host;
    var width = rail.getBoundingClientRect().width;
    var compact = host.matches('.ia-splitter-left-collapsed,.acs-side-bar-collapsed') || !!host.closest('.ia-splitter-left-collapsed') || !!host.querySelector('.ia-splitter-left-collapsed,.acs-side-bar-collapsed') || (width > 0 && width <= 96);
    if (host.getAttribute('data-credit-native-compact') !== String(compact)) { host.setAttribute('data-credit-native-compact', String(compact)); hideTooltip(); }
    toggles.forEach(function (record, control) {
      var label = compact ? 'Expand sidebar' : 'Collapse sidebar';
      if (record.ariaLabel === null || /^(?:sidebar|expand sidebar|collapse sidebar)$/i.test(record.ariaLabel)) {
        if (control.getAttribute('aria-label') !== label) control.setAttribute('aria-label', label);
        record.generatedLabel = label;
      }
    });
    if (topToggle) {
      var label = compact ? 'Expand sidebar' : 'Collapse sidebar';
      if (topToggle.getAttribute('aria-label') !== label) {
        topToggle.setAttribute('aria-label', label); topToggle.title = label;
        topToggle.querySelector('.credit-native-top-toggle-label').textContent = label;
      }
      if (topToggle.getAttribute('aria-expanded') !== String(!compact)) topToggle.setAttribute('aria-expanded', String(!compact));
    }
  }
  function reset() {
    hideTooltip(); resizeObserver?.disconnect(); resizeObserver = null;
    removeTopToggle();
    if (host) {
      host.removeEventListener('mouseover', showTooltip); host.removeEventListener('focusin', showTooltip);
      host.removeEventListener('mouseout', leaveTooltip); host.removeEventListener('focusout', leaveTooltip);
      host.removeAttribute('data-credit-native-compact');
      if (ownsHostClass) host.classList.remove('credit-native-navigation');
    }
    links.forEach(function (record, a) { restoreLink(a, record); });
    toggles.forEach(function (record, control) { restoreToggle(control, record); });
    decorations.forEach(function (names, el) { names.forEach(function (name) { el.classList.remove(name); }); restoreClassAttribute(el); }); decorations.clear();
    if (revealOwned) { d.body.classList.add('citi-hide-sidebar'); revealOwned = false; }
    presentation.forEach(function (properties, el) {
      properties.forEach(function (original, name) { if (original[0]) el.style.setProperty(name, original[0], original[1]); else el.style.removeProperty(name); });
      if (!el.getAttribute('style')) el.removeAttribute('style');
    }); presentation.clear();
    nativeFooters.clear(); host = null; ownsHostClass = false;
  }
  function refresh() {
    if (destroyed || !d.body) return;
    if (!active()) { reset(); return; }
    var native = d.querySelector('.ia-fixed-sidebar,.acs-side-bar,#sidebar');
    if (!native) { if (host) reset(); syncPresentation(); return; }
    if (host !== native) {
      reset(); host = native; ownsHostClass = !host.classList.contains('credit-native-navigation'); host.classList.add('credit-native-navigation');
      host.addEventListener('mouseover', showTooltip); host.addEventListener('focusin', showTooltip);
      host.addEventListener('mouseout', leaveTooltip); host.addEventListener('focusout', leaveTooltip);
      if (w.ResizeObserver) { resizeObserver = new w.ResizeObserver(compactState); resizeObserver.observe(host); var rail = host.querySelector('.acs-side-bar'); if (rail) resizeObserver.observe(rail); }
    }
    if (d.body.classList.contains('citi-hide-sidebar')) { revealOwned = true; d.body.classList.remove('citi-hide-sidebar'); }
    syncPresentation(); findFooters(); enhance(); compactState();
  }
  function schedule() { if (!queued && !destroyed) { queued = true; Promise.resolve().then(function () { queued = false; refresh(); }); } }
  function start() {
    refresh(); if (observer || !d.body || destroyed) return;
    observer = new w.MutationObserver(function (changes) {
      if (changes.some(function (change) {
        if (change.type === 'attributes') {
          if (change.target.matches('meta[name="ajs-space-key"],meta[name="confluence-space-key"]')) return true;
          if (change.attributeName === 'class' && (change.oldValue || '') === (change.target.getAttribute('class') || '')) return false;
          return !!host && (host.contains(change.target) || change.target.contains(host)) || !!d.getElementById('credit-ui') && change.target.contains(d.getElementById('credit-ui'));
        }
        if (host?.contains(change.target)) return true;
        return Array.from(change.addedNodes).concat(Array.from(change.removedNodes)).some(function (node) {
          return node.nodeType === 1 && (node === host || node.contains(host) || node.matches('#credit-hub,#editpageform,#content-editor,.ia-fixed-sidebar,.acs-side-bar,#sidebar,meta[name="ajs-space-key"],meta[name="confluence-space-key"]') || node.querySelector('#credit-hub,#editpageform,#content-editor,.ia-fixed-sidebar,.acs-side-bar,#sidebar,meta[name="ajs-space-key"],meta[name="confluence-space-key"]'));
        });
      })) schedule();
    });
    observer.observe(d.documentElement, {childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['class', 'style', 'data-color-mode', 'data-theme', 'aria-current', 'aria-expanded', 'href', 'content']});
  }
  function styleLoaded(event) { if (event.target.matches?.('link[rel="stylesheet"]')) schedule(); }
  function destroy() {
    destroyed = true; observer?.disconnect(); observer = null; reset();
    systemTheme?.removeEventListener('change', schedule);
    d.fonts?.removeEventListener?.('loadingdone', fontsSettled);
    d.removeEventListener('load', styleLoaded, true); d.removeEventListener('DOMContentLoaded', start); w.removeEventListener('hashchange', schedule); w.removeEventListener('resize', schedule);
    w.removeEventListener('scroll', hideTooltip, true); d.removeEventListener('keydown', escapeTooltip);
  }
  w.CreditSidebar = {refresh: refresh, destroy: destroy, icon: function (key) {
    return iconPaths[key] ? '<svg class="la-page-icon" viewBox="' + (iconViewBoxes[key] || '0 0 24 24') + '" fill="currentColor" stroke="none" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="' + iconPaths[key] + '"/></svg>' : '';
  }};
  systemTheme?.addEventListener('change', schedule);
  d.fonts?.addEventListener?.('loadingdone', fontsSettled);
  d.addEventListener('load', styleLoaded, true); d.addEventListener('DOMContentLoaded', start); w.addEventListener('hashchange', schedule); w.addEventListener('resize', schedule);
  w.addEventListener('scroll', hideTooltip, true); d.addEventListener('keydown', escapeTooltip);
  if (d.body) start();
})(window, document);

;
/* Lending Analytics introduction. Native Confluence owns the title and sidebar. */
(function(w){'use strict';
 const areas=[
  ['portfolio','Portfolio & relationships','Understand the portfolio','Review exposure, new business and upcoming expirations. Explore the relationships behind the numbers.',[
   ['portfolio','Portfolio Overview'],['deepdive','Relationship Deep Dive']]],
  ['underwriting','Underwriting','Focus the work','See what needs attention, who owns it and where workload or aging is concentrated.',[
   ['overview','Underwriter Summary'],['workload','Underwriter Workload']]],
  ['monitoring','Credit monitoring','Follow the obligations','Explore due dates, exceptions and recorded changes across the credit-monitoring lifecycle.',[
   ['COVENANTS','Covenants'],['activity','Covenants Activity'],['CCM','CCM'],['CA','CA Expiration'],['FACILITY','Facility Maturity'],['INSURANCE','Insurances'],['APPRAISALS','Appraisals']]]
 ];
 const faqs=[
  ['Which dashboard should I start with?','Start with Portfolio Overview for exposure, new business and upcoming expirations. Use Underwriter Summary for monitoring priorities and Underwriter Workload for owner queues. Open Relationship Deep Dive or a monitoring page for a closer look.'],
  ['What changes when I drill into a chart or table?','Selecting a chart segment or table row narrows that widget. Page filters apply to the supported measures across the page. Use the breadcrumb or Back to return; Reset clears page filters and local selections.'],
  ['How current is the information?','Results reflect the reporting dates supplied by each source. An open dashboard keeps its loaded snapshot; reload the page to check for newly published data. Comparisons appear only when suitable historical records are available.'],
  ['How do I view and download supporting records?','Select Data or expand a chart to inspect its supporting table. Choose the relevant dataset and use search or column filters to narrow the records. Download data exports all matching rows from the selected dataset across every table page.']
 ];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function destination(key,c){if(c.mode==='demo')return './'+key.toLowerCase()+'.html';const id=String(c.pageIds?.[key]||'');return /^[1-9]\d*$/.test(id)?(c.contextPath||'/confluence').replace(/\/$/,'')+'/pages/viewpage.action?pageId='+id:null;}
 function picture(assets,name,alt,width,height,hero=false){return '<picture><source type="image/webp" srcset="'+esc(assets+name+'.webp')+'"><img src="'+esc(assets+name+'.jpg')+'" alt="'+esc(alt)+'" width="'+width+'" height="'+height+'" loading="'+(hero?'eager':'lazy')+'" decoding="async" fetchpriority="'+(hero?'high':'low')+'"></picture>'; }
 const arrow='<svg class="la-link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';
 function link([key,title],c){const href=destination(key,c);return '<li>'+(href?'<a class="la-page-link" href="'+esc(href)+'"><span>'+esc(title)+'</span>'+arrow+'</a>':'<span class="la-page-label">'+esc(title)+'</span>')+'</li>';}
 function faqSection(){return '<section class="la-faq" aria-labelledby="la-faq-title"><h2 id="la-faq-title">Frequently asked questions</h2><div class="la-faq-list">'+faqs.map(([question,answer],i)=>'<div class="la-faq-item"><h3><button type="button" id="la-faq-question-'+i+'" aria-expanded="false" aria-controls="la-faq-answer-'+i+'"><span>'+esc(question)+'</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M5 12h14"/><path class="la-faq-vertical" d="M12 5v14"/></svg></button></h3><div class="la-faq-answer" id="la-faq-answer-'+i+'" role="region" aria-labelledby="la-faq-question-'+i+'" aria-hidden="true" inert><div><p>'+esc(answer)+'</p></div></div></div>').join('')+'</div></section>';}
 w.CreditHub={async mount(root){const config=w.CREDIT_CONFIG||{},loading=w.CreditLoadingOverlay?.create({target:root});
  try{loading?.show('Loading Lending Analytics…');await loading?.paint?.();
   const assets=(config.baseUrl||'../attachments/').replace(/\/?$/,'/'),heading=config.mode==='demo'?'h1':'h2';
   root.innerHTML='<main class="la-landing">'+
    '<div class="la-intro"><'+heading+' class="font-display">From portfolio insight<br>to the next action.</'+heading+'><p>A connected view of lending exposure, underwriting priorities and credit monitoring. Start with the bigger picture, explore what needs attention and follow each result to its supporting records.</p></div>'+
    '<figure class="la-hero">'+picture(assets,'lending-analytics-hero','Abstract data streams connecting a city skyline',1916,1080,true)+'</figure>'+
    '<section class="la-purpose" aria-labelledby="la-purpose-title"><h2 id="la-purpose-title">One place to understand<br>the lending picture.</h2><div><p>Lending Analytics brings facility, covenant and CCM information together for portfolio oversight and day-to-day credit work. It connects financial exposure with the obligations and people responsible for monitoring it.</p><p>Use the sidebar to move between views. Each page answers a specific question; the records behind a result retain their own source, reporting date and business context.</p></div></section>'+
    '<section class="la-areas" aria-label="Explore Lending Analytics">'+areas.map(([key,category,title,description,links])=>'<article class="la-area" aria-labelledby="la-area-'+key+'"><figure class="la-area-media">'+picture(assets,'lending-'+key,'',640,480)+'</figure><div class="la-area-copy"><p class="la-category">'+esc(category)+'</p><h2 id="la-area-'+key+'">'+esc(title)+'</h2><p class="la-area-description">'+esc(description)+'</p><ul class="la-links" aria-label="'+esc(category)+' dashboards">'+links.map(item=>link(item,config)).join('')+'</ul></div></article>').join('')+'</section>'+
    '<section class="la-journey" aria-labelledby="la-journey-title"><div><p class="la-eyebrow">From summary to detail</p><h2 id="la-journey-title">Explore without losing<br>your place.</h2></div><ol><li><strong>Set your scope</strong><span>Choose the available region, product or owner filters. Applied filters remain visible on the page.</span></li><li><strong>Follow a result</strong><span>Select a chart segment or table row to explore its detail. Use the breadcrumb to step back through your selection.</span></li><li><strong>See the supporting records</strong><span>Expand a chart for a focused analysis, then inspect its detailed table. Close returns you to the dashboard.</span></li></ol></section>'+faqSection()+'</main>';
   root.querySelectorAll('.la-hero img,.la-area-media img').forEach(img=>img.addEventListener('error',()=>{const source=img.closest('picture')?.querySelector('source');if(source){source.remove();return;}img.closest('figure').hidden=true;}));
   root.querySelectorAll('.la-faq-item button').forEach(button=>button.addEventListener('click',()=>{
    const expanded=button.getAttribute('aria-expanded')!=='true',answer=root.querySelector('#'+button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded',String(expanded));answer.setAttribute('aria-hidden',String(!expanded));answer.inert=!expanded;
   }));
   w.CreditUI?.enhance(root);w.CreditSidebar?.refresh();await loading?.paint?.();
  }catch(e){root.innerHTML='<div class="ch-error" role="alert"><h2>Lending Analytics could not load</h2><p>'+esc(e.message)+'</p><button class="ch-btn" data-landing-retry>Retry</button></div>';root.querySelector('[data-landing-retry]').onclick=()=>w.CreditHub.mount(root);
  }finally{loading?.destroy();}
 }};
})(window);

window.CREDIT_PAGE_BUILD="3cf2603f3453:lendingAnalytics";
})();
