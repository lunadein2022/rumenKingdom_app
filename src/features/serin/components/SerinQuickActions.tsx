interface SerinQuickActionsProps {
  onPick: (prompt: string) => void;
}

// 추천 대화는 버튼형 Quick Action이 아니라 "이런 식으로 말할 수 있어요"라는
// 예시 문장입니다. 클릭해도 바로 실행되지 않고 입력창에 채워지기만 합니다 —
// 공주님이 확인하고 다듬은 뒤 직접 보냅니다.
const exampleSentences = [
  "내일 오후 3시에 회의 일정 넣어줘",
  "제안서 초안 작성해야 돼, 퀘스트로 만들어줘",
  "매주 월요일 오전 9시에 주간회의 루틴으로 기억해줘",
  "오늘 일기 초안 써줘",
  "이 명함 사진 인연록에 저장해줘",
];

export function SerinQuickActions({ onPick }: SerinQuickActionsProps) {
  return (
    <section className="serin-example-panel">
      <h2>이렇게 말해보세요</h2>
      <p className="small-copy">누르면 입력창에 채워드려요. 확인하고 보내주세요.</p>
      <div className="quick-actions serin-quick-actions">
        {exampleSentences.map((sentence) => (
          <button key={sentence} type="button" onClick={() => onPick(sentence)}>
            {sentence}
          </button>
        ))}
      </div>
    </section>
  );
}
