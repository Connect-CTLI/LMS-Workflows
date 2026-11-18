/**
 * Connect@CTLI Workflows 2027: Shell Activation Requests for PLOs (Professional Learning Opportunities)
 * A PLO can be a course, a webinar or another event on Connect@CTLI.
 * The request form, the Request Tracker that PCs view, and the acknowledgement email, in one script.
 *
 * WHAT IT DOES
 *  - buildForm (optional): creates a ready-made Shell Activation Request 2027 form linked to this sheet.
 *  - setup: renames any old TC form questions to PC wording, adds the LMS Admin columns and
 *    Status dropdown, the Unit Heads tab, the Request Tracker tab and the email triggers.
 *  - New request: the LMS Admin inbox and every LMS Admin on the LMS Admins tab get an alert,
 *    and the PC gets ONE acknowledgement email.
 *    This is the only email the script sends to the person who made the request.
 *  - Status change: the date is stamped and the Tracker moves on. No email goes out.
 *  - Cohort sheet: each request is written straight onto the Summary tab of its unit's cohort sheet
 *    (PLO name, delivery mode, PC, dates, and the short name and cohort once the LMS Admin adds them),
 *    so nobody copies it across by hand. The "Cohort sheet" column shows which Summary row it went to.
 *  - setup also changes "Training coordinator" (TC) wording to PC on all the unit cohort sheets.
 *  - PC tracker: setup makes a separate, view-only Google Sheet with just the Request Tracker
 *    ("PLO Request Tracker 2027 (view only)"). PCs get that link. This request sheet, with the
 *    form responses and the Unit Heads tab, stays shared with the LMS Admins only.
 *    The view-only copy refreshes after every new request and edit here, and every hour.
 *    The LMS Admin sends any further emails to the PC by hand.
 *
 * UNITS (18 November 2026): External Projects added after EDULIS, with three sub-units:
 *  EXT_ELRN (eLearning), EXT_PRJB and EXT_PRJC (placeholders until the projects are named).
 *  After pasting this version in, run "updateLiveForm" (the Delivery unit list gets the new units),
 *  then "setup" (the Unit Heads tab gets a row for each new unit).
 *
 * SETUP: NEW FORM (recommended, about 10 minutes)
 *  1. Create a blank Google Sheet called "Shell Activation Requests 2027".
 *  2. Extensions > Apps Script. Delete what is there, paste this whole file, click Save.
 *  3. Fill in the SETTINGS below and save again.
 *  4. Choose "buildForm" in the toolbar and click Run. Allow the permissions.
 *     A message shows the new form's link.
 *  5. Choose "setup" and click Run. Do this while signed in as connect.ctli@wced.info, so the
 *     acknowledgement email comes from the shared inbox. (Or add connect.ctli@wced.info as a
 *     "Send mail as" address in your Gmail.)
 *  6. On the Unit Heads tab, type each Unit Head's name and email address.
 *  7. On the LMS Admins tab, add every LMS Admin who must get the new request alert.
 *
 * SETUP: KEEP YOUR CURRENT FORM
 *  Open the Google Sheet your current form sends responses to and follow steps 2, 3, 5, 6 and 7.
 *  setup renames old TC questions to PC wording by itself. To bring the rest of the form in line
 *  (PLO wording, request types, help texts, the unit list), run "updateLiveForm" once as well.
 *  Skip buildForm. The script accepts the question names listed under Q below, old or new.
 *  If setup says a question is missing, rename that form question to one of those names.
 *
 * The steps below match the Standard Operating Procedure (SOP), LMS Operations Workflow 2027.
 *
 * HOW THE LMS ADMIN USES IT
 *  On the form responses tab, fill in "Course short name", "Cohort" and "Moodle link", then pick a Status.
 *  For "Report sent", paste the report link into "Report link" as well.
 *  A NEW COHORT on an existing PLO skips "Activated (hidden)" and "QC passed": the shell is already
 *  set up and checked. Add the cohort, then go straight from "Requested" to "Participants loaded".
 *  The Tracker shows those two steps as n/a for that request.
 *  Changing the Status does not send an email. Email the PC (and the Unit Head for the report)
 *  yourself from connect.ctli@wced.info. The Unit Heads tab lists who gets each unit's report.
 *  The Request Tracker tab updates by itself. Never type on the Request Tracker tab.
 */

const SETTINGS = {
  LMS_ADMIN_EMAIL: 'connect.ctli@wced.info',   // shared LMS Admin inbox: the acknowledgement comes from here and request alerts go here
  CC: ['david.oliphant@westerncape.gov.za', 'marchelle.fester@westerncape.gov.za'],   // copied in on both emails, and on replies to them
  ACCESS_PAGE: 'https://connect-ctli.github.io/LMS-Workflows/',   // Connect@CTLI Workflows 2027 site
  SOP_PAGE: '',   // the SOP is now sent to PCs directly, so no SOP link goes in the email
  SENDER_NAME: 'Connect CTLI LMS Admin',   // no @ in the sender name: mail filters treat a name that looks like an email address as suspicious
  RESPONSES_SHEET: '',  // leave empty: the script finds the form responses tab by itself
  TRACKER_ORDER: 'ref',  // 'ref' = in request order (REQ-001, REQ-002 ...); 'opening' = soonest opening date first
  /* The published Site Links sheet: the script finds each unit's cohort sheet from its UNIT.cohort row */
  SITE_LINKS_CSV: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTP1JAVJV8ip8BdiHsbwURuF3WXoISYwHZVFI6lWA8PfO6AhAA3BMLvtgGb1NuiVY8fA-hkQhoTzOmT/pub?gid=135438491&single=true&output=csv'
};

/* The form questions. The script finds each one by any of these headings (capitals do not matter).
   The first name in each list is the one the form uses. setup renames the older names to it. */
const Q = {
  email:    ['Email address', 'Email'],                       // collected by the form
  pc:       ['Programme Coordinator (PC) name', 'PC name',                          // old wording, renamed by setup:
             'Training Coordinator (TC) name', "Training Coordinator's (TCs) name", 'TC name'],
  pcEmail:  ['PC email address', 'Programme Coordinator (PC) email address',
             'TC email address', "Training Coordinator's Email Address"],
  unit:     ['Delivery unit', 'Unit'],
  type:     ['Request type'],
  course:   ['PLO name', 'Course name'],                     // the PLO's full name
  existing: ['Existing PLO'],
  mode:     ['Delivery mode', 'Mode of delivery', 'Mode'],
  people:   ['Expected number of participants'],
  short:    ['Course short name'],                            // LMS Admin column: Moodle short name
  cohort:   ['Cohort'],                                       // LMS Admin column
  open:     ['Opening date'], start: ['Start date'], end: ['End date'], close: ['Closing date']
};
/* Questions that must be on the form. The rest are used when they are there. */
const REQUIRED_Q = ['email', 'pc', 'unit', 'course', 'open', 'start', 'end', 'close'];
const MODES = ['Blended', 'Face-to-Face', 'Online'];
const MODE_HELP = 'How the PLO is delivered: Blended (online and face-to-face), Face-to-Face, or Online only';
const PC_HELP = {
  pc: 'Name and surname of the PC responsible for this PLO',
  pcEmail: 'The LMS Admin sends updates about this PLO to this address'
};

