
document.querySelectorAll('.exp-card').forEach(c=>{
 c.addEventListener('mouseenter',()=>c.style.transform='translateY(-3px)');
 c.addEventListener('mouseleave',()=>c.style.transform='translateY(0)');
});
