// ---------- Screen refs ----------
const authScreen = document.getElementById('authScreen');
const homeScreen = document.getElementById('homeScreen');
const authError = document.getElementById('authError');
const toastMsg = document.getElementById('toastMsg');
const screenEl = document.getElementById('mainScreen');

let currentUser = null;

function showToast(msg) {
  toastMsg.textContent = msg;
  setTimeout(() => { if (toastMsg.textContent === msg) toastMsg.textContent = ''; }, 3000);
}

// ---------- Time / season kicker ----------
function updateKicker() {
  const now = new Date();
  const h = now.getHours();
  const timeLabel = h < 6 ? '🌙 Night' : h < 12 ? '☀️ Morning' : h < 18 ? '🌤 Afternoon' : '🌆 Evening';
  const month = now.getMonth() + 1;
  const season = [3,4,5].includes(month) ? '🌸 Spring' : [6,7,8].includes(month) ? '☀️ Summer' : [9,10,11].includes(month) ? '🍂 Autumn' : '❄️ Winter';
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  document.getElementById('topbarKicker').textContent = `${timeLabel} · ${season} · ${hh}:${mm}`;
  if (h >= 21 || h < 6) screenEl.classList.add('night'); else screenEl.classList.remove('night');
}
updateKicker();
setInterval(updateKicker, 60000);

// ---------- Serin status cycle ----------
const statuses = ['✨','💬','😴','📨','☕'];
let statusIndex = 0;
document.getElementById('serinCoreBtn').addEventListener('click', () => {
  statusIndex = (statusIndex + 1) % statuses.length;
  document.getElementById('serinStatus').textContent = statuses[statusIndex];
});

// ---------- Serin AI 질문 (실제 Claude API 연결, netlify/functions/serin-chat.js) ----------
document.getElementById('serinAskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const askInput = document.getElementById('serinAskInput');
  const replyEl = document.getElementById('serinAskReply');
  const askBtn = document.getElementById('serinAskBtn');
  const q = askInput.value.trim();
  if (!q) return;

  replyEl.textContent = '✨ 세린이 생각 중이에요...';
  askBtn.disabled = true;

  try {
    const res = await fetch('/.netlify/functions/serin-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: q }),
    });
    const data = await res.json();
    replyEl.textContent = res.ok && data.reply ? data.reply : `오류: ${data.error || '알 수 없는 오류'}`;
  } catch (err) {
    replyEl.textContent = '세린과 연결하지 못했어요. Netlify 배포 상태와 API 키 설정을 확인해주세요.';
  } finally {
    askBtn.disabled = false;
    askInput.value = '';
  }
});

// ---------- Bottom nav ----------
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const nav = item.dataset.nav;
    document.getElementById('serinGreetTitle').textContent = item.dataset.title;
    document.getElementById('serinGreetText').textContent = item.dataset.text;
    document.getElementById('questPanel').style.display = nav === 'home' ? '' : 'none';
    document.getElementById('calendarPanel').style.display = nav === 'calendar' ? '' : 'none';
    document.getElementById('questTabPanel').style.display = nav === 'quest' ? '' : 'none';
    if (nav === 'home') {
      refreshGreeting(allQuests);
    } else if (nav === 'calendar') {
      renderWeekCalendar();
    } else if (nav === 'quest') {
      renderQuestStack();
    } else {
      showToast(`${item.querySelector('.nav-label').textContent} 화면은 아직 디자인 준비 중이에요.`);
    }
  });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await sb.auth.signOut();
  location.reload();
});

// ---------- Auth ----------
document.getElementById('loginBtn').addEventListener('click', async () => {
  authError.textContent = '';
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) authError.textContent = '로그인 실패: ' + error.message;
});

document.getElementById('signupBtn').addEventListener('click', async () => {
  authError.textContent = '';
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const { error } = await sb.auth.signUp({ email, password });
  if (error) authError.textContent = '회원가입 실패: ' + error.message;
  else authError.textContent = '가입 확인 이메일을 보냈어요. 확인 후 로그인해주세요.';
});

