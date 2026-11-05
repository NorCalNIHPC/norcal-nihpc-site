// Photo gallery: reads approved photo submissions from a published Google Sheet tab (CSV).
// Paste the tab's published CSV link between the first pair of quotes, and your Google Form's
// link between the second pair (this adds a "Share a photo" button). Leave either blank to skip it.
const PHOTOS_CSV_URL = "";
const PHOTO_FORM_URL = "";

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
  // A form row can hold several files in one cell: "https://drive.google.com/open?id=AAA, https://drive.google.com/open?id=BBB"
  const driveIds=s=>[...String(s||"").matchAll(/(?:[?&]id=|\/d\/)([\w-]{20,})/g)].map(m=>m[1]);
  const thumb=(id,w)=>`https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;
  const schoolKey=s=>{s=(s||"").toLowerCase();return /stanford/.test(s)?"stanford":/davis|ucd/.test(s)?"davis":/ucsf/.test(s)?"ucsf":"coalition";};

  let photos=[];
  async function load(){
    const rows=parseCSV(await (await fetch(PHOTOS_CSV_URL,{cache:"no-store"})).text());
    const head=rows.shift().map(h=>h.toLowerCase().replace(/\s+/g,""));
    rows.forEach(r=>{
      const o={}; head.forEach((h,i)=>o[h]=(r[i]||"").trim());
      driveIds(o.image).forEach(id=>photos.push({id,school:schoolKey(o.school),desc:o.description||o.imagedescription||""}));
    });
  }

  // ---- lightbox ----
  let list=[], pos=0, box;
  function buildBox(){
    box=document.createElement("dialog"); box.className="lightbox";
    box.innerHTML='<button class="lb-close" aria-label="Close">×</button><button class="lb-nav lb-prev" aria-label="Previous photo">‹</button><figure><img alt=""><figcaption></figcaption></figure><button class="lb-nav lb-next" aria-label="Next photo">›</button>';
    document.body.appendChild(box);
    box.querySelector(".lb-close").onclick=()=>box.close();
    box.querySelector(".lb-prev").onclick=()=>step(-1);
    box.querySelector(".lb-next").onclick=()=>step(1);
    box.addEventListener("click",e=>{ if(e.target===box) box.close(); });
    box.addEventListener("keydown",e=>{ if(e.key==="ArrowLeft") step(-1); if(e.key==="ArrowRight") step(1); });
  }
  function step(d){ pos=(pos+d+list.length)%list.length; paint(); }
  function paint(){
    const p=list[pos]; box.querySelector("img").src=thumb(p.id,2000); box.querySelector("img").alt=p.desc;
    box.querySelector("figcaption").textContent=p.desc;
    box.classList.toggle("single",list.length<2);
  }
  function openBox(items,i){ if(!box) buildBox(); list=items; pos=i; paint(); box.showModal(); }

  function render(el,items,emptyMsg){
    if(!items.length){ el.innerHTML=`<p class="photo-empty">${emptyMsg}</p>`; return; }
    el.innerHTML=items.map((p,i)=>`<figure class="photo-item"><button type="button" data-i="${i}" aria-label="View larger: ${esc(p.desc||"photo")}"><img loading="lazy" src="${thumb(p.id,800)}" alt="${esc(p.desc)}"></button>${p.desc?`<figcaption>${esc(p.desc)}</figcaption>`:""}</figure>`).join("");
    el.querySelectorAll("button").forEach(b=>b.onclick=()=>openBox(items,+b.dataset.i));
  }

  async function init(){
    const share=document.getElementById("photoShare");
    if(share&&PHOTO_FORM_URL){ share.href=PHOTO_FORM_URL; share.hidden=false; }
    if(!PHOTOS_CSV_URL) return;
    try{ await load(); }catch(e){ console.error("Could not load photos sheet",e); return; }

    const school=document.getElementById("schoolPhotos");
    if(school){
      const keys=(school.dataset.keys||"").split(",");
      render(school,photos.filter(p=>keys.includes(p.school)),"No photos yet — be the first to share one.");
    }
    const grid=document.getElementById("galleryGrid");
    if(grid){
      const pills=[...document.querySelectorAll(".filter-pill")];
      const show=f=>{
        pills.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.filter===f)));
        render(grid,f==="all"?photos:photos.filter(p=>p.school===f),"No photos here yet.");
      };
      pills.forEach(b=>b.onclick=()=>show(b.dataset.filter));
      show("all");
    }
  }
  document.addEventListener("DOMContentLoaded",init);
})();
