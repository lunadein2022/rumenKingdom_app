
document.querySelectorAll('.calendar-cell').forEach(c=>{
 c.addEventListener('click',()=>{
   document.querySelectorAll('.calendar-cell.selected').forEach(x=>x.classList.remove('selected'));
   c.classList.add('selected');
 });
});
