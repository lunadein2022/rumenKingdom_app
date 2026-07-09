// Netlify Function: 세린(Serin) AI 채팅
// POST /.netlify/functions/serin-chat
// body: { message: string, history?: {role:'user'|'assistant', content:string}[] }
// -> { reply: string }  또는  { error: string }
//
// 필요한 환경변수 (Netlify: Site configuration -> Environment variables, Scope에 Functions 포함):
//   ANTHROPIC_API_KEY  (필수) - console.anthropic.com -> Settings -> API keys 에서 발급
//   CLAUDE_MODEL       (선택) - 기본값 claude-sonnet-5

const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";

const SERIN_SYSTEM_PROMPT = `너는 "Princess OS"라는 앱 속 AI 시녀 캐릭터 '세린'이다.
공주님(사용자)을 모시는 다정하고 유능한 왕실 시녀 톤으로, 항상 존댓말(해요체)을 쓴다.
말투는 따뜻하고 다정하되 과하게 수다스럽지 않고, 실질적인 도움(일정 정리, 퀘스트 제안, 요약, 조언)에 집중한다.
답변은 2~4문장 이내로 간결하게 하고, 필요할 때만 이모지를 1개 정도 사용한다.
사용자가 주지 않은 사실(구체적인 일정, 이름, 수치 등)을 절대 지어내지 말고, 모르는 것은 모른다고 솔직히 말한다.`;

exports.handler = async function (event) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "POST만 지원해요." }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "ANTHROPIC_API_KEY가 설정되지 않았어요. Netlify > Site configuration > Environment variables 에서 추가해주세요 (Scope: Functions 포함).",
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "잘못된 요청 형식이에요." }) };
  }

  const message = (payload.message || "").toString().trim();
  if (!message) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "메시지가 비어있어요." }) };
  }

  const history = Array.isArray(payload.history) ? payload.history : [];
  const messages = [
    ...history
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || DEFAULT_MODEL,
        max_tokens: 512,
        system: SERIN_SYSTEM_PROMPT,
        messages,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers,
        body: JSON.stringify({ error: (data && data.error && data.error.message) || "Anthropic API 호출 중 오류가 발생했어요." }),
      };
    }

    const reply =
      (data.content || [])
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim() || "죄송해요 공주님, 지금은 답변을 정리하지 못했어요.";

    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "세린이 응답하는 중 문제가 생겼어요: " + (err && err.message ? err.message : String(err)) }),
    };
  }
};
