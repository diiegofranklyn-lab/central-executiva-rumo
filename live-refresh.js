(()=>{
const KEY='rumo_app_v4';
let last='';
try{last=localStorage.getItem(KEY)||''}catch{}
const current=localStorage.setItem.bind(localStorage);
let timer=0;
const reloadPreserveView=()=>{
  const active=document.querySelector('#mainNav a.active[data-view],.shortcuts a.active[data-view]');
  const hash=active?.dataset?.view||location.hash.replace('#','')||'dashboard';
  const u=new URL(location.href);u.hash=hash;u.searchParams.set('live',Date.now().toString());
  location.replace(u.href);
};
localStorage.setItem=function(k,v){
  current(k,v);
  if(k!==KEY)return;
  let now='';try{now=localStorage.getItem(KEY)||''}catch{return}
  if(now===last)return;
  last=now;
  clearTimeout(timer);
  timer=setTimeout(reloadPreserveView,180);
};
})();