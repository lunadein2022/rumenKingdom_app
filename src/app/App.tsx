import { useMemo, useState } from "react";
import type { CalendarEvent, Quest, QuestCompletionEvent, QuestHistoryEntry, SerinMessage, UserProgress, ViewKey } from "./types";
import { getPrincessOsSnapshot } from "../data/mockRepository";
import { buildMockProgress } from "../data/mockProgress";
import { completeQuestDomain } from "../domain/questDomain";
import { BottomNav } from "../components/design-system/BottomNav";
import { CalendarScreen } from "../components/modules/CalendarScreen";
import { HomeScene } from "../components/home/HomeScene";
import { PrincessCharacter } from "../components/modules/PrincessCharacter";
import { ProgressScreen } from "../components/modules/ProgressScreen";
import { QuestScreen } from "../components/modules/QuestScreen";
import { SerinScreen } from "../components/modules/SerinScreen";

function buildProgress(quests: Quest[], base: UserProgress): UserProgress {
  return {
    ...buildMockProgress(quests, base.currentExp, base.requiredExp),
    level: base.level,
    streakDays: base.streakDays,
  };
}

export function App() {
  const snapshot = useMemo(() => getPrincessOsSnapshot(), []);
  const [activeView, setActiveView] = useState<ViewKey>("home");
  const [quests, setQuests] = useState<Quest[]>(snapshot.quests);
  const [questHistory, setQuestHistory] = useState<QuestHistoryEntry[]>(snapshot.questHistory);
  const [completionEvents, setCompletionEvents] = useState<QuestCompletionEvent[]>([]);
  const [progressBase, setProgressBase] = useState<UserProgress>(snapshot.progress);
  const [events] = useState<CalendarEvent[]>(snapshot.events);
  const [messages, setMessages] = useState<SerinMessage[]>(snapshot.serinMessages);
  const [selectedDate, setSelectedDate] = useState("2026-07-09");
  const progress = useMemo(() => buildProgress(quests, progressBase), [quests, progressBase]);
  const appData = { ...snapshot, quests, questHistory, events, serinMessages: messages, progress };

  function completeQuest(id: string) {
    const result = completeQuestDomain(quests, questHistory, id, progress);
    setQuests(result.quests);
    setQuestHistory(result.history);
    setCompletionEvents(result.events);
    setProgressBase(result.progress);
  }

  function cycleQuest(id: string) {
    setQuests((current) =>
      current.map((quest) => {
        if (quest.id !== id) return quest;
        const next = quest.status === "pending" ? "inProgress" : quest.status === "inProgress" ? "completed" : "pending";
        return {
          ...quest,
          status: next,
          completedAt: next === "completed" ? new Date().toISOString() : undefined,
          rewardClaimed: next === "completed" ? false : quest.rewardClaimed,
        };
      }),
    );
  }

  function sendSerinMessage(content: string) {
    const now = new Date().toISOString();
    const princessMessage: SerinMessage = {
      id: `m-${now}-p`,
      sender: "princess",
      content,
      createdAt: now,
    };
    const serinMessage: SerinMessage = {
      id: `m-${now}-s`,
      sender: "serin",
      content: `공주님, "${content}" 기준으로 오늘의 퀘스트와 일정을 다시 정리해두겠습니다.`,
      createdAt: now,
    };

    setMessages((current) => [...current, princessMessage, serinMessage]);
    // TODO: replace mock response with Anthropic API via server function and persist to Supabase serin_conversations.
  }

  return (
    <div className="mobile-app-shell">
      <main className="mobile-app-main">
        {activeView === "home" && (
          <HomeScene data={appData} activeView={activeView} onNavigate={setActiveView} />
        )}
        {activeView === "quests" && (
          <QuestScreen
            quests={quests}
            history={questHistory}
            progress={progress}
            completionEvents={completionEvents}
            onCompleteQuest={completeQuest}
            onCycleQuest={cycleQuest}
          />
        )}
        {activeView === "calendar" && (
          <CalendarScreen
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        )}
        {activeView === "serin" && (
          <SerinScreen
            princess={snapshot.princess}
            serin={snapshot.serin}
            messages={messages}
            onSendMessage={sendSerinMessage}
          />
        )}
        {activeView === "progress" && (
          <ProgressScreen
            data={appData}
            onOpenProfile={() => setActiveView("profile")}
          />
        )}
        {activeView === "profile" && <PrincessCharacter data={appData} />}
      </main>

      <BottomNav activeView={activeView} onChange={setActiveView} />
    </div>
  );
}
