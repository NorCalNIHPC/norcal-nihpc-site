// School pages: fills the board section from the Board sheet (uses BOARD_CSV_URL, getRows, boardCard, esc from pages-data.js).
document.addEventListener("DOMContentLoaded",async()=>{
  const root=document.getElementById("schoolBoard");
  if(!root||typeof BOARD_CSV_URL==="undefined"||!BOARD_CSV_URL) return;
  const keys=(root.dataset.keys||"").split(",");
  try{
    const all=(await getRows(BOARD_CSV_URL)).filter(r=>r.name);
    const first=Math.min(...all.map(r=>+r.year).filter(Boolean));
    const rows=all.filter(r=>keys.some(k=>r.school.toLowerCase().includes(k)));
    const years=[...new Set(rows.map(r=>r.year))].sort((a,b)=>b-a);
    root.innerHTML=years.length?years.map(y=>`<div class="year-block"><div class="year-block-head"><h2>${+y===first?"Founding Members":"Board"}</h2><span>${esc(y)}</span></div><div class="board-grid">${rows.filter(r=>r.year===y).map(boardCard).join("")}</div></div>`).join(""):'<p style="color:#5a7678;">Board members will be listed here soon.</p>';
  }catch(e){ console.error("Could not load board sheet",e); }
});
