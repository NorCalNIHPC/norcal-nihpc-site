// Reads events + news from a published Google Sheet (CSV) and fills the page.
// Paste the published CSV link of the Events display tab between the quotes.
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSuMZEtoLMkiS9814zq43KUwwUYGxN83BHPM3jzUW7MSYVCop7UvlsJOval5APx-7tasbYzYA6uU2Ax/pub?gid=1559474219&single=true&output=csv";

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
function parseDate(s){
  s=(s||"").trim();
  const m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const d=m?new Date(+m[1],m[2]-1,+m[3]):new Date(s);
  return isNaN(d)?null:d;
}
const escHtml=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=d=>d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"});
const isCoalition=h=>!h||/coalition|all schools/i.test(h);

function card(it){
  const isNews=it.type==="news";
  let label=fmt(it.date);
  if(!isNews&&it.end&&it.end>it.date) label+=" – "+fmt(it.end);
  if(it.time) label+=" · "+escHtml(it.time);
  const title=/^https?:/.test(it.link)?`<a href="${escHtml(it.link)}" target="_blank" rel="noopener">${escHtml(it.title)}</a>`:escHtml(it.title);
  return `<div class="event-card"><div class="event-date">${label}</div><div class="event-body"><h3>${title}</h3>`+
    (isNews?"":`<p><strong>Host:</strong> ${isCoalition(it.school)?"Coalition-wide":escHtml(it.school)}</p>`)+
    (it.location?`<p><strong>Where:</strong> ${escHtml(it.location)}</p>`:"")+
    (it.description?`<p>${escHtml(it.description)}</p>`:"")+`</div></div>`;
}
// A container with data-keys="ucsf" shows only events hosted by that school (coalition-wide events stay on the main Events page).
function show(id,items,empty){
  const el=document.getElementById(id); if(!el) return;
  const keys=(el.dataset.keys||"").split(",").filter(Boolean);
  if(keys.length) items=items.filter(i=>!isCoalition(i.school)&&keys.some(k=>i.school.toLowerCase().includes(k)));
  const lim=+el.dataset.limit||items.length;
  el.innerHTML=items.length?items.slice(0,lim).map(card).join(""):`<p style="grid-column:1/-1;color:#5a7678;">${empty}</p>`;
}
async function loadEvents(){
  if(!SHEET_CSV_URL) return;
  try{
    const rows=parseCSV(await (await fetch(SHEET_CSV_URL,{cache:"no-store"})).text());
    const head=rows.shift().map(h=>h.toLowerCase().replace(/\s+/g,""));
    const items=rows.map(r=>{
      const o={}; head.forEach((h,i)=>o[h]=(r[i]||"").trim());
      return {type:o.type.toLowerCase()==="news"?"news":"event",title:o.title,date:parseDate(o.date),end:parseDate(o.enddate),
        time:o.time,location:o.location,description:o.description,link:o.link,school:o.school||""};
    }).filter(i=>i.title&&i.date);
    const today=new Date(); today.setHours(0,0,0,0);
    const events=items.filter(i=>i.type==="event"), last=i=>i.end||i.date;
    const up=events.filter(i=>last(i)>=today).sort((a,b)=>a.date-b.date);
    const past=events.filter(i=>last(i)<today).sort((a,b)=>b.date-a.date);
    show("upcomingEvents",up,"No upcoming events right now — check back soon.");
    show("archivedEvents",past,"No past events yet.");
    show("schoolUpcoming",up,"No upcoming events listed yet — check back soon.");
    show("schoolPast",past,"No past events yet.");
    show("newsList",items.filter(i=>i.type==="news").sort((a,b)=>b.date-a.date),"No news yet.");
  }catch(e){ console.error("Could not load events sheet",e); }
}
document.addEventListener("DOMContentLoaded",loadEvents);
