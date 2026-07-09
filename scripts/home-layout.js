
document.querySelectorAll('.quick').forEach(el=>{
 el.addEventListener('click',()=>console.log('Navigate:',el.textContent.trim()));
});
