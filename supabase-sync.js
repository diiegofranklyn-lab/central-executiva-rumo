(()=>{
  const C=window.RUMO_SUPABASE_CONFIG;
  if(!C)return;
  const KEY='rumo_app_v4',base=C.url+'/rest/v1/';
  const headers=()=>({'apikey':C.key,'Content-Type':'application/json','Prefer':'return=representation'});
  const api=async(path,opts={})=>{const r=await fetch(base+path,{...opts,headers:{...headers(),...(opts.headers||{})}});if(!r.ok)throw new Error(await r.text());return r.status===204?[]:r.json()};
  const getLocal=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
  const saveLocal=db=>localStorage.setItem(KEY,JSON.stringify(db));
  const sync=async()=>{
    const db=getLocal(); if(!db)return;
    const units=Array.isArray(db.unidades)?db.unidades.filter(u=>u&&u.name):[];
    for(const u of units) await api('units?on_conflict=name',{method:'POST',body:JSON.stringify({name:u.name,city:u.city||'',state:u.state||'',active:u.active!==false})});
    const serverUnits=await api('units?select=id,name,city,state,active&order=id');
    const byName=new Map(serverUnits.map(u=>[u.name,u]));
    const demands=Array.isArray(db.demandas)?db.demandas.filter(d=>d&&d.title):[];
    for(const d of demands){
      const row={title:d.title,description:d.description||'',unit_id:byName.get(d.unit)?.id||null,owner:d.owner||'',priority:d.priority||'Média',status:d.status||'Aberta',due_date:d.due_date||null};
      if(d.db_id) await api('demands?id=eq.'+encodeURIComponent(d.db_id),{method:'PATCH',body:JSON.stringify(row)});
      else {const created=await api('demands',{method:'POST',body:JSON.stringify(row)});if(created[0])d.db_id=created[0].id;}
    }
  };
  const load=async()=>{
    const [units,demands]=await Promise.all([api('units?select=*&order=id'),api('demands?select=*&order=created_at.desc')]);
    const current=getLocal()||{ocorrencias:[],veiculos:[],efetivo:[],crachas:[],treinamentos:[],auditorias:[],usuarios:[]};
    const mapped=demands.map(d=>({id:String(d.id).padStart(3,'0'),db_id:d.id,title:d.title,description:d.description||'',unit:(units.find(u=>u.id===d.unit_id)||{}).name||'—',owner:d.owner||'',priority:d.priority||'Média',status:d.status||'Aberta',due_date:d.due_date||''}));
    saveLocal({...current,unidades:units,demandas:mapped});
    if(typeof window.RUMO_REFRESH==='function')window.RUMO_REFRESH();
  };
  const originalSet=localStorage.setItem.bind(localStorage);
  let syncing=false;
  localStorage.setItem=(k,v)=>{originalSet(k,v);if(k===KEY&&!syncing)sync().catch(e=>console.warn('Supabase sync:',e));};
  window.RUMO_REFRESH=()=>{if(typeof window.__RUMO_RENDER==='function')window.__RUMO_RENDER();else location.reload();};
  (async()=>{try{await sync();await load();}catch(e){console.warn('Supabase indisponível; mantendo dados locais.',e);}})();
})();