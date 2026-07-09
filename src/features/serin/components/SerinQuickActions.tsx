interface SerinQuickActionsProps {
  onPick: (prompt: string) => void;
}

// 예전에는 눌리는 즉시 실행되는 "Quick Action" 버튼이었지만, 세린의 철학은
// "대화가 먼저, 버튼은 보조"입니다. 그래서 이 문장들은 클릭해도 바로 등록되지
// 않고, 입력창에 채워지기만 합니다 — 공주님이 확인하고 다듬은 뒤 직접 보냅니다.
const exampleSentences = [
  "제안서 초안 작성 퀘스트 만들어줘",
  "내일 오후 3시에 프로젝트 체크인 일정 넣어줘",
  "8월 19일부터 3일간 가족여행 일정 등록해줘",
  "Hydro Hawk 프로젝트에 오늘 회의 내용 업데이트해줘",
  "회의 일정 5시로 옮겨줘",
  "나는 오전에 집중이 잘 되는 편이야, 기억해줘",
  "오늘 일기 써줘",
  "어제 일기 다시 볼래",
  "명함 사진에서 연락처 저장해줘",
  "오늘 브리핑 해줘",
];

export function SerinQuickActions({ onPick }: SerinQuickActionsProps) {
  return (
    <section className="serin-example-panel">
      <h2>이렇게 말해보세요</h2>
      <p className="small-copy">눌러도 바로 등록되지 않아요. 입력창에 채워드리니 확인하고 보내주세요.</p>
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
