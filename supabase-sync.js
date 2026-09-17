(()=>{
  const C=window.RUMO_SUPABASE_CONFIG;
  if(!C)return;
  const KEY='rumo_app_v4',base=C.url+'/rest/v1/';
  const headers=(method)=>({'apikey':C.key,'Authorization':'Bearer '+C.key,'Content-Type':'application/json','Prefer':method==='POST'?'resolution=merge-duplicates,return=representation':'return=representation'});
  const api=async(path,opts={})=>{const r=await fetch(base+path,{...opts,headers:{...headers(opts.method),...(opts.headers||{})}});if(!r.ok)throw new Error(await r.text());return r.status===204?[]:r.json()};
  const getLocal=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
  const rawSet=Storage.prototype.setItem;
  const saveLocal=db=>rawSet.call(localStorage,KEY,JSON.stringify(db));
  let syncing=false;
  const sync=async()=>{
    if(syncing)return;
    const db=getLocal();if(!db)return;
    syncing=true;
    try{
      const units=Array.isArray(db.unidades)?db.unidades.filter(u=>u&&u.name):[];
      for(const u of units){
        await api('units?on_conflict=name',{method:'POST',body:JSON.stringify({name:String(u.name).trim(),city:String(u.city||'').trim(),state:String(u.state||'').trim().toUpperCase(),active:u.active!==false})});
      }
      const serverUnits=await api('units?select=id,name,city,state,active&order=id');
      const byName=new Map(serverUnits.map(u=>[String(u.name).trim().toLowerCase(),u]));
      const demands=Array.isArray(db.demandas)?db.demandas.filter(d=>d&&d.title):[];
      for(const d of demands){
        const unit=byName.get(String(d.unit||'').trim().toLowerCase());
        const row={title:d.title,description:d.description||'',unit_id:unit?.id||null,owner:d.owner||'',priority:d.priority||'Média',status:d.status||'Aberta',due_date:d.due_date||null};
        if(d.db_id)await api('demands?id=eq.'+encodeURIComponent(d.db_id),{method:'PATCH',body:JSON.stringify(row)});
        else{const created=await api('demands',{method:'POST',body:JSON.stringify(row)});if(created[0])d.db_id=created[0].id;}
      }
      rawSet.call(localStorage,KEY,JSON.stringify(db));
    }finally{syncing=false}
  };
  const load=async()=>{
    syncing=true;
    try{
      const [units,demands]=await Promise.all([api('units?select=*&order=id'),api('demands?select=*&order=created_at.desc')]);
      const current=getLocal()||{ocorrencias:[],veiculos:[],efetivo:[],crachas:[],treinamentos:[],auditorias:[],usuarios:[]};
      const mapped=demands.map(d=>({id:String(d.id).padStart(3,'0'),db_id:d.id,title:d.title,description:d.description||'',unit:(units.find(u=>u.id===d.unit_id)||{}).name||'—',owner:d.owner||'',priority:d.priority||'Média',status:d.status||'Aberta',due_date:d.due_date||''}));
      rawSet.call(localStorage,KEY,JSON.stringify({...current,unidades:units,demandas:mapped}));
    }finally{syncing=false}
    if(typeof window.__RUMO_RENDER==='function')window.__RUMO_RENDER();
  };
  const originalSet=localStorage.setItem.bind(localStorage);
  localStorage.setItem=(k,v)=>{originalSet(k,v);if(k===KEY&&!syncing)sync().catch(e=>console.warn('Supabase sync:',e));};
  window.RUMO_REFRESH=()=>{if(typeof window.__RUMO_RENDER==='function')window.__RUMO_RENDER();};
  (async()=>{try{await sync();await load();}catch(e){console.warn('Supabase indisponível; mantendo dados locais.',e);}})();
})();