
const form = document.getElementById('serinForm');
const input = document.getElementById('serinInput');
const thread = document.getElementById('chatThread');

// 화면에 미리 보이는 목업 대화를 그대로 히스토리로 사용해서,
// 첫 실제 질문부터 문맥이 이어지도록 함.
const history = [
  { role: 'assistant', content: '공주님, 오늘 회의가 2건 있습니다. 먼저 회의 자료를 정리해드릴까요?' },
  { role: 'user', content: '첫 번째 회의 자료 정리해줘.' },
  { role: 'assistant', content: '좋습니다. 관련 메모와 일정, 이전 대화 기록을 묶어 브리핑 카드로 정리하겠습니다.' },
];

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

function appendMessage(role, text) {
  const html = role === 'user'
    ? `<article class="message user">
        <div class="message-bubble">${escapeHtml(text)}</div>
        <div class="message-avatar"><img src="../assets/princess-bust.png" alt="공주"></div>
      </article>`
    : `<article class="message">
        <div class="message-avatar"><img src="../assets/serin-bust.png" alt="세린"></div>
        <div class="message-bubble">${escapeHtml(text)}</div>
      </article>`;
  thread.insertAdjacentHTML('beforeend', html);
  thread.scrollTop = thread.scrollHeight;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  appendMessage('user', text);
  input.value = '';

  const thinkingId = 'thinking-' + Date.now();
  thread.insertAdjacentHTML('beforeend', `
    <article class="message" id="${thinkingId}">
      <div class="message-avatar"><img src="../assets/serin-bust.png" alt="세린"></div>
      <div class="message-bubble">✨ 생각 중이에요...</div>
    </article>
  `);
  thread.scrollTop = thread.scrollHeight;

  try {
    const res = await fetch('/.netlify/functions/serin-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history }),
    });
    const data = await res.json();
    document.getElementById(thinkingId)?.remove();

    if (res.ok && data.reply) {
      appendMessage('assistant', data.reply);
      history.push({ role: 'user', content: text });
      history.push({ role: 'assistant', content: data.reply });
    } else {
      appendMessage('assistant', `죄송해요 공주님, 지금은 응답할 수 없어요. (${data.error || '알 수 없는 오류'})`);
    }
  } catch (err) {
    document.getElementById(thinkingId)?.remove();
    appendMessage('assistant', '세린과 연결하지 못했어요. Netlify 배포 상태와 API 키 설정을 확인해주세요.');
  }
});
