/* =====================================================================
   Connect@CTLI Workflows 2027: WHERE THE SITE GETS ITS LINKS

   STEP 1 (once): paste the "Publish to web" CSV link of the Site Links
   Google Sheet between the quotes below. After that, manage every link
   in the Google Sheet. You do not need to edit this file again.
   ===================================================================== */
const SHEET_CSV = "1Lpn6nu4ny7kty44mdOweO7MzueIVMA06EVVKGgFcASY";

/* Backup links. Only used if SHEET_CSV is empty or the sheet cannot be
   reached. A link in the Google Sheet always wins over one typed here. */
const LINKS = {
  request: "",   // Course Activation Request form
  tracker: "",   // Request tracker sheet (form responses with Status column)
  master:  "",   // CTLI Master Dashboard
  reports: "",   // Drive folder: all 2027 completion reports
  units: {
    LA:     {cohort:"", dashboard:"", reports:""},
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
  {k:"LA",     name:"Leadership Academy",             sub:"LA",  c:["#00A1A3","#6E6259"], on:"#000b4d"},
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
    tr.innerHTML = `<th scope="row"><div class="uc"><span class="sw" style="background:linear-gradient(135deg,${u.c[0]} 60%,${u.c[1]} 60%)"></span><span class="un"><b>${esc(u.name)}</b><small>${esc(u.k)}${u.sub!==u.k?" &middot; "+esc(u.sub):""}</small></span></div></th>` +
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
  if(b){ if(LINKS.units[a] && b in LINKS.units[a]) LINKS.units[a][b] = url; }
  else if(a in LINKS && a !== "units") LINKS[a] = url;
}
const LINKS_READY = (async ()=>{
  if(!SHEET_CSV) return;
  try{
    const r = await fetch(SHEET_CSV + (SHEET_CSV.includes("?") ? "&" : "?") + "t=" + Date.now(), {cache:"no-store"});
    if(!r.ok) return;
    parseCSV(await r.text()).forEach(row=>{
      const code = (row[0]||"").trim(), url = (row[3]||"").trim();
      if(code && /^https:\/\//i.test(url)) applyLink(code, url);
    });
  }catch(e){ /* sheet not reachable: keep the backup links */ }
})();

/* Draw now with the backup links, then again once the sheet has loaded */
function onLinks(draw){
  const run = ()=>{ fillTopLinks(); draw && draw(); };
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  LINKS_READY.then(run);
}
