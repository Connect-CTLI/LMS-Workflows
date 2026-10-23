/**
 * Connect@CTLI Workflows 2027: Course Activation Requests
 * The request form, the Request Tracker that TCs view, and the automatic emails, in one script.
 *
 * WHAT IT DOES
 *  - buildForm (optional): creates a ready-made Course Activation Request form linked to this sheet.
 *  - setup: adds the LMS Admin columns and Status dropdown, the Unit Heads tab,
 *    the Request Tracker tab and the email triggers.
 *  - New request: the LMS Admin inbox gets an alert and the TC gets a receipt.
 *  - Status change: the right people get an email for that stage, and the Tracker moves on.
 *
 * SETUP: NEW FORM (recommended, about 10 minutes)
 *  1. Create a blank Google Sheet called "Course Activation Requests 2027".
 *  2. Extensions > Apps Script. Delete what is there, paste this whole file, click Save.
 *  3. Fill in the SETTINGS below and save again.
 *  4. Choose "buildForm" in the toolbar and click Run. Allow the permissions.
 *     A message shows the new form's link.
 *  5. Choose "setup" and click Run.
 *  6. On the Unit Heads tab, type each Unit Head's name and email address.
 *
 * SETUP: KEEP YOUR CURRENT FORM
 *  Open the Google Sheet your current form sends responses to and follow steps 2, 3, 5 and 6.
 *  Skip buildForm. If setup says a heading is missing, rename that form question to match.
 *
 * HOW THE LMS ADMIN USES IT
 *  On the form responses tab, paste the Moodle course link into "Moodle link", then pick a Status.
 *  For "Report sent", paste the report link into "Report link" first.
 *  The Request Tracker tab updates by itself. Never type on the Request Tracker tab.
 */

const SETTINGS = {
  LMS_ADMIN_EMAIL: 'lmsadmin@example.org',                        // shared LMS Admin inbox
  ACCESS_PAGE: 'https://connect-ctli.github.io/LMS-Workflows/',   // Connect@CTLI Workflows 2027 site
  SENDER_NAME: 'Connect@CTLI LMS Admin',
  RESPONSES_SHEET: ''   // leave empty: the script finds the form responses tab by itself
};

/* The form questions. The script finds each one by this heading. */
const Q = {
  email: 'Email address', tc: 'TC name', unit: 'Unit', course: 'Course name',
  short: 'Course short name', cohort: 'Cohort',
  open: 'Opening date', start: 'Start date', end: 'End date', close: 'Closing date'
};

/* Status, short label on the Tracker, workflow stage, next step, who acts next */
const STAGES = [
  ['Requested',           'Requested',   1, 'LMS Admin activates the course on Connect@CTLI and keeps it hidden', 'LMS Admin'],
  ['Activated (hidden)',  'Activated',   1, 'Quality check: PDD and the TC test the course together',               'PDD and TC'],
  ['QC passed',           'QC passed',   1, 'TC finishes the cohort sheet. Participants are loaded 1 to 2 weeks before opening', 'TC, then LMS Admin'],
  ['Participants loaded', 'Loaded',      2, 'TC checks the participant list on Connect@CTLI. The course opens on the opening date', 'TC'],
  ['Course open',         'Open',        2, 'Course is running. The LMS Admin closes it for reporting on the closing date',      'LMS Admin'],
  ['Course closed',       'Closed',      3, 'LMS Admin builds the completion report',                              'LMS Admin'],
  ['Report sent',         'Report sent', 3, 'Complete. Data added to the unit dashboard and the CTLI Master Dashboard', 'Done']
];
const STATUS = STAGES.map(function (s) { return s[0]; });
const ADMIN_COLS = ['Status', 'Moodle link', 'Report link', 'Status updated', 'Last email'];

const UNITS = [
  ['LA_SMLDP', 'School Management and Leadership Development Programme'],
  ['LA_SMLDC', 'School Management and Leadership Development Courses'],
  ['FP', 'Foundation Phase'], ['IP', 'Intermediate Phase'], ['SP', 'Senior Phase'],
  ['IE', 'Inclusive Education'], ['NTI', 'Novice Teacher Induction'],
  ['FET', 'Further Education and Training'], ['EDULIS', 'Library and information services'],
  ['PD', 'Professional Development']
];

