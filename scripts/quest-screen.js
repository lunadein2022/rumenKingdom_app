
document.querySelectorAll('.quest-filter').forEach(f=>{
 f.onclick=()=>{
  document.querySelectorAll('.quest-filter').forEach(x=>x.classList.remove('active'));
  f.classList.add('active');
 };
});
