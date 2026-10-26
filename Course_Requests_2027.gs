/**
 * Connect@CTLI Workflows 2027: Shell Activation Requests for PLOs (Professional Learning Opportunities)
 * A PLO can be a course, a webinar or another event on Connect@CTLI.
 * The request form, the Request Tracker that TCs view, and the automatic emails, in one script.
 *
 * WHAT IT DOES
 *  - buildForm (optional): creates a ready-made Shell Activation Request 2027 form linked to this sheet.
 *  - setup: adds the LMS Admin columns and Status dropdown, the Unit Heads tab,
 *    the Request Tracker tab and the email triggers.
 *  - New request: the LMS Admin inbox gets an alert and the TC gets a receipt.
 *  - Status change: the right people get an email for that stage, and the Tracker moves on.
 *
 * SETUP: NEW FORM (recommended, about 10 minutes)
 *  1. Create a blank Google Sheet called "Shell Activation Requests 2027".
 *  2. Extensions > Apps Script. Delete what is there, paste this whole file, click Save.
 *  3. Fill in the SETTINGS below and save again.
 *  4. Choose "buildForm" in the toolbar and click Run. Allow the permissions.
 *     A message shows the new form's link.
 *  5. Choose "setup" and click Run.
 *  6. On the Unit Heads tab, type each Unit Head's name and email address.
 *
 * SETUP: KEEP YOUR CURRENT FORM
 *  Open the Google Sheet your current form sends responses to and follow steps 2, 3, 5 and 6.
 *  Before step 5, run "updateLiveForm" once: it brings the form's wording in line (PLO wording,
 *  request types, help texts) without touching the responses.
 *  Skip buildForm. The script accepts the question names listed under Q below, old or new.
 *  If setup says a question is missing, rename that form question to one of those names.
 *
 * The steps below match the Standard Operating Procedure (SOP), LMS Operations Workflow 2027.
 *
 * HOW THE LMS ADMIN USES IT
 *  On the form responses tab, fill in "Course short name", "Cohort" and "Moodle link", then pick a Status.
 *  For "Report sent", paste the report link into "Report link" first.
 *  The Request Tracker tab updates by itself. Never type on the Request Tracker tab.
 */

const SETTINGS = {
  LMS_ADMIN_EMAIL: 'connect.ctli@wced.info',                      // shared LMS Admin inbox
  ACCESS_PAGE: 'https://connect-ctli.github.io/LMS-Workflows/',   // Connect@CTLI Workflows 2027 site
  SOP_PAGE: 'https://connect-ctli.github.io/LMS-Workflows/sop.html', // Standard Operating Procedure page
  SENDER_NAME: 'Connect@CTLI LMS Admin',
  RESPONSES_SHEET: ''   // leave empty: the script finds the form responses tab by itself
};

/* The form questions. The script finds each one by any of these headings (capitals do not matter).
   The first name in each list is the one buildForm uses. */
const Q = {
  email:    ['Email address', 'Email'],                       // collected by the form
  tc:       ['Training Coordinator (TC) name', "Training Coordinator's (TCs) name", 'TC name'],
  tcEmail:  ['TC email address', "Training Coordinator's Email Address"],
  unit:     ['Delivery unit', 'Unit'],
  type:     ['Request type'],
  course:   ['PLO name', 'Course name'],                     // the PLO's full name
  existing: ['Existing PLO'],
  people:   ['Expected number of participants'],
  short:    ['Course short name'],                            // LMS Admin column: Moodle short name
  cohort:   ['Cohort'],                                       // LMS Admin column
  open:     ['Opening date'], start: ['Start date'], end: ['End date'], close: ['Closing date']
};
/* Questions that must be on the form. The rest are used when they are there. */
const REQUIRED_Q = ['email', 'tc', 'unit', 'course', 'open', 'start', 'end', 'close'];

