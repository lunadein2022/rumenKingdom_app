import type { SerinMessage, SerinProfile } from "../app/types";

// 세린 프로필은 캐릭터 설정(데이터가 아니라 페르소나)이므로 유지합니다.
export const mockSerin: SerinProfile = {
  name: "세린",
  role: "ai_maid",
  greetingTitle: "공주님, 어서오세요.",
  greetingText: "필요한 것이 있으면 언제든 말씀해주세요. 세린이 곁에서 챙기겠습니다.",
  relationshipLabel: "신뢰",
  affinity: 0,
};

// 대화 기록은 사용자가 실제로 나눈 것만 존재합니다. 초기값은 비어 있습니다.
export const mockSerinMessages: SerinMessage[] = [];
