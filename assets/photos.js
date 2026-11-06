// Photo gallery: reads approved photo submissions from a published Google Sheet tab (CSV).
// Paste the tab's published CSV link between the first pair of quotes, and your Google Form's
// link between the second pair (this adds a "Share a photo" button). Leave either blank to skip it.
const PHOTOS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSuMZEtoLMkiS9814zq43KUwwUYGxN83BHPM3jzUW7MSYVCop7UvlsJOval5APx-7tasbYzYA6uU2Ax/pub?gid=896645513&single=true&output=csv";
const PHOTO_FORM_URL = "https://forms.gle/UZyVhzphKHcY25mZ9";

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

  // Home page: swap the hero illustration for a slow crossfade of recent photos (keeps the illustration if none load)
  function heroShow(){
    const fig=document.getElementById("heroFigure"); if(!fig||!photos.length) return;
    const pool=photos.filter(p=>p.school==="coalition"); const use=(pool.length>=3?pool:photos).slice(-6).reverse();
    const imgs=[]; let ready=0;
    use.forEach(p=>{
      const im=new Image(); im.className="hero-slide"; im.alt=p.desc||""; im.decoding="async";
      im.onload=()=>{
        imgs.push(im); fig.appendChild(im);
        if(++ready===1){ fig.querySelector("svg")&&(fig.querySelector("svg").style.visibility="hidden"); fig.removeAttribute("aria-hidden"); im.classList.add("on"); }
        if(ready===2 && !matchMedia("(prefers-reduced-motion: reduce)").matches){
          let i=0; setInterval(()=>{ imgs[i].classList.remove("on"); i=(i+1)%imgs.length; imgs[i].classList.add("on"); },6000);
        }
      };
      im.src=thumb(p.id,1000);
    });
  }

  async function init(){
    const share=document.getElementById("photoShare");
    if(share&&PHOTO_FORM_URL){ share.href=PHOTO_FORM_URL; share.hidden=false; }
    if(!PHOTOS_CSV_URL) return;
    try{ await load(); }catch(e){ console.error("Could not load photos sheet",e); return; }

    heroShow();
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