const TRACKER = 'Request Tracker';
const LISTS = 'Tracker Lists';
const FONT = 'Century Gothic';
const C = { navy: '#001489', deep: '#000b4d', gold: '#FFC600', teal: '#00A1A3', olive: '#8FAD15',
  goldL: '#FFF3C4', tealL: '#D9F2F2', oliveL: '#EAF1D2', doneL: '#DCEFD9', line: '#E2E7EE',
  soft: '#5A6A80', faint: '#8A97A8', bad: '#B3261E', badL: '#FDECEA', band: '#F4F6F9' };


/* =====================================================================
   1. BUILD THE FORM (optional)
   ===================================================================== */
function buildForm() {
  const ss = SpreadsheetApp.getActive();
  const form = FormApp.create('Course Activation Request 2027');
  form.setDescription(
    'Use this form to ask the LMS Admin team (PDD) to activate a course on Connect@CTLI for a new cohort.\n\n' +
    'Please send your request at least 4 weeks before the opening date. That leaves time to activate the course, ' +
    'do the quality check with you, and load your participants 1 to 2 weeks before it opens.\n\n' +
    'You will get a receipt by email, and you can follow your course on the Request Tracker.');
  try { form.setEmailCollectionType(FormApp.EmailCollectionType.VERIFIED); }
  catch (err) { form.setCollectEmail(true); }
  form.setAllowResponseEdits(false).setLimitOneResponsePerUser(false).setProgressBar(false);

  form.addSectionHeaderItem().setTitle('About you');
  form.addTextItem().setTitle(Q.tc).setHelpText('Your name and surname').setRequired(true);
  form.addListItem().setTitle(Q.unit).setHelpText('Choose the unit that owns this course')
    .setChoiceValues(UNITS.map(function (u) { return u[0] + ': ' + u[1]; })).setRequired(true);

  form.addSectionHeaderItem().setTitle('The course');
  form.addMultipleChoiceItem().setTitle('Request type')
    .setChoiceValues(['New course', 'Existing course, new cohort', 'Copy of an existing course']).setRequired(true);
  form.addTextItem().setTitle(Q.course).setHelpText('The full course name as it should appear on Connect@CTLI').setRequired(true);
  form.addTextItem().setTitle(Q.short)
    .setHelpText('The Moodle short name. It must match Connect@CTLI exactly, for example LA_StratMan').setRequired(true);
  form.addTextItem().setTitle(Q.cohort).setHelpText('Your cohort code, for example FP_C1_27').setRequired(true);
  const n = form.addTextItem().setTitle('Expected number of participants').setRequired(true);
  n.setValidation(FormApp.createTextValidation().requireWholeNumber().setHelpText('Please type a number, for example 45').build());

  form.addSectionHeaderItem().setTitle('Dates')
    .setHelpText('Opening date, then start date, then end date, then closing date.');
  form.addDateItem().setTitle(Q.open)
    .setHelpText('The day the course opens on Connect@CTLI and participants can log in. This can be before the start date').setRequired(true);
  form.addDateItem().setTitle(Q.start).setHelpText('The official start date, as advertised').setRequired(true);
  form.addDateItem().setTitle(Q.end).setHelpText('The official end date, as advertised').setRequired(true);
  form.addDateItem().setTitle(Q.close)
    .setHelpText('The day the course closes for reporting. The completion report is only generated after this date').setRequired(true);
  form.addParagraphTextItem().setTitle('Notes for the LMS Admin')
    .setHelpText('Anything else we should know, for example which course to copy from').setRequired(false);

  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();

  const url = form.getPublishedUrl();
  let short = url;
  try { short = form.shortenFormUrl(url); } catch (err) { /* keep the long link */ }
  form.setConfirmationMessage('Thank you. Your request is with the LMS Admin team and a receipt is on its way to your inbox. ' +
    'You can follow your course on the Request Tracker: ' + trackerUrl_(ss));
  PropertiesService.getDocumentProperties().setProperty('FORM_ID', form.getId());

  ui_('The form is ready.\n\nLink for TCs: ' + short +
    '\n\nNext: run "setup". Then put this link on the "request" row of the Site Links sheet.');
}