sb.auth.onAuthStateChange((_event, session) => {
  currentUser = session ? session.user : null;
  if (currentUser) {
    authScreen.style.display = 'none';
    homeScreen.style.display = '';
    loadQuests();
  } else {
    authScreen.style.display = '';
    homeScreen.style.display = 'none';
  }
});

// ---------- Quests (Supabase table: quests) ----------
let allQuests = [];

async function loadQuests() {
  const { data, error } = await sb
    .from('quests')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    document.getElementById('questPreviewList').innerHTML =
      `<article class="topbar-mini-card"><span class="pill">📜 Quest</span><h3 style="margin-top:10px">불러오기 실패</h3><p>${error.message}</p></article>`;
    return;
  }
  allQuests = data || [];
  renderQuestList(allQuests.slice(0, 5));
  refreshGreeting(allQuests);
}

function renderQuestList(list) {
  const listEl = document.getElementById('questPreviewList');
  if (!list || list.length === 0) {
    listEl.innerHTML = `<article class="topbar-mini-card"><span class="pill">📜 Quest</span><h3 style="margin-top:10px">등록된 퀘스트가 없어요</h3><p>아래에서 새 퀘스트를 추가해보세요.</p></article>`;
    return;
  }
  listEl.innerHTML = list.map(q => `
    <article class="topbar-mini-card" style="position:relative;">
      <div data-quest-id="${q.id}" style="cursor:pointer;">
        <span class="pill">${statusLabel(q.status)}</span>
        <h3 style="margin-top:10px;${q.status === 'completed' ? 'text-decoration:line-through;opacity:.6;' : ''}">${escapeHtml(q.title)}</h3>
        <p>눌러서 다음 단계로 (대기→진행중→완료)</p>
      </div>
      <button data-del-quest="${q.id}" data-quest-title="${escapeHtml(q.title)}" style="position:absolute;top:14px;right:14px;border:0;background:transparent;cursor:pointer;font-size:15px;opacity:.6;">🗑</button>
    </article>`).join('');
  listEl.querySelectorAll('[data-quest-id]').forEach(card => {
    card.addEventListener('click', () => cycleQuestStatus(card.dataset.questId));
  });
  listEl.querySelectorAll('[data-del-quest]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteDialog(btn.dataset.delQuest, btn.dataset.questTitle);
    });
  });
}

function statusLabel(status) {
  if (status === 'completed') return '✅ 완료';
  if (status === 'inProgress') return '✨ 진행중';
  return '⏳ 대기';
}

// ---------- Delete confirmation dialog ----------
let pendingDeleteId = null;
const deleteOverlay = document.getElementById('deleteDialogOverlay');

function openDeleteDialog(id, title) {
  pendingDeleteId = id;
  document.getElementById('deleteDialogText').textContent = `"${title}" 퀘스트를 삭제하면 되돌릴 수 없어요.`;
  deleteOverlay.style.display = 'flex';
}
function closeDeleteDialog() {
  deleteOverlay.style.display = 'none';
  pendingDeleteId = null;
}
document.getElementById('deleteDialogClose').addEventListener('click', closeDeleteDialog);
document.getElementById('deleteDialogCancel').addEventListener('click', closeDeleteDialog);
document.getElementById('deleteDialogConfirm').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  await sb.from('quests').delete().eq('id', pendingDeleteId);
  closeDeleteDialog();
  showToast('퀘스트를 삭제했어요.');
  await loadQuests();
  if (document.getElementById('questTabPanel').style.display !== 'none') renderQuestStack();
});

document.getElementById('questSearchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = document.getElementById('questSearchInput').value.trim().toLowerCase();
  if (!q) { renderQuestList(allQuests.slice(0, 5)); return; }
  const filtered = allQuests.filter(item => item.title.toLowerCase().includes(q));
  renderQuestList(filtered);
});