/* Status, short label on the Tracker, workflow stage, next step, who acts next */
const STAGES = [
  ['Requested',           'Requested',   1, 'LMS Admin activates the PLO shell on Connect@CTLI and keeps it hidden', 'LMS Admin'],
  ['Activated (hidden)',  'Activated',   1, 'Quality check: PDD and the TC test the PLO together',               'PDD and TC'],
  ['QC passed',           'QC passed',   1, 'TC finishes the cohort sheet. Participants are loaded 1 to 2 weeks before opening', 'TC, then LMS Admin'],
  ['Participants loaded', 'Loaded',      2, 'TC checks the participant list on Connect@CTLI. The PLO opens on the opening date', 'TC'],
  ['PLO open',            'Open',        2, 'PLO is running. The LMS Admin closes it for reporting on the closing date',      'LMS Admin'],
  ['PLO closed',          'Closed',      3, 'LMS Admin builds the completion report',                              'LMS Admin'],
  ['Report sent',         'Report sent', 3, 'Complete. Data added to the unit dashboard and the CTLI Master Dashboard', 'Done']
];
const STATUS = STAGES.map(function (s) { return s[0]; });
/* Status names used before PLO wording. setup changes them on existing rows. */
const OLD_STATUS = { 'Course open': 'PLO open', 'Course closed': 'PLO closed' };
const ADMIN_COLS = ['Status', 'Course short name', 'Cohort', 'Moodle link', 'Report link', 'Status updated', 'Last email'];

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
  const ss = sheetOrStop_();
  if (ss.getFormUrl()) {
    return ui_('This sheet already has a form linked to it, so no new form was made. ' +
      'Use Form > Go to live form to open it. To start again, unlink and delete the old form first.');
  }
  const form = FormApp.create('Shell Activation Request 2027');
  form.setDescription(FORM_DESCRIPTION);
  try { form.setEmailCollectionType(FormApp.EmailCollectionType.VERIFIED); }
  catch (err) { form.setCollectEmail(true); }
  form.setAllowResponseEdits(false).setLimitOneResponsePerUser(false).setProgressBar(false);

  form.addSectionHeaderItem().setTitle('Requestor information');
  form.addTextItem().setTitle(Q.tc[0]).setHelpText('Name and surname of the TC responsible for this PLO').setRequired(true);
  const te = form.addTextItem().setTitle(Q.tcEmail[0])
    .setHelpText('The LMS Admin sends updates about this PLO to this address').setRequired(true);
  te.setValidation(FormApp.createTextValidation().requireTextIsEmail().setHelpText('Please type a valid email address').build());
  form.addListItem().setTitle(Q.unit[0]).setHelpText('Choose the unit that owns this PLO')
    .setChoiceValues(UNITS.map(function (u) { return u[0] + ': ' + u[1]; })).setRequired(true);

  form.addSectionHeaderItem().setTitle('Professional Learning Opportunity (PLO) details');
  form.addMultipleChoiceItem().setTitle(Q.type[0])
    .setChoiceValues(['Brand new PLO shell', 'Copy of an existing PLO shell', 'Add a cohort to an existing PLO']).setRequired(true);
  form.addTextItem().setTitle(Q.course[0])
    .setHelpText('The full PLO name as it should appear on Connect@CTLI, as listed in Annexure A').setRequired(true);
  form.addTextItem().setTitle(Q.existing[0])
    .setHelpText('Only for a copy or a new cohort: the name of the existing PLO on Connect@CTLI').setRequired(false);
  const n = form.addTextItem().setTitle(Q.people[0]).setRequired(true);
  n.setValidation(FormApp.createTextValidation().requireWholeNumber().setHelpText('Please type a number, for example 45').build());

  form.addSectionHeaderItem().setTitle('Dates')
    .setHelpText('Opening date, then start date, then end date, then closing date. ' +
      'For a once-off event such as a webinar, use the same date for start and end.');
  form.addDateItem().setTitle(Q.open[0])
    .setHelpText('The day the PLO opens on Connect@CTLI and participants can log in. This can be before the start date').setRequired(true);
  form.addDateItem().setTitle(Q.start[0]).setHelpText('The official start date, as advertised').setRequired(true);
  form.addDateItem().setTitle(Q.end[0]).setHelpText('The official end date, as advertised').setRequired(true);
  form.addDateItem().setTitle(Q.close[0])
    .setHelpText('The day the PLO closes for reporting. The completion report is only generated after this date').setRequired(true);
  form.addParagraphTextItem().setTitle('Notes for the LMS Admin')
    .setHelpText('Any other relevant information').setRequired(false);

  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();

  const url = form.getPublishedUrl();
  let short = url;
  try { short = form.shortenFormUrl(url); } catch (err) { /* keep the long link */ }
  form.setConfirmationMessage('Thank you. Your request is with the LMS Admin team and an acknowledgement receipt from the LMS Admin is on its way to your inbox. ' +
    'You can follow your PLO on the Request Tracker: ' + trackerUrl_(ss));
  PropertiesService.getDocumentProperties().setProperty('FORM_ID', form.getId());

  ui_('The form is ready.\n\nLink for TCs: ' + short +
    '\n\nNext: run "setup". Then put this link on the "request" row of the Site Links sheet.');
}


