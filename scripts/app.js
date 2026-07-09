const statuses=['✨','💬','😴','📨','☕'];let statusIndex=0;
window.toggleNight=function(){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('night'))}
window.cycleStatus=function(){statusIndex=(statusIndex+1)%statuses.length;document.querySelectorAll('[data-serin-status]').forEach(el=>el.textContent=statuses[statusIndex])}
document.addEventListener('click',e=>{const item=e.target.closest('.nav-item');if(!item)return;const shell=item.closest('.screen');if(!shell)return;shell.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));item.classList.add('active');if(item.dataset.title)shell.querySelector('[data-scene-title]').textContent=item.dataset.title;if(item.dataset.text)shell.querySelector('[data-scene-text]').textContent=item.dataset.text})