async function cycleQuestStatus(id) {
  const quest = allQuests.find(q => q.id === id);
  if (!quest) return;
  const next = quest.status === 'pending' ? 'inProgress' : quest.status === 'inProgress' ? 'completed' : 'pending';

  const patch = { status: next };
  if (next === 'completed') {
    patch.completed_at = new Date().toISOString();
    patch.reward_claimed = false;
    await bumpDailyCompletion(1);
  } else if (quest.status === 'completed') {
    // undoing a completion
    patch.completed_at = null;
    patch.reward_claimed = false;
    await bumpDailyCompletion(-1);
  }

  await sb.from('quests').update(patch).eq('id', id);
  await loadQuests();
  if (document.getElementById('questTabPanel').style.display !== 'none') renderQuestStack();
}

// Keeps a per-day completion count for streak tracking (daily_completions table)
async function bumpDailyCompletion(delta) {
  const today = todayIso();
  const { data: existing } = await sb
    .from('daily_completions')
    .select('quest_count')
    .eq('user_id', currentUser.id)
    .eq('completion_date', today)
    .maybeSingle();

  const newCount = Math.max(0, (existing ? existing.quest_count : 0) + delta);
  await sb.from('daily_completions').upsert({
    user_id: currentUser.id, completion_date: today, quest_count: newCount
  });
}

function todayIso() { return new Date().toISOString().slice(0,10); }

// ---------- Progress (level/EXP/streak/rewards/daily) ----------
// Level/EXP: currentExp = sum of exp_reward over completed quests (all-time).
// Level requirement grows each level (Lv1->2 needs 100, Lv2->3 needs 200, ...).
// This is a transparent formula computed fresh from real quest data every time -
// no separate mutable "UserProgress" row to drift out of sync.
function computeLevel(totalExp) {
  let level = 1, required = 100, remaining = totalExp;
  while (remaining >= required) {
    remaining -= required;
    level += 1;
    required += 100;
  }
  return { level, currentExpInLevel: remaining, requiredExpForLevel: required };
}