/* =====================================================================
   2. SETUP (run once, and again whenever you want to rebuild the Tracker)
   ===================================================================== */
function setup() {
  const ss = SpreadsheetApp.getActive();
  const rs = responses_();
  if (!rs) return ui_('No form responses tab found yet. Run buildForm first, or link your current form to this sheet.');

  const missing = Object.keys(Q).filter(function (k) { return !colIdx_(rs, Q[k]); }).map(function (k) { return Q[k]; });
  if (missing.length) {
    return ui_('These form questions are missing or worded differently:\n\n' + missing.join('\n') +
      '\n\nRename them in the form so they match exactly, then run setup again.');
  }

  ADMIN_COLS.forEach(function (h) {
    if (!colIdx_(rs, h)) rs.getRange(1, rs.getLastColumn() + 1).setValue(h);
  });

  const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUS, true).setAllowInvalid(false).build();
  rs.getRange(2, col_(rs, 'Status'), rs.getMaxRows() - 1, 1).setDataValidation(rule);
  rs.getRange(2, col_(rs, 'Status updated'), rs.getMaxRows() - 1, 1).setNumberFormat('d mmm yyyy HH:mm');
  rs.getRange(1, 1, 1, rs.getLastColumn()).setFontWeight('bold').setBackground(C.navy).setFontColor('#ffffff').setFontFamily(FONT);
  rs.getRange(1, col_(rs, 'Status'), 1, ADMIN_COLS.length).setBackground(C.deep);
  rs.setFrozenRows(1);

  /* Requests that came in before setup get "Requested" */
  const last = rs.getLastRow();
  if (last > 1) {
    const st = rs.getRange(2, col_(rs, 'Status'), last - 1, 1);
    st.setValues(st.getValues().map(function (r) { return [r[0] || 'Requested']; }));
  }

  unitHeads_(ss);
  buildLists_(ss);
  buildTracker_(ss, rs);

  /* A form made by buildForm: point its thank-you message at the finished Tracker */
  const formId = PropertiesService.getDocumentProperties().getProperty('FORM_ID');
  if (formId) {
    try {
      FormApp.openById(formId).setConfirmationMessage('Thank you. Your request is with the LMS Admin team and a receipt is on its way to your inbox. ' +
        'You can follow your course on the Request Tracker: ' + trackerUrl_(ss));
    } catch (err) { /* form deleted or not shared with you: nothing to update */ }
  }

  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onRequestSubmit').forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger('onStatusChange').forSpreadsheet(ss).onEdit().create();

  ui_('Setup done.\n\n1. Add the Unit Head emails on the Unit Heads tab.\n' +
    '2. Share this sheet with TCs as Viewer.\n' +
    '3. Put this Tracker link on the "tracker" row of the Site Links sheet:\n' + trackerUrl_(ss));
}


/* =====================================================================
   3. AUTOMATIC EMAILS
   ===================================================================== */
function onRequestSubmit(e) {
  const sh = e.range.getSheet();
  const rs = responses_();
  if (!rs || sh.getSheetId() !== rs.getSheetId()) return;
  const row = e.range.getRow();
  sh.getRange(row, col_(sh, 'Status')).setValue('Requested');
  sh.getRange(row, col_(sh, 'Status updated')).setValue(new Date());
  const r = read_(sh, row);

  send_(SETTINGS.LMS_ADMIN_EMAIL,
    'New course activation request: ' + r.short + ' (' + r.unit + ')',
    'A new course activation request has come in.\n\n' + summary_(r) +
    '\nPlease activate the course on Connect@CTLI, keep it hidden, add the Moodle link to the request sheet and set the Status to "Activated (hidden)".');

  send_(r.email,
    'We have received your request: ' + r.short,
    'Hi ' + r.tc + ',\n\nThank you. Your request to activate the course below has reached the LMS Admin team.\n\n' + summary_(r) +
    '\nYou will get another email with the link to the course once it has been activated.' + trackerLine_());

  stamp_(sh, row, 'Request alert and receipt');
}

