(()=>{
const clean=()=>{
  const f=document.querySelector('#demandForm');
  if(f)f.querySelectorAll('label').forEach(l=>{
    const t=(l.textContent||'').trim().toLowerCase();
    if(t.startsWith('prazo')||t.startsWith('ideia')||t.startsWith('solução'))l.remove();
    if(t.startsWith('problema')){
      const n=l.querySelector('input,textarea');
      if(n)l.childNodes[0].textContent='Demanda';
    }
  });
  const table=document.querySelector('#demandTable')?.closest('table');
  if(table){
    table.querySelectorAll('thead th').forEach(h=>{
      if((h.textContent||'').trim().toLowerCase()==='problema')h.textContent='Demanda';
    });
    table.querySelectorAll('tr').forEach(r=>[6,4].forEach(i=>r.children[i]?.remove()));
    const e=table.querySelector('tbody td[colspan="7"]');
    if(e)e.colSpan=5;
  }
};
const schedule=()=>setTimeout(clean,80);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean);else clean();
document.addEventListener('click',e=>{if(e.target.closest('[data-view]'))schedule()});
window.addEventListener('hashchange',schedule);
})();