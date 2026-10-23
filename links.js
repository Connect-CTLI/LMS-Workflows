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

/* Main units on the Overview page, in the order they appear.
   "units" lists the sub-unit codes (k) from UNITS above. */
const GROUPS = [
  {k:"TPI",    name:"Teacher Practice Improvement", c:["#001489","#FFC600"], units:["FP","IP","SP","IE","NTI","FET"]},
  {k:"LA",     name:"Leadership Academy",           c:["#00A1A3","#6E6259"], units:["LA_SMLDP","LA_SMLDC"]},
  {k:"PD",     name:"Professional Development",     c:["#007DBA","#C4D600"], units:["PD"]},
  {k:"EDULIS", name:"Library and information services", c:["#C4D600","#FFC600"], units:["EDULIS"]}
];

/* One sub-unit card with three buttons */
function makeUnitCard(u){
  const L = LINKS.units[u.k] || {};
  const kinds = [["cohort","Cohort sheet"],["dashboard","Dashboard"],["reports","Reports"]];
  const card = document.createElement("article");
  card.className = "ucard";
  card.style.setProperty("--u1", u.c[0]); card.style.setProperty("--u2", u.c[1]);
  card.innerHTML = `<div class="uhead"><span class="sw"></span><div class="un"><b>${esc(u.name)}</b><small>${esc(u.k)} &middot; ${esc(u.sub)}</small></div></div>
    <div class="ubtns">${kinds.map(([k,l])=>`<a class="ubtn" data-kind="${k}" target="_blank" rel="noopener">${l}</a>`).join("")}</div>`;
  card.querySelectorAll(".ubtn").forEach(a=>{
    setLink(a, L[a.dataset.kind]);
    a.setAttribute("aria-label", `${u.name}: ${a.textContent.toLowerCase()}`);
  });
  return card;
}

/* All sub-unit cards in one grid (kept for any page that still uses it) */
function renderUnitCards(target){
  const box = document.getElementById(target); if(!box) return;
  box.innerHTML = "";
  UNITS.forEach(u=>box.appendChild(makeUnitCard(u)));
}

/* Overview: four main unit tiles. Clicking one opens its sub-units below. */
let OPEN_GROUP = null;
function renderUnitGroups(tilesId, drawerId){
  const tiles = document.getElementById(tilesId), drawer = document.getElementById(drawerId);
  if(!tiles || !drawer) return;
  tiles.innerHTML = "";
  const byK = Object.fromEntries(UNITS.map(u=>[u.k,u]));

  function draw(){
    tiles.querySelectorAll(".gtile").forEach(t=>t.setAttribute("aria-expanded", String(t.dataset.g===OPEN_GROUP)));
    const g = GROUPS.find(x=>x.k===OPEN_GROUP);
    drawer.innerHTML = "";
    drawer.hidden = !g;
    if(!g) return;
    drawer.style.setProperty("--g1", g.c[0]); drawer.style.setProperty("--g2", g.c[1]);
    const one = g.units.length === 1;
    drawer.innerHTML = `<div class="gdhead"><div><b>${esc(g.name)}</b><small>${one ? "Cohort sheet, dashboard and reports" : g.units.length + " sub-units"}</small></div>
      <button type="button" class="gclose" aria-label="Close ${esc(g.name)}">Close</button></div>
      <div class="ugrid"></div>`;
    const grid = drawer.querySelector(".ugrid");
    g.units.forEach(k=>{ if(byK[k]) grid.appendChild(makeUnitCard(byK[k])); });
    drawer.querySelector(".gclose").addEventListener("click", ()=>{
      const t = tiles.querySelector(`[data-g="${OPEN_GROUP}"]`);
      OPEN_GROUP = null; draw(); t && t.focus();
    });
  }

  GROUPS.forEach(g=>{
    const subs = g.units.map(k=>byK[k]).filter(Boolean);
    const b = document.createElement("button");
    b.type = "button"; b.className = "gtile"; b.dataset.g = g.k;
    b.setAttribute("aria-controls", drawerId);
    b.style.setProperty("--g1", g.c[0]); b.style.setProperty("--g2", g.c[1]);
    const line = subs.length > 1 ? subs.map(u=>u.k.replace(/^LA_/,"")).join(" · ") : "Cohort sheet, dashboard, reports";
    b.innerHTML = `<span class="gtop"><span class="gk">${esc(g.k)}</span>
        <svg class="gchev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg></span>
      <span class="gname">${esc(g.name)}</span>
      <span class="gsubs">${esc(line)}</span>
      <span class="gdots" aria-hidden="true">${subs.map(u=>`<i style="background:linear-gradient(135deg,${u.c[0]} 60%,${u.c[1]} 60%)"></i>`).join("")}</span>`;
    b.addEventListener("click", ()=>{ OPEN_GROUP = OPEN_GROUP === g.k ? null : g.k; draw(); });
    tiles.appendChild(b);
  });
  draw();
}
