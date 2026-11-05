// Fills the Board and Publications pages from Google Sheet tabs published as CSV.
// Paste each tab's published CSV link between the quotes. Leave blank to keep the page's built-in content.
const BOARD_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSuMZEtoLMkiS9814zq43KUwwUYGxN83BHPM3jzUW7MSYVCop7UvlsJOval5APx-7tasbYzYA6uU2Ax/pub?gid=829251906&single=true&output=csv";
const PUBLICATIONS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSuMZEtoLMkiS9814zq43KUwwUYGxN83BHPM3jzUW7MSYVCop7UvlsJOval5APx-7tasbYzYA6uU2Ax/pub?gid=1168173273&single=true&output=csv";

function parseCSV(t){
  const rows=[]; let r=[], c="", q=false;
  for(let i=0;i<t.length;i++){
    const ch=t[i];
    if(q){ if(ch==='"'){ if(t[i+1]==='"'){c+='"';i++;} else q=false; } else c+=ch; }
    else if(ch==='"') q=true;
    else if(ch===','){ r.push(c); c=""; }
    else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&t[i+1]==='\n') i++; r.push(c); rows.push(r); r=[]; c=""; }
    else c+=ch;
  }
  if(c||r.length){ r.push(c); rows.push(r); }
  return rows;
}
async function getRows(url){
  const rows=parseCSV(await (await fetch(url,{cache:"no-store"})).text());
  const head=rows.shift().map(h=>h.toLowerCase().replace(/\s+/g,""));
  return rows.map(r=>{ const o={}; head.forEach((h,i)=>o[h]=(r[i]||"").trim()); return o; });
}
const esc=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const initials=n=>{const w=n.split(/\s+/);return (w[0][0]+(w.length>1?w[w.length-1][0]:"")).toUpperCase();};

function boardCard(r){
  const src=r.photo?(/^https?:/.test(r.photo)?r.photo:"assets/img/"+r.photo):"";
  const meta=[r.school,r.class].filter(Boolean).map(esc).join("<br>");
  return `<article class="board-card"><div class="board-avatar"${src?"":' aria-hidden="true"'}>${src?`<img src="${esc(src)}" alt="${esc(r.name)}">`:initials(r.name)}</div>`+
    `<h3>${esc(r.name)}</h3><span class="board-role">${esc(r.role)}</span>`+(meta?`<p class="board-meta">${meta}</p>`:"")+
    (r.tribalaffiliation?`<p class="board-tribe">Tribal affiliation: ${esc(r.tribalaffiliation)}</p>`:"")+
    (r.bio?`<p class="board-bio">${esc(r.bio)}</p>`:"")+`</article>`;
}
async function loadBoard(){
  const root=document.getElementById("boardRoot"); if(!root||!BOARD_CSV_URL) return;
  try{
    const rows=(await getRows(BOARD_CSV_URL)).filter(r=>r.name);
    const years=[...new Set(rows.map(r=>r.year))].sort((a,b)=>b-a);
    const first=Math.min(...years.map(Number));
    root.innerHTML=years.map(y=>`<div class="year-block"><div class="year-block-head"><h2>${+y===first?"Founding Members":"Board"}</h2><span>${esc(y)}</span></div><div class="board-grid">${rows.filter(r=>r.year===y).map(boardCard).join("")}</div></div>`).join("");
  }catch(e){ console.error("Could not load board sheet",e); }
}
function pubCard(r){
  const authors=esc(r.authors).replace(/\*(.+?)\*/g,"<strong>$1</strong>");
  return `<div class="pub-card"><div class="pub-year">${esc(r.year)}</div><div class="pub-body"><h3>${esc(r.title)}</h3>`+
    `<div class="pub-meta">${authors}${r.journal?`<br><em>${esc(r.journal)}</em>`:""}</div>`+(r.summary?`<p>${esc(r.summary)}</p>`:"")+
    (/^https?:/.test(r.link)?`<a href="${esc(r.link)}" target="_blank" rel="noopener">Read the publication →</a>`:"")+`</div></div>`;
}
async function loadPublications(){
  const el=document.getElementById("pubList"); if(!el||!PUBLICATIONS_CSV_URL) return;
  try{
    const rows=(await getRows(PUBLICATIONS_CSV_URL)).filter(r=>r.title).sort((a,b)=>b.year-a.year);
    el.innerHTML=rows.length?rows.map(pubCard).join(""):'<p style="color:#5a7678;">No publications yet.</p>';
  }catch(e){ console.error("Could not load publications sheet",e); }
}
document.addEventListener("DOMContentLoaded",()=>{ loadBoard(); loadPublications(); });