function onStatusChange(e) {
  const sh = e.range.getSheet();
  const rs = responses_();
  if (!rs || sh.getSheetId() !== rs.getSheetId()) return;
  if (e.range.getColumn() !== col_(sh, 'Status') || e.range.getRow() < 2 || e.range.getNumRows() > 1) return;

  const row = e.range.getRow();
  const status = e.range.getValue();
  sh.getRange(row, col_(sh, 'Status updated')).setValue(new Date());
  const r = read_(sh, row);
  let to = [r.email], subject = '', body = '';

  switch (status) {
    case 'Activated (hidden)':
      if (!r.link) return warn_(sh, row, 'Add the Moodle link before setting this status.');
      subject = 'Your course is activated: ' + r.short;
      body = 'Hi ' + r.tc + ',\n\nYour course has been activated on Connect@CTLI. It is hidden from participants for now.\n\n' +
        'Course link: ' + r.link + '\n\nNext step: the quality check. PDD will arrange to test the course with you. ' +
        'The course stays hidden until the quality check is confirmed.\n\n' + summary_(r);
      break;
    case 'QC passed':
      to.push(SETTINGS.LMS_ADMIN_EMAIL);
      subject = 'Quality check passed: ' + r.short;
      body = 'Hi ' + r.tc + ',\n\nThe quality check for this course is confirmed.\n\n' +
        'Next step: please make sure all participants are on your unit cohort sheet. ' +
        'Participants are uploaded 1 to 2 weeks before the opening date (' + r.open + ').\n\n' + summary_(r);
      break;
    case 'Participants loaded':
      subject = 'Participants loaded: ' + r.short;
      body = 'Hi ' + r.tc + ',\n\nThe participants from your cohort sheet are now loaded on the course.\n\n' +
        'Please check the participant list here: ' + r.link + '\n\n' +
        'Additions and corrections can still be made. If your unit intern makes changes on Moodle, please let the LMS Admin know.\n\n' +
        'The course will open on ' + r.open + '.';
      break;
    case 'Course open':
      subject = 'Your course is open: ' + r.short;
      body = 'Hi ' + r.tc + ',\n\nYour course is now open to participants.\n\nCourse link: ' + r.link +
        '\n\nOfficial dates: ' + r.start + ' to ' + r.end + '.\nThe course closes for reporting on ' + r.close + '.';
      break;
    case 'Course closed':
      subject = 'Course closed: ' + r.short;
      body = 'Hi ' + r.tc + ',\n\nYour course is now closed for reporting. The LMS Admin will now generate the completion report and send it to you and your Unit Head.';
      break;
    case 'Report sent':
      if (!r.report) return warn_(sh, row, 'Add the Report link before setting this status.');
      const head = unitHead_(r.unit);
      if (head) to.push(head);
      subject = 'Completion report: ' + r.short;
      body = 'Good day,\n\nThe completion report for ' + r.course + ' (' + r.short + ', ' + r.cohort + ') is ready.\n\n' +
        'Report: ' + r.report + '\n\n' +
        'The completion data is being added to the ' + r.unit + ' dashboard and will flow through to the CTLI Master Dashboard.';
      break;
    default:
      return;
  }
  body += trackerLine_();
  if (SETTINGS.ACCESS_PAGE) body += '\nConnect@CTLI Workflows 2027: ' + SETTINGS.ACCESS_PAGE;
  send_(to.join(','), subject, body);
  stamp_(sh, row, status);
}


/* =====================================================================
   4. THE REQUEST TRACKER TAB
   ===================================================================== */
function buildLists_(ss) {
  let ls = ss.getSheetByName(LISTS);
  if (!ls) ls = ss.insertSheet(LISTS);
  ls.clear();
  ls.getRange(1, 1, 1, 4).setValues([['Status', 'Step', 'Next step', 'Who acts next']]);
  ls.getRange(2, 1, STAGES.length, 4).setValues(STAGES.map(function (s, i) { return [s[0], i + 1, s[3], s[4]]; }));
  ls.getDataRange().setFontFamily(FONT);
  ls.hideSheet();
}