/* Status, short label on the Tracker, workflow stage, next step, who acts next */
const STAGES = [
  ['Requested',           'Requested',   1, 'LMS Admin activates the PLO shell on Connect@CTLI and keeps it hidden', 'LMS Admin'],
  ['Activated (hidden)',  'Activated',   1, 'Quality check: PDD and the PC test the PLO together',               'PDD and PC'],
  ['QC passed',           'QC passed',   1, 'PC finishes the cohort sheet. Participants are loaded 1 to 2 weeks before opening', 'PC, then LMS Admin'],
  ['Participants loaded', 'Loaded',      2, 'PC checks the participant list on Connect@CTLI. The PLO opens on the opening date', 'PC'],
  ['PLO open',            'Open',        2, 'PLO is running. The LMS Admin closes it for reporting on the closing date',      'LMS Admin'],
  ['PLO closed',          'Closed',      3, 'LMS Admin builds the completion report',                              'LMS Admin'],
  ['Report sent',         'Report sent', 3, 'Complete. Data added to the unit dashboard and the CTLI Master Dashboard', 'Done']
];
const STATUS = STAGES.map(function (s) { return s[0]; });
/* Status names used before PLO wording. setup changes them on existing rows. */
const OLD_STATUS = { 'Course open': 'PLO open', 'Course closed': 'PLO closed' };
const ADMIN_COLS = ['Status', 'Course short name', 'Cohort', 'Moodle link', 'Report link', 'Status updated', 'Last email', 'Cohort sheet'];

/* Delivery units on the form, in this order. The code before the colon must match the Site Links codes. */
const UNITS = [
  ['LA_SMLDP', 'School Management and Leadership Development Programme'],
  ['LA_SMLDC', 'School Management and Leadership Development Courses'],
  ['FP', 'Foundation Phase'], ['IP', 'Intermediate Phase'], ['SP', 'Senior Phase'],
  ['IE', 'Inclusive Education'], ['NTI', 'Novice Teacher Induction'],
  ['FET', 'Further Education and Training'], ['EDULIS', 'Library and information services'],
  ['EXT_ELRN', 'eLearning (External Projects)'],
  ['EXT_PRJB', 'External Project B (External Projects)'],
  ['EXT_PRJC', 'External Project C (External Projects)'],
  ['PD', 'Professional Development']
];

const TRACKER = 'Request Tracker';
const ADMINS_TAB = 'LMS Admins';   // everyone listed here (with Yes) gets the new request alert
const PC_TRACKER_NAME = 'PLO Request Tracker 2027 (view only)';   // the separate file PCs see
const LISTS = 'Tracker Lists';
const FONT = 'Century Gothic';
const C = { navy: '#001489', deep: '#000b4d', gold: '#FFC600', teal: '#00A1A3', olive: '#8FAD15',
  adminL: '#FCE4D6', autoL: '#F2F2F2',
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
  form.addTextItem().setTitle(Q.pc[0]).setHelpText(PC_HELP.pc).setRequired(true);
  const pe = form.addTextItem().setTitle(Q.pcEmail[0]).setHelpText(PC_HELP.pcEmail).setRequired(true);
  pe.setValidation(FormApp.createTextValidation().requireTextIsEmail().setHelpText('Please type a valid email address').build());
  form.addListItem().setTitle(Q.unit[0]).setHelpText('Choose the unit that owns this PLO')
    .setChoiceValues(UNITS.map(function (u) { return u[0] + ': ' + u[1]; })).setRequired(true);

  form.addSectionHeaderItem().setTitle('Professional Learning Opportunity (PLO) details');
  form.addMultipleChoiceItem().setTitle(Q.type[0])
    .setChoiceValues(['Brand new PLO shell', 'Copy of an existing PLO shell', 'Add a cohort to an existing PLO']).setRequired(true);
  form.addTextItem().setTitle(Q.course[0])
    .setHelpText('The full PLO name as it should appear on Connect@CTLI, as listed in Annexure A').setRequired(true);
  form.addTextItem().setTitle(Q.existing[0])
    .setHelpText('Only for a copy or a new cohort: the name of the existing PLO on Connect@CTLI').setRequired(false);
  form.addMultipleChoiceItem().setTitle(Q.mode[0]).setHelpText(MODE_HELP).setChoiceValues(MODES).setRequired(true);
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

  ui_('The form is ready.\n\nLink for PCs: ' + short +
    '\n\nNext: run "setup". Then put this link on the "request" row of the Site Links sheet.');
}


/* =====================================================================
   1b. TIDY THE LIVE FORM (run once on a form you already use, and after the unit list changes)
   Fixes the wording on the form linked to this sheet without losing responses:
   PLO and PC wording, help texts, request types, unit list without "Other",
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
  const find = function (names) { return findItem_(items, names); };
  const done = [], notFound = [];

  form.setTitle('Shell Activation Request 2027').setDescription(FORM_DESCRIPTION);
  done.push('title and description');

  let it = find(Q.pc);
  if (it) { it.setTitle(Q.pc[0]).setHelpText(PC_HELP.pc); done.push(Q.pc[0]); } else notFound.push(Q.pc[0]);

  it = find(Q.pcEmail);
  if (it) {
    const t = it.asTextItem().setTitle(Q.pcEmail[0]).setHelpText(PC_HELP.pcEmail);
    t.setValidation(FormApp.createTextValidation().requireTextIsEmail().setHelpText('Please type a valid email address').build());
    done.push(Q.pcEmail[0]);
  } else notFound.push(Q.pcEmail[0]);

  it = find(Q.unit);
  if (it) {
    const choices = UNITS.map(function (u) { return u[0] + ': ' + u[1]; });
    if (it.getType() === FormApp.ItemType.LIST) it.asListItem().setChoiceValues(choices);
    else if (it.getType() === FormApp.ItemType.MULTIPLE_CHOICE) it.asMultipleChoiceItem().setChoiceValues(choices).showOtherOption(false);
    it.setTitle(Q.unit[0]).setHelpText('Choose the unit that owns this PLO');
    done.push(Q.unit[0] + ' (' + UNITS.length + ' units, without "Other")');
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

  if (addModeQuestion_(form)) done.push('new question: ' + Q.mode[0]);

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
   1c. TC TO PC WORDING (setup runs this every time)
   Renames old Training Coordinator (TC) questions on the linked form to the PC wording,
   and the matching column headings on the form responses tab. Responses are kept.
   ===================================================================== */
function renameToPC_(ss, rs) {
  const changed = [];
  const url = ss.getFormUrl();
  if (url) {
    try {
      const items = FormApp.openByUrl(url).getItems();
      if (addModeQuestion_(FormApp.openByUrl(url))) changed.push('new question "' + Q.mode[0] + '" added to the form');
      ['pc', 'pcEmail'].forEach(function (k) {
        const it = findItem_(items, Q[k]);
        if (it && it.getTitle().trim() !== Q[k][0]) {
          changed.push('"' + it.getTitle().trim() + '" is now "' + Q[k][0] + '"');
          it.setTitle(Q[k][0]).setHelpText(PC_HELP[k]);
        }
      });
    } catch (err) { /* form not shared with you: the headings below still change */ }
  }
  SpreadsheetApp.flush();
  ['pc', 'pcEmail'].forEach(function (k) {
    const i = colIdx_(rs, Q[k]);
    if (!i) return;
    const cell = rs.getRange(1, i);
    const old = String(cell.getValue()).trim();
    if (old !== Q[k][0]) {
      cell.setValue(Q[k][0]);
      if (changed.join(' ').indexOf(old) === -1) changed.push('column "' + old + '" is now "' + Q[k][0] + '"');
    }
  });
  return changed;
}

/* Adds the Delivery mode question after the PLO name (and Existing PLO) if the form does not have it yet */
function addModeQuestion_(form) {
  const items = form.getItems();
  const have = findItem_(items, Q.mode);
  if (have) {
    if (have.getType() === FormApp.ItemType.MULTIPLE_CHOICE) have.asMultipleChoiceItem().setChoiceValues(MODES);
    return false;
  }
  const after = findItem_(items, Q.existing) || findItem_(items, Q.course);
  const m = form.addMultipleChoiceItem().setTitle(Q.mode[0]).setHelpText(MODE_HELP).setChoiceValues(MODES).setRequired(true);
  if (after) form.moveItem(m.getIndex(), after.getIndex() + 1);
  return true;
}