async function computeStreak() {
  const { data } = await sb
    .from('daily_completions')
    .select('completion_date, quest_count')
    .eq('user_id', currentUser.id)
    .gt('quest_count', 0)
    .order('completion_date', { ascending: false })
    .limit(400);

  if (!data || data.length === 0) return 0;
  const dates = new Set(data.map(r => r.completion_date));
  let streak = 0;
  let cursor = new Date();
  // today doesn't have to have a completion yet for the streak to still "count" up to yesterday
  if (!dates.has(isoDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(isoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function renderProgressPanel() {
  const totalExp = allQuests
    .filter(q => q.status === 'completed')
    .reduce((sum, q) => sum + (q.exp_reward || 0), 0);
  const { level, currentExpInLevel, requiredExpForLevel } = computeLevel(totalExp);
  const levelPct = Math.round((currentExpInLevel / requiredExpForLevel) * 100);

  const total = allQuests.length;
  const done = allQuests.filter(q => q.status === 'completed').length;
  const rate = total > 0 ? Math.round((done / total) * 100) : 0;
  const pendingRewards = allQuests.filter(q => q.status === 'completed' && !q.reward_claimed).length;

  document.getElementById('progLevel').textContent = `Lv. ${level}`;
  document.getElementById('progExpBadge').textContent = `${levelPct}%`;
  document.getElementById('progExpFill').style.width = `${levelPct}%`;
  document.getElementById('progExpText').textContent = `${currentExpInLevel} / ${requiredExpForLevel} EXP`;
  document.getElementById('statDone').textContent = done;
  document.getElementById('statRate').textContent = total > 0 ? `${rate}%` : '-';
  document.getElementById('statPendingReward').textContent = pendingRewards;

  const streak = await computeStreak();
  document.getElementById('statStreak').textContent = streak;

  // Today's progress ring: based on quests whose due_date is today
  const today = todayIso();
  const todayQuests = allQuests.filter(q => q.due_date === today);
  const todayDone = todayQuests.filter(q => q.status === 'completed').length;
  const todayPct = todayQuests.length > 0 ? Math.round((todayDone / todayQuests.length) * 100) : 0;
  const ring = document.getElementById('dailyRing');
  ring.style.background = `conic-gradient(#4169E1 ${todayPct}%, #E9EDF8 0)`;
  document.getElementById('dailyRingText').textContent = `${todayPct}%`;
  document.getElementById('dailyRingCaption').textContent = todayQuests.length > 0
    ? `오늘 마감 퀘스트 ${todayQuests.length}개 중 ${todayDone}개 완료`
    : '오늘 마감인 퀘스트가 없어요. 퀘스트 추가할 때 마감일을 오늘로 설정해보세요.';

  renderRewardClaimList();
}

function renderRewardClaimList() {
  const claimable = allQuests.filter(q => q.status === 'completed' && !q.reward_claimed);
  const el = document.getElementById('rewardClaimList');
  if (claimable.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = claimable.map(q => `
    <article class="quest-card">
      <div class="quest-icon">🎁</div>
      <div>
        <h3 class="quest-title">${escapeHtml(q.title)}</h3>
        <p class="quest-desc">완료한 퀘스트예요. 보상을 받아가세요.</p>
      </div>
      <div class="quest-reward">
        <div class="quest-exp">+${q.exp_reward} EXP</div>
        <button class="btn btn-gold btn-md" style="margin-top:8px;" data-claim="${q.id}">🏆 보상 받기</button>
      </div>
    </article>`).join('');
  el.querySelectorAll('[data-claim]').forEach(btn => {
    btn.addEventListener('click', () => claimReward(btn.dataset.claim));
  });
}

async function claimReward(id) {
  await sb.from('quests').update({ reward_claimed: true }).eq('id', id);
  showToast('보상을 받았어요!');
  await loadQuests();
  renderQuestStack();
}

async function renderQuestStack() {
  await renderProgressPanel();
  const stack = document.getElementById('questStack');
  if (!allQuests || allQuests.length === 0) {
    stack.innerHTML = `<article class="quest-card"><div class="quest-icon">📜</div><div><h3 class="quest-title">등록된 퀘스트가 없어요</h3><p class="quest-desc">홈 화면에서 새 퀘스트를 추가해보세요.</p></div></article>`;
    return;
  }
  const stateClass = { pending: '', inProgress: 'state-active', completed: 'state-done' };
  stack.innerHTML = allQuests.map(q => `
    <article class="quest-card" data-quest-id="${q.id}" style="cursor:pointer;">
      <div class="quest-icon">${q.status === 'completed' ? '✅' : q.status === 'inProgress' ? '✨' : '📜'}</div>
      <div>
        <h3 class="quest-title">${escapeHtml(q.title)}</h3>
        <p class="quest-desc">눌러서 다음 단계로 (대기 → 진행중 → 완료)${q.due_date ? ` · 마감 ${q.due_date}` : ''}</p>
        <div class="quest-meta"><span class="quest-tag">왕실 퀘스트</span><span class="quest-tag">+${q.exp_reward} EXP</span></div>
      </div>
      <div class="quest-reward">
        <span class="quest-state ${stateClass[q.status] || ''}" style="${!stateClass[q.status] ? 'background:#F5F5F7;color:#8C92A3;' : ''}">${statusLabel(q.status)}</span><br>
        <button data-del-quest="${q.id}" data-quest-title="${escapeHtml(q.title)}" style="margin-top:8px;border:0;background:transparent;cursor:pointer;font-size:13px;opacity:.6;">🗑 삭제</button>
      </div>
    </article>`).join('');
  stack.querySelectorAll('[data-quest-id]').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-del-quest]')) return;
      cycleQuestStatus(card.dataset.questId);
    });
  });
  stack.querySelectorAll('[data-del-quest]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteDialog(btn.dataset.delQuest, btn.dataset.questTitle);
    });
  });
}

