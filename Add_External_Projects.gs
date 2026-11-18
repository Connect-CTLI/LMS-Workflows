/**
 * Connect@CTLI Workflows 2027: ADD THE EXTERNAL PROJECTS UNITS
 * Goes in the CTLI Master Cohort 2027 sheet, in the same Apps Script project as Central_School_List.gs,
 * Add_Profile_Fields.gs and Tidy_Cohort_Sheets.gs (File > + > Script, name it Add_External_Projects, paste, Save).
 * It uses helpers from those three files, so it will not run on its own.
 *
 * WHAT IT ADDS
 *  A new main unit, External Projects (EXT), after EDULIS, with three sub-units:
 *     EXT_ELRN  eLearning
 *     EXT_PRJB  External Project B   (placeholder: rename later, keep the code)
 *     EXT_PRJC  External Project C   (placeholder: rename later, keep the code)
 *  Each sub-unit gets everything the other units have. EDULIS is used as the template.
 *
 * "checkExternalProjects": looks at everything first and changes NOTHING. The findings go on a new
 *  "External Projects" tab in this sheet. Run it first and read it.
 *
 * "addExternalProjects": does the work, in this order:
 *   1. Backup copies of this Master Cohort and the CTLI Master Dashboard (named "BACKUP before External Projects").
 *   2. Three unit cohort sheets: copies of the EDULIS cohort sheet in the same Drive folder, with every PC and
 *      LMS Admin cell emptied (yellow, light orange, amber and red cells, and the Summary rows) and EDULIS
 *      changed to the new unit code in titles, tab names and the unit label. The official school list,
 *      districts, formulas, dropdowns and the Age, Race, Disability, Gender columns stay as they are.
 *   3. Three completion report folders, next to the EDULIS report folder.
 *   4. Three unit dashboards: copies of the EDULIS dashboard, set to the new unit.
 *   5. This Master Cohort: three Link_ tabs, three Setup rows (with the new cohort sheet links), the new units
 *      added to every Master_Feed column, and 15 Course_Summary rows per new unit.
 *   6. Every dashboard (Master and all unit dashboards): the Course_Link import reads the longer Course_Summary.
 *   7. CTLI Master Dashboard: the new units on the Unit filter list and, if it has one, in the by-unit table
 *      on District Overview.
 *   8. Site Links sheet: the nine new rows (cohort, dashboard and reports for each sub-unit), if
 *      XP.SITE_LINKS_SHEET below has the Site Links sheet's link. If it is empty, the rows are listed on the
 *      External Projects tab for you to paste in.
 *  Safe to run again. If it stops at Google's 6-minute limit, run it again: it carries on where it stopped.
 *  If a step fails, nothing after it is changed. Fix what the message says and run it again.
 *
 * AFTERWARDS: the External Projects tab lists what still needs a click by hand (Allow access on the new
 * links, sharing, and running pushSchoolList).
 */

const XP = {
  GROUP: 'External Projects',
  UNITS: [
    { code: 'EXT_ELRN', name: 'eLearning' },
    { code: 'EXT_PRJB', name: 'External Project B' },
    { code: 'EXT_PRJC', name: 'External Project C' }
  ],
  TEMPLATE: 'EDULIS',                                // the unit that is copied
  TEMPLATE_NAME: 'Library and information services', // its full name, changed to the new unit's name
  SITE_LINKS_SHEET: '',   // paste the Site Links Google Sheet's normal (edit) link here so the script can add the 9 rows
  REPORT_TAB: 'External Projects',
  PROGRESS: 'XP_DONE',
  FEED_DONE: 'XP_FEED_DONE',
  LIMIT_MS: 5 * 60 * 1000,
  TZ: 'Africa/Johannesburg',
  BIG: 60000              // tabs bigger than this many cells: only their top 12 rows are relabelled
};
const XP_STOP = 'XP_STOP';
/* Cell colours that mean "someone types here": yellow PC, light orange LMS Admin, amber and red school flags */
const XP_INPUT = ['#fff2cc', '#fce4d6', '#ffc000', '#e06666', '#ffd966', '#f4b6b0', '#fff8d6'];


/* =====================================================================
   1. CHECK (changes nothing)
   ===================================================================== */
function checkExternalProjects() {
  const info = xpInspect_();
  const out = ['CHECK ONLY: nothing was changed.'];
  if (info.problems.length) out.push('FIX FIRST: ' + info.problems.join(' | '));
  else out.push('Ready. Run addExternalProjects.');
  xpFinish_(out.concat(info.notes), info);
}

function xpInspect_() {
  const ss = SpreadsheetApp.getActive(), T = XP.TEMPLATE;
  const r = { problems: [], notes: [], links: {}, rows: {}, order: [], lastLink: '' };
  try { r.links = xpCsv_(); } catch (err) { r.problems.push('the Site Links sheet could not be read (' + err.message + ')'); }
  ['cohort', 'dashboard', 'reports'].forEach(function (k) {
    if (!r.links[T + '.' + k]) r.problems.push('no ' + T + '.' + k + ' link on the Site Links sheet');
  });
  if (!r.links.master) r.problems.push('no master link on the Site Links sheet');
  if (!ss.getSheetByName('Setup')) r.problems.push('no Setup tab: run this in the CTLI Master Cohort 2027 sheet');

  /* Setup rows, from the Setup cell each Link_ tab reads */
  const rows = xpSetupRows_(ss, false);
  const names = Object.keys(rows).sort(function (a, b) { return rows[a] - rows[b]; });
  r.rows = rows; r.order = names; r.lastLink = names[names.length - 1] || '';
  if (!rows['Link_' + T]) r.problems.push('no Link_' + T + ' tab reading a row on the Setup tab');
  r.notes.push('Setup unit rows: ' + names.map(function (n) { return n.slice(5) + ' (row ' + rows[n] + ')'; }).join(', '));
  r.notes.push('New units go on the Setup tab just above ' + r.lastLink.slice(5) + ', and in the same place in the Master_Feed lists');

  /* Master_Feed: the CHOOSE lists must follow the Setup order */
  const feed = ss.getSheetByName('Master_Feed');
  if (!feed) r.problems.push('no Master_Feed tab');
  else {
    const row2 = feed.getRange(2, 1, 1, feed.getLastColumn()).getFormulasR1C1()[0];
    const cols = row2.map(function (f, i) { return f.indexOf('Link_') !== -1 ? i + 1 : 0; }).filter(Boolean);
    r.notes.push('Master_Feed: ' + cols.length + ' column(s) read the Link_ tabs');
    if (!cols.length) r.problems.push('no Master_Feed column reads the Link_ tabs');
    else {
      const refs = [];
      row2[cols[0] - 1].replace(/'?(Link_[A-Za-z_]+)'?!R\d+C\d+:R\d+C\d+/g, function (m, n) { refs.push(n); return m; });
      const list = refs.filter(function (n) { return !xpIsNew_(n.slice(5)); }).slice(0, names.length);
      if (list.join(',') !== names.join(',')) {
        r.problems.push('the Master_Feed list (' + list.join(', ') + ') is not in the same order as the Setup rows (' + names.join(', ') + ')');
      }
    }
  }

  /* Course_Summary */
  const cs = ss.getSheetByName('Course_Summary');
  if (cs) {
    const rr = cs.createTextFinder('Link_' + T).matchFormulaText(true).findAll().map(function (h) { return h.getRow(); });
    r.notes.push('Course_Summary: ' + (rr.length ? 'rows ' + Math.min.apply(null, rr) + ' to ' + Math.max.apply(null, rr) + ' read Link_' + T : 'no rows read Link_' + T));
  } else r.notes.push('No Course_Summary tab');

  /* Anything else that reads Link_EDULIS is not changed by this script */
  const other = [];
  ss.getSheets().forEach(function (sh) {
    const n = sh.getName();
    if (/^(setup|master_feed|course_summary)$/i.test(n) || /^Link_/.test(n) || sh.getLastRow() < 1) return;
    if (sh.createTextFinder('Link_' + T).matchFormulaText(true).findNext()) other.push(n);
  });
  if (other.length) r.notes.push('These tabs also read Link_' + T + ' and are NOT changed by the script: ' + other.join(', ') + '. Check whether the new units need adding there');

  const made = XP.UNITS.filter(function (u) { return xpGet_('XP_' + u.code + '_cohort'); }).map(function (u) { return u.code; });
  if (made.length) r.notes.push('Already made on an earlier run: ' + made.join(', '));
  return r;
}


