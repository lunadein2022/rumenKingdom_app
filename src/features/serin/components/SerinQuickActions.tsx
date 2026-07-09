interface SerinQuickActionsProps {
  onAction: (prompt: string) => void;
}

const quickActions = [
  { label: "Quest 생성", prompt: "제안서 초안 작성 퀘스트 만들어줘" },
  { label: "일정 추가", prompt: "내일 오후 3시에 프로젝트 체크인 일정 넣어줘" },
  { label: "메모 요약", prompt: "오늘 대화 메모 요약해줘" },
  { label: "오늘 일기", prompt: "오늘 일기 써줘" },
  { label: "연락처 저장", prompt: "명함 사진에서 연락처 저장해줘" },
  { label: "오늘 브리핑", prompt: "오늘 브리핑 해줘" },
  { label: "보상 확인", prompt: "받을 수 있는 보상 확인해줘" },
];

export function SerinQuickActions({ onAction }: SerinQuickActionsProps) {
  return (
    <div className="quick-actions serin-quick-actions">
      {quickActions.map((action) => (
        <button key={action.label} type="button" onClick={() => onAction(action.prompt)}>
          {action.label}
        </button>
      ))}
    </div>
  );
}
