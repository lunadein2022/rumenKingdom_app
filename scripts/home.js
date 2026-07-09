
const h=new Date().getHours();
const t=document.getElementById('greeting');
if(t){
 if(h<11)t.textContent='좋은 아침입니다, 공주님.';
 else if(h<17)t.textContent='좋은 오후입니다, 공주님.';
 else if(h<21)t.textContent='좋은 저녁입니다, 공주님.';
 else t.textContent='늦은 밤이네요, 공주님.';
}
