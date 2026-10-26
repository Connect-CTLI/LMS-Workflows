/* =====================================================================
   Builds the SOP as a PDF (A4) from sop-content.js and the live links.
   Used by the "Download SOP (PDF)" button on sop.html.
   ===================================================================== */
function buildSopPdf(jsPDF, assets, LINKS_IN, UNITS_IN){
  const L = LINKS_IN || {units:{}};
  const doc = new jsPDF({unit:"mm", format:"a4", compress:true});
  doc.addFileToVFS("URWGothic-Book.ttf", assets.book);
  doc.addFont("URWGothic-Book.ttf", "Gothic", "normal");
  doc.addFileToVFS("URWGothic-Demi.ttf", assets.demi);
  doc.addFont("URWGothic-Demi.ttf", "Gothic", "bold");
  doc.setProperties({title: SOP.kind + ": " + SOP.title, subject: SOP.kind, author: SOP.team, creator: "Connect@CTLI Workflows 2027"});

  const W = 210, H = 297, M = 16, CW = W - 2*M, TOP = 20, BOTTOM = H - 18;
  const NAVY = "#001489", INK = "#14203a", SOFT = "#5a6a80", FAINT = "#8a97a8", LINE = "#d9dfe8", TINT = "#f2f4f9";
  let y = TOP;

  const font = (w, size, col) => { doc.setFont("Gothic", w === "b" ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(col || INK); };
  const mix = (hex, pct) => { // hex mixed with white, pct = amount of colour
    const n = parseInt(hex.slice(1), 16), r = n>>16, g = (n>>8)&255, b = n&255;
    const f = c => Math.round(255 - (255 - c) * pct);
    return "#" + [f(r),f(g),f(b)].map(v=>v.toString(16).padStart(2,"0")).join("");
  };
  const lh = size => size * 0.3528 * 1.38; // line height in mm
  const newPage = () => { doc.addPage(); y = TOP; };
  const need = h => { if (y + h > BOTTOM) newPage(); };
  const para = (text, size, col, x, w, weight) => {
    font(weight || "n", size, col);
    const lines = doc.splitTextToSize(text, w || CW);
    lines.forEach(line => { need(lh(size)); doc.text(line, x || M, y + size*0.3528); y += lh(size); });
  };
  const heading = (num, text) => {
    need(28);
    y += 4;
    font("b", 13, NAVY);
    doc.text((num ? num + "  " : "") + text, M, y + 4.6);
    y += 7.5;
    doc.setDrawColor(LINE); doc.setLineWidth(0.3); doc.line(M, y, M + CW, y);
    y += 3.5;
  };


  /* ---------- letterhead (page 1) ---------- */
  doc.addImage(assets.logo, "PNG", M, 12, 57, 16);
  font("b", 10, NAVY); doc.text(SOP.org, W - M, 16.5, {align:"right"});
  font("n", 8.5, SOFT); doc.text(SOP.dept, W - M, 21, {align:"right"});
  doc.text(SOP.team, W - M, 25, {align:"right"});
  font("b", 8.5, NAVY); doc.text(SOP.email, W - M, 29, {align:"right"});
  const bar = (yy) => { const seg = CW/3; [["#FFC600",0],["#8FAD15",1],["#00A1A3",2]].forEach(([c,i])=>{ doc.setFillColor(c); doc.rect(M + i*seg, yy, seg, 1.4, "F"); }); };
  bar(33);
  y = 41;

  /* title block */
  font("b", 8.5, SOFT); doc.text(SOP.kind.toUpperCase(), M, y + 3, {charSpace:0.4});
  y += 6;
  font("b", 22, NAVY); doc.text(SOP.title, M, y + 7.5); y += 13;
  font("n", 10, SOFT); doc.text("From course request to completion report on Connect@CTLI", M, y + 3.5); y += 9;

  /* document control table */
  const half = CW/2, vw = half - 32;
  font("n", 8.5, INK);
  const cells = SOP.control.map(c => doc.splitTextToSize(c[1], vw));
  const rowsH = [];
  for (let r = 0; r < Math.ceil(cells.length/2); r++) rowsH.push(Math.max(...[cells[2*r], cells[2*r+1] || [""]].map(l => l.length)) * lh(8.5) + 2.6);
  const boxH = rowsH.reduce((a,b)=>a+b,0) + 4;
  doc.setFillColor(TINT); doc.setDrawColor(LINE); doc.setLineWidth(0.25);
  doc.roundedRect(M, y, CW, boxH, 1.5, 1.5, "FD");
  let ry0 = y + 5.6;
  rowsH.forEach((rh, r) => {
    [0,1].forEach(col => {
      const i = 2*r + col; if (i >= SOP.control.length) return;
      const x = M + 4 + col*half;
      font("b", 7.2, FAINT); doc.text(SOP.control[i][0].toUpperCase(), x, ry0, {charSpace:0.25});
      font("n", 8.5, INK); doc.text(cells[i], x + 27, ry0);
    });
    ry0 += rh;
  });
  y += boxH + 6;

  /* ---------- 1 Purpose ---------- */
  heading("1", "Purpose");
  SOP.purpose.forEach(p => { para(p, 9.5, INK); y += 1.8; });

  /* ---------- 2 Scope ---------- */
  heading("2", "Scope");
  para(SOP.scope, 9.5, INK); y += 1.5;
  const uRow = 5.6;
  (UNITS_IN || []).forEach((u, i) => {
    need(uRow);
    const unit = SOP.units.find(x=>x[0]===u.k) || [u.k, u.name];
    doc.setFillColor(u.c[0]); doc.roundedRect(M + 1, y + 1.1, 3, 3, 0.6, 0.6, "F");
    font("b", 8.5, INK); doc.text(unit[0], M + 7, y + 3.6);
    font("n", 8.5, SOFT); doc.text(unit[1], M + 30, y + 3.6);
    y += uRow;
  });
  para("Courses are run on Connect@CTLI (Moodle). The LMS Admin can be reached at " + SOP.email + ".", 9.5, INK);

  /* ---------- Infographic page ---------- */
  newPage();
  font("b", 8.5, SOFT); doc.text("AT A GLANCE", M, y + 3, {charSpace:0.4}); y += 6;
  font("b", 15, NAVY); doc.text("How a course moves through Connect@CTLI", M, y + 5.5); y += 10;
  font("n", 9, SOFT); doc.text("Three stages, twelve steps. The envelope shows where an automatic email goes out.", M, y + 3); y += 8;

  const gap = 7, colW = (CW - 2*gap)/3, top = y;
  let colBottom = top;
  const hdrH = Math.max(...SOP.stages.map(s => { font("b", 9.5); const a = doc.splitTextToSize(s.name, colW - 15).length; font("n", 7.4); const b = doc.splitTextToSize(s.when, colW - 8).length; return 11.5 + a*lh(9.5) + b*lh(7.4) + 1.5; }));
  SOP.stages.forEach((s, si) => {
    const x = M + si*(colW + gap);
    let yy = top;
    // header
    font("n", 7.4, "#0b1530"); const wl = doc.splitTextToSize(s.when, colW - 8);
    font("b", 9.5, "#0b1530"); const nm = doc.splitTextToSize(s.name, colW - 15);
    const hh = hdrH;
    doc.setFillColor(s.colour); doc.roundedRect(x, yy, colW, hh, 2, 2, "F");
    doc.setFillColor("#ffffff"); doc.circle(x + 7, yy + 7.5, 3.8, "F");
    font("b", 10, "#0b1530"); doc.text(String(s.n), x + 7, yy + 9, {align:"center"});
    font("b", 8, "#0b1530"); doc.text("STAGE " + s.n, x + 13, yy + 6.2, {charSpace:0.3});
    font("b", 9.5, "#0b1530"); doc.text(nm, x + 13, yy + 10.6);
    font("n", 7.4, "#0b1530"); doc.text(wl, x + 4, yy + 10.6 + nm.length*lh(9.5) + 1.2);
    yy += hh + 3;
    s.steps.forEach(st => {
      font("b", 8.4, INK);
      const tl = doc.splitTextToSize(st.title, colW - 13 - (st.email ? 8 : 2));
      const h = 7 + tl.length*lh(8.4) + 3.5;
      doc.setFillColor(mix(s.colour, 0.14)); doc.setDrawColor(mix(s.colour, 0.55)); doc.setLineWidth(0.3);
      doc.roundedRect(x, yy, colW, h, 1.5, 1.5, "FD");
      font("b", 7.6, "#0b1530");
      doc.setFillColor(s.colour); doc.roundedRect(x + 2.5, yy + 2.6, 8, 4.6, 1, 1, "F");
      doc.text(st.id, x + 6.5, yy + 5.9, {align:"center"});
      font("b", 8.4, INK); doc.text(tl, x + 12.5, yy + 5.9);
      const ry = yy + 5.9 + tl.length*lh(8.4) + 0.6;
      font("n", 7.2, SOFT); doc.text(st.who.join(" + "), x + 12.5, ry);
      if (st.email) { // small envelope
        const ex = x + colW - 7.5, ey = yy + 2.6;
        doc.setDrawColor(NAVY); doc.setLineWidth(0.3); doc.setFillColor("#ffffff");
        doc.rect(ex, ey, 5, 3.5, "FD"); doc.line(ex, ey, ex + 2.5, ey + 2); doc.line(ex + 5, ey, ex + 2.5, ey + 2);
      }
      yy += h + 2.4;
    });
    colBottom = Math.max(colBottom, yy);
    if (si < 2) { // arrow to next stage
      const ax = x + colW + 1.2, ay = top + 12;
      doc.setFillColor(NAVY); doc.triangle(ax, ay - 3, ax + 4.6, ay, ax, ay + 3, "F");
    }
  });
  y = colBottom + 6;

  /* timeline of the four course dates */
  font("b", 11, NAVY); doc.text("Where each stage sits against the course dates", M, y + 4); y += 10;
  const marks = [
    ["Request", "Stage 1", "#FFC600"],
    ["Upload", "1 to 2 weeks before", "#00A1A3"],
    ["Opening date", "Course opens", "#00A1A3"],
    ["Official start", "As advertised", "#5B7F95"],
    ["Official end", "As advertised", "#5B7F95"],
    ["Closing date", "Course closes", "#8FAD15"],
    ["Report", "Stage 3", "#8FAD15"]
  ];
  const tx0 = M + 8, tx1 = M + CW - 8, step = (tx1 - tx0)/(marks.length - 1), ty = y + 9;
  const segs = [[0,1,"#FFC600"],[1,2,"#00A1A3"],[2,5,"#5B7F95"],[5,6,"#8FAD15"]];
  segs.forEach(([a,b,c]) => { doc.setDrawColor(c); doc.setLineWidth(1.6); doc.line(tx0 + a*step, ty, tx0 + b*step, ty); });
  font("b", 7.4, SOFT);
  doc.text("STAGE 1", tx0 + 0.5*step, ty - 4, {align:"center"});
  doc.text("STAGE 2", tx0 + 1.5*step, ty - 4, {align:"center"});
  doc.text("COURSE RUNS", tx0 + 3.5*step, ty - 4, {align:"center"});
  doc.text("STAGE 3", tx0 + 5.5*step, ty - 4, {align:"center"});
  marks.forEach((m, i) => {
    const mx = tx0 + i*step;
    doc.setFillColor("#ffffff"); doc.setDrawColor(m[2]); doc.setLineWidth(0.9); doc.circle(mx, ty, 2.2, "FD");
    font("b", 7.8, INK); doc.text(m[0], mx, ty + 7, {align:"center"});
    font("n", 6.8, SOFT); doc.text(m[1], mx, ty + 10.5, {align:"center"});
  });
  y = ty + 16;

  /* roles grid on the same page if it fits */
  /* ---------- 3 Roles ---------- */
  heading("3", "Roles and responsibilities");
  SOP.roles.forEach(r => {
    font("n", 9, INK);
    const lines = doc.splitTextToSize(r[1], CW - 48);
    const h = Math.max(lines.length * lh(9), lh(9)) + 2.4;
    need(h);
    font("b", 9, NAVY); doc.text(doc.splitTextToSize(r[0], 44), M, y + 3.2);
    font("n", 9, INK); doc.text(lines, M + 48, y + 3.2);
    y += h;
    doc.setDrawColor(LINE); doc.setLineWidth(0.2); doc.line(M, y - 1, M + CW, y - 1);
  });

  /* ---------- 4 Key terms ---------- */
  heading("4", "Key terms");
  SOP.terms.forEach(t => {
    font("n", 9, INK);
    const lines = doc.splitTextToSize(t[1], CW - 48);
    const h = lines.length * lh(9) + 2.4;
    need(h);
    font("b", 9, INK); doc.text(doc.splitTextToSize(t[0], 44), M, y + 3.2);
    font("n", 9, INK); doc.text(lines, M + 48, y + 3.2);
    y += h;
  });

  /* ---------- 5 Procedure ---------- */
  heading("5", "Procedure");
  para("Each step lists who does it, what to do, what you should have at the end, and the links you need.", 9.5, SOFT);
  y += 2;
  SOP.stages.forEach(s => {
    need(30);
    doc.setFillColor(s.colour); doc.roundedRect(M, y, CW, 11, 1.5, 1.5, "F");
    font("b", 11, "#0b1530"); doc.text("Stage " + s.n + ": " + s.name, M + 4, y + 7.2);
    font("n", 8.5, "#0b1530"); doc.text(s.when, M + CW - 4, y + 7.2, {align:"right"});
    y += 14;
    para(s.intro, 9.2, SOFT); y += 1.5;
    s.steps.forEach(st => {
      font("n", 9, INK);
      const dl = doc.splitTextToSize(st.detail, CW - 16);
      const ol = doc.splitTextToSize("Result: " + st.output + (st.status ? "  Tracker status: " + st.status + "." : ""), CW - 16);
      const hasLinks = st.links.length > 0;
      const h = 6 + dl.length*lh(9) + ol.length*lh(9) + (hasLinks ? 6 : 0) + 4;
      need(h);
      const y0 = y;
      doc.setFillColor(mix(s.colour, 0.9)); doc.roundedRect(M, y0 + 0.5, 10, 5.5, 1, 1, "F");
      font("b", 8.5, "#0b1530"); doc.text(st.id, M + 5, y0 + 4.3, {align:"center"});
      font("b", 10, INK); doc.text(st.title, M + 14, y0 + 4.4);
      const tw = doc.getTextWidth(st.title);
      font("n", 8, SOFT); doc.text("Who: " + st.who.join(", ") + (st.email ? "   |   Automatic email" : ""), M + 14 + tw + 4, y0 + 4.4);
      y = y0 + 7;
      font("n", 9, INK); doc.text(dl, M + 14, y + 3); y += dl.length*lh(9);
      font("n", 9, SOFT); doc.text(ol, M + 14, y + 3); y += ol.length*lh(9);
      if (hasLinks) {
        let lx = M + 14; y += 1.5;
        font("b", 7.4, FAINT); doc.text("LINKS", lx, y + 3, {charSpace:0.3}); lx += 11;
        st.links.forEach((code, i) => {
          const kind = code.split(":")[1];
          const lbl = {cohort:"Your unit cohort sheet", dashboard:"Your unit dashboard", reports:"Your unit report folder"}[kind] + " (section 7)";
          font("n", 8.4, INK); doc.text(lbl, lx, y + 3); lx += doc.getTextWidth(lbl);
          if (i < st.links.length - 1) { font("n", 8.4, FAINT); doc.text("  |  ", lx, y + 3); lx += doc.getTextWidth("  |  "); }
        });
        y += 4.5;
      }
      y += 3.5;
      doc.setDrawColor(LINE); doc.setLineWidth(0.2); doc.line(M + 14, y - 1.8, M + CW, y - 1.8);
    });
    y += 2;
  });

  /* ---------- 6 Rules ---------- */
  heading("6", "Rules to follow");
  SOP.rules.forEach((r, i) => {
    font("n", 9.2, INK);
    const lines = doc.splitTextToSize(r, CW - 10);
    const h = lines.length*lh(9.2) + 1.8;
    need(h);
    doc.setFillColor(NAVY); doc.circle(M + 2, y + 2.1, 1, "F");
    doc.text(lines, M + 7, y + 3.2);
    y += h;
  });

  /* ---------- 7 Unit links ---------- */
  need(30 + 6.5 + (UNITS_IN || []).length * 7);   /* keep the unit table on one page */
  heading("7", "Unit links");
  para("Each unit's cohort sheet, dashboard and completion reports folder. Click Open to go to the link. Links are taken from the Connect@CTLI Workflows 2027 site when the PDF is downloaded.", 9, SOFT);
  y += 1.5;
  const cx = [M, M + 92, M + 122, M + 152];
  doc.setFillColor(TINT); doc.rect(M, y, CW, 6.5, "F");
  font("b", 7.2, FAINT);
  ["UNIT", "COHORT SHEET", "DASHBOARD", "REPORTS"].forEach((h, i) => doc.text(h, cx[i] + 2, y + 4.4, {charSpace:0.25}));
  y += 6.5;
  (UNITS_IN || []).forEach(u => {
    need(9);
    const UL = (L.units && L.units[u.k]) || {};
    doc.setFillColor(u.c[0]); doc.roundedRect(cx[0] + 2, y + 2.3, 2.6, 2.6, 0.5, 0.5, "F");
    font("b", 8.2, INK); doc.text(u.k, cx[0] + 7, y + 4.6);
    font("n", 7.4, SOFT); doc.text(doc.splitTextToSize(u.name, 64)[0], cx[0] + 24, y + 4.6);
    ["cohort", "dashboard", "reports"].forEach((k, i) => {
      const url = (UL[k] || "").trim();
      if (url) { font("b", 8.2, NAVY); doc.textWithLink("Open", cx[i+1] + 2, y + 4.6, {url}); doc.setDrawColor(NAVY); doc.setLineWidth(0.2); doc.line(cx[i+1] + 2, y + 5.3, cx[i+1] + 2 + doc.getTextWidth("Open"), y + 5.3); }
      else { font("n", 7.6, FAINT); doc.text("Not added yet", cx[i+1] + 2, y + 4.6); }
    });
    y += 7;
    doc.setDrawColor(LINE); doc.setLineWidth(0.2); doc.line(M, y, M + CW, y);
  });

  /* ---------- 8 Sign-off ---------- */
  need(58);
  heading("8", "Approval");
  const sw = (CW - 8)/2;
  [["Prepared by", "CTLI Process Team (LMS Administration)"], ["Approved by", ""]].forEach((s, i) => {
    const x = M + i*(sw + 8);
    font("b", 7.4, FAINT); doc.text(s[0].toUpperCase(), x, y + 3, {charSpace:0.3});
    font("n", 8.6, INK); if (s[1]) doc.text(s[1], x, y + 8);
    doc.setDrawColor(SOFT); doc.setLineWidth(0.25);
    font("n", 7.6, SOFT);
    [["Name", 16], ["Signature", 25], ["Date", 34]].forEach(([lab, dy]) => { doc.text(lab, x, y + dy); doc.line(x + 18, y + dy + 0.4, x + sw, y + dy + 0.4); });
  });
  y += 40;

  /* ---------- footer on every page ---------- */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const seg = CW/3; [["#FFC600",0],["#8FAD15",1],["#00A1A3",2]].forEach(([c,i])=>{ doc.setFillColor(c); doc.rect(M + i*seg, H - 13, seg, 0.7, "F"); });
    font("n", 7.4, SOFT);
    doc.text(SOP.kind + ": " + SOP.title + "  |  Version " + (SOP.control.find(c=>c[0]==="Version")||[0,"1.0"])[1] + "  |  " + SOP.org, M, H - 8.6);
    doc.text("Page " + p + " of " + pages, W - M, H - 8.6, {align:"right"});
    if (p > 1) { doc.addImage(assets.logo, "PNG", M, 8, 28.5, 8); font("b", 7.4, SOFT); doc.text(SOP.title.toUpperCase(), W - M, 13, {align:"right", charSpace:0.3}); doc.setDrawColor(LINE); doc.setLineWidth(0.25); doc.line(M, 17.5, W - M, 17.5); }
  }
  return doc;
}
if (typeof module !== "undefined") module.exports = { buildSopPdf };