function findItem_(items, names) {
  const n = [].concat(names).map(norm_);
  for (let i = 0; i < items.length; i++) if (n.indexOf(norm_(items[i].getTitle())) !== -1) return items[i];
  return null;
}


/* =====================================================================
   2. SETUP (run once, and again whenever you want to rebuild the Tracker)
   ===================================================================== */
function setup() {
  const ss = sheetOrStop_();
  const rs = responses_();
  if (!rs) return ui_('No form responses tab found yet. Run buildForm first, or link your current form to this sheet.');

  const renamed = renameToPC_(ss, rs);

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
  /* Light orange = the LMS Admin completes these cells. Grey = filled in automatically. */
  ['Status', 'Course short name', 'Cohort', 'Moodle link', 'Report link'].forEach(function (h) {
    rs.getRange(2, col_(rs, h), rs.getMaxRows() - 1, 1).setBackground(C.adminL);
  });
  ['Status updated', 'Last email'].forEach(function (h) {
    rs.getRange(2, col_(rs, h), rs.getMaxRows() - 1, 1).setBackground(C.autoL);
  });
  rs.setFrozenRows(1);

  /* Requests that came in before setup get "Requested" */
  const last = rs.getLastRow();
  if (last > 1) {
    const st = rs.getRange(2, col_(rs, 'Status'), last - 1, 1);
    st.setValues(st.getValues().map(function (r) { return [OLD_STATUS[r[0]] || r[0] || 'Requested']; }));
  }

  ['Status updated', 'Last email', 'Cohort sheet'].forEach(function (h) {
    rs.getRange(2, col_(rs, h), rs.getMaxRows() - 1, 1).setBackground(C.autoL);
  });
  rs.getRange(1, col_(rs, 'Cohort sheet')).setNote('Filled in by the script: the cohort sheet Summary row this request was written to.');

  unitHeads_(ss);
  lmsAdmins_(ss);
  buildLists_(ss);
  buildTracker_(ss, rs);
  const pc = buildPCTracker_(ss);
  PropertiesService.getDocumentProperties().setProperty('MODE_COL', String(colIdx_(rs, Q.mode)));

  /* Cohort sheets: PC wording, then every request written onto its unit's Summary tab */
  let cohortNote = '';
  try { cohortNote += 'Cohort sheets: ' + renameCohortSheetsToPC() + '\n'; }
  catch (err) { cohortNote += 'Cohort sheets: PC wording NOT DONE (' + err.message + ')\n'; }
  try { cohortNote += 'Summary tabs: ' + syncAllToCohort_(rs) + '\n\n'; }
  catch (err) { cohortNote += 'Summary tabs: NOT DONE (' + err.message + ')\n\n'; }

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
  ScriptApp.newTrigger('syncTracker').timeBased().everyHours(1).create();   /* keeps "days to opening" and date flags current */

  const from = sender_() === 'other'
    ? 'WARNING: the acknowledgement email will come from ' + Session.getEffectiveUser().getEmail() + ', not ' + SETTINGS.LMS_ADMIN_EMAIL +
      '. To fix this, run setup again while signed in as ' + SETTINGS.LMS_ADMIN_EMAIL +
      ', or add it as a "Send mail as" address in your Gmail settings and run setup again.\n\n'
    : 'The acknowledgement email will come from ' + SETTINGS.LMS_ADMIN_EMAIL + ', with ' + SETTINGS.CC.join(' and ') + ' copied in. Replies go to all three.\n' +
      'Status changes do not send emails: the LMS Admin emails PCs by hand.\n\n';
  const pcNote = renamed.length ? 'Changed to PC wording: ' + renamed.join('; ') + '.\n\n' : '';
  const admins = adminList_(ss);
  ui_('Setup done. ' + pcNote + cohortNote + from + 'New request alerts go to: ' + admins.join(', ') + '.\n\n' +
    '1. Add the Unit Head emails on the Unit Heads tab (for sending reports by hand).\n' +
    '   Add any other LMS Admins on the LMS Admins tab, so they get the new request alert too.\n' +
    '2. Share THIS sheet with the LMS Admins only. Remove any PCs. The form still works without sharing.\n' +
    '3. Put this view-only Tracker link on the "tracker" row of the Site Links sheet:\n' + trackerUrl_(ss) + '\n' +
    '   ' + pc.sharing);
}


/* =====================================================================
   3. THE ACKNOWLEDGEMENT EMAIL (the only email the script sends)
   A new request: the LMS Admin inbox gets an alert and the person who made the request
   gets one acknowledgement email. After that, the script sends nothing.
   The LMS Admin emails the PC by hand at each later step.
   ===================================================================== */
function onRequestSubmit(e) {
  const sh = e.range.getSheet();
  const rs = responses_();
  if (!rs || sh.getSheetId() !== rs.getSheetId()) return;
  const row = e.range.getRow();
  addStatusDropdown_(sh, row);   /* new form rows do not copy the dropdown from the rows above */
  sh.getRange(row, col_(sh, 'Status')).setValue('Requested');
  sh.getRange(row, col_(sh, 'Status updated')).setValue(new Date());
  const r = read_(sh, row);

  send_(adminList_(SpreadsheetApp.getActive()).join(','),
    'New PLO shell request: ' + label_(r) + ' (' + r.unit + ')',
    'A new PLO shell request has come in from ' + r.pc + '.\n\n' + summary_(r) +
    (/cohort/i.test(r.type)
      ? '\nThis is a new cohort on an existing PLO, so no new shell or quality check is needed. Add the cohort on Connect@CTLI and fill in the Course short name, Cohort and Moodle link on the request sheet. ' +
        'Leave the Status on "Requested" until the participants are loaded, then set it to "Participants loaded". The Tracker shows "Activated" and "QC passed" as n/a.\n\n'
      : '\nPlease set up the PLO shell on Connect@CTLI and keep it hidden. On the request sheet, add the Moodle link' +
        (r.short && r.cohort ? '' : !r.short && !r.cohort ? ', the Course short name and the Cohort' : !r.short ? ' and the Course short name' : ' and the Cohort') +
        ', then set the Status to "Activated (hidden)".\n\n') +
    'Reminder: status changes do not send emails. Please email the PC yourself when the PLO is set up.');

  send_(pcTo_(r),
    'Acknowledgement of your PLO request: ' + label_(r),
    'Hi ' + r.pc + ',\n\nThank you. The LMS Admin team has received your request for the PLO below.\n\n' + summary_(r) +
    '\nThe LMS Admin will be in touch by email once the PLO has been set up.' + trackerLine_() +
    (SETTINGS.SOP_PAGE ? '\nStandard Operating Procedure: ' + SETTINGS.SOP_PAGE : ''));

  stamp_(sh, row, 'Acknowledgement sent');

  /* A new question (Delivery mode) gets its column on the first response after it was added: rebuild the Tracker once */
  const props = PropertiesService.getDocumentProperties();
  if (String(colIdx_(sh, Q.mode)) !== props.getProperty('MODE_COL')) {
    try { buildTracker_(SpreadsheetApp.getActive(), sh); buildPCTracker_(SpreadsheetApp.getActive()); props.setProperty('MODE_COL', String(colIdx_(sh, Q.mode))); }
    catch (err) { Logger.log('Tracker rebuild: ' + err.message); }
  }
  cohortSync_(sh, row);
  syncTracker();
}