/* All the Tracker formulas. Kept separate so they can be checked on their own.
   Tracker columns: A Ref, B Unit, C Course name, D Short name, E Cohort, F TC,
   G Opens, H Starts, I Ends, J Closes, K Status, L Step, M to S the seven steps,
   T Next step, U Who acts next, V Days to opening, W Needs attention, X Last update, Y Course link */
function trackerFormulas_(rsName, cols) {
  const R = "'" + rsName.replace(/'/g, "''") + "'!";
  const rng = function (c) { const L = colL_(c); return R + L + '2:' + L; };
  const key = '"REQ-"&TEXT(ROW(' + rng(1) + ')-1,"000")';
  const unit = 'IFERROR(REGEXEXTRACT(' + rng(cols.unit) + '&"","^[A-Za-z_]+"),' + rng(cols.unit) + ')';
  const status = 'IF(' + rng(cols.status) + '="","Requested",' + rng(cols.status) + ')';
  const LST = "'" + LISTS + "'!";
  const f = {};
  f.A5 = '=ARRAYFORMULA(IFERROR(SORT(FILTER({' + [key, unit, rng(cols.course), rng(cols.short), rng(cols.cohort),
    rng(cols.tc), rng(cols.open), rng(cols.start), rng(cols.end), rng(cols.close), status].join(',') +
    '},' + rng(1) + '<>""),7,TRUE),""))';
  f.L5 = '=ARRAYFORMULA(IF(A5:A="","",IFERROR(VLOOKUP(K5:K,' + LST + 'A2:B8,2,FALSE),1)))';
  f.stages = STAGES.map(function (s, i) {
    const k = i + 1;
    return '=ARRAYFORMULA(IF($A5:$A="","",IF(($L5:$L>' + k + ')+($L5:$L=7),"✓",IF($L5:$L=' + k + ',"●",""))))';
  });
  f.T5 = '=ARRAYFORMULA(IF(A5:A="","",IFERROR(VLOOKUP(K5:K,' + LST + 'A2:D8,3,FALSE),"")))';
  f.U5 = '=ARRAYFORMULA(IF(A5:A="","",IFERROR(VLOOKUP(K5:K,' + LST + 'A2:D8,4,FALSE),"")))';
  f.V5 = '=ARRAYFORMULA(IF(A5:A="","",IF((L5:L>=5)+(G5:G=""),"",G5:G-TODAY())))';
  /* Dates must run Opening, Start, End, Closing */
  const order = '((G5:G<>"")*(H5:H<>"")*(H5:H<G5:G)+(H5:H<>"")*(I5:I<>"")*(I5:I<H5:H)+(I5:I<>"")*(J5:J<>"")*(J5:J<I5:I))';
  f.W5 = '=ARRAYFORMULA(IF(A5:A="","",' +
    'IF(' + order + '>0,"Check the dates",' +
    'IF((L5:L<4)*(G5:G<>"")*(G5:G>=TODAY())*(G5:G-TODAY()<=14),"Opens within 2 weeks",' +
    'IF((L5:L<5)*(G5:G<>"")*(G5:G<TODAY()),"Opening date has passed",' +
    'IF((L5:L=5)*(J5:J<>"")*(J5:J<TODAY()),"Closing date has passed",""))))))';
  f.X5 = '=ARRAYFORMULA(IF(A5:A="","",IFERROR(VLOOKUP(A5:A,{' + key + ',' + rng(cols.updated) + '},2,FALSE),"")))';
  f.Y5 = '=ARRAYFORMULA(IF(A5:A="","",IFERROR(IF(VLOOKUP(A5:A,{' + key + ',' + rng(cols.link) + '},2,FALSE)="","",' +
    'HYPERLINK(VLOOKUP(A5:A,{' + key + ',' + rng(cols.link) + '},2,FALSE),"Open course")),"")))';
  f.A3 = '="Requests: "&COUNTIF(A5:A,"REQ-*")&"     In progress: "&COUNTIFS(L5:L,">=1",L5:L,"<=6")&"     Complete: "&COUNTIF(L5:L,7)' +
    '&"     Need attention: "&COUNTIF(W5:W,"?*")';
  f.M3 = '="STAGE 1: REQUEST AND QC  ("&COUNTIFS(L5:L,">=1",L5:L,"<=3")&")"';
  f.P3 = '="STAGE 2: LOAD AND OPEN  ("&COUNTIFS(L5:L,">=4",L5:L,"<=5")&")"';
  f.R3 = '="STAGE 3: CLOSE AND REPORT  ("&COUNTIF(L5:L,6)&")"';
  return f;
}

function buildTracker_(ss, rs) {
  const W = 25;
  let t = ss.getSheetByName(TRACKER);
  if (t) { t.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); }); }
  else t = ss.insertSheet(TRACKER);
  t.clear(); t.clearConditionalFormats();
  t.getRange(1, 1, t.getMaxRows(), t.getMaxColumns()).breakApart();
  if (t.getMaxRows() < 1000) t.insertRowsAfter(t.getMaxRows(), 1000 - t.getMaxRows());
  if (t.getMaxColumns() < W) t.insertColumnsAfter(t.getMaxColumns(), W - t.getMaxColumns());
  if (t.getMaxColumns() > W) t.deleteColumns(W + 1, t.getMaxColumns() - W);

  const cols = { unit: col_(rs, Q.unit), course: col_(rs, Q.course), short: col_(rs, Q.short), cohort: col_(rs, Q.cohort),
    tc: col_(rs, Q.tc), open: col_(rs, Q.open), start: col_(rs, Q.start), end: col_(rs, Q.end), close: col_(rs, Q.close),
    status: col_(rs, 'Status'), updated: col_(rs, 'Status updated'), link: col_(rs, 'Moodle link') };
  const f = trackerFormulas_(rs.getName(), cols);

  t.getRange(1, 1, 1000, W).setFontFamily(FONT).setFontSize(10).setVerticalAlignment('middle');

  /* Title and summary */
  t.getRange('A1:Y1').merge().setValue('COURSE ACTIVATION REQUEST TRACKER 2027')
    .setBackground(C.navy).setFontColor('#ffffff').setFontSize(15).setFontWeight('bold');
  t.getRange('A2:Y2').merge()
    .setValue('Where every Connect@CTLI course request is. This tab updates by itself. Find your course by unit, course short name or cohort. ' +
      '✓ means a step is done and ● shows where the course is now.')
    .setBackground(C.deep).setFontColor('#ffffff').setFontSize(10);
  t.getRange('A3:L3').merge().setFormula(f.A3).setFontWeight('bold').setFontColor(C.navy).setBackground(C.band);
  t.getRange('M3:O3').merge().setFormula(f.M3).setBackground(C.gold).setFontColor(C.deep);
  t.getRange('P3:Q3').merge().setFormula(f.P3).setBackground(C.teal).setFontColor('#ffffff');
  t.getRange('R3:S3').merge().setFormula(f.R3).setBackground(C.olive).setFontColor(C.deep);
  t.getRange('T3:Y3').merge().setBackground(C.band);
  t.getRange('M3:S3').setFontWeight('bold').setFontSize(8.5).setHorizontalAlignment('center').setWrap(true);

  /* Column headings */
  const heads = ['Ref', 'Unit', 'Course name', 'Short name', 'Cohort', 'TC',
    'Opens on Connect@CTLI', 'Official start', 'Official end', 'Closes for reporting', 'Status', 'Step']
    .concat(STAGES.map(function (s) { return s[1]; }))
    .concat(['Next step', 'Who acts next', 'Days to opening', 'Needs attention', 'Last update', 'Course link']);
  t.getRange(4, 1, 1, W).setValues([heads]).setBackground(C.navy).setFontColor('#ffffff').setFontWeight('bold')
    .setWrap(true).setVerticalAlignment('middle');
  t.getRange('G4:J4').setBackground(C.deep);
  t.getRange(4, 13, 1, 7).setHorizontalAlignment('center').setFontSize(9);
  t.getRange('L4').setHorizontalAlignment('center');

  /* Formulas */
  t.getRange('A5').setFormula(f.A5);
  t.getRange('L5').setFormula(f.L5);
  f.stages.forEach(function (fx, i) { t.getRange(5, 13 + i).setFormula(fx); });
  ['T5', 'U5', 'V5', 'W5', 'X5', 'Y5'].forEach(function (a) { t.getRange(a).setFormula(f[a]); });

  /* Formats */
  t.getRange('G5:J').setNumberFormat('d mmm yyyy');
  t.getRange('H5:I').setFontWeight('bold');
  t.getRange('X5:X').setNumberFormat('d mmm yyyy');
  t.getRange('L5:L').setNumberFormat('0"/7"').setHorizontalAlignment('center').setFontColor(C.soft);
  t.getRange('V5:V').setNumberFormat('0').setHorizontalAlignment('center');
  t.getRange('M5:S').setHorizontalAlignment('center').setFontSize(12);
  t.getRange('T5:T').setWrap(true).setFontColor(C.soft);
  t.getRange('A5:A').setFontColor(C.faint);
  t.getRange('B5:B').setFontWeight('bold');
  t.getRange('A4:Y').setBorder(null, null, true, null, true, true, C.line, SpreadsheetApp.BorderStyle.SOLID);
  t.getRange('M4:S').setBorder(null, true, null, true, null, null, '#C9D2DE', SpreadsheetApp.BorderStyle.SOLID);

  const widths = [70, 86, 240, 130, 110, 140, 96, 96, 96, 96, 140, 50, 74, 74, 74, 74, 74, 74, 74, 290, 120, 80, 160, 100, 100];
  widths.forEach(function (w, i) { t.setColumnWidth(i + 1, w); });
  t.setRowHeight(1, 40); t.setRowHeight(2, 30); t.setRowHeight(3, 30); t.setRowHeight(4, 42);
  t.setRowHeightsForced(5, 995, 30);
  t.setFrozenRows(4); t.setFrozenColumns(4);
  t.setHiddenGridlines(true);

  /* Colour rules (first matching rule wins) */
  const rules = [];
  const stageCells = t.getRange('M5:S1000');
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('●').setBackground(C.goldL).setFontColor(C.navy).setBold(true).setRanges([stageCells]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('✓').setBackground(C.tealL).setFontColor(C.teal).setRanges([stageCells]).build());
  const st = t.getRange('K5:K1000');
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$L5=7').setBackground(C.doneL).setFontColor('#2E6B34').setBold(true).setRanges([st]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($L5>=1,$L5<=3)').setBackground(C.goldL).setFontColor(C.deep).setRanges([st]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($L5>=4,$L5<=5)').setBackground(C.tealL).setFontColor(C.deep).setRanges([st]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$L5=6').setBackground(C.oliveL).setFontColor(C.deep).setRanges([st]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=LEN($W5)>0').setBackground(C.badL).setFontColor(C.bad).setBold(true).setRanges([t.getRange('W5:W1000')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND(ISNUMBER($V5),$V5<0)').setFontColor(C.bad).setRanges([t.getRange('V5:V1000')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$L5=7').setFontColor(C.faint).setRanges([t.getRange('A5:J1000'), t.getRange('T5:Y1000')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($A5<>"",ISEVEN(ROW()))').setBackground(C.band).setRanges([t.getRange('A5:L1000'), t.getRange('T5:Y1000')]).build());
  t.setConditionalFormatRules(rules);

  /* Only the Process Team should change this tab; TCs are viewers anyway */
  t.protect().setDescription('Request Tracker: updates by itself').setWarningOnly(true);

  ss.setActiveSheet(t);
  ss.moveActiveSheet(1);
}


