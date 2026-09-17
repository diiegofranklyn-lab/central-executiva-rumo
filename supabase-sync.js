(()=>{
  const C=window.RUMO_SUPABASE_CONFIG;
  if(!C)return;
  const KEY='rumo_app_v4',base=C.url+'/rest/v1/';
  const headers=()=>({'apikey':C.key,'Authorization':'Bearer '+C.key,'Content-Type':'application/json','Prefer':'return=representation'});
  const api=async(path,opts={})=>{const r=await fetch(base+path,{...opts,headers:{...headers(),...(opts.headers||{})}});if(!r.ok)throw new Error(await r.text());return r.status===204?[]:r.json()};
  const local=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
  const writeLocal=db=>{localStorage.setItem(KEY,JSON.stringify(db));window.dispatchEvent(new Event('rumo:supabase-sync'))};
  const load=async()=>{
    const [units,demands]=await Promise.all([api('units?select=*%26order=id'),api('demands?select=*&order=created_at.desc')]);
    const current=local()||{demandas:[],unidades:[],ocorrencias:[],veiculos:[],efetivo:[],crachas:[],treinamentos:[],auditorias:[],usuarios:[]};
    const mappedDemands=demands.map(d=>({id:String(d.id).padStart(3,'0'),db_id:d.id,title:d.title,description:d.description||'',unit:(units.find(u=>u.id===d.unit_id)||{}).name||'—',owner:d.owner||'',priority:d.priority||'Média',status:d.status||'Aberta',due_date:d.due_date||''}));
    writeLocal({...current,unidades:units,demandas:mappedDemands});
    if(typeof window.RUMO_REFRESH==='function')window.RUMO_REFRESH();
  };
  const seedIfEmpty=async()=>{
    const current=local();if(!current)return;
    const [units,demands]=await Promise.all([api('units?select=id&limit=1'),api('demands?select=id&limit=1')]);
    if(!units.length && Array.isArray(current.unidades)&&current.unidades.length){
      const rows=current.unidades.filter(u=>u.name).map(u=>({name:u.name,city:u.city||'',state:u.state||'',active:u.active!==false}));
      await api('units?on_conflict=name',{method:'POST',body:JSON.stringify(rows)});
    }
    if(!demands.length && Array.isArray(current.demandas)&&current.demandas.length){
      const us=await api('units?select=id,name');
      const rows=current.demandas.filter(d=>d.title).map(d=>({title:d.title,description:d.description||'',unit_id:(us.find(u=>u.name===d.unit)||{}).id||null,owner:d.owner||'',priority:d.priority||'Média',status:d.status||'Aberta',due_date:d.due_date||null}));
      if(rows.length)await api('demands',{method:'POST',body:JSON.stringify(rows)});
    }
  };
  const originalSet=localStorage.setItem.bind(localStorage);
  let syncing=false;
  localStorage.setItem=(k,v)=>{originalSet(k,v);if(k===KEY&&!syncing)syncToServer(v).catch(e=>console.warn('Supabase sync:',e))};
  const syncToServer=async raw=>{
    if(syncing)return;let d;try{d=JSON.parse(raw)}catch{return}syncing=true;
    try{
      if(Array.isArray(d.unidades)){for(const u of d.unidades.filter(x=>x.name)){await api('units?on_conflict=name',{method:'POST',body:JSON.stringify({name:u.name,city:u.city||'',state:u.state||'',active:u.active!==false})})}}
      const us=await api('units?select=id,name');
      if(Array.isArray(d.demandas)){for(const x of d.demandas.filter(x=>x.title)){const row={title:x.title,description:x.description||'',unit_id:(us.find(u=>u.name===x.unit)||{}).id||null,owner:x.owner||'',priority:x.priority||'Média',status:x.status||'Aberta',due_date:x.due_date||null};if(x.db_id)await api('demands?id=eq.'+encodeURIComponent(x.db_id),{method:'PATCH',body:JSON.stringify(row)});else{const created=await api('demands',{method:'POST',body:JSON.stringify(row)});if(created[0])x.db_id=created[0].id}}
        originalSet(KEY,JSON.stringify(d));
      }
    }finally{syncing=false}
  };
  window.RUMO_REFRESH=()=>{const hash=location.hash.replace('#','');if(typeof window.__RUMO_SHOW_VIEW==='function')window.__RUMO_SHOW_VIEW(hash||'dashboard');else location.reload()};
  (async()=>{try{await seedIfEmpty();await load();}catch(e){console.warn('Supabase indisponível; usando dados locais.',e)}})();
})();