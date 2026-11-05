// Resources page: fills the two resource sections from a published Google Sheet tab (CSV).
// Paste the tab's published CSV link in RESOURCES_CSV_URL, and (optionally) a form link in RESOURCE_FORM_URL
// to show a "Suggest a resource" button. Leave RESOURCES_CSV_URL blank to keep the built-in placeholder cards.
const RESOURCES_CSV_URL = "";
const RESOURCE_FORM_URL = "";

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
  // "Undergraduate", "Medical School", or "Both" (anything else = Both)
  const audience=s=>{s=(s||"").toLowerCase();return /under/.test(s)?"undergrad":/med/.test(s)?"med":"both";};

  const ICON='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h16M4 6h16M4 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function card(r){
    const ids=driveIds(r.file);
    const media=ids.length?`<img class="res-thumb" loading="lazy" src="${thumb(ids[0])}" alt="">`:`<div class="icon" aria-hidden="true">${ICON}</div>`;
    const tags=[r.category,r.type].filter(Boolean).map(t=>`<span class="res-tag">${esc(t)}</span>`).join("");
    const links=[];
    if(isUrl(r.link)) links.push(`<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.linktext||"Open resource")} →</a>`);
    ids.forEach((id,i)=>links.push(`<a href="${fileUrl(id)}" target="_blank" rel="noopener">${ids.length>1?`Download file ${i+1}`:"Download file"} →</a>`));
    return `<div class="resource-card">${media}${tags?`<div class="res-tags">${tags}</div>`:""}<h3>${esc(r.name)}</h3>`+
      (r.description?`<p>${esc(r.description)}</p>`:"")+
      (r.deadline?`<div class="res-deadline">Deadline: ${esc(r.deadline)}</div>`:"")+
      (links.length?`<div class="res-links">${links.join("")}</div>`:"")+`</div>`;
  }

  async function init(){
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
        deadline:o.deadline, expires:o.expires||o.expirationdate, featured:/^(true|yes|y|1|x)$/i.test(o.featured||""),
        order:parseFloat(o.order)};
      }).filter(r=>r.name && !(r.expires && r.expires<today()));
    }catch(e){ console.error("Could not load resources sheet",e); return; }

    rows.sort((a,b)=>(b.featured-a.featured)||((isNaN(a.order)?9999:a.order)-(isNaN(b.order)?9999:b.order)));
    [["resUndergrad","undergrad"],["resMed","med"]].forEach(([id,key])=>{
      const el=document.getElementById(id); if(!el) return;
      const mine=rows.filter(r=>r.audience===key||r.audience==="both");
      if(mine.length) el.innerHTML=mine.map(card).join("");
    });
  }
  document.addEventListener("DOMContentLoaded",init);
})();