/* Status change: stamp the date so the Tracker moves on. No email goes out. */
function onStatusChange(e) {
  const sh = e.range.getSheet();
  const rs = responses_();
  if (!rs || sh.getSheetId() !== rs.getSheetId()) return;
  if (e.range.getColumn() === col_(sh, 'Status') && e.range.getRow() >= 2 && e.range.getNumRows() === 1 && e.range.getValue()) {
    sh.getRange(e.range.getRow(), col_(sh, 'Status updated')).setValue(new Date());
  }
  /* A change to the request details goes on to the cohort sheet Summary as well */
  const watch = ['course', 'short', 'cohort', 'mode', 'pc', 'unit', 'open', 'start', 'end', 'close', 'people']
    .map(function (k) { return colIdx_(sh, Q[k]); }).filter(Boolean);
  const c0 = e.range.getColumn(), c1 = e.range.getLastColumn();
  if (watch.some(function (c) { return c >= c0 && c <= c1; })) {
    for (let r = Math.max(2, e.range.getRow()); r <= Math.min(e.range.getLastRow(), e.range.getRow() + 20); r++) cohortSync_(sh, r);
  }
  syncTracker();   /* any change here (status, short name, cohort, link, dates) shows on the PCs' tracker */
}

function addStatusDropdown_(sh, row) {
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUS, true).setAllowInvalid(false).build();
  sh.getRange(row, col_(sh, 'Status')).setDataValidation(rule);
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
   Tracker columns: A Ref, B Unit, C PLO name, D Delivery mode, E Short name, F Cohort, G PC,
   H Opens, I Starts, J Ends, K Closes, L Status, M Step, N to T the seven steps,
   U Next step, V Who acts next, W Days to opening, X Needs attention, Y Last update, Z PLO link */