document.getElementById('addQuestBtn').addEventListener('click', async () => {
  const input = document.getElementById('newQuestInput');
  const title = input.value.trim();
  if (!title) return;
  const expReward = Number(document.getElementById('newQuestReward').value) || 10;
  const dueDate = document.getElementById('newQuestDueDate').value || null;
  const { error } = await sb.from('quests').insert({
    title, user_id: currentUser.id, status: 'pending', exp_reward: expReward, due_date: dueDate
  });
  if (error) { showToast('추가 실패: ' + error.message); return; }
  input.value = '';
  document.getElementById('newQuestDueDate').value = '';
  showToast('퀘스트를 추가했어요!');
  loadQuests();
});

function refreshGreeting(quests) {
  const openCount = quests ? quests.filter(q => q.status !== 'completed').length : 0;
  document.getElementById('serinGreetTitle').textContent = '공주님.';
  document.getElementById('serinGreetText').textContent = openCount > 0
    ? `오늘 남은 퀘스트가 ${openCount}개 있어요.`
    : '오늘은 남은 퀘스트가 없어요. 편히 쉬셔도 좋아요.';
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

// ---------- Calendar (Supabase table: events) ----------
const DOW_KR = ['일','월','화','수','목','금','토'];
let calSelectedDate = new Date().toISOString().slice(0,10);

function isoDate(d) { return d.toISOString().slice(0,10); }

function currentWeekDates() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

async function renderWeekCalendar() {
  const days = currentWeekDates();
  const todayIso = isoDate(new Date());

  document.getElementById('calWeekLabels').innerHTML =
    ['MON','TUE','WED','THU','FRI','SAT','SUN'].map(d => `<div>${d}</div>`).join('');

  const { data: weekEvents } = await sb
    .from('events')
    .select('*')
    .eq('user_id', currentUser.id)
    .gte('event_date', isoDate(days[0]))
    .lte('event_date', isoDate(days[6]));

  const grid = document.getElementById('calGrid');
  grid.innerHTML = days.map(d => {
    const iso = isoDate(d);
    const hasEvent = (weekEvents || []).some(e => e.event_date === iso);
    let cls = 'calendar-cell';
    if (iso === todayIso) cls += ' today';
    if (iso === calSelectedDate) cls += ' selected';
    return `<div class="${cls}" data-date="${iso}"><span class="calendar-date">${d.getDate()}</span>${hasEvent ? '<span class="calendar-dot"></span>' : ''}</div>`;
  }).join('');

  grid.querySelectorAll('[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      calSelectedDate = cell.dataset.date;
      renderWeekCalendar();
    });
  });

  document.getElementById('calSelectedLabel').textContent = `${calSelectedDate} 일정 추가`;
  renderEventList(calSelectedDate);
}

async function renderEventList(dateIso) {
  const { data, error } = await sb
    .from('events')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('event_date', dateIso)
    .order('created_at', { ascending: true });

  const listEl = document.getElementById('calEventList');
  if (error) {
    listEl.innerHTML = `<article class="calendar-event"><h4>불러오기 실패</h4><p>${error.message}</p></article>`;
    return;
  }
  if (!data || data.length === 0) {
    listEl.innerHTML = `<article class="calendar-event"><h4>일정이 없어요</h4><p>이 날짜에 등록된 일정이 없어요.</p></article>`;
    return;
  }
  listEl.innerHTML = data.map(e => `
    <article class="calendar-event" data-event-id="${e.id}" style="cursor:pointer;">
      <h4>📅 ${escapeHtml(e.title)}</h4>
      <p>눌러서 삭제</p>
    </article>`).join('');
  listEl.querySelectorAll('[data-event-id]').forEach(el => {
    el.addEventListener('click', async () => {
      await sb.from('events').delete().eq('id', el.dataset.eventId);
      renderWeekCalendar();
    });
  });
}

document.getElementById('addEventBtn').addEventListener('click', async () => {
  const input = document.getElementById('newEventInput');
  const title = input.value.trim();
  if (!title) return;
  const { error } = await sb.from('events').insert({
    title, user_id: currentUser.id, event_date: calSelectedDate
  });
  if (error) { showToast('일정 추가 실패: ' + error.message); return; }
  input.value = '';
  showToast('일정을 추가했어요!');
  renderWeekCalendar();
});