/* =====================================================================
   2. ADD THE UNITS
   ===================================================================== */
function addExternalProjects() {
  const t0 = Date.now(), ss = SpreadsheetApp.getActive();
  const props = PropertiesService.getScriptProperties();
  const done = JSON.parse(props.getProperty(XP.PROGRESS) || '[]');
  const out = [];
  const info = xpInspect_();
  if (!done.length && info.problems.length) {
    out.push('NOTHING CHANGED. Fix these first: ' + info.problems.join(' | '));
    return xpFinish_(out.concat(info.notes), info);
  }
  const outOfTime = function () { return Date.now() - t0 > XP.LIMIT_MS; };
  const L = info.links;

  const steps = [['backup', 'Backup copies', function () { return xpBackup_(L); }]]
    .concat(XP.UNITS.map(function (u) { return ['cohort:' + u.code, u.code + ' cohort sheet', function () { return xpMakeCohort_(u, L); }]; }))
    .concat([['folders', 'Report folders', function () { return xpFolders_(L); }]])
    .concat(XP.UNITS.map(function (u) { return ['dash:' + u.code, u.code + ' dashboard', function () { return xpMakeDash_(u, L); }]; }))
    .concat([
      ['links', 'Master Cohort Link_ tabs', function () { return xpLinkTabs_(ss); }],
      ['setup', 'Master Cohort Setup rows', function () { return xpSetup_(ss); }],
      ['feed', 'Master Cohort Master_Feed', function () { return xpFeed_(ss, info.lastLink, outOfTime); }],
      ['summary', 'Master Cohort Course_Summary', function () { return xpCourseSummary_(ss); }],
      ['courselink', 'Dashboards: Course_Link import', function () { return xpCourseLink_(ss, L); }],
      ['master', 'CTLI Master Dashboard', function () { return xpMasterDash_(L); }],
      ['sitelinks', 'Site Links sheet', function () { return xpSiteLinksRows_(); }]
    ]);

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (done.indexOf(s[0]) !== -1) { out.push(s[1] + ': done on an earlier run'); continue; }
    if (outOfTime()) {
      out.push('Stopped to stay inside the time limit. Run addExternalProjects again to carry on.');
      return xpFinish_(out, info);
    }
    let res;
    try { res = s[2](); }
    catch (err) {
      out.push(s[1] + ': NOT DONE (' + err.message + '). Nothing after this step was changed. Fix it, then run addExternalProjects again.');
      return xpFinish_(out, info);
    }
    if (res === XP_STOP) {
      out.push(s[1] + ': part done. Run addExternalProjects again to carry on.');
      return xpFinish_(out, info);
    }
    out.push(s[1] + ': ' + res);
    done.push(s[0]);
    props.setProperty(XP.PROGRESS, JSON.stringify(done));
  }
  props.deleteProperty(XP.PROGRESS);
  out.push('ALL DONE. Work through the STILL TO DO list below.');
  xpFinish_(out, info);
}

/* Starts the run from the top again (files already made are reused, not made twice) */
function resetExternalProjectsRun() {
  const p = PropertiesService.getScriptProperties();
  p.deleteProperty(XP.PROGRESS); p.deleteProperty(XP.FEED_DONE);
  log_('External Projects: progress cleared. Files already made are kept and reused.');
}


/* ---------- Backups ---------- */
function xpBackup_(links) {
  const stamp = Utilities.formatDate(new Date(), XP.TZ, 'd MMM yyyy HH.mm');
  const out = [];
  [[SpreadsheetApp.getActive().getId(), 'Master Cohort'], [xpId_(links.master), 'Master Dashboard']].forEach(function (x) {
    if (!x[0]) return;
    const f = DriveApp.getFileById(x[0]);
    const c = f.makeCopy('BACKUP before External Projects (' + stamp + ') ' + f.getName(), xpParent_(f));
    out.push(x[1] + ' backed up');
  });
  return out.join(', ');
}

/* ---------- Unit cohort sheets ---------- */
function xpMakeCohort_(u, links) {
  const key = 'XP_' + u.code + '_cohort';
  const have = xpGet_(key);
  if (have && xpOpens_(have)) return 'already made: ' + xpSheetUrl_(have);
  const tplUrl = links[XP.TEMPLATE + '.cohort'];
  if (!tplUrl) throw new Error('no ' + XP.TEMPLATE + '.cohort link on the Site Links sheet');
  const tpl = DriveApp.getFileById(xpId_(tplUrl));
  const copy = tpl.makeCopy(xpName_(tpl.getName(), u), xpParent_(tpl));
  xpSharing_(tpl, copy);
  xpSet_(key, copy.getId());
  const ss = SpreadsheetApp.openById(copy.getId());
  const cleared = xpClearCohort_(ss);
  const relabelled = xpRetext_(ss, u);
  SpreadsheetApp.flush();
  const label = xpLabel_(ss, u);
  xpSet_('XP_' + u.code + '_label', label);
  return xpSheetUrl_(copy.getId()) + ' (' + cleared + ' input column(s) and cells emptied, ' + relabelled +
    ' label(s) changed; the unit shows as "' + label + '")';
}