function trackerFormulas_(rsName, cols) {
  const R = "'" + rsName.replace(/'/g, "''") + "'!";
  const rng = function (c) { const L = colL_(c); return R + L + '2:' + L; };
  const key = '"REQ-"&TEXT(ROW(' + rng(1) + ')-1,"000")';
  const unit = 'IFERROR(REGEXEXTRACT(' + rng(cols.unit) + '&"","^[A-Za-z_]+"),' + rng(cols.unit) + ')';
  const status = 'IF(' + rng(cols.status) + '="","Requested",' + rng(cols.status) + ')';
  /* Requests made before the Delivery mode question existed show a blank mode */
  const mode = cols.mode ? rng(cols.mode) : 'IF(ROW(' + rng(1) + '),"")';
  const LST = "'" + LISTS + "'!";
  /* A new cohort on an existing PLO skips "Activated" and "QC passed": the shell is already set up and checked */
  const nc = cols.type
    ? 'REGEXMATCH(IFERROR(VLOOKUP($A5:$A,{' + key + ',' + rng(cols.type) + '},2,FALSE),"")&"","(?i)cohort")'
    : 'FALSE';
  const f = {};
  f.A5 = '=ARRAYFORMULA(IFERROR(SORT(FILTER({' + [key, unit, rng(cols.course), mode, rng(cols.short), rng(cols.cohort),
    rng(cols.pc), rng(cols.open), rng(cols.start), rng(cols.end), rng(cols.close), status].join(',') +
    '},' + rng(1) + '<>""),' + (SETTINGS.TRACKER_ORDER === 'opening' ? 8 : 1) + ',TRUE),""))';
  f.M5 = '=ARRAYFORMULA(IF(A5:A="","",IFERROR(VLOOKUP(L5:L,' + LST + 'A2:B8,2,FALSE),1)))';
  f.stages = STAGES.map(function (s, i) {
    const k = i + 1;
    const mark = 'IF(($M5:$M>' + k + ')+($M5:$M=7),"✓",IF($M5:$M=' + k + ',"●",""))';
    if (k === 2 || k === 3) return '=ARRAYFORMULA(IF($A5:$A="","",IF(' + nc + ',"n/a",' + mark + ')))';
    return '=ARRAYFORMULA(IF($A5:$A="","",' + mark + '))';
  });
  const ncEarly = '(' + nc + ')*(M5:M<=3)';
  f.U5 = '=ARRAYFORMULA(IF(A5:A="","",IF(' + ncEarly + ',"New cohort: LMS Admin adds the cohort to the existing PLO. PC finishes the cohort sheet. Participants are loaded 1 to 2 weeks before opening",' +
    'IFERROR(VLOOKUP(L5:L,' + LST + 'A2:D8,3,FALSE),""))))';
  f.V5 = '=ARRAYFORMULA(IF(A5:A="","",IF(' + ncEarly + ',"LMS Admin and PC",IFERROR(VLOOKUP(L5:L,' + LST + 'A2:D8,4,FALSE),""))))';
  f.W5 = '=ARRAYFORMULA(IF(A5:A="","",IF((M5:M>=5)+(H5:H=""),"",H5:H-TODAY())))';
  /* Dates must run Opening, Start, End, Closing */
  const order = '((H5:H<>"")*(I5:I<>"")*(I5:I<H5:H)+(I5:I<>"")*(J5:J<>"")*(J5:J<I5:I)+(J5:J<>"")*(K5:K<>"")*(K5:K<J5:J))';
  f.X5 = '=ARRAYFORMULA(IF(A5:A="","",' +
    'IF(' + order + '>0,"Check the dates",' +
    'IF((M5:M<4)*(H5:H<>"")*(H5:H>=TODAY())*(H5:H-TODAY()<=IF(' + nc + ',7,14)),IF(' + nc + ',"Opens within 1 week","Opens within 2 weeks"),' +
    'IF((M5:M<5)*(H5:H<>"")*(H5:H<TODAY()),"Opening date has passed",' +
    'IF((M5:M=5)*(K5:K<>"")*(K5:K<TODAY()),"Closing date has passed",""))))))';
  f.Y5 = '=ARRAYFORMULA(IF(A5:A="","",IFERROR(VLOOKUP(A5:A,{' + key + ',' + rng(cols.updated) + '},2,FALSE),"")))';
  f.Z5 = '=ARRAYFORMULA(IF(A5:A="","",IFERROR(IF(VLOOKUP(A5:A,{' + key + ',' + rng(cols.link) + '},2,FALSE)="","",' +
    'HYPERLINK(VLOOKUP(A5:A,{' + key + ',' + rng(cols.link) + '},2,FALSE),"Open PLO")),"")))';
  f.A3 = '="Requests: "&COUNTIF(A5:A,"REQ-*")&"   In progress: "&COUNTIFS(M5:M,">=1",M5:M,"<=6")&"   Complete: "&COUNTIF(M5:M,7)' +
    '&"   Attention: "&COUNTIF(X5:X,"?*")';
  f.N3 = '="STAGE 1: REQUEST AND QC  ("&COUNTIFS(M5:M,">=1",M5:M,"<=3")&")"';
  f.Q3 = '="STAGE 2: LOAD AND OPEN  ("&COUNTIFS(M5:M,">=4",M5:M,"<=5")&")"';
  f.S3 = '="STAGE 3: CLOSE AND REPORT  ("&COUNTIF(M5:M,6)&")"';
  return f;
}

const TW = 26;   /* Tracker width: columns A to Z */

function buildTracker_(ss, rs) {
  const W = TW;
  let t = ss.getSheetByName(TRACKER);
  if (t) { t.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); }); }
  else t = ss.insertSheet(TRACKER);
  t.clear(); t.clearConditionalFormatRules();
  t.getRange(1, 1, t.getMaxRows(), t.getMaxColumns()).breakApart();
  if (t.getMaxRows() < 1000) t.insertRowsAfter(t.getMaxRows(), 1000 - t.getMaxRows());
  if (t.getMaxColumns() < W) t.insertColumnsAfter(t.getMaxColumns(), W - t.getMaxColumns());
  if (t.getMaxColumns() > W) t.deleteColumns(W + 1, t.getMaxColumns() - W);

  const cols = { unit: col_(rs, Q.unit), course: col_(rs, Q.course), short: col_(rs, Q.short), cohort: col_(rs, Q.cohort),
    pc: col_(rs, Q.pc), open: col_(rs, Q.open), start: col_(rs, Q.start), end: col_(rs, Q.end), close: col_(rs, Q.close),
    status: col_(rs, 'Status'), updated: col_(rs, 'Status updated'), link: col_(rs, 'Moodle link'),
    type: colIdx_(rs, Q.type), mode: colIdx_(rs, Q.mode) };
  const f = trackerFormulas_(rs.getName(), cols);

  t.getRange(1, 1, 1000, W).setFontFamily(FONT).setFontSize(10).setVerticalAlignment('middle');

  /* Title and summary */
  /* Merges stop at column D so the first four columns can stay frozen */
  t.getRange('A1:Z1').setBackground(C.navy);
  t.getRange('A1:D1').merge();
  t.getRange('E1:Z1').merge();
  t.getRange('A1').setValue('PLO SHELL REQUEST TRACKER 2027')
    .setFontColor('#ffffff').setFontSize(15).setFontWeight('bold');
  t.getRange('A2:Z2').setBackground(C.deep).setFontColor('#ffffff').setFontSize(10);
  t.getRange('A2:D2').merge();
  t.getRange('E2:Z2').merge();
  t.getRange('A2').setValue('✓ done   ● now   n/a not needed (new cohort)');
  t.getRange('E2').setValue('Where every Connect@CTLI PLO request is. This tab updates by itself. ' +
    'Find your PLO by unit, PLO name, short name or cohort.');
  t.getRange('A3:M3').setBackground(C.band);
  t.getRange('A3:D3').merge();
  t.getRange('E3:M3').merge();
  t.getRange('A3').setFormula(f.A3).setFontWeight('bold').setFontColor(C.navy);
  t.getRange('N3:P3').merge();
  t.getRange('N3').setFormula(f.N3).setBackground(C.gold).setFontColor(C.deep);
  t.getRange('Q3:R3').merge();
  t.getRange('Q3').setFormula(f.Q3).setBackground(C.teal).setFontColor('#ffffff');
  t.getRange('S3:T3').merge();
  t.getRange('S3').setFormula(f.S3).setBackground(C.olive).setFontColor(C.deep);
  t.getRange('U3:Z3').merge().setBackground(C.band);
  t.getRange('N3:T3').setFontWeight('bold').setFontSize(8.5).setHorizontalAlignment('center').setWrap(true);

  /* Column headings */
  const heads = ['Ref', 'Unit', 'PLO name', 'Delivery mode', 'Short name', 'Cohort', 'PC',
    'Opens on Connect@CTLI', 'Official start', 'Official end', 'Closes for reporting', 'Status', 'Step']
    .concat(STAGES.map(function (s) { return s[1]; }))
    .concat(['Next step', 'Who acts next', 'Days to opening', 'Needs attention', 'Last update', 'PLO link']);
  t.getRange(4, 1, 1, W).setValues([heads]).setBackground(C.navy).setFontColor('#ffffff').setFontWeight('bold')
    .setWrap(true).setVerticalAlignment('middle');
  t.getRange('H4:K4').setBackground(C.deep);
  t.getRange(4, 14, 1, 7).setHorizontalAlignment('center').setFontSize(9);
  t.getRange('M4').setHorizontalAlignment('center');

  /* Formulas */
  t.getRange('A5').setFormula(f.A5);
  t.getRange('M5').setFormula(f.M5);
  f.stages.forEach(function (fx, i) { t.getRange(5, 14 + i).setFormula(fx); });
  ['U5', 'V5', 'W5', 'X5', 'Y5', 'Z5'].forEach(function (a) { t.getRange(a).setFormula(f[a]); });

  /* Formats */
  t.getRange('H5:K').setNumberFormat('d mmm yyyy');
  t.getRange('I5:J').setFontWeight('bold');
  t.getRange('Y5:Y').setNumberFormat('d mmm yyyy');
  t.getRange('M5:M').setNumberFormat('0"/7"').setHorizontalAlignment('center').setFontColor(C.soft);
  t.getRange('W5:W').setNumberFormat('0').setHorizontalAlignment('center');
  t.getRange('N5:T').setHorizontalAlignment('center').setFontSize(12);
  t.getRange('U5:U').setWrap(true).setFontColor(C.soft);
  t.getRange('A5:A').setFontColor(C.faint);
  t.getRange('B5:B').setFontWeight('bold');
  t.getRange('D5:D').setHorizontalAlignment('center');
  t.getRange('A4:Z').setBorder(null, null, true, null, true, true, C.line, SpreadsheetApp.BorderStyle.SOLID);
  t.getRange('N4:T').setBorder(null, true, null, true, null, null, '#C9D2DE', SpreadsheetApp.BorderStyle.SOLID);

  const widths = [70, 86, 240, 104, 130, 110, 140, 96, 96, 96, 96, 140, 50, 74, 74, 74, 74, 74, 74, 74, 290, 120, 80, 160, 100, 100];
  widths.forEach(function (w, i) { t.setColumnWidth(i + 1, w); });
  t.setRowHeight(1, 40); t.setRowHeight(2, 30); t.setRowHeight(3, 30); t.setRowHeight(4, 42);
  t.setRowHeightsForced(5, 995, 30);
  t.setFrozenRows(4); t.setFrozenColumns(4);
  t.setHiddenGridlines(true);

  /* Colour rules (first matching rule wins) */
  const rules = [];
  const stageCells = t.getRange('N5:T1000');
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('●').setBackground(C.goldL).setFontColor(C.navy).setBold(true).setRanges([stageCells]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('✓').setBackground(C.tealL).setFontColor(C.teal).setRanges([stageCells]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('n/a').setBackground(C.band).setFontColor(C.faint).setItalic(true).setRanges([stageCells]).build());
  const st = t.getRange('L5:L1000');
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$M5=7').setBackground(C.doneL).setFontColor('#2E6B34').setBold(true).setRanges([st]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($M5>=1,$M5<=3)').setBackground(C.goldL).setFontColor(C.deep).setRanges([st]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($M5>=4,$M5<=5)').setBackground(C.tealL).setFontColor(C.deep).setRanges([st]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$M5=6').setBackground(C.oliveL).setFontColor(C.deep).setRanges([st]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=LEN($X5)>0').setBackground(C.badL).setFontColor(C.bad).setBold(true).setRanges([t.getRange('X5:X1000')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND(ISNUMBER($W5),$W5<0)').setFontColor(C.bad).setRanges([t.getRange('W5:W1000')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$M5=7').setFontColor(C.faint).setRanges([t.getRange('A5:K1000'), t.getRange('U5:Z1000')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($A5<>"",ISEVEN(ROW()))').setBackground(C.band).setRanges([t.getRange('A5:M1000'), t.getRange('U5:Z1000')]).build());
  t.setConditionalFormatRules(rules);

  /* Only the LMS Admins see this tab. PCs see the view-only copy. */
  t.protect().setDescription('Request Tracker: updates by itself').setWarningOnly(true);

  ss.setActiveSheet(t);
  ss.moveActiveSheet(1);
}


/* =====================================================================
   4b. THE VIEW-ONLY TRACKER FOR PCs
   A separate Google Sheet with only the Request Tracker, as values. PCs cannot see the
   form responses, email addresses, the LMS Admin columns or the Unit Heads tab.
   ===================================================================== */

