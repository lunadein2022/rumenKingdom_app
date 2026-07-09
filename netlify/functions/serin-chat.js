// Netlify Function: Serin AI chat
// POST /.netlify/functions/serin-chat
// body: { message: string, history?: { role: "user" | "assistant", content: string }[] }
// response: { reply: string }

const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";

const SERIN_SYSTEM_PROMPT = `You are Serin, the AI maid and executive aide inside Princess OS.
The user is the Princess: the protagonist and growing character of the system.
Princess OS is a Personal OS for quests, calendar, diary, relationships, documents, memories, and long-term life operations.

Speak in Korean by default.
Your tone is warm, composed, precise, and quietly loyal.
Do not pretend to have created calendar events, quests, files, or memories unless the app confirms that action.
Give practical next steps when useful.
Keep most replies concise, usually 2-4 sentences.`;

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
    return { statusCode: 405, headers, body: JSON.stringify({ error: "POST만 지원합니다." }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ENTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "ANTHROPIC_API_KEY가 설정되지 않았습니다. Netlify Site configuration > Environment variables에 추가하세요.",
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "요청 JSON 형식이 올바르지 않습니다." }) };
  }

  const message = String(payload.message || "").trim();
  if (!message) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "메시지가 비어 있습니다." }) };
  }

  const history = Array.isArray(payload.history) ? payload.history : [];
  const messages = [
    ...history
      .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
      .slice(-10)
      .map((item) => ({ role: item.role, content: item.content })),
    { role: "user", content: message },
  ];

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || DEFAULT_MODEL,
        max_tokens: 700,
        system: SERIN_SYSTEM_PROMPT,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data?.error?.message || "Anthropic API 호출 중 오류가 발생했습니다." }),
      };
    }

    const reply =
      (data.content || [])
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim() || "죄송합니다, 공주님. 지금은 응답을 정리하지 못했습니다.";

    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `세린 응답 처리 중 문제가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
      }),
    };
  }
};
