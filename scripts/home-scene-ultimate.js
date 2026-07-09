/* Princess OS — Home Scene Ultimate v1
   Data policy:
   Do not invent permanent user numbers.
   UI receives a single homeState object.
   Until Supabase is connected, fallback values are clearly isolated here.
   Replace loadHomeState() with Supabase query later.
*/

const fallbackHomeState = {
  completedQuests: 12,
  totalQuests: 16,
  todaysQuests: 4,
  todaysMeetings: 2,
  pendingRewards: 3,
  levelRule: 5,
};

function calculateProgress(state) {
  const level = Math.floor(state.completedQuests / state.levelRule) + 1;
  const expInLevel = state.completedQuests % state.levelRule;
  const currentExp = expInLevel * 600;
  const requiredExp = state.levelRule * 600;
  const expRate = Math.round((currentExp / requiredExp) * 100);

  return {
    level,
    currentExp,
    requiredExp,
    expRate,
    completionRate: state.totalQuests ? Math.round((state.completedQuests / state.totalQuests) * 100) : 0,
  };
}

async function loadHomeState() {
  // TODO Supabase:
  // const { data: quests } = await supabase.from('quests').select('*').eq('user_id', user.id)
  // const { data: events } = await supabase.from('events').select('*').eq('user_id', user.id)
  // return normalizeHomeState(quests, events)
  return fallbackHomeState;
}

function setTimeTheme() {
  const scene = document.getElementById("posLiveScene");
  const label = document.getElementById("posTimeLabel");
  const clock = document.getElementById("posClock");
  const greetingText = document.getElementById("posGreetingText");

  const now = new Date();
  const hour = now.getHours();
  const minute = String(now.getMinutes()).padStart(2, "0");
  clock.textContent = `${hour}:${minute}`;

  if (hour < 6) {
    label.textContent = "🌙 Late Night";
    scene.classList.add("is-night");
    greetingText.textContent = "늦은 밤이네요. 오늘의 회고를 정리하고 편안히 쉬는 것을 추천드립니다.";
  } else if (hour < 11) {
    label.textContent = "☀️ Morning";
    scene.classList.remove("is-night");
    greetingText.textContent = "좋은 아침입니다. 오늘의 일정과 퀘스트를 제가 먼저 정리해드릴게요.";
  } else if (hour < 17) {
    label.textContent = "🌤 Day";
    scene.classList.remove("is-night");
    greetingText.textContent = "좋은 오후입니다. 지금은 집무실 퀘스트에 집중하기 좋은 시간입니다.";
  } else if (hour < 21) {
    label.textContent = "🌇 Evening";
    scene.classList.remove("is-night");
    greetingText.textContent = "좋은 저녁입니다. 오늘 완료한 일과 남은 퀘스트를 정리해드릴게요.";
  } else {
    label.textContent = "🌙 Night";
    scene.classList.add("is-night");
    greetingText.textContent = "밤이 깊었습니다. 달빛 발코니에서 하루를 조용히 마무리해볼까요?";
  }
}

function mountHomeState(state) {
  const progress = calculateProgress(state);

  document.getElementById("posQuestCount").textContent = state.todaysQuests;
  document.getElementById("posMeetingCount").textContent = state.todaysMeetings;
  document.getElementById("posLevel").textContent = `Lv.${progress.level}`;
  document.getElementById("posMiniExp").style.width = `${progress.expRate}%`;
}

function observeRooms() {
  const rooms = document.querySelectorAll(".pos-room");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  }, { threshold: 0.18 });

  rooms.forEach(room => io.observe(room));
}

function bindControls() {
  document.getElementById("posThemeToggle")?.addEventListener("click", () => {
    document.getElementById("posLiveScene")?.classList.toggle("is-night");
  });

  const statuses = ["✨ Thinking", "💬 Speaking", "🙂 Idle", "📨 Notification", "😴 Sleeping"];
  let statusIndex = 0;
  setInterval(() => {
    statusIndex = (statusIndex + 1) % statuses.length;
    const status = document.getElementById("posSerinStatus");
    if (status) status.textContent = statuses[statusIndex];
  }, 5200);
}

(async function initHomeScene() {
  setTimeTheme();
  mountHomeState(await loadHomeState());
  observeRooms();
  bindControls();
})();
