/* =====================================================================
   Connect@CTLI Workflows 2027: WHERE THE SITE GETS ITS LINKS

   STEP 1 (once): paste the "Publish to web" CSV link of the Site Links
   Google Sheet between the quotes below. After that, manage every link
   in the Google Sheet. You do not need to edit this file again.
   ===================================================================== */
const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTP1JAVJV8ip8BdiHsbwURuF3WXoISYwHZVFI6lWA8PfO6AhAA3BMLvtgGb1NuiVY8fA-hkQhoTzOmT/pub?gid=135438491&single=true&output=csv";

/* Backup links. Only used if SHEET_CSV is empty or the sheet cannot be
   reached. A link in the Google Sheet always wins over one typed here. */
const LINKS = {
  request: "",   // Course Activation Request form
  tracker: "",   // Request tracker sheet (form responses with Status column)
  master:  "",   // CTLI Master Dashboard
  reports: "",   // Drive folder: all 2027 completion reports
  units: {
    LA_SMLDP: {cohort:"", dashboard:"", reports:""},
    LA_SMLDC: {cohort:"", dashboard:"", reports:""},
    FP:     {cohort:"", dashboard:"", reports:""},
    IP:     {cohort:"", dashboard:"", reports:""},
    SP:     {cohort:"", dashboard:"", reports:""},
    IE:     {cohort:"", dashboard:"", reports:""},
    NTI:    {cohort:"", dashboard:"", reports:""},
    FET:    {cohort:"", dashboard:"", reports:""},
    EDULIS: {cohort:"", dashboard:"", reports:""},
    PD:     {cohort:"", dashboard:"", reports:""}
  }
};

/* Unit colours from the CTLI palettes. IP, SP and NTI are new additions.
   You should not need to change anything below this line. */
const UNITS = [
  {k:"LA_SMLDP", name:"School Management and Leadership Development Programme", sub:"Leadership Academy", c:["#00A1A3","#6E6259"], on:"#000b4d"},
  {k:"LA_SMLDC", name:"School Management and Leadership Development Courses", sub:"Leadership Academy", c:["#6E6259","#00A1A3"], on:"#ffffff"},
  {k:"FP",     name:"Foundation Phase",               sub:"TPI", c:["#8FAD15","#8D6E97"], on:"#000b4d"},
  {k:"IP",     name:"Intermediate Phase",             sub:"TPI", c:["#BA0C2F","#A6BBC8"], on:"#ffffff"},
  {k:"SP",     name:"Senior Phase",                   sub:"TPI", c:["#5B7F95","#FFC600"], on:"#ffffff"},
  {k:"IE",     name:"Inclusive Education",            sub:"TPI", c:["#D73828","#00A1A3"], on:"#ffffff"},
  {k:"NTI",    name:"Novice Teacher Induction",       sub:"TPI", c:["#8D6E97","#FFC600"], on:"#ffffff"},
  {k:"FET",    name:"Further Education and Training", sub:"TPI", c:["#890C58","#007DBA"], on:"#ffffff"},
  {k:"EDULIS", name:"EDULIS",                         sub:"Library and information services", c:["#C4D600","#FFC600"], on:"#000b4d"},
  {k:"PD",     name:"Professional Development",       sub:"PDD", c:["#007DBA","#C4D600"], on:"#ffffff"}
];

function esc(s){return String(s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));}

function setLink(el, url){
  if(!el) return;
  if(url){ el.href = url; el.classList.remove("off"); el.removeAttribute("aria-disabled"); el.removeAttribute("title"); }
  else { el.removeAttribute("href"); el.classList.add("off"); el.setAttribute("aria-disabled","true"); el.title = "Link not added yet"; }
}

/* Fill any element with data-link="request|tracker|master|reports" */
function fillTopLinks(){
  document.querySelectorAll("[data-link]").forEach(el=>setLink(el, LINKS[el.dataset.link]));
}

/* Unit link table. cols: any of "cohort", "reports", "dashboard" */
function renderUnitTable(target, cols){
  const tb = document.getElementById(target); if(!tb) return;
  tb.innerHTML = "";
  const label = {cohort:"Cohort sheet", reports:"Report folder", dashboard:"Dashboard"};
  UNITS.forEach(u=>{
    const L = LINKS.units[u.k] || {};
    const tr = document.createElement("tr");
    tr.innerHTML = `<th scope="row"><div class="uc"><span class="sw" style="background:linear-gradient(135deg,${u.c[0]} 60%,${u.c[1]} 60%)"></span><span class="un"><b>${esc(u.name)}</b><small>${u.name===u.k?esc(u.sub):esc(u.k)+(u.sub!==u.k?" &middot; "+esc(u.sub):"")}</small></span></div></th>` +
      cols.map(c=>`<td><a class="tl" data-kind="${c}" target="_blank" rel="noopener"></a></td>`).join("");
    tr.querySelectorAll(".tl").forEach(a=>{
      const url = L[a.dataset.kind];
      a.textContent = url ? "Open" : "Not added";
      setLink(a, url);
      a.setAttribute("aria-label", `${u.name} ${label[a.dataset.kind].toLowerCase()}`);
    });
    tb.appendChild(tr);
  });
}

