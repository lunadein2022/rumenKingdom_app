// Princess OS — Castle Growth System v1
// Supabase 연결 시 `userLevel`과 `castle_rooms` 테이블 값을 주입하세요.

const castleRoomDescriptions = {
  lobby: "Princess OS의 중심 공간입니다. 오늘의 일정, 세린 브리핑, 퀘스트 시작점이 이곳에 모입니다.",
  garden: "데일리 루틴, 회복 퀘스트, 컨디션 관리를 담당하는 공간입니다.",
  library: "메모, AI 검색, 요약, 지식 보관함이 모이는 공간입니다.",
  office: "캘린더, 회의, 업무 퀘스트를 관리하는 생산성 중심 공간입니다.",
  bedroom: "수면, 감정 회고, 야간 루틴을 관리하는 공간입니다.",
  throne: "레벨, 업적, 보상, 궁전 성장 상태를 확인하는 상징적 공간입니다.",
  tower: "고레벨 콘텐츠와 특별 이벤트를 위한 잠긴 공간입니다."
};

document.querySelectorAll(".castle-room").forEach(room => {
  room.addEventListener("click", () => {
    const title = room.dataset.title;
    const key = room.dataset.room;
    const unlock = room.dataset.unlock;
    const locked = room.classList.contains("locked");

    const detail = document.getElementById("castleDetail");
    if (!detail) return;

    detail.innerHTML = `
      <div>
        <h3>${locked ? "🔒" : "✨"} ${title}</h3>
        <p>${castleRoomDescriptions[key] || "아직 설명이 등록되지 않은 방입니다."}</p>
        <p style="margin-top:8px;font-size:12px;">Unlock Level: Lv.${unlock}</p>
      </div>
      <button class="btn ${locked ? "btn-secondary" : "btn-primary"} btn-md">
        ${locked ? "아직 잠김" : "이 방으로 이동"}
      </button>
    `;
  });
});