/* Empties every cell a PC, intern or LMS Admin types in. Formulas, lists and the school list stay. */
function xpClearCohort_(ss) {
  let n = 0;
  ss.getSheets().forEach(function (sh) {
    const name = sh.getName();
    if (/^(lists|how to|master_feed)$/i.test(name) || sh.getLastRow() < 1 || sh.getLastColumn() < 1) return;
    if (/^summary$/i.test(name)) { n += xpClearSummary_(sh); return; }
    const hr = plotHeader_(sh);
    if (!hr) return;
    if (hr.row > 1) n += xpClearInputs_(sh, 1, hr.row - 1);   /* course details above the headings */
    const last = sh.getLastRow();
    if (last <= hr.row) return;
    const W = sh.getLastColumn(), first = hr.row + 1, rows = last - hr.row;
    const bg = sh.getRange(first, 1, 1, W).getBackgrounds()[0].map(function (b) { return String(b).toLowerCase(); });
    bg.forEach(function (b, i) {
      if (XP_INPUT.indexOf(b) === -1) return;
      const rng = sh.getRange(first, i + 1, rows, 1);
      const f = rng.getFormulas();
      if (f.some(function (x) { return x[0]; })) rng.setFormulas(f); else rng.clearContent();
      rng.clearNote();
      rng.setBackground(isFlag_(b) ? SL.PC : b);   /* amber and red school flags go back to yellow */
      n++;
    });
  });
  return n;
}

/* Input-coloured cells without formulas in rows r1 to r2 */
function xpClearInputs_(sh, r1, r2) {
  const W = sh.getLastColumn();
  const rng = sh.getRange(r1, 1, r2 - r1 + 1, W);
  const bg = rng.getBackgrounds(), f = rng.getFormulas(), v = rng.getValues();
  const a1 = [];
  for (let i = 0; i < v.length; i++) for (let j = 0; j < W; j++) {
    if (!f[i][j] && v[i][j] !== '' && XP_INPUT.indexOf(String(bg[i][j]).toLowerCase()) !== -1) a1.push(xpA1_(r1 + i, j + 1));
  }
  if (a1.length) sh.getRangeList(a1).clearContent();
  return a1.length;
}

/* Summary: the course rows keep their formulas (course tab links, counts); everything typed is emptied */
function xpClearSummary_(sh) {
  const hr = summaryHead_(sh);
  if (!hr) return 0;
  const last = sh.getLastRow();
  if (last <= hr.row) return 0;
  const fA = sh.getRange(hr.row + 1, 1, last - hr.row, 1).getFormulas();
  const withF = fA.map(function (x, i) { return x[0] ? i : -1; }).filter(function (i) { return i !== -1; });
  const r1 = hr.row + 1 + (withF.length ? withF[0] : 0);
  const r2 = withF.length ? hr.row + 1 + withF[withF.length - 1] : last;
  const rng = sh.getRange(r1, 1, r2 - r1 + 1, sh.getLastColumn());
  const f = rng.getFormulas(), v = rng.getValues();
  let n = 0;
  v.forEach(function (row, i) { row.forEach(function (x, j) { if (!f[i][j] && x !== '') n++; }); });
  rng.setFormulas(f);
  rng.clearNote();
  return n;
}

/* EDULIS becomes the new code, and its full name the new unit's name, in tab names, titles and labels */
function xpRetext_(ss, u) {
  let n = 0;
  ss.getSheets().forEach(function (sh) {
    const nm = sh.getName(), nn = xpRe_(nm, u);
    if (nn !== nm) { sh.setName(nn); n++; }   /* formulas that name the tab follow the new name by themselves */
  });
  ss.getSheets().forEach(function (sh) {
    const R = sh.getLastRow(), W = sh.getLastColumn();
    if (R < 1 || W < 1) return;
    const rows = R * W > XP.BIG ? Math.min(R, 12) : R;
    const rng = sh.getRange(1, 1, rows, W);
    const f = rng.getFormulas(), v = rng.getValues();
    for (let i = 0; i < rows; i++) for (let j = 0; j < W; j++) {
      if (f[i][j]) {
        const nf = xpRe_(f[i][j], u);
        if (nf !== f[i][j]) { sh.getRange(i + 1, j + 1).setFormula(nf); n++; }
      } else if (typeof v[i][j] === 'string' && v[i][j]) {
        const nv = xpRe_(v[i][j], u);
        if (nv !== v[i][j]) { sh.getRange(i + 1, j + 1).setValue(nv); n++; }
      }
    }
  });
  try { ss.rename(xpName_(ss.getName(), u)); } catch (err) { /* name already set by the copy */ }
  return n;
}

/* The unit label the cohort sheet sends to the Master (the Unit column on its Summary tab) */
function xpLabel_(ss, u) {
  const sm = ss.getSheetByName('Summary');
  if (sm) {
    const hr = summaryHead_(sm);
    if (hr) {
      const h = sm.getRange(hr.row, 1, 1, sm.getLastColumn()).getDisplayValues()[0].map(function (x) { return x.trim().toLowerCase(); });
      const c = h.indexOf('unit');
      if (c !== -1) { const v = sm.getRange(hr.row + 1, c + 1).getDisplayValue().trim(); if (v) return v; }
    }
  }
  return u.code;
}

/* ---------- Report folders ---------- */
function xpFolders_(links) {
  const tplUrl = links[XP.TEMPLATE + '.reports'];
  if (!tplUrl) throw new Error('no ' + XP.TEMPLATE + '.reports link on the Site Links sheet');
  const tpl = DriveApp.getFolderById(xpId_(tplUrl));
  const parent = tpl.getParents().hasNext() ? tpl.getParents().next() : DriveApp.getRootFolder();
  const out = [];
  XP.UNITS.forEach(function (u) {
    const key = 'XP_' + u.code + '_reports';
    const have = xpGet_(key);
    if (have) { try { DriveApp.getFolderById(have); out.push(u.code + ' already made'); return; } catch (err) { /* deleted: make again */ } }
    const name = xpName_(tpl.getName(), u);
    const it = parent.getFoldersByName(name);
    const f = it.hasNext() ? it.next() : parent.createFolder(name);
    xpSharing_(tpl, f);
    xpSet_(key, f.getId());
    out.push(u.code + ': "' + name + '"');
  });
  return out.join(', ') + ' (in "' + parent.getName() + '")';
}

