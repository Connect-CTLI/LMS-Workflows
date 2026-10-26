/* =====================================================================
   LMS Operations Workflow 2027: Standard Operating Procedure content.
   The SOP page and the PDF download are both built from this file,
   so a change made here shows in both.
   Link codes (request, tracker, master, reports, site, and per unit
   cohort / dashboard / reports) come from links.js and the Site Links
   Google Sheet.
   ===================================================================== */
const SOP = {
  title: "LMS Operations Workflow 2027",
  kind: "Standard Operating Procedure",
  org: "Cape Teaching and Leadership Institute",
  dept: "Western Cape Education Department",
  team: "CTLI Process Team: LMS Administration",
  email: "connect.ctli@wced.info",
  control: [
    ["Document", "SOP: LMS Operations Workflow 2027"],
    ["Version", "1.1"],
    ["Date issued", "26 October 2026"],
    ["Applies from", "January 2027"],
    ["Owner", "CTLI Process Team (LMS Administration)"],
    ["Next review", "October 2027, or sooner if the workflow changes"]
  ],

  purpose: [
    "This SOP sets out how a course on Connect@CTLI (Moodle) moves from a training coordinator's request to a finished completion report. It makes sure every course is set up the same way, checked before teachers see it, and reported on correctly.",
    "Follow it for every course run in 2027. If a step cannot be followed, speak to the LMS Admin before you go ahead."
  ],

  scope: "All CTLI units that run courses on Connect@CTLI in 2027:",
  units: [
    ["LA_SMLDP", "Leadership Academy: School Management and Leadership Development Programme"],
    ["LA_SMLDC", "Leadership Academy: School Management and Leadership Development Courses"],
    ["FP", "TPI: Foundation Phase"],
    ["IP", "TPI: Intermediate Phase"],
    ["SP", "TPI: Senior Phase"],
    ["IE", "TPI: Inclusive Education"],
    ["NTI", "TPI: Novice Teacher Induction"],
    ["FET", "TPI: Further Education and Training"],
    ["EDULIS", "EDULIS: Library and information services"],
    ["PD", "Professional Development (PDD)"]
  ],

  roles: [
    ["Training Coordinator (TC)", "Requests the course, tests it with PDD, owns the unit cohort sheet, checks enrolments and receives the completion report."],
    ["Unit intern", "Captures and checks participant details in the cohort sheet. May fix enrolments on Moodle, but always tells the LMS Admin."],
    ["LMS Admin", "Assigns the course short name and cohort code, sets up, opens and closes the course, uploads participants, builds reports and updates the dashboards. Shared inbox: connect.ctli@wced.info"],
    ["PDD", "Runs the quality check with the TC before the course is opened to participants."],
    ["Unit Head", "Receives the completion report by email (listed on the Unit Heads tab of the request sheet) and uses the unit dashboard for planning."]
  ],

  terms: [
    ["Opening date", "The day the course opens on Connect@CTLI and participants can get in."],
    ["Official start date", "The start date as advertised to teachers."],
    ["Official end date", "The end date as advertised to teachers."],
    ["Closing date", "The day the course closes for reporting. Completion reports are only built after this date."],
    ["Course short name and cohort code", "Moodle identifiers for the course run. The LMS Admin assigns both once a request comes in, so the TC does not need them."],
    ["Course, district and school groups", "Every participant is placed in all three groups when uploaded. This makes reporting by course, district and school possible."],
    ["Request Tracker", "Shows each request, its step out of 7 and what happens next. TCs check it instead of emailing for updates. It also flags dates in the wrong order and courses that open within 2 weeks."],
    ["Status", "Set by the LMS Admin on the request sheet: Requested, Activated (hidden), QC passed, Participants loaded, Course open, Course closed, Report sent. Each change sends the matching email and moves the Tracker on."],
    ["Cohort sheet", "Each unit's own Google Sheet of participants. All unit sheets feed the Master participant data."],
    ["CTLI Master Dashboard", "Holds completions for all units. Each unit dashboard pulls only its own unit's numbers from it."]
  ],

  stages: [
    {
      n: 1, name: "Request and quality check", short: "Request", colour: "#FFC600", ink: "#0b1530",
      when: "At least 4 weeks before the opening date",
      intro: "The course is set up on Connect@CTLI but stays hidden until it passes the quality check.",
      steps: [
        { id: "1.1", title: "Submit the course request", who: ["TC"], email: true, status: "Requested",
          detail: "Complete the Course Activation Request form at least 4 weeks before the opening date. Give your name, your unit, the request type, the full course name, the expected number of participants and the four dates: opening, official start, official end and closing. You do not need the Moodle short name or cohort code.",
          output: "The LMS Admin inbox gets an alert and you get a receipt by email. The request shows on the Request Tracker.",
          links: [] },
        { id: "1.2", title: "Set up the course and keep it hidden", who: ["LMS Admin"], email: true, status: "Activated (hidden)",
          detail: "Assign the course short name and cohort code, set up the course on Connect@CTLI and keep it hidden from participants. On the request sheet, fill in Course short name, Cohort and Moodle link, then set the Status. The email only goes out once all three are filled in.",
          output: "The TC gets an email with the course link, short name and cohort.",
          links: [] },
        { id: "1.3", title: "Run the quality check", who: ["PDD", "TC"], email: false, status: "",
          detail: "PDD and the TC test the course together: content, activities, completion settings and dates. Fix anything that does not work before moving on.",
          output: "A course that is ready for participants.", links: [] },
        { id: "1.4", title: "Confirm the quality check", who: ["TC", "LMS Admin"], email: true, status: "QC passed",
          detail: "The TC lets the LMS Admin know that the quality check passed. The LMS Admin sets the Status. The course stays hidden until this step is done.",
          output: "The TC and the LMS Admin inbox get an email reminding the TC to finish the cohort sheet.", links: [] }
      ]
    },
    {
      n: 2, name: "Load participants and open", short: "Load", colour: "#00A1A3", ink: "#0b1530",
      when: "1 to 2 weeks before the opening date",
      intro: "Participants are loaded from the unit cohort sheet, checked, and the course opens on the opening date.",
      steps: [
        { id: "2.1", title: "Complete the cohort sheet", who: ["TC", "Intern"], email: false, status: "",
          detail: "Capture every participant in your unit's cohort sheet and check names, email addresses, district and school. PERSAL and EMIS numbers are not needed. Leadership Academy captures LA_SMLDP and LA_SMLDC participants on their own sheets.",
          output: "A complete, checked cohort sheet.", links: ["unit:cohort"] },
        { id: "2.2", title: "Upload participants", who: ["LMS Admin"], email: true, status: "Participants loaded",
          detail: "Upload participants from the cohort sheet into the course, district and school groups, then set the Status.",
          output: "The TC gets an email with the course link to check the participant list.", links: [] },
        { id: "2.3", title: "Check and correct enrolments", who: ["TC", "Intern"], email: false, status: "",
          detail: "Check the enrolments on Connect@CTLI against the cohort sheet. Interns may correct enrolments on Moodle, but must always tell the LMS Admin what was changed.",
          output: "Enrolments match the cohort sheet.", links: [] },
        { id: "2.4", title: "Open the course", who: ["LMS Admin"], email: true, status: "Course open",
          detail: "Make the course visible on the opening date given in the request, then set the Status.",
          output: "Participants can get into the course. The TC gets an email with the official dates and the closing date.", links: [] }
      ]
    },
    {
      n: 3, name: "Close and report", short: "Report", colour: "#8FAD15", ink: "#0b1530",
      when: "On the closing date",
      intro: "Reports are only built once the course has closed. The data then flows to the dashboards.",
      steps: [
        { id: "3.1", title: "Close the course", who: ["LMS Admin"], email: true, status: "Course closed",
          detail: "Close the course for reporting on the closing date given in the request, then set the Status.",
          output: "The TC gets an email that the course has closed and the report is being built.", links: [] },
        { id: "3.2", title: "Build the completion report", who: ["LMS Admin"], email: false, status: "",
          detail: "Build the completion report from the Moodle completion data, using the course, district and school groups.",
          output: "A completion report for the course run.", links: [] },
        { id: "3.3", title: "Send and file the report", who: ["LMS Admin"], email: true, status: "Report sent",
          detail: "Save the report in the unit's report folder. Paste the report link into Report link on the request sheet, then set the Status. The email goes to the TC and to the Unit Head listed on the Unit Heads tab.",
          output: "The TC and the Unit Head have the report. The Request Tracker shows the course as complete.", links: ["unit:reports"] },
        { id: "3.4", title: "Update the dashboards", who: ["LMS Admin", "TC"], email: false, status: "",
          detail: "Paste the Moodle completions once into the CTLI Master Dashboard. The unit dashboard updates from there. The TC checks the unit dashboard.",
          output: "Master and unit dashboards are up to date.", links: ["unit:dashboard"] }
      ]
    }
  ],

  rules: [
    "Send course requests at least 4 weeks before the opening date.",
    "No course opens to participants before the quality check is confirmed.",
    "Only the LMS Admin changes the Status on the request sheet. Nobody types on the Request Tracker tab: it updates by itself.",
    "Participant details go into the unit cohort sheet, not into emailed lists.",
    "Any change made on Moodle by a TC or intern is reported to the LMS Admin.",
    "Completion reports are only built after the closing date.",
    "Completions are pasted once, into the CTLI Master Dashboard only. Unit dashboards are never edited by hand.",
    "Unit dashboards show only that unit's numbers. Only the Master Dashboard shows all units.",
    "Leadership Academy keeps LA_SMLDP and LA_SMLDC separate in every file."
  ],

  /* The SOP only links to each unit's cohort sheet, dashboard and completion reports folder */
  general: []
};