/* The view-only file's ID. Earlier versions saved it as TC_TRACKER_ID: it moves across, so the link stays the same. */
function pcTrackerId_() {
  const props = PropertiesService.getDocumentProperties();
  let id = props.getProperty('PC_TRACKER_ID');
  if (!id) {
    id = props.getProperty('TC_TRACKER_ID');
    if (id) { props.setProperty('PC_TRACKER_ID', id); props.deleteProperty('TC_TRACKER_ID'); }
  }
  return id;
}

/* Opens the PC copy, or makes it the first time. Keeps the same file (and link) after that. */
function pcTrackerFile_(ss) {
  const props = PropertiesService.getDocumentProperties();
  const id = pcTrackerId_();
  if (id) { try { return SpreadsheetApp.openById(id); } catch (err) { /* deleted: make a new one */ } }
  const dest = SpreadsheetApp.create(PC_TRACKER_NAME);
  props.setProperty('PC_TRACKER_ID', dest.getId());
  try {   /* put it in the same Drive folder as this request sheet */
    DriveApp.getFileById(dest.getId()).moveTo(DriveApp.getFileById(ss.getId()).getParents().next());
  } catch (err) { /* stays in My Drive */ }
  return dest;
}

/* Copies the Tracker layout (colours, widths, headings) into the PC file, then fills it.
   setup runs this, so rebuilding the Tracker here also rebuilds the PC copy. */
function buildPCTracker_(ss) {
  const t = ss.getSheetByName(TRACKER);
  const dest = pcTrackerFile_(ss);
  const old = dest.getSheets();
  old.forEach(function (sh, i) { sh.setName('old ' + i + ' ' + Date.now()); });
  const copy = t.copyTo(dest).setName(TRACKER);
  old.forEach(function (sh) { dest.deleteSheet(sh); });
  copy.getRange('A3').setValue('');
  copy.getRange('A5:Z' + copy.getMaxRows()).clearContent();
  copy.setFrozenRows(4); copy.setFrozenColumns(4); copy.setHiddenGridlines(true);
  copy.getRange('E2').setValue('Where every Connect@CTLI PLO request is. This sheet is view only and updates by itself. ' +
    'Find your PLO by unit, PLO name, short name or cohort.');

  /* Anyone with the link can view. If your organisation blocks that, only WCED accounts can. */
  let sharing = 'The view-only Tracker is set to "Anyone with the link can view".';
  const f = DriveApp.getFileById(dest.getId());
  try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (err) {
    try { f.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); sharing = 'Your organisation blocks public links, so the view-only Tracker is set to "Anyone in your organisation with the link can view". Share it by hand with PCs outside it.'; }
    catch (err2) { sharing = 'Could not set sharing on the view-only Tracker. Open it and share it as Viewer.'; }
  }
  try { f.setShareableByEditors(false); } catch (err) { /* not important */ }

  syncTracker();
  return { url: dest.getUrl(), sharing: sharing };
}

/* Copies the Tracker's current values into the PC file. Runs after new requests, edits, and every hour. */
function syncTracker() {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) return;
  try {
    const ss = SpreadsheetApp.getActive();
    const id = pcTrackerId_();
    const t = ss.getSheetByName(TRACKER);
    if (!id || !t) return;
    let dest;
    try { dest = SpreadsheetApp.openById(id).getSheetByName(TRACKER); } catch (err) { return; }
    if (!dest) return;
    SpreadsheetApp.flush();

    /* Summary row */
    ['A3', 'N3', 'Q3', 'S3'].forEach(function (a) { dest.getRange(a).setValue(t.getRange(a).getDisplayValue()); });

    /* Request rows */
    const last = t.getLastRow();
    const n = Math.max(0, last - 4);
    const vals = n ? t.getRange(5, 1, n, TW).getValues().filter(function (r) { return String(r[0]).indexOf('REQ-') === 0; }) : [];

    /* PLO link column: a clickable link, read straight from the responses tab */
    const rs = responses_();
    const linkCol = rs ? colIdx_(rs, 'Moodle link') : 0;
    const links = (rs && linkCol && rs.getLastRow() > 1) ? rs.getRange(2, linkCol, rs.getLastRow() - 1, 1).getValues() : [];
    vals.forEach(function (r) {
      const i = parseInt(String(r[0]).replace('REQ-', ''), 10) - 1;
      const url = links[i] ? String(links[i][0]).trim() : '';
      r[TW - 1] = /^https?:\/\//i.test(url) ? '=HYPERLINK("' + url.replace(/"/g, '%22') + '","Open PLO")' : '';
    });

    dest.getRange(5, 1, dest.getMaxRows() - 4, TW).clearContent();
    if (vals.length) dest.getRange(5, 1, vals.length, TW).setValues(vals);
  } finally {
    lock.releaseLock();
  }
}


/* =====================================================================
   4c. THE UNIT COHORT SHEETS
   Each request is written onto the Summary tab of its unit's cohort sheet, so the PC and the
   LMS Admin never copy it across by hand. Columns are found by their headings, so the script
   still works if columns move. Cells with formulas are never touched.
   ===================================================================== */

/* Summary headings the script fills in, found by these patterns (capitals and spaces do not matter) */
const SUMMARY_FIELDS = {
  plo:    /^(plo|plo name|plo full name|course|course name)$/,
  short:  /^(moodle )?(course )?short name$/,
  cohort: /^(cohort|cohort code)$/,
  mode:   /^(mode|delivery mode|mode of delivery|delivery)$/,
  pc:     /^(programme coordinator|programme coordinator \(pc\)|pc|pc name|coordinator|training coordinator|training coordinator \(tc\)|tc)$/,
  open:   /^(opening|opening date|opens|opens on connect@ctli)$/,
  start:  /^(official start|official start date|start|start date)$/,
  end:    /^(official end|official end date|end|end date)$/,
  close:  /^(closing|closing date|closes|closes for reporting)$/,
  people: /^expected( number of)? participants$/,
  enrol:  /^enrolment request( received)?$/
};
const SUMMARY_REF = 'Request ref';   /* added after the last Summary heading; its note holds the request's fixed key */

let UNIT_CACHE_ = null;
const BOOK_CACHE_ = {};