/* =====================================================================
   1b. TIDY THE LIVE FORM (run once on a form you already use)
   Fixes the wording on the form linked to this sheet without losing responses:
   PLO wording, help texts, request types, unit list without "Other",
   an "Existing PLO" question, and the thank-you message. Then run setup.
   ===================================================================== */
const FORM_DESCRIPTION =
  'You can use this form to:\n' +
  '1. Request a brand new PLO shell on Connect@CTLI. Send this request as early as possible: at least 4 weeks before your PLO must run on the LMS.\n' +
  '2. Request a copy of an existing PLO shell on Connect@CTLI. Send this request as early as possible: at least 4 weeks before your PLO must run on the LMS.\n' +
  '3. Request the addition of a cohort to an existing PLO on Connect@CTLI. Send this request as early as possible: 1 to 2 weeks before your PLO must run on the LMS.\n\n' +
  'You will get an acknowledgement receipt by email from the LMS Admin, and you can follow your PLO on the Request Tracker.\n\n' +
  'A PLO (Professional Learning Opportunity) can be a course, a webinar or another event.';

function updateLiveForm() {
  const ss = sheetOrStop_();
  const url = ss.getFormUrl();
  if (!url) return ui_('No form is linked to this sheet. Open the form, go to Responses > Link to Sheets, choose this sheet, then run updateLiveForm again.');
  const form = FormApp.openByUrl(url);
  const items = form.getItems();
  const find = function (names) {
    const n = [].concat(names).map(norm_);
    for (let i = 0; i < items.length; i++) if (n.indexOf(norm_(items[i].getTitle())) !== -1) return items[i];
    return null;
  };
  const done = [], notFound = [];

  form.setTitle('Shell Activation Request 2027').setDescription(FORM_DESCRIPTION);
  done.push('title and description');

  let it = find(Q.tc);
  if (it) { it.setTitle(Q.tc[0]).setHelpText('Name and surname of the TC responsible for this PLO'); done.push(Q.tc[0]); } else notFound.push(Q.tc[0]);

  it = find(Q.tcEmail);
  if (it) {
    const t = it.asTextItem().setTitle(Q.tcEmail[0]).setHelpText('The LMS Admin sends updates about this PLO to this address');
    t.setValidation(FormApp.createTextValidation().requireTextIsEmail().setHelpText('Please type a valid email address').build());
    done.push(Q.tcEmail[0]);
  } else notFound.push(Q.tcEmail[0]);

  it = find(Q.unit);
  if (it) {
    const choices = UNITS.map(function (u) { return u[0] + ': ' + u[1]; });
    if (it.getType() === FormApp.ItemType.LIST) it.asListItem().setChoiceValues(choices);
    else if (it.getType() === FormApp.ItemType.MULTIPLE_CHOICE) it.asMultipleChoiceItem().setChoiceValues(choices).showOtherOption(false);
    it.setTitle(Q.unit[0]).setHelpText('Choose the unit that owns this PLO');
    done.push(Q.unit[0] + ' (without "Other")');
  } else notFound.push(Q.unit[0]);

  it = find(Q.type);
  if (it && it.getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
    it.asMultipleChoiceItem().setChoiceValues(['Brand new PLO shell', 'Copy of an existing PLO shell', 'Add a cohort to an existing PLO']);
    done.push('Request type choices');
  } else notFound.push('Request type');

  const plo = find(Q.course);
  if (plo) { plo.setTitle(Q.course[0]).setHelpText('The full PLO name as it should appear on Connect@CTLI, as listed in Annexure A'); done.push(Q.course[0]); }
  else notFound.push(Q.course[0]);

  if (!find(Q.existing) && plo) {
    const ex = form.addTextItem().setTitle(Q.existing[0])
      .setHelpText('Only for a copy or a new cohort: the name of the existing PLO on Connect@CTLI').setRequired(false);
    form.moveItem(ex.getIndex(), plo.getIndex() + 1);
    done.push('new question: ' + Q.existing[0]);
  }

  it = find(['Dates']);
  if (it) { it.setHelpText('Opening date, then start date, then end date, then closing date. For a once-off event such as a webinar, use the same date for start and end.'); done.push('Dates help text'); }
  it = find(Q.open);
  if (it) it.setHelpText('The day the PLO opens on Connect@CTLI and participants can log in. This can be before the start date');
  it = find(Q.close);
  if (it) it.setHelpText('The day the PLO closes for reporting. The completion report is only generated after this date');

  form.setConfirmationMessage('Thank you. Your request is with the LMS Admin team and an acknowledgement receipt from the LMS Admin is on its way to your inbox. ' +
    'You can follow your PLO on the Request Tracker: ' + trackerUrl_(ss));
  done.push('thank-you message');

  ui_('Form updated: ' + done.join(', ') + '.' + (notFound.length ? '\nNot found, check by hand: ' + notFound.join(', ') + '.' : '') +
    '\n\nNext: run "setup" so the Tracker uses the new wording.');
}


