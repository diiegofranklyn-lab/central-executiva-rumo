(()=>{
  const KEY='rumo_app_v4';
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));
  const getDb=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
  const saveDb=db=>localStorage.setItem(KEY,JSON.stringify(db));
  const units=()=>{const db=getDb()||{};return (db.unidades||[]).filter(u=>u.active!==false).map(u=>u.name)};
  const days=d=>{if(!d)return null;return Math.ceil((new Date(d+'T23:59:59')-new Date())/86400000)};
  const dateBR=d=>{if(!d)return '—';const [y,m,day]=d.split('-');return `${day}/${m}/${y}`};
  const statusClass=s=>s==='Concluída'?'ok':s==='Em andamento'?'warn':s==='Cancelada'?'cancel':'open';
  const priorityClass=p=>p==='Crítica'?'critical':p==='Alta'?'high':p==='Baixa'?'low':'medium';
  function isDemandPage(){return document.querySelector('#workspace h1')?.textContent?.trim()==='Demandas'}
  function render(){
    if(!isDemandPage())return;
    const db=getDb()||{},data=Array.isArray(db.demandas)?db.demandas:[], box=document.querySelector('#workspace');
    if(!box)return;
    const stats=box.querySelector('#moduleStats');
    if(stats)stats.innerHTML=`<div><small>Total de demandas</small><strong>${data.length}</strong></div><div><small>Abertas</small><strong>${data.filter(x=>x.status==='Aberta').length}</strong></div><div><small>Em andamento</small><strong>${data.filter(x=>x.status==='Em andamento').length}</strong></div><div><small>Concluídas</small><strong>${data.filter(x=>x.status==='Concluída').length}</strong></div>`;
    const panel=box.querySelector('.module-panel');if(!panel)return;
    let filters=panel.querySelector('.filters');
    if(!filters)return;
    filters.innerHTML=`<input id="moduleSearch" placeholder="Buscar por demanda, unidade ou responsável..."><div class="quick-tabs"><button type="button" class="active" data-qfilter="">Todas</button><button type="button" data-qfilter="Aberta">Abertas</button><button type="button" data-qfilter="Em andamento">Em andamento</button><button type="button" data-qfilter="Concluída">Concluídas</button></div>`;
    const table=panel.querySelector('table');
    if(table){
      table.innerHTML='<thead id="moduleHead"></thead><tbody id="moduleBody"></tbody>';
      table.querySelector('#moduleHead').innerHTML='<tr><th>ID</th><th>DEMANDA</th><th>UNIDADE</th><th>RESPONSÁVEL</th><th>PRIORIDADE</th><th>VENCIMENTO</th><th>STATUS</th><th>DIAS</th><th>AÇÕES</th></tr>';
    }
    const search=panel.querySelector('#moduleSearch'), tabs=panel.querySelectorAll('[data-qfilter]');
    const paint=()=>{
      const q=(search?.value||'').toLowerCase(),f=[...tabs].find(b=>b.classList.contains('active'))?.dataset.qfilter||'';
      const list=data.filter(x=>(!f||x.status===f)&&(!q||[x.id,x.title,x.unit,x.owner,x.priority,x.status].join(' ').toLowerCase().includes(q)));
      const body=panel.querySelector('#moduleBody');if(!body)return;
      body.innerHTML=list.map(x=>{const n=days(x.due_date),dc=n!==null?(n<0?'late':n<=7?'soon':''):'',dayText=n===null?'—':n<0?`${Math.abs(n)}d atrasado`:n===0?'Hoje':`${n}d`;return `<tr><td><span class="demand-id">${esc(x.id)}</span></td><td><span class="demand-title">${esc(x.title)}</span></td><td>${esc(x.unit)}</td><td>${esc(x.owner)}</td><td><span class="priority-pill ${priorityClass(x.priority)}">${esc(x.priority||'Média')}</span></td><td class="due-cell ${dc}">${dateBR(x.due_date)}</td><td><span class="status-pill ${statusClass(x.status)}">${esc(x.status)}</span></td><td class="days-cell ${dc}">${dayText}</td><td><button class="mini" data-demand-edit="${esc(x.id)}">Editar</button></td></tr>`}).join('')||'<tr><td colspan="9" class="empty-row">Nenhuma demanda encontrada.</td></tr>';
      body.querySelectorAll('[data-demand-edit]').forEach(b=>b.onclick=()=>openForm(b.dataset.demandEdit));
    };
    if(!filters.dataset.bound){
      filters.dataset.bound='1';search.oninput=paint;tabs.forEach(b=>b.onclick=()=>{tabs.forEach(x=>x.classList.remove('active'));b.classList.add('active');paint()});
    }
    paint();
  }
  function openForm(id){
    const db=getDb()||{},old=(db.demandas||[]).find(x=>String(x.id)===String(id))||{},md=document.querySelector('#moduleDialog');if(!md)return;
    const status=['Aberta','Em andamento','Concluída','Cancelada'],priorities=['Baixa','Média','Alta','Crítica'];
    md.innerHTML=`<form class="module-form demand-form"><div class="form-kicker">ACOMPANHAMENTO EXECUTIVO RUMO</div><h3>${id?'Editar demanda':'Nova demanda'}</h3><p class="form-subtitle">Registre o assunto e acompanhe o responsável, prazo e status.</p><label>Demanda<input name="title" value="${esc(old.title||'')}" placeholder="Ex.: Crachás pendentes" required></label><div class="two"><label>Unidade<select name="unit">${units().map(u=>`<option ${old.unit===u?'selected':''}>${esc(u)}</option>`).join('')}</select></label><label>Responsável<input name="owner" value="${esc(old.owner||'')}" placeholder="Nome ou área" required></label></div><div class="two"><label>Prioridade<select name="priority">${priorities.map(s=>`<option ${old.priority===s?'selected':''}>${s}</option>`).join('')}</select></label><label>Status<select name="status">${status.map(s=>`<option ${old.status===s?'selected':''}>${s}</option>`).join('')}</select></label></div><label>Data de vencimento<input name="due_date" type="date" value="${esc(old.due_date||'')}" required></label><div class="actions"><button type="button" class="ghost" id="closeDemand">Cancelar</button><button>Salvar demanda</button></div></form>`;
    md.showModal();md.querySelector('#closeDemand').onclick=()=>md.close();md.querySelector('form').onsubmit=e=>{e.preventDefault();const r=Object.fromEntries(new FormData(e.target));r.id=id||Date.now().toString().slice(-6);if(id){const i=(db.demandas||[]).findIndex(x=>String(x.id)===String(id));db.demandas[i]={...db.demandas[i],...r}}else{db.demandas=db.demandas||[];db.demandas.unshift(r)}saveDb(db);md.close();setTimeout(render,0)};
  }
  function bind(){if(!isDemandPage())return;const action=document.querySelector('#moduleAction');if(action&&!action.dataset.demandBound){action.dataset.demandBound='1';action.onclick=()=>openForm()}render()}
  const start=()=>{const ws=document.querySelector('#workspace');if(!ws)return;const mo=new MutationObserver(bind);mo.observe(ws,{childList:true});bind()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();