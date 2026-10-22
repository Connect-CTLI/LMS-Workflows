/* =====================================================================
   Connect@CTLI Workflows 2027: ALL LINKS LIVE IN THIS FILE
   Paste each Google Sheet, form, dashboard or Drive folder link between
   the quotes. Every page on the site reads from here, so you only paste
   a link once. Anything left empty shows as greyed out.
   ===================================================================== */
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

/* Unit tiles. show = ["cohort","dashboard"] or one of them */
function renderUnits(target, show){
  const box = document.getElementById(target); if(!box) return;
  const label = {cohort:"Cohort sheet", dashboard:"Dashboard"};
  UNITS.forEach(u=>{
    const L = LINKS.units[u.k] || {};
    const t = document.createElement("article");
    t.className = "unit";
    t.innerHTML =
      `<div class="band"><i style="background:${u.c[0]};flex:2"></i><i style="background:${u.c[1]}"></i></div>
       <div class="body">
         <div class="top"><div class="tag" style="background:${u.c[0]};color:${u.on}">${esc(u.k)}</div>
           <div><h3>${esc(u.name)}</h3><div class="sub">${esc(u.sub)}</div></div></div>
         <div class="row${show.length===1?' one':''}">${show.map((s,i)=>
           `<a class="ub${i===0?' fill':''}" target="_blank" rel="noopener" data-kind="${s}"${i===0?` style="background:${u.c[0]};color:${u.on}"`:''}>${label[s]}</a>`).join("")}</div>
       </div>`;
    t.querySelectorAll(".ub").forEach(a=>{
      setLink(a, L[a.dataset.kind]);
      a.setAttribute("aria-label", `${u.name} ${label[a.dataset.kind].toLowerCase()}`);
    });
    box.appendChild(t);
  });
}

/* Completion report folders, one per unit */
function renderReports(target){
  const box = document.getElementById(target); if(!box) return;
  UNITS.forEach(u=>{
    const L = LINKS.units[u.k] || {};
    const r = document.createElement("a");
    r.className = "rep"; r.target = "_blank"; r.rel = "noopener";
    r.innerHTML = `<i style="background:linear-gradient(${u.c[0]} 65%,${u.c[1]} 65%)"></i><span>${esc(u.name)}<small>${L.reports ? "Open report folder" : "Folder not added yet"}</small></span>`;
    setLink(r, L.reports);
    box.appendChild(r);
  });
}

document.addEventListener("DOMContentLoaded", fillTopLinks);