/* =====================================================================
   2. SETUP (run once, and again whenever you want to rebuild the Tracker)
   ===================================================================== */
function setup() {
  const ss = sheetOrStop_();
  const rs = responses_();
  if (!rs) return ui_('No form responses tab found yet. Run buildForm first, or link your current form to this sheet.');

  const missing = REQUIRED_Q.filter(function (k) { return !colIdx_(rs, Q[k]); })
    .map(function (k) { return Q[k][0]; });
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
  ADMIN_COLS.forEach(function (h) { rs.getRange(1, col_(rs, h)).setBackground(C.deep); });   /* LMS Admin columns in dark navy */
  rs.setFrozenRows(1);

  /* Requests that came in before setup get "Requested" */
  const last = rs.getLastRow();
  if (last > 1) {
    const st = rs.getRange(2, col_(rs, 'Status'), last - 1, 1);
    st.setValues(st.getValues().map(function (r) { return [OLD_STATUS[r[0]] || r[0] || 'Requested']; }));
  }

  unitHeads_(ss);
  buildLists_(ss);
  buildTracker_(ss, rs);

  /* A form made by buildForm: point its thank-you message at the finished Tracker */
  const formId = PropertiesService.getDocumentProperties().getProperty('FORM_ID');
  if (formId) {
    try {
      FormApp.openById(formId).setConfirmationMessage('Thank you. Your request is with the LMS Admin team and an acknowledgement receipt from the LMS Admin is on its way to your inbox. ' +
        'You can follow your PLO on the Request Tracker: ' + trackerUrl_(ss));
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
    'New PLO shell request: ' + label_(r) + ' (' + r.unit + ')',
    'A new PLO shell request has come in.\n\n' + summary_(r) +
    '\nPlease set up the PLO shell on Connect@CTLI and keep it hidden. On the request sheet, add the Moodle link' +
    (r.short && r.cohort ? '' : !r.short && !r.cohort ? ', the Course short name and the Cohort' : !r.short ? ' and the Course short name' : ' and the Cohort') + ', then set the Status to "Activated (hidden)".');

  send_(tcTo_(r),
    'Acknowledgement of your PLO request: ' + label_(r),
    'Hi ' + r.tc + ',\n\nThank you. The LMS Admin team has received your request for the PLO below.\n\n' + summary_(r) +
    '\nYou will get another email with the link to the PLO once it has been set up.' + trackerLine_() +
    (SETTINGS.SOP_PAGE ? '\nStandard Operating Procedure: ' + SETTINGS.SOP_PAGE : ''));

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
  let to = [tcTo_(r)], subject = '', body = '';

  switch (status) {
    case 'Activated (hidden)':
      if (!r.link) return warn_(sh, row, 'Add the Moodle link before setting this status.');
      if (!r.short) return warn_(sh, row, 'Add the Course short name (Moodle short name) before setting this status.');
      if (!r.cohort) return warn_(sh, row, 'Add the Cohort before setting this status.');
      subject = 'Your PLO is set up: ' + label_(r);
      body = 'Hi ' + r.tc + ',\n\nYour PLO has been set up on Connect@CTLI. It is hidden from participants for now.\n\n' +
        'PLO link: ' + r.link + '\nMoodle short name: ' + r.short + '\nCohort: ' + r.cohort + '\n\nNext step: the quality check. PDD will arrange to test the PLO with you. ' +
        'The PLO stays hidden until the quality check is confirmed.\n\n' + summary_(r);
      break;
    case 'QC passed':
      to.push(SETTINGS.LMS_ADMIN_EMAIL);
      subject = 'Quality check passed: ' + label_(r);
      body = 'Hi ' + r.tc + ',\n\nThe quality check for this PLO is confirmed.\n\n' +
        'Next step: please make sure all participants are on your unit cohort sheet. ' +
        'Participants are uploaded 1 to 2 weeks before the opening date (' + r.open + ').\n\n' + summary_(r);
      break;
    case 'Participants loaded':
      subject = 'Participants loaded: ' + label_(r);
      body = 'Hi ' + r.tc + ',\n\nThe participants from your cohort sheet are now loaded on the PLO.\n\n' +
        'Please check the participant list here: ' + r.link + '\n\n' +
        'Additions and corrections can still be made. If your unit intern makes changes on Moodle, please let the LMS Admin know.\n\n' +
        'The PLO will open on ' + r.open + '.';
      break;
    case 'PLO open':
    case 'Course open':
      subject = 'Your PLO is open: ' + label_(r);
      body = 'Hi ' + r.tc + ',\n\nYour PLO is now open to participants.\n\nPLO link: ' + r.link +
        '\n\nOfficial dates: ' + r.start + ' to ' + r.end + '.\nThe PLO closes for reporting on ' + r.close + '.';
      break;
    case 'PLO closed':
    case 'Course closed':
      subject = 'PLO closed: ' + label_(r);
      body = 'Hi ' + r.tc + ',\n\nYour PLO is now closed for reporting. The LMS Admin will now generate the completion report and send it to you and your Unit Head.';
      break;
    case 'Report sent': {
      if (!r.report) return warn_(sh, row, 'Add the Report link before setting this status.');
      const head = unitHead_(r.unit);
      if (head) to.push(head);
      subject = 'Completion report: ' + label_(r);
      body = 'Good day,\n\nThe completion report for ' + r.course + ' (' + label_(r) + ', ' + r.cohort + ') is ready.\n\n' +
        'Report: ' + r.report + '\n\n' +
        'The completion data is being added to the CTLI Master Dashboard and will flow through to the ' + r.unit + ' dashboard.';
      break;
    }
    default:
      return;
  }
  body += trackerLine_();
  if (SETTINGS.ACCESS_PAGE) body += '\nConnect@CTLI Workflows 2027: ' + SETTINGS.ACCESS_PAGE;
  if (SETTINGS.SOP_PAGE) body += '\nStandard Operating Procedure: ' + SETTINGS.SOP_PAGE;
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
   Tracker columns: A Ref, B Unit, C PLO name, D Short name, E Cohort, F TC,
   G Opens, H Starts, I Ends, J Closes, K Status, L Step, M to S the seven steps,
   T Next step, U Who acts next, V Days to opening, W Needs attention, X Last update, Y PLO link */
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
    'HYPERLINK(VLOOKUP(A5:A,{' + key + ',' + rng(cols.link) + '},2,FALSE),"Open PLO")),"")))';
  f.A3 = '="Requests: "&COUNTIF(A5:A,"REQ-*")&"   In progress: "&COUNTIFS(L5:L,">=1",L5:L,"<=6")&"   Complete: "&COUNTIF(L5:L,7)' +
    '&"   Attention: "&COUNTIF(W5:W,"?*")';
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
  t.clear(); t.clearConditionalFormatRules();
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
  /* Merges stop at column D so the first four columns can stay frozen */
  t.getRange('A1:Y1').setBackground(C.navy);
  t.getRange('A1:D1').merge();
  t.getRange('E1:Y1').merge();
  t.getRange('A1').setValue('PLO SHELL REQUEST TRACKER 2027')
    .setFontColor('#ffffff').setFontSize(15).setFontWeight('bold');
  t.getRange('A2:Y2').setBackground(C.deep).setFontColor('#ffffff').setFontSize(10);
  t.getRange('A2:D2').merge();
  t.getRange('E2:Y2').merge();
  t.getRange('A2').setValue('✓ step done     ● where the PLO is now');
  t.getRange('E2').setValue('Where every Connect@CTLI PLO request is. This tab updates by itself. ' +
    'Find your PLO by unit, PLO name, short name or cohort.');
  t.getRange('A3:L3').setBackground(C.band);
  t.getRange('A3:D3').merge();
  t.getRange('E3:L3').merge();
  t.getRange('A3').setFormula(f.A3).setFontWeight('bold').setFontColor(C.navy);
  t.getRange('M3:O3').merge();
  t.getRange('M3').setFormula(f.M3).setBackground(C.gold).setFontColor(C.deep);
  t.getRange('P3:Q3').merge();
  t.getRange('P3').setFormula(f.P3).setBackground(C.teal).setFontColor('#ffffff');
  t.getRange('R3:S3').merge();
  t.getRange('R3').setFormula(f.R3).setBackground(C.olive).setFontColor(C.deep);
  t.getRange('T3:Y3').merge().setBackground(C.band);
  t.getRange('M3:S3').setFontWeight('bold').setFontSize(8.5).setHorizontalAlignment('center').setWrap(true);

  /* Column headings */
  const heads = ['Ref', 'Unit', 'PLO name', 'Short name', 'Cohort', 'TC',
    'Opens on Connect@CTLI', 'Official start', 'Official end', 'Closes for reporting', 'Status', 'Step']
    .concat(STAGES.map(function (s) { return s[1]; }))
    .concat(['Next step', 'Who acts next', 'Days to opening', 'Needs attention', 'Last update', 'PLO link']);
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
    return sh.getLastColumn() > 0 && colIdx_(sh, Q.course) && colIdx_(sh, Q.open) && sh.getName() !== TRACKER;
  });
  if (!found.length) return null;
  const linked = found.filter(function (sh) { return sh.getFormUrl(); });
  const pool = linked.length ? linked : found;
  return pool[pool.length - 1];
}

