import { BackButton } from '../../components/BackButton'

type LegalKind = 'privacy' | 'terms' | 'ai-data'

const content: Record<LegalKind, { title: string; updated: string; sections: Array<[string, string]> }> = {
  privacy: {
    title: '개인정보 처리방침', updated: '2026-07-22',
    sections: [
      ['수집하는 정보', '계정 식별자, 프로필, 일정·퀘스트·일기·메모·인연록, 서비스 이용기록을 서비스 제공에 필요한 범위에서 처리합니다.'],
      ['이용 목적', '기기 간 동기화, 알림, 데이터 복구, 리타 AI 응답, 보안·오류 대응에 이용합니다.'],
      ['보관과 삭제', '계정 탈퇴 시 관계 법령에서 보관을 요구하는 정보를 제외하고 계정 데이터와 첨부파일 삭제를 요청합니다. AI 분석 임시 파일은 처리 후 즉시 삭제합니다.'],
      ['이용자의 권리', '왕좌의 방에서 데이터를 내보내거나 계정과 모든 데이터 삭제를 요청할 수 있습니다.'],
    ],
  },
  terms: {
    title: '서비스 이용약관', updated: '2026-07-22',
    sections: [
      ['서비스', '루멘왕국은 일정·퀘스트·기록 관리와 AI 정리 도구를 제공합니다. 중요한 일정은 원본 자료와 함께 확인해 주세요.'],
      ['계정 책임', '이용자는 본인 계정의 접속 정보를 안전하게 관리하고 법령과 타인의 권리를 침해하는 자료를 입력하지 않아야 합니다.'],
      ['서비스 변경', '안전·점검·법적 요구에 따라 기능이 일시 제한될 수 있으며, 중요한 변경은 공지와 패치노트로 안내합니다.'],
    ],
  },
  'ai-data': {
    title: 'AI 데이터 처리 안내', updated: '2026-07-22',
    sections: [
      ['처리 범위', '리타에게 전송한 대화와 선택한 파일만 AI 응답 생성을 위해 처리됩니다. 왕국의 다른 기록을 임의로 전송하지 않습니다.'],
      ['파일 보관', '명함·문서·음성 원본은 비공개 임시 경로를 통해 분석하고 처리 후 삭제합니다. 요약 결과는 저장 전 사용자가 확인합니다.'],
      ['제한', '사실을 추측하지 않도록 요청하지만 AI 결과에는 오류가 있을 수 있습니다. 중요한 결정 전에 반드시 원본을 확인해 주세요.'],
      ['이용기록', '품질·비용·오류 관리에는 요청 유형, 모델, 토큰, 포인트, 상태만 기록하며 대화 본문은 분석 통계에 넣지 않습니다.'],
    ],
  },
}

export function LegalPage({ kind }: { kind: LegalKind }) {
  const document = content[kind]
  return <article className="legal-page panel glass-panel"><BackButton fallback="/"/><header><span className="eyebrow">RUMEN KINGDOM POLICY</span><h1>{document.title}</h1><p>시행·최종 수정: {document.updated}</p></header>{document.sections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}<aside>운영자 상호·연락처·소재지는 정식 사업자 정보 확정 후 최종 고지합니다.</aside></article>
}