/* All the unit cohort sheets, from the UNIT.cohort rows of the Site Links sheet */
function unitSheets_() {
  if (UNIT_CACHE_) return UNIT_CACHE_;
  const csv = UrlFetchApp.fetch(SETTINGS.SITE_LINKS_CSV + '&t=' + Date.now()).getContentText();
  const out = {};
  Utilities.parseCsv(csv).forEach(function (row) {
    const cells = row.map(function (c) { return String(c || '').trim(); });
    const code = cells.filter(function (c) { return /^[A-Za-z_]+\.cohort$/.test(c); })[0];
    const url = cells.filter(function (c) { return /^https:\/\/docs\.google\.com\/spreadsheets\//.test(c); })[0];
    if (code && url) out[code.split('.')[0].toUpperCase()] = url;
  });
  return (UNIT_CACHE_ = out);
}

function book_(url) {
  if (!BOOK_CACHE_[url]) BOOK_CACHE_[url] = SpreadsheetApp.openByUrl(url);
  return BOOK_CACHE_[url];
}

/* A fixed key for each request: its form timestamp. It does not change when rows are deleted. */
function requestKey_(sh, row) {
  const t = sh.getRange(row, 1).getValue();
  return t instanceof Date ? 'req:' + t.getTime() : 'req:row' + row;
}

/* Where things are on a Summary tab: the heading row, each field's column, and the Request ref column */
function summaryLayout_(sm) {
  const W = Math.max(1, sm.getLastColumn());
  const top = sm.getRange(1, 1, Math.min(12, sm.getMaxRows()), W).getDisplayValues();
  for (let r = 0; r < top.length; r++) {
    const h = top[r].map(function (x) { return x.replace(/\s+/g, ' ').trim().toLowerCase(); });
    if (!h.some(function (x) { return SUMMARY_FIELDS.pc.test(x); })) continue;
    const col = {};
    Object.keys(SUMMARY_FIELDS).forEach(function (k) {
      const i = h.findIndex(function (x) { return SUMMARY_FIELDS[k].test(x); });
      if (i !== -1) col[k] = i + 1;
    });
    let ref = h.indexOf(SUMMARY_REF.toLowerCase()) + 1;
    if (!ref) {
      let last = 0;
      h.forEach(function (x, k) { if (x) last = k + 1; });
      ref = last + 1;
      if (ref > sm.getMaxColumns()) sm.insertColumnsAfter(sm.getMaxColumns(), 1);
      sm.getRange(r + 1, last).copyTo(sm.getRange(r + 1, ref), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
      sm.getRange(r + 1, ref).setValue(SUMMARY_REF).setNote('Filled in by the request form script: the request this row came from. Do not type here.');
      sm.setColumnWidth(ref, 110);
    }
    return { head: r + 1, col: col, ref: ref };
  }
  return null;
}

/* Copies one request onto its unit's Summary tab and records where it went in the "Cohort sheet" column */
function cohortSync_(sh, row) {
  let msg;
  try { msg = writeToSummary_(sh, row); }
  catch (err) { msg = 'NOT DONE: ' + err.message; }
  if (msg) { try { sh.getRange(row, col_(sh, 'Cohort sheet')).setValue(msg); } catch (err) { Logger.log(msg); } }
  return msg;
}

function writeToSummary_(sh, row) {
  const r = read_(sh, row);
  if (!String(r.course || '').trim()) return '';
  const url = unitSheets_()[String(r.unit).toUpperCase()];
  if (!url) return 'Not added: no cohort sheet for ' + r.unit + ' on the Site Links sheet';
  const sm = book_(url).getSheetByName('Summary');
  if (!sm) return 'Not added: the ' + r.unit + ' cohort sheet has no Summary tab';
  const L = summaryLayout_(sm);
  if (!L) return 'Not added: no Programme coordinator heading on the ' + r.unit + ' Summary tab';

  const first = L.head + 1, last = Math.max(sm.getLastRow(), first);
  const n = last - first + 1;
  const key = requestKey_(sh, row);
  const notes = sm.getRange(first, L.ref, n, 1).getNotes();
  const refs = sm.getRange(first, L.ref, n, 1).getValues();
  let target = 0;
  for (let i = 0; i < n; i++) if (notes[i][0] === key) { target = first + i; break; }

  if (!target) {
    /* A free PLO row: one with a course tab (formula in column A) and no PLO name or request yet */
    const fA = sm.getRange(first, 1, n, 1).getFormulas();
    const plo = L.col.plo ? sm.getRange(first, L.col.plo, n, 1).getDisplayValues() : fA.map(function () { return ['']; });
    const withTabs = fA.some(function (x) { return x[0]; });
    for (let i = 0; i < n; i++) {
      if (withTabs && !fA[i][0]) continue;
      if (!withTabs && i >= 15) break;
      if (!String(plo[i][0]).trim() && !String(refs[i][0]).trim() && !notes[i][0]) { target = first + i; break; }
    }
    if (!target) return 'Not added: the ' + r.unit + ' Summary has no free PLO row. Add a course tab, then edit this request to try again';
  }

  const values = {
    plo: r.course, short: r.short, cohort: r.cohort, mode: r.mode, pc: r.pc === 'colleague' ? '' : r.pc,
    open: r.raw.open, start: r.raw.start, end: r.raw.end, close: r.raw.close, people: r.raw.people, enrol: 'Yes'
  };
  const skipped = [];
  Object.keys(values).forEach(function (k) {
    const c = L.col[k], v = values[k];
    if (!c || v === '' || v === null || v === undefined) return;
    const cell = sm.getRange(target, c);
    if (cell.getFormula()) return;
    try { cell.setValue(fitDropdown_(cell, v)); }
    catch (err) { skipped.push(k); }
  });
  const refCell = sm.getRange(target, L.ref);
  refCell.setValue('REQ-' + ('00' + (row - 1)).slice(-3)).setNote(key).setBackground(C.autoL).setFontFamily(FONT);
  return r.unit + ' Summary row ' + target + (skipped.length ? ' (not accepted by the dropdown: ' + skipped.join(', ') + ')' : '') +
    ', ' + Utilities.formatDate(new Date(), 'Africa/Johannesburg', 'd MMM HH:mm');
}

/* When a Summary cell has a dropdown, use the dropdown's own spelling (Face-to-Face = Face to face = face-to-face) */
function fitDropdown_(cell, v) {
  if (typeof v !== 'string') return v;
  const dv = cell.getDataValidation();
  if (!dv) return v;
  const type = dv.getCriteriaType(), crit = dv.getCriteriaValues();
  let opts = [];
  if (type === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) opts = crit[0] || [];
  else if (type === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE && crit[0]) opts = crit[0].getDisplayValues().map(function (x) { return x[0]; });
  const sq = function (x) { return String(x).toLowerCase().replace(/[^a-z0-9]/g, ''); };
  const hit = opts.filter(function (o) { return sq(o) === sq(v); })[0];
  return hit !== undefined ? hit : v;
}

/* setup: every request onto its Summary tab */
function syncAllToCohort_(rs) {
  const last = rs.getLastRow();
  if (last < 2) return 'no requests yet';
  let ok = 0;
  const bad = [];
  for (let row = 2; row <= last; row++) {
    const msg = cohortSync_(rs, row);
    if (!msg) continue;
    if (/^Not added|^NOT DONE/.test(msg)) bad.push('REQ-' + ('00' + (row - 1)).slice(-3) + ': ' + msg); else ok++;
  }
  return ok + ' request(s) on their Summary tabs' + (bad.length ? '. ' + bad.join('; ') : '');
}

/* Training coordinator (TC) wording becomes Programme coordinator (PC) on all the unit cohort sheets.
   Only headings and instruction text near the top of each tab are changed (rows with an email address are skipped,
   so participant details are never touched). Text inside formulas is changed only within quotation marks.
   Run it on its own from the toolbar, or let setup run it. Safe to run again. */
function renameCohortSheetsToPC() {
  const units = unitSheets_();
  let cells = 0;
  const failed = [];
  Object.keys(units).forEach(function (u) {
    try {
      book_(units[u]).getSheets().forEach(function (tab) {
        const rows = Math.min(15, tab.getMaxRows()), cols = Math.max(1, tab.getLastColumn());
        if (tab.getLastRow() < 1) return;
        const rng = tab.getRange(1, 1, rows, cols);
        const v = rng.getValues(), f = rng.getFormulas();
        for (let r = 0; r < rows; r++) {
          if (v[r].some(function (x) { return /\S+@\S+\.\S+/.test(String(x)); })) continue;
          for (let c = 0; c < cols; c++) {
            if (f[r][c]) {
              const nf = f[r][c].replace(/"(?:[^"]|"")*"/g, toPC_);
              if (nf !== f[r][c]) { tab.getRange(r + 1, c + 1).setFormula(nf); cells++; }
            } else if (typeof v[r][c] === 'string' && v[r][c]) {
              const nv = toPC_(v[r][c]);
              if (nv !== v[r][c]) { tab.getRange(r + 1, c + 1).setValue(nv); cells++; }
            }
          }
        }
      });
    } catch (err) { failed.push(u + ' (' + err.message + ')'); }
  });
  const msg = cells + ' heading or instruction cell(s) changed to PC wording' + (failed.length ? '. Could not open: ' + failed.join(', ') : '');
  Logger.log(msg);
  return msg;
}

/* Training Coordinator(s) -> Programme Coordinator(s), keeping capitals; TC -> PC and TCs -> PCs as whole words */
function toPC_(text) {
  return String(text)
    .replace(/\b(training)(\s+)(co-?ordinators?)\b/gi, function (m, a, sp, b) {
      const w = a === a.toUpperCase() ? 'PROGRAMME' : a[0] === 'T' ? 'Programme' : 'programme';
      return w + sp + b;
    })
    .replace(/\bTCs\b/g, 'PCs').replace(/\bTC\b/g, 'PC');
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

/* The LMS Admins tab: every admin who gets the new request alert. The shared inbox is always first. */
function lmsAdmins_(ss) {
  let a = ss.getSheetByName(ADMINS_TAB);
  if (!a) {
    a = ss.insertSheet(ADMINS_TAB);
    a.getRange(1, 1, 2, 3).setValues([['LMS Admin', 'Email address', 'Gets request alerts'],
      ['Connect@CTLI shared inbox', SETTINGS.LMS_ADMIN_EMAIL, 'Yes']]);
  }
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(['Yes', 'No'], true).setAllowInvalid(false).build();
  a.getRange(2, 3, a.getMaxRows() - 1, 1).setDataValidation(rule);
  a.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground(C.navy).setFontColor('#ffffff');
  a.getRange(2, 1, a.getMaxRows() - 1, 3).setBackground(C.adminL);   /* light orange: the LMS Admin completes */
  a.getRange(1, 1, a.getMaxRows(), 3).setFontFamily(FONT);
  a.setColumnWidths(1, 3, 240);
  a.setFrozenRows(1);
}

/* Everyone who gets the new request alert: the shared inbox, plus each email on the LMS Admins tab
   (unless "Gets request alerts" says No). Repeats and blank rows are skipped. */
function adminList_(ss) {
  const list = [SETTINGS.LMS_ADMIN_EMAIL];
  const a = ss ? ss.getSheetByName(ADMINS_TAB) : null;
  if (a && a.getLastRow() > 1) {
    a.getRange(2, 1, a.getLastRow() - 1, 3).getValues().forEach(function (r) {
      String(r[1] || '').split(/[,;\s]+/).forEach(function (em) {
        em = em.trim();
        if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) && norm_(r[2]) !== 'no') list.push(em);
      });
    });
  }
  return list.filter(function (x, i) { return list.map(norm_).indexOf(norm_(x)) === i; });
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
    email: String(get(Q.email) || '').trim(), pcEmail: String(get(Q.pcEmail) || '').trim(),
    pc: get(Q.pc) || 'colleague', unit: unitRaw.split(':')[0].trim(),
    type: String(get(Q.type) || ''), existing: String(get(Q.existing) || '').trim(), people: String(get(Q.people) || ''),
    course: get(Q.course), short: String(get(Q.short) || '').trim(), cohort: String(get(Q.cohort) || '').trim(),
    open: d(get(Q.open)), start: d(get(Q.start)), end: d(get(Q.end)), close: d(get(Q.close)),
    mode: String(get(Q.mode) || '').trim(),
    raw: { open: get(Q.open), start: get(Q.start), end: get(Q.end), close: get(Q.close), people: get(Q.people) },
    link: get('Moodle link'), report: get('Report link')
  };
}