/* ---------- Unit dashboards ---------- */
function xpMakeDash_(u, links) {
  const key = 'XP_' + u.code + '_dashboard';
  const have = xpGet_(key);
  if (have && xpOpens_(have)) return 'already made: ' + xpSheetUrl_(have);
  const tplUrl = links[XP.TEMPLATE + '.dashboard'];
  if (!tplUrl) throw new Error('no ' + XP.TEMPLATE + '.dashboard link on the Site Links sheet');
  const tpl = DriveApp.getFileById(xpId_(tplUrl));
  const copy = tpl.makeCopy(xpName_(tpl.getName(), u), xpParent_(tpl));
  xpSharing_(tpl, copy);
  xpSet_(key, copy.getId());
  const ss = SpreadsheetApp.openById(copy.getId());
  const n = xpRetext_(ss, u);
  const label = xpGet_('XP_' + u.code + '_label') || u.code;
  let note = '';
  const lists = ss.getSheetByName('Lists');
  const src = lists ? listRange_(lists, /^all units?$/i) : null;
  if (src) {
    const vals = src.getDisplayValues().map(function (x) { return x[0].trim(); });
    note = '; Unit list: ' + vals.join(', ');
    if (vals.indexOf(label) === -1 && vals.length >= 2) { lists.getRange(src.getRow() + 1, src.getColumn()).setValue(label); note += ' (set to ' + label + ')'; }
  }
  if (label !== u.code) note += '. NOTE: the cohort sheet labels this unit "' + label + '": check the dashboard filter shows the same';
  return xpSheetUrl_(copy.getId()) + ' (' + n + ' label(s) changed' + note + ')';
}

/* ---------- Master Cohort: Link_ tabs ---------- */
/* Copies of Link_EDULIS. They are pointed at their own Setup rows in the Setup step. */
function xpLinkTabs_(ss) {
  const tpl = ss.getSheetByName('Link_' + XP.TEMPLATE);
  if (!tpl) throw new Error('no Link_' + XP.TEMPLATE + ' tab');
  const out = [];
  XP.UNITS.forEach(function (u, i) {
    const name = 'Link_' + u.code;
    if (ss.getSheetByName(name)) { out.push(name + ' already there'); return; }
    const sh = tpl.copyTo(ss).setName(name);
    ss.setActiveSheet(sh);
    ss.moveActiveSheet(tpl.getIndex() + 1 + i);
    const top = sh.getRange(1, 1, 3, sh.getMaxColumns());
    const v = top.getValues(), f = top.getFormulas();
    v.forEach(function (row, r) { row.forEach(function (x, c) {
      if (!f[r][c] && typeof x === 'string' && x.indexOf(XP.TEMPLATE) !== -1) sh.getRange(r + 1, c + 1).setValue(xpRe_(x, u));
    }); });
    if (tpl.isSheetHidden()) sh.hideSheet();
    out.push(name);
  });
  return out.join(', ');
}

/* ---------- Master Cohort: Setup rows ---------- */
function xpSetup_(ss) {
  const st = ss.getSheetByName('Setup');
  if (!st) throw new Error('no Setup tab');
  const T = XP.TEMPLATE, k = XP.UNITS.length;
  const already = st.createTextFinder('Link_' + XP.UNITS[0].code).matchFormulaText(true).findNext() ||
    st.createTextFinder(XP.UNITS[0].code).matchEntireCell(true).findNext();
  if (already) return 'already done (row ' + already.getRow() + ')';
  XP.UNITS.forEach(function (u) { if (!xpGet_('XP_' + u.code + '_cohort')) throw new Error('the ' + u.code + ' cohort sheet has not been made'); });

  const rows = xpSetupRows_(ss, false);
  const tplRow = rows['Link_' + T];
  if (!tplRow) throw new Error('Link_' + T + ' does not read a row on the Setup tab');
  const all = Object.keys(rows).map(function (x) { return rows[x]; });
  const U0 = Math.min.apply(null, all), L = Math.max.apply(null, all);
  const W = st.getLastColumn();

  /* New rows go just above the last unit row, so every total and range over the unit rows grows by itself */
  st.insertRowsBefore(L, k);
  const src = tplRow >= L ? tplRow + k : tplRow;
  XP.UNITS.forEach(function (u, i) {
    xpCopyBlock_(st, src, 1, L + i, W, u, xpSheetUrl_(xpGet_('XP_' + u.code + '_cohort')));
  });
  /* The unit that was last now sits below the new rows: its "row above" references move to the last new row */
  const fixed = xpFixRow_(st, L + k, W, L - 1, L + k - 1);

  /* Unit numbers in column A, if the rows are numbered */
  const a = st.getRange(U0, 1, L + k - U0 + 1, 1);
  const av = a.getValues(), af = a.getFormulas();
  if (av.every(function (x, i) { return !af[i][0] && typeof x[0] === 'number'; })) a.setValues(av.map(function (x, i) { return [i + 1]; }));

  /* Point each new Link_ tab at its own Setup row */
  const tplNow = xpSetupRow_(ss.getSheetByName('Link_' + T));
  let pointed = 0;
  XP.UNITS.forEach(function (u, i) {
    const sh = ss.getSheetByName('Link_' + u.code);
    if (sh) pointed += xpRetarget_(sh, tplNow, L + i);
  });
  return k + ' rows added at rows ' + L + ' to ' + (L + k - 1) + ' with the new cohort sheet links' +
    (fixed ? '; ' + fixed + ' running total formula(s) on the row below moved on' : '') +
    '; ' + pointed + ' Link_ formula(s) pointed at the new rows';
}