/* =====================================================================
   5. HELPERS
   ===================================================================== */
function unitHeads_(ss) {
  let heads = ss.getSheetByName('Unit Heads');
  if (!heads) {
    heads = ss.insertSheet('Unit Heads');
    heads.getRange(1, 1, 1, 3).setValues([['Unit', 'Unit Head', 'Unit Head email']]);
  }
  const have = heads.getDataRange().getValues().map(function (r) { return String(r[0]).trim(); });
  UNITS.forEach(function (u) { if (have.indexOf(u[0]) === -1) heads.appendRow([u[0], '', '']); });
  heads.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground(C.navy).setFontColor('#ffffff');
  heads.getDataRange().setFontFamily(FONT);
  heads.setColumnWidths(1, 3, 220);
  heads.setFrozenRows(1);
}

function responses_() {
  const ss = SpreadsheetApp.getActive();
  if (SETTINGS.RESPONSES_SHEET) return ss.getSheetByName(SETTINGS.RESPONSES_SHEET);
  const found = ss.getSheets().filter(function (sh) {
    return sh.getLastColumn() > 0 && colIdx_(sh, Q.short) && colIdx_(sh, Q.open) && sh.getName() !== TRACKER;
  });
  if (!found.length) return null;
  const linked = found.filter(function (sh) { return sh.getFormUrl(); });
  const pool = linked.length ? linked : found;
  return pool[pool.length - 1];
}