/* The short name once the LMS Admin has added it, otherwise the PLO name */
function label_(r) { return r.short || r.course; }

function summary_(r) {
  return 'PC: ' + r.pc + '\nUnit: ' + r.unit + '\nRequest type: ' + (r.type || 'not given') + '\nPLO: ' + r.course +
    (r.existing ? '\nExisting PLO: ' + r.existing : '') + (r.mode ? '\nDelivery mode: ' + r.mode : '') + (r.people ? '\nExpected participants: ' + r.people : '') + '\nShort name: ' + (r.short || 'to be added by the LMS Admin') + '\nCohort: ' + (r.cohort || 'to be added by the LMS Admin') +
    '\nOpening date: ' + r.open + '\nStart date: ' + r.start + '\nEnd date: ' + r.end +
    '\nClosing date (for reporting): ' + r.close + '\n';
}

/* Updates go to the PC email given on the form, and to the person who sent the request if that is someone else */
function pcTo_(r) {
  const list = [r.pcEmail, r.email].filter(function (x, i, a) { return x && a.map(norm_).indexOf(norm_(x)) === i; });
  return list.join(',');
}


/* The link PCs get: the view-only copy once setup has made it */
function trackerUrl_(ss) {
  const id = pcTrackerId_();
  if (id) return 'https://docs.google.com/spreadsheets/d/' + id + '/edit?usp=sharing';
  const t = ss.getSheetByName(TRACKER);
  return ss.getUrl() + (t ? '#gid=' + t.getSheetId() : '');
}

function trackerLine_() {
  return '\n\nFollow your PLO on the Request Tracker: ' + trackerUrl_(SpreadsheetApp.getActive());
}

/* Sent from the shared LMS Admin inbox, the people in SETTINGS.CC are copied in, and replies go to the inbox and to them.
   The email comes from connect.ctli@wced.info when the script runs as that account (setup was run while signed in as it),
   or when that address is a "Send mail as" address in the Gmail of the person who ran setup. */
function send_(to, subject, body) {
  const toList = String(to || '').split(',').map(function (x) { return x.trim(); }).filter(String);
  if (!toList.length) return;
  const have = toList.map(norm_);
  const cc = SETTINGS.CC.filter(function (x) { return x && have.indexOf(norm_(x)) === -1; }).join(',');
  const text = body + '\n\nKind regards\nConnect@CTLI LMS Admin\n' + SETTINGS.LMS_ADMIN_EMAIL;
  /* A plain Reply goes to the shared inbox and to everyone in SETTINGS.CC */
  const replyTo = [SETTINGS.LMS_ADMIN_EMAIL].concat(SETTINGS.CC).filter(String).join(',');
  const opts = { name: SETTINGS.SENDER_NAME, replyTo: replyTo };
  if (cc) opts.cc = cc;
  if (sender_() === 'alias') {
    opts.from = SETTINGS.LMS_ADMIN_EMAIL;
    GmailApp.sendEmail(toList.join(','), subject, text, opts);
  } else {
    opts.to = toList.join(','); opts.subject = subject; opts.body = text;
    MailApp.sendEmail(opts);
  }
}

/* 'inbox' = the script runs as the shared inbox, 'alias' = it can send as the shared inbox, 'other' = neither */
let SENDER_ = null;
function sender_() {
  if (SENDER_) return SENDER_;
  const me = norm_(Session.getEffectiveUser().getEmail() || '');
  if (me === norm_(SETTINGS.LMS_ADMIN_EMAIL)) return (SENDER_ = 'inbox');
  try {
    if (GmailApp.getAliases().map(norm_).indexOf(norm_(SETTINGS.LMS_ADMIN_EMAIL)) !== -1) return (SENDER_ = 'alias');
  } catch (err) { /* no Gmail access: fall back */ }
  return (SENDER_ = 'other');
}

function stamp_(sh, row, what) {
  sh.getRange(row, col_(sh, 'Last email')).setValue(what + ', ' +
    Utilities.formatDate(new Date(), 'Africa/Johannesburg', 'd MMM yyyy HH:mm'));
}


/* Results show in the Execution log in the editor, and as a short note on the sheet. No pop-up to wait on. */
function ui_(msg) {
  Logger.log(msg);
  try { SpreadsheetApp.getActive().toast(msg.split('\n')[0] + ' The full details are in the Execution log.', 'Shell Requests 2027', 15); }
  catch (err) { /* no sheet open: the log is enough */ }
}