/* ---------- Master Cohort: Master_Feed ---------- */
/* Every Master_Feed column that picks from the Link_ tabs gets the three new tabs, just before the last unit */
function xpFeed_(ss, lastLink, outOfTime) {
  const feed = ss.getSheetByName('Master_Feed');
  if (!feed) throw new Error('no Master_Feed tab');
  if (!lastLink) throw new Error('could not tell which unit is last on the Setup tab');
  const W = feed.getLastColumn(), rows = feed.getMaxRows() - 1;
  const row2 = feed.getRange(2, 1, 1, W).getFormulasR1C1()[0];
  const done = JSON.parse(xpGet_(XP.FEED_DONE) || '[]');
  const first = 'Link_' + XP.UNITS[0].code;
  let n = 0;
  for (let c = 1; c <= W; c++) {
    const f = row2[c - 1];
    if (!f || f.indexOf('Link_') === -1) continue;
    if (done.indexOf(c) !== -1 || f.indexOf(first + '!') !== -1 || f.indexOf("'" + first + "'!") !== -1) continue;
    if (outOfTime()) { xpSet_(XP.FEED_DONE, JSON.stringify(done)); return XP_STOP; }
    const nf = xpAddChoose_(f, lastLink);
    if (nf === f) throw new Error('Master_Feed column ' + xpCol_(c) + ' does not list ' + lastLink);
    const mid = Math.floor(rows / 2) + 1, end = rows + 1;
    const same = [mid, end].every(function (r) { return feed.getRange(r, c).getFormulaR1C1() === f; });
    if (same) feed.getRange(2, c, rows, 1).setFormulaR1C1(nf);
    else {
      for (let r = 2; r <= end; r += 2000) {
        const rng = feed.getRange(r, c, Math.min(2000, end - r + 1), 1);
        rng.setFormulasR1C1(rng.getFormulasR1C1().map(function (x) { return [x[0] ? xpAddChoose_(x[0], lastLink) : '']; }));
      }
    }
    done.push(c); n++;
    xpSet_(XP.FEED_DONE, JSON.stringify(done));
  }
  xpDel_(XP.FEED_DONE);
  return done.length + ' column(s) now read the new Link_ tabs';
}