function norm_(s) { return String(s).trim().toLowerCase(); }

function colIdx_(sh, name) {
  if (sh.getLastColumn() < 1) return 0;
  const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(norm_);
  return h.indexOf(norm_(name)) + 1;
}

function col_(sh, name) {
  const i = colIdx_(sh, name);
  if (!i) throw new Error('Column "' + name + '" not found. Run setup, and check the form question wording.');
  return i;
}

function colL_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function read_(sh, row) {
  const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(norm_);
  const v = sh.getRange(row, 1, 1, h.length).getValues()[0];
  const get = function (n) { const i = h.indexOf(norm_(n)); return i === -1 ? '' : v[i]; };
  const d = function (x) { return x instanceof Date ? Utilities.formatDate(x, 'Africa/Johannesburg', 'd MMMM yyyy') : String(x || ''); };
  const unitRaw = String(get(Q.unit) || '');
  return {
    email: get(Q.email), tc: get(Q.tc) || 'colleague', unit: unitRaw.split(':')[0].trim(),
    course: get(Q.course), short: get(Q.short), cohort: get(Q.cohort),
    open: d(get(Q.open)), start: d(get(Q.start)), end: d(get(Q.end)), close: d(get(Q.close)),
    link: get('Moodle link'), report: get('Report link')
  };
}