/* ---------- read the published Google Sheet ---------- */
function parseCSV(text){
  const rows=[]; let row=[], cell="", q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){ if(ch==='"'){ if(text[i+1]==='"'){cell+='"';i++;} else q=false; } else cell+=ch; }
    else if(ch==='"') q=true;
    else if(ch===','){ row.push(cell); cell=""; }
    else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&text[i+1]==='\n') i++; row.push(cell); rows.push(row); row=[]; cell=""; }
    else cell+=ch;
  }
  if(cell!==""||row.length){ row.push(cell); rows.push(row); }
  return rows;
}
function applyLink(code, url){
  const [a,b] = code.split(".");
  if(b){ if(LINKS.units[a] && b in LINKS.units[a]){ LINKS.units[a][b] = url; return true; } }
  else if(a in LINKS && a !== "units"){ LINKS[a] = url; return true; }
  return false;
}

/* What happened when the site tried to read the Google Sheet. Shown in the side menu. */
const LINK_STATUS = {ok:false, text:(SHEET_CSV||"").trim() ? "Links: loading from the Google Sheet" : "Links: from links.js (no Google Sheet link set)"};
const CODE_RE = /^(request|tracker|master|reports|[A-Za-z_]+\.(cohort|dashboard|reports))$/;

const LINKS_READY = (async ()=>{
  const src = (SHEET_CSV || "").trim();
  if(!src) return;
  if(!/^https:\/\/docs\.google\.com\/spreadsheets\//i.test(src)){
    LINK_STATUS.text = "Links problem: SHEET_CSV is not a Google Sheets link"; return;
  }
  if(/\/edit|\/pubhtml/i.test(src) || !/output=csv/i.test(src)){
    LINK_STATUS.text = "Links problem: use the Publish to web link with .csv chosen (it ends in output=csv)"; return;
  }
  try{
    const r = await fetch(src + "&t=" + Date.now(), {cache:"no-store"});
    if(!r.ok){ LINK_STATUS.text = "Links problem: the Google Sheet answered " + r.status + ". Is it still published?"; return; }
    const text = await r.text();
    if(/^\s*</.test(text)){ LINK_STATUS.text = "Links problem: the sheet sent a web page, not CSV. Publish the Links tab as .csv"; return; }
    let codes = 0, used = 0;
    parseCSV(text).forEach(row=>{
      const cells = row.map(c=>(c||"").trim());
      const code = cells.find(c=>CODE_RE.test(c));
      if(!code) return;
      codes++;
      const url = cells.find(c=>/^https?:\/\//i.test(c));
      if(url && applyLink(code, url)) used++;
    });
    if(!codes){ LINK_STATUS.text = "Links problem: no link codes found. Publish the Links tab, not the How To tab or Entire document"; return; }
    LINK_STATUS.ok = true;
    LINK_STATUS.text = `Links: ${used} of ${codes} loaded from the Google Sheet`;
  }catch(e){
    LINK_STATUS.text = "Links problem: the Google Sheet could not be reached from this page";
  }
})();

function showLinkStatus(){
  const el = document.getElementById("linkstatus"); if(!el) return;
  const bad = /problem/.test(LINK_STATUS.text);
  el.textContent = bad ? LINK_STATUS.text : "";   /* only shown when something needs fixing */
  el.hidden = !bad;
  el.classList.toggle("bad", bad);
}

/* Draw now with the backup links, then again once the sheet has loaded */
function onLinks(draw){
  const run = ()=>{ fillTopLinks(); draw && draw(); showLinkStatus(); };
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  LINKS_READY.then(run);
}

/* Unit cards with three buttons each (Overview page) */
function renderUnitCards(target){
  const box = document.getElementById(target); if(!box) return;
  box.innerHTML = "";
  const kinds = [["cohort","Cohort sheet"],["dashboard","Dashboard"],["reports","Reports"]];
  UNITS.forEach(u=>{
    const L = LINKS.units[u.k] || {};
    const card = document.createElement("article");
    card.className = "ucard";
    card.style.setProperty("--u1", u.c[0]); card.style.setProperty("--u2", u.c[1]);
    card.innerHTML = `<div class="uhead"><span class="sw"></span><div class="un"><b>${esc(u.name)}</b><small>${esc(u.k)} &middot; ${esc(u.sub)}</small></div></div>
      <div class="ubtns">${kinds.map(([k,l])=>`<a class="ubtn" data-kind="${k}" target="_blank" rel="noopener">${l}</a>`).join("")}</div>`;
    card.querySelectorAll(".ubtn").forEach(a=>{
      setLink(a, L[a.dataset.kind]);
      a.setAttribute("aria-label", `${u.name}: ${a.textContent.toLowerCase()}`);
    });
    box.appendChild(card);
  });
}
