# Connect@CTLI Workflows 2027

Access site for CTLI training coordinators: course requests, the Request Tracker, unit cohort sheets, dashboards, completion reports and the LMS Operations Workflow 2027 Standard Operating Procedure (SOP).

Site: https://connect-ctli.github.io/LMS-Workflows/

## Files in this repository

| File | What it is |
|---|---|
| `index.html` | Overview page: quick links and the four unit tiles (TPI, LA, PD, EDULIS) that open to their sub-units |
| `sop.html` | Standard Operating Procedure page: process infographic, the full SOP and the Download SOP (PDF) button. The SOP only links to each unit's cohort sheet, dashboard and completion reports |
| `links.js` | Where the site gets its links. It reads the published Site Links Google Sheet |
| `sop-content.js` | The SOP text. Change wording, dates or the version here and both the page and the PDF update |
| `sop-pdf.js` | Builds the PDF download. You should not need to change it |
| `logo.png` | WCED logo used on the pages and the PDF letterhead |
| `favicon.ico`, `favicon.png`, `apple-touch-icon.png` | Browser tab and phone home-screen icons |
| `fonts/` | Gothic font files for the PDF and for computers without Century Gothic |
| `.nojekyll` | Tells GitHub Pages to serve the files exactly as they are |

## Updating the repository

1. Delete `stage-1.html`, `stage-2.html` and `stage-3.html`. The SOP page replaces them and nothing links to them any more.
2. Click **Add file > Upload files**, drag in everything from this folder (including the `fonts` folder and `.nojekyll`) and click **Commit changes**. Files with the same name are replaced.
3. GitHub Pages updates the site within a minute or two.

## Links

All links are managed in the Site Links Google Sheet, on the Links tab. Link codes:

- `request`: Course Activation Request form
- `tracker`: Request Tracker tab of the Course Activation Requests 2027 sheet
- `master`: CTLI Master Dashboard
- `reports`: Drive folder with all 2027 completion reports
- Per unit: `UNIT.cohort`, `UNIT.dashboard`, `UNIT.reports`, for example `FP.cohort` or `LA_SMLDP.dashboard`

Unit codes: LA_SMLDP, LA_SMLDC, FP, IP, SP, IE, NTI, FET, EDULIS, PD.

## Course Activation Requests script

`Course_Requests_2027.gs` is not part of the website. It belongs in the Course Activation Requests 2027 Google Sheet (Extensions > Apps Script). The setup steps are at the top of the script.

## Updating the SOP

Edit `sop-content.js`. Change the Version and Date issued in the `control` list whenever the procedure changes.
