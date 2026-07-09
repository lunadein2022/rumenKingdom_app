
document.querySelectorAll('.quest-card').forEach(card=>{
 card.addEventListener('mouseenter',()=>card.style.boxShadow='0 18px 40px rgba(46,79,163,.18)');
 card.addEventListener('mouseleave',()=>card.style.boxShadow='0 12px 30px rgba(16,25,54,.10)');
});