/* The script must live inside the Google Sheet (Extensions > Apps Script), not on its own */
function sheetOrStop_() {
  const ss = SpreadsheetApp.getActive();
  if (!ss) throw new Error('This script is not attached to a Google Sheet. Open the "Shell Activation Requests 2027" sheet, ' +
    'go to Extensions > Apps Script, and paste the script there. Then run it from that editor.');
  return ss;
}

function norm_(s) { return String(s).trim().toLowerCase(); }

/* name can be one heading or a list of accepted headings */
function colIdx_(sh, name) {
  if (sh.getLastColumn() < 1) return 0;
  const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(norm_);
  const names = [].concat(name);
  for (let k = 0; k < names.length; k++) { const i = h.indexOf(norm_(names[k])); if (i !== -1) return i + 1; }
  return 0;
}

function col_(sh, name) {
  const i = colIdx_(sh, name);
  if (!i) throw new Error('Column "' + [].concat(name)[0] + '" not found. Run setup, and check the form question wording.');
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
  const get = function (n) {
    const names = [].concat(n);
    for (let k = 0; k < names.length; k++) { const i = h.indexOf(norm_(names[k])); if (i !== -1) return v[i]; }
    return '';
  };
  const d = function (x) { return x instanceof Date ? Utilities.formatDate(x, 'Africa/Johannesburg', 'd MMMM yyyy') : String(x || ''); };
  const unitRaw = String(get(Q.unit) || '');
  return {
    email: String(get(Q.email) || '').trim(), tcEmail: String(get(Q.tcEmail) || '').trim(),
    tc: get(Q.tc) || 'colleague', unit: unitRaw.split(':')[0].trim(),
    type: String(get(Q.type) || ''), existing: String(get(Q.existing) || '').trim(), people: String(get(Q.people) || ''),
    course: get(Q.course), short: String(get(Q.short) || '').trim(), cohort: String(get(Q.cohort) || '').trim(),
    open: d(get(Q.open)), start: d(get(Q.start)), end: d(get(Q.end)), close: d(get(Q.close)),
    link: get('Moodle link'), report: get('Report link')
  };
}