function summary_(r) {
  return 'Unit: ' + r.unit + '\nCourse: ' + r.course + '\nShort name: ' + r.short + '\nCohort: ' + r.cohort +
    '\nOpening date: ' + r.open + '\nStart date: ' + r.start + '\nEnd date: ' + r.end +
    '\nClosing date (for reporting): ' + r.close + '\n';
}

function unitHead_(unit) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Unit Heads');
  if (!sh) return '';
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (String(rows[i][0]).trim() === unit) return rows[i][2];
  return '';
}

function trackerUrl_(ss) {
  const t = ss.getSheetByName(TRACKER);
  return ss.getUrl() + (t ? '#gid=' + t.getSheetId() : '');
}

function trackerLine_() {
  return '\n\nFollow your course on the Request Tracker: ' + trackerUrl_(SpreadsheetApp.getActive());
}

function send_(to, subject, body) {
  if (!to) return;
  MailApp.sendEmail({ to: to, subject: subject, body: body + '\n\nKind regards\nConnect@CTLI LMS Admin', name: SETTINGS.SENDER_NAME });
}

function stamp_(sh, row, what) {
  sh.getRange(row, col_(sh, 'Last email')).setValue(what + ', ' +
    Utilities.formatDate(new Date(), 'Africa/Johannesburg', 'd MMM yyyy HH:mm'));
}

function warn_(sh, row, msg) {
  sh.getRange(row, col_(sh, 'Last email')).setValue('Not sent: ' + msg);
}

function ui_(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (err) { Logger.log(msg); }
}
