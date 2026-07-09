import type { SerinAction, SerinAttachmentType } from "../types/serin.types";

// 첨부파일 처리 파이프라인 (Mock/TODO 스캐폴딩)
// ---------------------------------------------------------------------
// 지금은 실제 이미지/문서/음성 파일 내용을 서버로 보내 분석하지 않습니다.
// 파일명(과 최소한의 휴리스틱)만으로 그럴듯한 결과를 mock으로 만들어 보여주고,
// 실제 연동 시 교체해야 할 지점을 TODO로 명시해둡니다.
//
// 실제 구현 시 예상 흐름:
//   image    -> Vision/OCR API로 텍스트 추출 -> 명함이면 contact.extract 액션 제안
//   document -> 문서 파서(PDF/DOCX 등) + LLM 요약 -> 왕국도서관에 저장
//   audio    -> STT API로 텍스트 변환 -> 일반 대화 인텐트 분류로 이어서 처리

export interface AttachmentPipelineResult {
  // 처리 완료 후 세린이 보낼 메시지 본문입니다.
  resultMessage: string;
  // 이미지가 명함처럼 보이는 경우처럼, 후속 확인이 필요한 제안 액션입니다.
  // 있으면 기존 pendingSerinAction 확인/취소 UI를 그대로 재사용합니다.
  suggestedAction?: SerinAction;
}

// 파일명에 "명함", "card", "biz" 같은 힌트가 있으면 명함으로 간주합니다.
// TODO: 실제로는 Vision API의 문서 유형 분류 결과를 사용해야 합니다.
const BUSINESS_CARD_HINT = /(명함|card|biz)/i;

export function buildProcessingNotice(type: SerinAttachmentType, fileName?: string): string {
  const label = fileName ? `'${fileName}'` : type === "image" ? "사진" : type === "document" ? "파일" : "음성";
  if (type === "audio") return `공주님, ${label}을 듣고 있어요. 잠시만 기다려주세요...`;
  return `공주님, ${label}을 확인하고 있어요. 잠시만 기다려주세요...`;
}

export function runAttachmentPipeline(type: SerinAttachmentType, fileName?: string): AttachmentPipelineResult {
  const label = fileName ?? (type === "image" ? "사진" : type === "document" ? "파일" : "음성 메모");

  if (type === "image") {
    // TODO: 실제 연동 시 여기서 Vision/OCR API 결과(mockExtract)를 받아
    // 이름/회사/연락처를 파싱해 payload.contact에 채워야 합니다.
    if (BUSINESS_CARD_HINT.test(label)) {
      const suggestedAction: SerinAction = {
        id: `attach-contact-${Date.now()}`,
        intent: "contact.extract",
        title: "새 인연",
        summary: `'${label}'에서 명함 정보를 추출했어요. 인연록에 등록할까요?`,
        confirmLabel: "인연록에 등록",
        secondaryLabel: "그냥 넘어가기",
        payload: {
          contact: {
            name: "새 연락처",
            memo: `'${label}' 사진에서 추출 (mock — 실제 연동 전까지는 OCR 결과가 아닌 자리표시자입니다)`,
          },
        },
        logEntries: [
          {
            domain: "relationship",
            label: "명함 이미지에서 인연 추출",
            detail: `'${label}'을 분석해 인연록 초안을 만들었습니다.`,
          },
        ],
      };
      return {
        resultMessage: `공주님, '${label}'은 명함처럼 보여요. 인연록에 등록해드릴까요?`,
        suggestedAction,
      };
    }
    return {
      resultMessage: `공주님, '${label}' 확인했습니다. 명함이면 "명함이야"라고 말씀해주시면 인연록으로 정리해드릴게요.`,
    };
  }

  if (type === "document") {
    // TODO: 실제 연동 시 문서 파서 + LLM 요약 결과를 왕국도서관 항목으로 저장해야 합니다.
    // 지금은 도서관 데이터가 각 도메인(다이어리/일정/프로젝트 등)에서만 파생되므로,
    // 첨부파일 전용 보관함이 생기기 전까지는 저장 없이 안내만 드립니다.
    return {
      resultMessage: `공주님, '${label}' 파일을 확인했습니다. 아직은 자동 요약·저장 기능이 준비 중이라, 필요한 내용을 말씀해주시면 제가 직접 정리해드릴게요.`,
    };
  }

  // audio
  // TODO: 실제 연동 시 STT API로 텍스트 변환 후, 그 텍스트를 다시 일반 대화
  // 인텐트 분류(sendSerinMessage)로 넘겨 이어서 처리해야 합니다.
  return {
    resultMessage: "공주님, 음성 입력은 곧 지원해드릴 수 있도록 준비하고 있어요. 지금은 글로 말씀해주시면 바로 도와드릴게요.",
  };
}