/* The short name once the LMS Admin has added it, otherwise the PLO name */
function label_(r) { return r.short || r.course; }

function summary_(r) {
  return 'Unit: ' + r.unit + '\nRequest type: ' + (r.type || 'not given') + '\nPLO: ' + r.course +
    (r.existing ? '\nExisting PLO: ' + r.existing : '') + (r.people ? '\nExpected participants: ' + r.people : '') + '\nShort name: ' + (r.short || 'to be added by the LMS Admin') + '\nCohort: ' + (r.cohort || 'to be added by the LMS Admin') +
    '\nOpening date: ' + r.open + '\nStart date: ' + r.start + '\nEnd date: ' + r.end +
    '\nClosing date (for reporting): ' + r.close + '\n';
}

/* Updates go to the TC email given on the form, and to the person who sent the request if that is someone else */
function tcTo_(r) {
  const list = [r.tcEmail, r.email].filter(function (x, i, a) { return x && a.map(norm_).indexOf(norm_(x)) === i; });
  return list.join(',');
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
  return '\n\nFollow your PLO on the Request Tracker: ' + trackerUrl_(SpreadsheetApp.getActive());
}

function send_(to, subject, body) {
  if (!to) return;
  /* Replies go to the shared LMS Admin inbox, not to whoever installed the script */
  MailApp.sendEmail({ to: to, subject: subject, body: body + '\n\nKind regards\nConnect@CTLI LMS Admin\n' + SETTINGS.LMS_ADMIN_EMAIL,
    name: SETTINGS.SENDER_NAME, replyTo: SETTINGS.LMS_ADMIN_EMAIL });
}

function stamp_(sh, row, what) {
  sh.getRange(row, col_(sh, 'Last email')).setValue(what + ', ' +
    Utilities.formatDate(new Date(), 'Africa/Johannesburg', 'd MMM yyyy HH:mm'));
}

function warn_(sh, row, msg) {
  sh.getRange(row, col_(sh, 'Last email')).setValue('Not sent: ' + msg);
}

/* Results show in the Execution log in the editor, and as a short note on the sheet. No pop-up to wait on. */
function ui_(msg) {
  Logger.log(msg);
  try { SpreadsheetApp.getActive().toast(msg.split('\n')[0] + ' The full details are in the Execution log.', 'Shell Requests 2027', 15); }
  catch (err) { /* no sheet open: the log is enough */ }
}
