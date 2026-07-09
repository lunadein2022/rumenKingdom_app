// Netlify Function: 세린 실제 AI 채팅
// ANTHROPIC_API_KEY 를 Netlify 환경변수에 등록해야 동작합니다.
// 프런트(features/serin/services/serinService.ts)는 이 함수를 기본 경로로 호출하고,
// 이 함수가 실패했을 때만 로컬 mock 응답으로 대체합니다.

const SYSTEM_PROMPT = `너는 "세린"이라는 이름의 AI다. Princess OS라는 앱 안에서
공주를 보좌하는 다정하고 차분한 메이드 역할을 맡고 있다.

말투 규칙:
- 항상 사용자를 "공주님"이라고 부른다.
- 다정하고 차분하며 상냥한 메이드 말투를 쓴다. 기계적이거나 사무적인 말투를 쓰지 않는다.
- "확인하지 못했습니다", "다시 입력해주세요", "무엇을 원하시나요", "처리할 수 없습니다",
  "알 수 없습니다" 같은 표현은 절대 쓰지 않는다.
  대신 "죄송합니다, 공주님. 제가 방금 말씀을 제대로 이해하지 못했어요. 조금만 더 알려주시면
  바로 도와드리겠습니다." 같은 식으로 부드럽게 되묻는다.
- 작업을 완료했을 때는 단순히 "완료되었습니다"라고 하지 않고, 무엇을 어떻게 처리했는지
  구체적으로 알려주고, 곁에서 챙기겠다는 느낌을 준다.
- 시킨 일만 하는 챗봇이 아니라 한 걸음 더 챙기는 메이드처럼, 자연스럽게 다음 정보를
  묻거나 제안한다.
- 답변은 2~4문장 이내로 간결하게 한다.
- 사용자가 주지 않은 사실을 지어내지 않는다.`;

function buildAnthropicMessages(history, message) {
  const trimmed = Array.isArray(history) ? history.slice(-10) : [];
  const messages = trimmed
    .filter((item) => item && typeof item.content === "string" && item.content.trim())
    .map((item) => ({
      role: item.sender === "princess" ? "user" : "assistant",
      content: item.content,
    }));
  messages.push({ role: "user", content: message });
  return messages;
}

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "POST만 지원합니다." }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "잘못된 요청 본문입니다." }) };
  }

  const { message, history } = payload;
  if (!message || typeof message !== "string") {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "message가 필요합니다." }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }) };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: buildAnthropicMessages(history, message),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: 502, headers, body: JSON.stringify({ error: `Anthropic API 오류: ${errText}` }) };
    }

    const data = await response.json();
    const reply = data?.content?.[0]?.text?.trim();
    if (!reply) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "AI 응답을 해석하지 못했습니다." }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(error) }) };
  }
};
