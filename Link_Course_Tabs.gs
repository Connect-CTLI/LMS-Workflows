/**
 * Connect@CTLI Cohort Data 2027: link each Summary row to its course tab
 *
 * Turns the "Course tab" column on the Summary (A8:A22) into links that open the
 * matching course tab. The link keeps working when a tab is renamed, and the
 * name shown updates by itself.
 *
 * HOW TO USE (once per unit cohort sheet)
 *  1. Open the unit cohort sheet. Go to Extensions > Apps Script.
 *  2. Delete what is there, paste this whole file and click Save.
 *  3. Choose "linkCourseTabs" in the toolbar and click Run. Allow the permissions.
 *  4. Go back to the sheet. A note in the bottom corner says how many rows were linked.
 *  You can delete the script afterwards. The links stay.
 */

const SUMMARY_TAB = 'Summary';
const FIRST_ROW = 8;    // first course row on the Summary
const LAST_ROW = 22;    // last course row (15 courses)
const COUNT_COL = 12;   // column L: participant count, whose formula names the course tab

function linkCourseTabs() {
  const ss = SpreadsheetApp.getActive();
  if (!ss) throw new Error('Open the unit cohort sheet and run this from Extensions > Apps Script there.');
  const sm = ss.getSheetByName(SUMMARY_TAB);
  if (!sm) throw new Error('No tab called "' + SUMMARY_TAB + '" in this spreadsheet.');

  /* The tab name sits between the opening bracket and the "!" in column L's formula */
  const pattern = /^=\s*[A-Z.]+\(\s*(?:'((?:[^']|'')+)'|([^!(),'"\s]+))!/i;
  let linked = 0;
  const missed = [];

  for (let r = FIRST_ROW; r <= LAST_ROW; r++) {
    const f = sm.getRange(r, COUNT_COL).getFormula();
    const m = f.match(pattern);
    const name = m ? (m[1] ? m[1].replace(/''/g, "'") : m[2]) : '';
    const tab = name ? ss.getSheetByName(name) : null;
    if (!tab) { missed.push(r); continue; }

    const L = 'L' + r;
    const label = 'IFERROR(SUBSTITUTE(MID(FORMULATEXT(' + L + '),FIND("(",FORMULATEXT(' + L + '))+1,' +
      'FIND("!",FORMULATEXT(' + L + '))-FIND("(",FORMULATEXT(' + L + '))-1),"\'",""),"")';
    sm.getRange(r, 1).setFormula('=HYPERLINK("#gid=' + tab.getSheetId() + '",' + label + ')');
    linked++;
  }

  const msg = linked + ' course rows linked.' + (missed.length ? ' Not linked: Summary row ' + missed.join(', ') + '.' : '');
  Logger.log(msg);
  ss.toast(msg, 'Course tab links', 10);
}
