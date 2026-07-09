// 공통 하단 네비게이션 스크립트

window.posShowToast = function (message) {
  const el = document.createElement('div');
  el.textContent = message;
  el.style.cssText = 'position:fixed;left:50%;bottom:150px;transform:translateX(-50%);background:rgba(16,25,54,.88);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:700;z-index:999;box-shadow:0 12px 30px rgba(16,25,54,.35);opacity:0;transition:opacity .25s ease;pointer-events:none;white-space:nowrap;';
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 1800);
};

document.addEventListener('DOMContentLoaded', () => {
  // 설정 화면은 아직 만들어지지 않아서, 누르면 "준비 중" 토스트만 보여줌.
  const settingsBtn = document.getElementById('navSettingsBtn');
  settingsBtn?.addEventListener('click', () => {
    window.posShowToast('⚙️ 설정 화면은 아직 준비 중이에요.');
  });

  // 아직 화면이 없는 목적지(예: 궁전 Room 이동 버튼)에 공통으로 붙이는 속성.
  // 사용법: <button data-coming-soon="🌸 정원">정원으로 이동</button>
  document.querySelectorAll('[data-coming-soon]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.posShowToast(`${btn.dataset.comingSoon} 화면은 아직 준비 중이에요.`);
    });
  });
});
