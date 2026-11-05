// Resources page: fills the two resource sections from a published Google Sheet tab (CSV).
// Paste the tab's published CSV link in RESOURCES_CSV_URL, and (optionally) a form link in RESOURCE_FORM_URL
// to show a "Suggest a resource" button. Leave RESOURCES_CSV_URL blank to keep the built-in placeholder cards.
const RESOURCES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSuMZEtoLMkiS9814zq43KUwwUYGxN83BHPM3jzUW7MSYVCop7UvlsJOval5APx-7tasbYzYA6uU2Ax/pub?gid=1361184372&single=true&output=csv";
const RESOURCE_FORM_URL = "https://forms.gle/M2DuwbMsojYtSW3M9";
// Opportunities (scholarships, internships, programs...) come from a second tab, published as CSV.
const OPPORTUNITIES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSuMZEtoLMkiS9814zq43KUwwUYGxN83BHPM3jzUW7MSYVCop7UvlsJOval5APx-7tasbYzYA6uU2Ax/pub?gid=710633766&single=true&output=csv";
const OPPORTUNITY_FORM_URL = "https://forms.gle/UxbDgCKeSvkTMb636";

(function(){
  const esc=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
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
  const driveIds=s=>[...String(s||"").matchAll(/(?:[?&]id=|\/d\/)([\w-]{20,})/g)].map(m=>m[1]);
  const thumb=id=>`https://drive.google.com/thumbnail?id=${id}&sz=w600`;
  const fileUrl=id=>`https://drive.google.com/file/d/${id}/view`;
  const isUrl=s=>/^https?:\/\//i.test(s||"");
  const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
  // Audience cell may list several ("Pre-med students, Medical students"). Blank/unrecognized = shown to everyone.
  const AUD_LABEL={high:"High school",premed:"Pre-med",med:"Medical school"};
  const audience=s=>{s=(s||"").toLowerCase();const a=[];
    if(/high/.test(s)) a.push("high");
    if(/pre|under/.test(s)) a.push("premed");
    if(/medical|med\s*stud|med school|^med/.test(s.replace(/pre-?\s*med\w*/g,""))) a.push("med");
    return a.length?a:["high","premed","med"];};

  const ICON='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h16M4 6h16M4 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function card(r){
    const ids=driveIds(r.file);
    const media=ids.length?`<img class="res-thumb" loading="lazy" src="${thumb(ids[0])}" alt="">`:`<div class="icon" aria-hidden="true">${ICON}</div>`;
    const tags=[r.category,r.type].filter(Boolean).map(t=>`<span class="res-tag">${esc(t)}</span>`).join("");
    const links=[];
    if(isUrl(r.link)) links.push(`<a href="${esc(r.link)}" target="_blank" rel="noopener">Learn More →</a>`);
    ids.forEach((id,i)=>links.push(`<a href="${fileUrl(id)}" target="_blank" rel="noopener">${ids.length>1?`Download file ${i+1}`:"Download file"} →</a>`));
    return `<div class="resource-card">${media}${tags?`<div class="res-tags">${tags}</div>`:""}<h3>${esc(r.name)}</h3>`+
      (r.description?`<p>${esc(r.description)}</p>`:"")+
      (links.length?`<div class="res-links">${links.join("")}</div>`:"")+`</div>`;
  }

  // ---- Opportunities ----
  // Accepts 2027-02-01 or 2/1/2027; anything else (e.g. "Rolling") is kept as text and sorted last.
  function parseDate(s){
    let m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s||"");
    if(m) return new Date(+m[1],m[2]-1,+m[3]);
    m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s||"");
    return m?new Date(+m[3],m[1]-1,+m[2]):null;
  }
  const fmt=d=>d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  function oppCard(o){
    const ids=driveIds(o.file);
    const tags=[o.type].filter(Boolean).map(t=>`<span class="res-tag">${esc(t)}</span>`).join("");
    const when=o.date?`<span class="opp-deadline">Deadline: ${fmt(o.date)}</span>`:(o.deadline?`<span class="opp-deadline rolling">${esc(o.deadline)}</span>`:"");
    const meta=[o.organization,o.location].filter(Boolean).map(esc).join(" · ");
    const links=[];
    if(isUrl(o.link)) links.push(`<a href="${esc(o.link)}" target="_blank" rel="noopener">Learn More &amp; Apply →</a>`);
    ids.forEach((id,i)=>links.push(`<a href="${fileUrl(id)}" target="_blank" rel="noopener">${ids.length>1?`Download file ${i+1}`:"Download file"} →</a>`));
    return `<div class="opp-card"><div class="opp-top">${tags}${when}</div><h3>${esc(o.name)}</h3>`+
      (meta?`<div class="opp-meta">${meta}</div>`:"")+(o.description?`<p>${esc(o.description)}</p>`:"")+
      (o.eligibility?`<p class="opp-elig"><strong>Who can apply:</strong> ${esc(o.eligibility)}</p>`:"")+
      (links.length?`<div class="res-links">${links.join("")}</div>`:"")+`</div>`;
  }
  async function initOpps(){
    const share=document.getElementById("opportunityShare");
    if(share&&OPPORTUNITY_FORM_URL){ share.href=OPPORTUNITY_FORM_URL; share.hidden=false; }
    const el=document.getElementById("oppList");
    if(!el||!OPPORTUNITIES_CSV_URL) return;
    let rows;
    try{
      const t=parseCSV(await (await fetch(OPPORTUNITIES_CSV_URL,{cache:"no-store"})).text());
      const head=t.shift().map(h=>h.toLowerCase().replace(/[^a-z]/g,""));
      const now=new Date(); now.setHours(0,0,0,0);
      rows=t.map(r=>{const o={};head.forEach((h,i)=>o[h]=(r[i]||"").trim());
        const a=audience(o.audience);
        return {name:o.opportunityname||o.name, type:o.type, organization:o.organization, location:o.location,
          audience:a,
          description:o.description, eligibility:o.eligibility, link:o.link, linktext:o.linkbuttontext||o.linktext,
          file:o.file||o.image||o.pdf, deadline:o.deadline, date:parseDate(o.deadline)};
      }).filter(o=>o.name && !(o.date && o.date<now));
    }catch(e){ console.error("Could not load opportunities sheet",e); return; }
    // soonest deadline first; dateless ("Rolling") last
    rows.sort((a,b)=>(a.date?a.date.getTime():9e15)-(b.date?b.date.getTime():9e15));
    const pills=[...document.querySelectorAll(".opp-filter .filter-pill")];
    const show=f=>{
      pills.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.filter===f)));
      const m=rows.filter(o=>f==="all"||o.audience.includes(f));
      el.innerHTML=m.length?m.map(oppCard).join(""):'<p class="photo-empty">No open opportunities right now. Check back soon.</p>';
    };
    pills.forEach(b=>b.onclick=()=>show(b.dataset.filter));
    show("all");
  }

  async function init(){
    initOpps();
    const share=document.getElementById("resourceShare");
    if(share&&RESOURCE_FORM_URL){ share.href=RESOURCE_FORM_URL; share.hidden=false; }
    if(!RESOURCES_CSV_URL) return;
    let rows;
    try{
      const t=parseCSV(await (await fetch(RESOURCES_CSV_URL,{cache:"no-store"})).text());
      const head=t.shift().map(h=>h.toLowerCase().replace(/[^a-z]/g,""));
      rows=t.map(r=>{const o={};head.forEach((h,i)=>o[h]=(r[i]||"").trim());return {
        name:o.resourcename||o.name, audience:audience(o.audience), category:o.category, type:o.type,
        description:o.description, link:o.link, linktext:o.linkbuttontext||o.linktext, file:o.file||o.image||o.pdf||o.fileimage,
        featured:/^(true|yes|y|1|x)$/i.test(o.featured||""),
        order:parseFloat(o.order)};
      }).filter(r=>r.name);
    }catch(e){ console.error("Could not load resources sheet",e); return; }

    rows.sort((a,b)=>(b.featured-a.featured)||((isNaN(a.order)?9999:a.order)-(isNaN(b.order)?9999:b.order)));
    [["resHigh","high"],["resPremed","premed"],["resMed","med"]].forEach(([id,key])=>{
      const el=document.getElementById(id); if(!el) return;
      const mine=rows.filter(r=>r.audience.includes(key));
      if(mine.length) el.innerHTML=mine.map(card).join("");
    });
  }
  document.addEventListener("DOMContentLoaded",init);
})();