function xpAddChoose_(f, lastLink) {
  const re = new RegExp("('?)" + lastLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\1!(R\\d+C\\d+:R\\d+C\\d+)", 'g');
  return f.replace(re, function (m, q, rng) {
    return XP.UNITS.map(function (u) { return q + 'Link_' + u.code + q + '!' + rng; }).join(',') + ',' + m;
  });
}

/* ---------- Master Cohort: Course_Summary ---------- */
function xpCourseSummary_(ss) {
  const cs = ss.getSheetByName('Course_Summary');
  if (!cs) return 'no Course_Summary tab: nothing to do';
  if (cs.createTextFinder('Link_' + XP.UNITS[0].code).matchFormulaText(true).findNext()) return 'already done';
  const rr = cs.createTextFinder('Link_' + XP.TEMPLATE).matchFormulaText(true).findAll().map(function (h) { return h.getRow(); });
  if (!rr.length) throw new Error('no Course_Summary rows read Link_' + XP.TEMPLATE);
  const first = Math.min.apply(null, rr), last = Math.max.apply(null, rr), n = last - first + 1, k = XP.UNITS.length;
  const W = cs.getLastColumn();
  /* Inserted between existing rows, so anything that reads the whole list grows with it */
  const after = cs.getLastRow() > last;
  let src, at;
  if (after) { cs.insertRowsAfter(last, n * k); src = first; at = last + 1; }
  else { cs.insertRowsBefore(first, n * k); src = first + n * k; at = first; }
  XP.UNITS.forEach(function (u, i) { xpCopyBlock_(cs, src, n, at + i * n, W, u, null); });
  return (n * k) + ' rows added (' + n + ' per unit) at rows ' + at + ' to ' + (at + n * k - 1);
}

/* ---------- Dashboards: Course_Link reads the longer Course_Summary ---------- */
function xpCourseLink_(ss, links) {
  const cs = ss.getSheetByName('Course_Summary');
  if (!cs) return 'no Course_Summary tab: nothing to do';
  const need = cs.getLastRow();
  const ids = {};
  Object.keys(links).forEach(function (k) {
    if (k === 'master' || /\.dashboard$/.test(k)) { const id = xpId_(links[k]); if (id) ids[id] = k === 'master' ? 'Master Dashboard' : k.split('.')[0]; }
  });
  XP.UNITS.forEach(function (u) { const id = xpGet_('XP_' + u.code + '_dashboard'); if (id) ids[id] = u.code; });
  const out = [];
  Object.keys(ids).forEach(function (id) {
    try { out.push(ids[id] + ': ' + xpWidenCourseLink_(SpreadsheetApp.openById(id), need)); }
    catch (err) { out.push(ids[id] + ': NOT DONE (' + err.message + ')'); }
  });
  return out.join('; ');
}

function xpWidenCourseLink_(ss, need) {
  const cl = ss.getSheetByName('Course_Link');
  if (!cl) return 'no Course_Link tab';
  const f = cl.getRange(1, 1, 1, Math.min(cl.getMaxColumns(), 30)).getFormulas()[0];
  const col = f.findIndex(function (x) { return /Course_Summary!/i.test(x); });
  if (col === -1) return 'no Course_Summary import in row 1 of Course_Link';
  const m = f[col].match(/Course_Summary!\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)/i);
  if (!m) return 'the import range was not recognised: check by hand';
  const start = +m[2], end = +m[4];
  if (end >= need) return 'already reads to row ' + end;
  cl.getRange(1, col + 1).setFormula(f[col].replace(m[0], 'Course_Summary!' + m[1] + start + ':' + m[3] + need));
  const oldLast = end - start + 1, newLast = need - start + 1;
  if (cl.getMaxRows() < newLast + 5) cl.insertRowsAfter(cl.getMaxRows(), newLast + 5 - cl.getMaxRows());
  let n = 0;
  ss.getSheets().forEach(function (sh) {
    if (sh.getLastRow() < 1 || sh.getName() === 'Course_Link') return;
    sh.createTextFinder('Course_Link').matchFormulaText(true).findAll().forEach(function (c) {
      const x = c.getFormula();
      if (!x) return;
      const y = x.replace(/(Course_Link'?!\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?)(\d+)/g, function (mm, a, b) { return +b === oldLast ? a + newLast : mm; });
      if (y !== x) { c.setFormula(y); n++; }
    });
  });
  return 'reads Course_Summary to row ' + need + (n ? ', ' + n + ' formula(s) that read Course_Link widened' : '');
}

/* ---------- CTLI Master Dashboard ---------- */
function xpMasterDash_(links) {
  const ss = SpreadsheetApp.openById(xpId_(links.master));
  const labels = XP.UNITS.map(function (u) { return xpGet_('XP_' + u.code + '_label') || u.code; });
  const out = ['Unit filter: ' + xpAddToList_(ss, labels), 'District Overview: ' + xpAddUnitCols_(ss, labels)];
  const other = [];
  ss.getSheets().forEach(function (sh) {
    if (/^(lists|district overview|data_link|course_link|moodle_completions|master participant data)$/i.test(sh.getName()) || sh.getLastRow() < 1) return;
    const hits = sh.createTextFinder(XP.TEMPLATE).matchEntireCell(true).findAll();
    if (hits.length) other.push(sh.getName() + ' ' + hits.slice(0, 5).map(function (h) { return h.getA1Notation(); }).join(','));
  });
  if (other.length) out.push(XP.TEMPLATE + ' is also named on ' + other.join('; ') + ': check whether the new units belong there too');
  try { fixDashboardDropdowns(); out.push('dropdowns reset'); } catch (err) { out.push('run fixDashboardDropdowns by hand (' + err.message + ')'); }
  return out.join('; ');
}

/* Adds the new unit labels to the list under "All units" on the Lists tab, and widens formulas that read it */
function xpAddToList_(ss, labels) {
  const lists = ss.getSheetByName('Lists');
  if (!lists) return 'no Lists tab';
  const src = listRange_(lists, /^all units?$/i);
  if (!src) return 'no list starting with "All units" on the Lists tab';
  const vals = src.getDisplayValues().map(function (x) { return x[0].trim(); });
  const add = labels.filter(function (l) { return vals.indexOf(l) === -1; });
  if (!add.length) return 'already there';
  const col = src.getColumn(), top = src.getRow(), first = top + 1, last = top + src.getNumRows() - 1;
  if (lists.getRange(last + 1, col, add.length, 1).getDisplayValues().some(function (x) { return x[0].trim(); })) {
    return 'the cells under the list are in use: add ' + add.join(', ') + ' by hand';
  }
  lists.getRange(last, col).copyTo(lists.getRange(last + 1, col, add.length, 1), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  lists.getRange(last + 1, col, add.length, 1).setValues(add.map(function (x) { return [x]; }));
  const L = xpCol_(col), nl = last + add.length;
  let n = 0;
  [[first, last], [top, last]].forEach(function (p) {
    const oldRef = 'Lists!$' + L + '$' + p[0] + ':$' + L + '$' + p[1], newRef = 'Lists!$' + L + '$' + p[0] + ':$' + L + '$' + nl;
    ss.getSheets().forEach(function (sh) {
      if (sh.getLastRow() < 1) return;
      n += sh.getDataRange().createTextFinder(oldRef).matchFormulaText(true).replaceAllWith(newRef);
    });
  });
  return 'added ' + add.join(', ') + (n ? ', ' + n + ' formula(s) widened' : '');
}

/* The by-unit table on District Overview (units across, districts down): a column per new unit after EDULIS */
function xpAddUnitCols_(ss, labels) {
  const ov = ss.getSheetByName('District Overview');
  if (!ov) return 'no District Overview tab';
  const W = ov.getLastColumn(), R = Math.min(15, ov.getMaxRows());
  const top = ov.getRange(1, 1, R, W).getDisplayValues();
  let hr = -1, hc = -1;
  for (let r = 0; r < R && hr === -1; r++) for (let c = 0; c < W; c++) if (top[r][c].trim() === XP.TEMPLATE) { hr = r; hc = c; break; }
  if (hr === -1) return 'no ' + XP.TEMPLATE + ' column heading found, nothing changed (check by hand whether it lists units)';
  if (labels.some(function (l) { return top[hr].map(function (x) { return x.trim(); }).indexOf(l) !== -1; })) return 'already there';
  const col = hc + 1, k = labels.length, last = ov.getLastRow();
  ov.insertColumnsAfter(col, k);
  labels.forEach(function (label, i) { xpCopyCol_(ov, col, col + 1 + i, last, label); });
  /* A total column straight after the units: its sums run across the new columns too */
  const next = col + k + 1, oldL = xpCol_(col), newL = xpCol_(col + k);
  const nr = ov.getRange(1, next, last, 1), nf = nr.getFormulas();
  const re = new RegExp('(\\$?[A-Z]{1,3}\\$?\\d+:\\$?)' + oldL + '(\\$?\\d+)', 'g');
  let t = 0;
  const out = nf.map(function (x) { if (!x[0]) return [x[0]]; const y = x[0].replace(re, '$1' + newL + '$2'); if (y !== x[0]) t++; return [y]; });
  if (t) nf.forEach(function (x, i) { if (x[0] && out[i][0] !== x[0]) ov.getRange(i + 1, next).setFormula(out[i][0]); });
  return k + ' unit column(s) added after ' + XP.TEMPLATE + (t ? ', ' + t + ' total formula(s) widened' : '') + '. Look over the table once';
}

function xpCopyCol_(sh, src, dst, last, label) {
  const from = sh.getRange(1, src, last, 1), to = sh.getRange(1, dst, last, 1);
  from.copyTo(to, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  const f = from.getFormulas(), v = from.getValues();
  to.setValues(f.map(function (r, i) {
    if (r[0]) return [xpMap_(r[0].split('"' + XP.TEMPLATE + '"').join('"' + label + '"'), xpShiftFn_(0, dst - src))];
    const x = v[i][0];
    return [typeof x === 'string' && x.trim() === XP.TEMPLATE ? label : x];
  }));
  sh.setColumnWidth(dst, sh.getColumnWidth(src));
}

/* ---------- Site Links sheet ---------- */
function xpSiteRows_() {
  const rows = [];
  XP.UNITS.forEach(function (u) {
    const unit = XP.GROUP + ': ' + u.name;
    const c = xpGet_('XP_' + u.code + '_cohort'), d = xpGet_('XP_' + u.code + '_dashboard'), r = xpGet_('XP_' + u.code + '_reports');
    rows.push([u.code + '.cohort', unit, 'Cohort sheet', c ? xpSheetUrl_(c) : '']);
    rows.push([u.code + '.dashboard', unit, 'Unit dashboard', d ? xpSheetUrl_(d) : '']);
    rows.push([u.code + '.reports', unit, 'Folder: completion reports', r ? xpFolderUrl_(r) : '']);
  });
  return rows;
}

function xpSiteLinksRows_() {
  const url = String(XP.SITE_LINKS_SHEET || '').trim();
  if (!url) return 'not added: XP.SITE_LINKS_SHEET is empty. The 9 rows are on the External Projects tab: paste them into the Links tab';
  const T = XP.TEMPLATE;
  const sl = SpreadsheetApp.openByUrl(url);
  const tab = sl.getSheets().filter(function (sh) { return sh.createTextFinder(T + '.reports').matchEntireCell(true).findNext(); })[0];
  if (!tab) throw new Error('no ' + T + '.reports row on the Site Links sheet');
  if (tab.createTextFinder(XP.UNITS[0].code + '.cohort').matchEntireCell(true).findNext()) return 'already there';
  const hit = ['cohort', 'dashboard', 'reports'].map(function (k) { return tab.createTextFinder(T + '.' + k).matchEntireCell(true).findNext(); });
  if (hit.some(function (h) { return !h; })) throw new Error('the three ' + T + ' rows were not all found');
  const rr = hit.map(function (h) { return h.getRow(); });
  const r0 = Math.min.apply(null, rr), r1 = Math.max.apply(null, rr);
  if (r1 - r0 !== 2) throw new Error('the three ' + T + ' rows are not together');
  const codeCol = hit[0].getColumn(), W = tab.getLastColumn();
  const tv = tab.getRange(r0, 1, 1, W).getValues()[0];
  let linkCol = tv.findIndex(function (x) { return /^https?:\/\//.test(String(x).trim()); }) + 1;
  if (!linkCol) linkCol = 4;   /* the yellow Link column */
  const want = xpSiteRows_();
  tab.insertRowsAfter(r1, want.length);
  XP.UNITS.forEach(function (u, i) {
    const dst = r1 + 1 + i * 3;
    xpCopyBlock_(tab, r0, 3, dst, W, u, null);
    for (let k = 0; k < 3; k++) {
      const row = dst + k, w = want[i * 3 + k];
      tab.getRange(row, linkCol).setValue(w[3]);
      const v = tab.getRange(row, 1, 1, W).getValues()[0];
      v.forEach(function (x, c) { if (c + 1 !== codeCol && String(x).trim() === u.code) tab.getRange(row, c + 1).setValue(w[1]); });
    }
  });
  return want.length + ' rows added after the ' + T + ' rows. The site and scripts pick them up within about 5 minutes';
}


/* =====================================================================
   3. THE EXTERNAL PROJECTS TAB (results and what is left to do)
   ===================================================================== */
function xpFinish_(out, info) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(XP.REPORT_TAB) || ss.insertSheet(XP.REPORT_TAB);
  sh.clear();
  const W = 5, rows = [];
  const fmt = [];   /* [row, kind] */
  const add = function (vals, kind) { const r = vals.slice(0, W); while (r.length < W) r.push(''); rows.push(r); if (kind) fmt.push([rows.length, kind]); };

  add(['EXTERNAL PROJECTS: SETUP'], 'title');
  add(['Last run ' + Utilities.formatDate(new Date(), XP.TZ, 'd MMM yyyy HH:mm') + '. Units: ' + XP.UNITS.map(function (u) { return u.code + ' (' + u.name + ')'; }).join(', ')], 'sub');
  add([]);
  add(['RESULT'], 'head');
  out.forEach(function (x) { add([x], 'line'); });
  add([]);
  add(['Unit', 'Code', 'Cohort sheet', 'Dashboard', 'Report folder'], 'cols');
  XP.UNITS.forEach(function (u) {
    const c = xpGet_('XP_' + u.code + '_cohort'), d = xpGet_('XP_' + u.code + '_dashboard'), r = xpGet_('XP_' + u.code + '_reports');
    add([XP.GROUP + ': ' + u.name, u.code, c ? xpSheetUrl_(c) : 'not made yet', d ? xpSheetUrl_(d) : 'not made yet', r ? xpFolderUrl_(r) : 'not made yet'], 'cell');
  });
  add([]);
  add(['STILL TO DO BY HAND, IN THIS ORDER'], 'head');
  [
    '1. This Master Cohort: open Link_' + XP.UNITS.map(function (u) { return u.code; }).join(', Link_') + '. On each, click A1 and choose Allow access.',
    '2. Each new dashboard: click A1 on Data_Link, A1 on Course_Link and A6 on Moodle_Completions, and choose Allow access each time.',
    '3. Site Links sheet: if the RESULT above says the rows were not added, paste the 9 rows below into the Links tab (after the EDULIS rows). Wait 5 minutes.',
    '4. Run pushSchoolList (School list menu). It sends the school list and switches on school name correction on the new cohort sheets.',
    '5. Share each new cohort sheet with its PCs (as the other units are) and each new dashboard as Viewer.',
    '6. Request sheet: paste in the new Course_Requests_2027, run updateLiveForm, then setup. Add the Unit Heads for the new units.',
    '7. PLO Quality Check sheet: Quality check > Refresh courses. Add the new units\' PCs on the PCs tab.',
    '8. Moodle Upload sheet: if it has its own unit list, add ' + XP.UNITS.map(function (u) { return u.code; }).join(', ') + '.',
    '9. GitHub: upload links.js, index.html, README.md and sop-content.js. The External Projects tile then shows on the site.'
  ].forEach(function (x) { add([x], 'line'); });
  add([]);
  add(['SITE LINKS ROWS (Links tab, after the EDULIS rows)'], 'head');
  add(['Code', 'Unit', 'Link type', 'Link'], 'cols');
  xpSiteRows_().forEach(function (r) { add(r, 'cell'); });
  if (info && info.notes && info.notes.length) {
    add([]);
    add(['WHAT THE CHECK FOUND'], 'head');
    info.notes.forEach(function (x) { add([x], 'line'); });
  }

  sh.getRange(1, 1, rows.length, W).setValues(rows).setFontFamily(SL.FONT).setFontSize(10).setVerticalAlignment('middle');
  fmt.forEach(function (f) {
    const rg = sh.getRange(f[0], 1, 1, W);
    if (f[1] === 'title') { rg.merge().setBackground(SL.NAVY).setFontColor('#ffffff').setFontWeight('bold').setFontSize(14); sh.setRowHeight(f[0], 34); }
    else if (f[1] === 'sub') rg.merge().setBackground(SL.DEEP).setFontColor('#ffffff').setWrap(true);
    else if (f[1] === 'head') rg.merge().setBackground('#8D6E97').setFontColor('#ffffff').setFontWeight('bold');
    else if (f[1] === 'cols') rg.setBackground(SL.LIGHT).setFontWeight('bold');
    else if (f[1] === 'line') rg.merge().setWrap(true);
    else if (f[1] === 'cell') rg.setWrap(true);
  });
  [260, 160, 300, 300, 300].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.setHiddenGridlines(true);
  ss.setActiveSheet(sh);
  log_('External Projects: ' + out[out.length - 1] + ' Details on the External Projects tab.');
}


/* =====================================================================
   4. HELPERS
   ===================================================================== */

/* Every code and link on the published Site Links sheet */
function xpCsv_() {
  const csv = UrlFetchApp.fetch(SL.SITE_LINKS_CSV + '&t=' + Date.now()).getContentText();
  const out = {};
  Utilities.parseCsv(csv).forEach(function (row) {
    const cells = row.map(function (c) { return String(c || '').trim(); });
    const code = cells.filter(function (c) { return /^(request|tracker|qc|master|reports|[A-Za-z_]+\.(cohort|dashboard|reports))$/.test(c); })[0];
    const url = cells.filter(function (c) { return /^https:\/\//.test(c); })[0];
    if (code && url) out[code] = url;
  });
  return out;
}

/* The Setup row a Link_ tab reads (from its import formulas in row 1) */
function xpSetupRow_(sh) {
  if (!sh) return 0;
  const f = sh.getRange(1, 1, 1, Math.min(sh.getMaxColumns(), 80)).getFormulas()[0].join(' ');
  const m = f.match(/Setup!\$?[A-Z]+\$?(\d+)/);
  return m ? +m[1] : 0;
}

function xpSetupRows_(ss, withNew) {
  const out = {};
  ss.getSheets().forEach(function (sh) {
    const n = sh.getName();
    if (!/^Link_/.test(n) || (!withNew && xpIsNew_(n.slice(5)))) return;
    const r = xpSetupRow_(sh);
    if (r) out[n] = r;
  });
  return out;
}

function xpIsNew_(code) { return XP.UNITS.some(function (u) { return u.code === code; }); }

function xpRetarget_(sh, oldRow, newRow) {
  const rng = sh.getRange(1, 1, 3, Math.min(sh.getMaxColumns(), 80));
  const f = rng.getFormulas();
  let n = 0;
  f.forEach(function (row, i) { row.forEach(function (x, j) {
    if (!x) return;
    const y = x.replace(/(Setup!\$?[A-Z]+\$?)(\d+)/g, function (m, a, b) { return +b === oldRow ? a + newRow : m; });
    if (y !== x) { sh.getRange(i + 1, j + 1).setFormula(y); n++; }
  }); });
  return n;
}

/* Copies n rows from src to dst: formats, dropdowns, values and formulas. References to other tabs stay
   exactly as they are; references on the same tab move with the rows. Then EDULIS becomes the new unit. */
function xpCopyBlock_(sh, src, n, dst, W, u, url) {
  const from = sh.getRange(src, 1, n, W), to = sh.getRange(dst, 1, n, W);
  from.copyTo(to, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  from.copyTo(to, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
  const f = from.getFormulas(), v = from.getValues(), notes = from.getNotes();
  const shift = xpShiftFn_(dst - src, 0);
  to.setValues(f.map(function (row, i) {
    return row.map(function (x, j) {
      if (x) return xpRe_(xpMap_(x, shift), u);
      const val = v[i][j];
      if (typeof val !== 'string') return val;
      if (url && /^https:\/\/docs\.google\.com\/spreadsheets\//.test(val.trim())) return url;
      return xpRe_(val, u);
    });
  }));
  to.setNotes(notes.map(function (row) { return row.map(function (x) { return xpRe_(x, u); }); }));
}

/* In one row, same-tab references to oldRow (without $) become newRow */
function xpFixRow_(sh, row, W, oldRow, newRow) {
  const f = sh.getRange(row, 1, 1, W).getFormulas()[0];
  let n = 0;
  f.forEach(function (x, j) {
    if (!x) return;
    const y = xpMap_(x, function (ca, c, ra, r) { return [c, !ra && r === oldRow ? newRow : r]; });
    if (y !== x) { sh.getRange(row, j + 1).setFormula(y); n++; }
  });
  return n;
}

/* Walks the cell references in a formula (outside text in quotes). References to another tab are left alone. */
const XP_REF = /(?<![A-Za-z0-9_.$'!:])((?:'(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_.]*)!)?(\$?)([A-Z]{1,3})(\$?)(\d+)(?::(\$?)([A-Z]{1,3})(\$?)(\d+))?(?![A-Za-z0-9_(!])/g;
function xpMap_(formula, fn) {
  return String(formula).split(/("(?:[^"]|"")*")/).map(function (part, i) {
    if (i % 2) return part;
    return part.replace(XP_REF, function (m, sheet, ca, c, ra, r, cb, c2, rb, r2) {
      if (sheet) return m;
      const a = fn(ca, c, ra, +r);
      let s = ca + a[0] + ra + a[1];
      if (c2) { const b = fn(cb, c2, rb, +r2); s += ':' + cb + b[0] + rb + b[1]; }
      return s;
    });
  }).join('');
}

function xpShiftFn_(dr, dc) {
  return function (ca, c, ra, r) { return [ca || !dc ? c : xpCol_(xpColN_(c) + dc), ra ? r : r + dr]; };
}

/* EDULIS becomes the unit code; "Library and information services" becomes the unit name */
function xpRe_(s, u) {
  const name = new RegExp(XP.TEMPLATE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return String(s).split(XP.TEMPLATE).join(u.code).replace(name, u.name);
}

function xpName_(name, u) {
  const n = xpRe_(name, u);
  return n !== name ? n : name + ' ' + u.code;
}

function xpSharing_(from, to) {
  try { to.setSharing(from.getSharingAccess(), from.getSharingPermission()); } catch (err) { /* left private: share by hand */ }
}

function xpParent_(file) { const p = file.getParents(); return p.hasNext() ? p.next() : DriveApp.getRootFolder(); }
function xpOpens_(id) { try { SpreadsheetApp.openById(id); return true; } catch (err) { return false; } }
function xpId_(url) {
  const m = String(url || '').match(/\/d\/([a-zA-Z0-9_-]{20,})/) || String(url || '').match(/folders\/([a-zA-Z0-9_-]{20,})/) || String(url || '').match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  return m ? m[1] : '';
}
function xpSheetUrl_(id) { return 'https://docs.google.com/spreadsheets/d/' + id + '/edit?usp=sharing'; }
function xpFolderUrl_(id) { return 'https://drive.google.com/drive/folders/' + id + '?usp=sharing'; }
function xpGet_(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function xpSet_(k, v) { PropertiesService.getScriptProperties().setProperty(k, v); }
function xpDel_(k) { PropertiesService.getScriptProperties().deleteProperty(k); }
function xpCol_(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function xpColN_(s) { let n = 0; for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64); return n; }
function xpA1_(r, c) { return xpCol_(c) + r; }
