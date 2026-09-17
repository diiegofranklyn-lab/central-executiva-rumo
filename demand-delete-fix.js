(()=>{
const KEY='rumo_app_v4',OLD='rumo_deleted_demands';
try{localStorage.removeItem(OLD)}catch{}
const getDb=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
const saveDb=db=>localStorage.setItem(KEY,JSON.stringify(db));
const sbDelete=async id=>{const C=window.RUMO_SUPABASE_CONFIG;if(!C||!id)throw new Error('Supabase indisponível');const r=await fetch(C.url+'/rest/v1/demands?id=eq.'+encodeURIComponent(id),{method:'DELETE',cache:'no-store',headers:{apikey:C.key,Authorization:'Bearer '+C.key,Prefer:'return=minimal'}});if(!r.ok)throw new Error(await r.text())};
const refresh=()=>{window.dispatchEvent(new Event('hashchange'))};
let busy=false;
const deleteOne=async id=>{const db=getDb()||{},items=Array.isArray(db.demandas)?db.demandas:[],i=items.findIndex(x=>String(x.id)===String(id));if(i<0)return;const d=items[i];if(!confirm(`Excluir a demanda “${d.title||id}”?\n\nEssa ação não poderá ser desfeita.`))return;busy=true;try{if(d.db_id)await sbDelete(d.db_id);items.splice(i,1);saveDb(db);refresh()}catch(e){console.error(e);alert('Não foi possível excluir a demanda. A exclusão não foi aplicada.')}finally{busy=false}};
const deleteAll=async()=>{const db=getDb()||{},items=Array.isArray(db.demandas)?db.demandas:[];if(!items.length){alert('Não há demandas cadastradas para excluir.');return}if(!confirm(`Excluir TODAS as ${items.length} demandas cadastradas?\n\nEssa ação não poderá ser desfeita.`))return;busy=true;try{for(const d of items)if(d.db_id)await sbDelete(d.db_id);db.demandas=[];saveDb(db);refresh()}catch(e){console.error(e);alert('Não foi possível excluir todas as demandas.')}finally{busy=false}};
document.addEventListener('click',e=>{const one=e.target.closest('[data-demand-delete]'),all=e.target.closest('#deleteAllDemandas');if(!one&&!all)return;e.preventDefault();e.stopImmediatePropagation();if(busy)return;if(one)deleteOne(one.dataset.demandDelete);else deleteAll()},true);
})();