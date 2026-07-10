// Netlify Function: 세린 실제 AI 채팅 + 구조화된 액션 판단
// ANTHROPIC_API_KEY 를 Netlify 환경변수에 등록해야 동작합니다.
//
// 구조: "판단은 Claude, 실행은 앱 코드"
//  - 프런트는 모든 메시지를 이 함수로 먼저 보냅니다.
//  - Claude가 일정/퀘스트/기억 저장이 필요하다고 판단하면 tool_use로
//    구조화된 액션(JSON)을 반환하고, 프런트는 그 액션으로 확인 카드를 띄웁니다.
//  - 순수 잡담이면 그냥 자연어 답변만 반환합니다.
//  - 정규식으로 사용자의 말을 미리 분류하지 않습니다.

const SYSTEM_PROMPT_BASE = `너는 Princess OS의 AI 메이드 세린이다.

- 사용자를 항상 "공주님"이라고 부른다.
- 다정하고 차분하지만 지나치게 장황하지 않게 말한다.
- 사용자의 말을 자연스럽게 이해하고, 일정·퀘스트(할 일)·기억·일반 대화를 스스로 구분한다.
- 일정이나 퀘스트를 처리할 때 필요한 정보가 충분하면 도구를 호출해 구조화된 작업을 제안한다.
- 날짜, 시간, 대상이 불명확할 때만 짧게 되묻는다.
- "내일", "모레", "다음주 월요일" 같은 상대 날짜는 아래 오늘 날짜를 기준으로 계산한다.
- 사용자가 주지 않은 사실은 지어내지 않는다.
- 일반 대화도 자연스럽게 이어간다.
- 답변은 보통 2~4문장으로 한다.
- "처리할 수 없습니다", "알 수 없습니다" 같은 기계적인 표현은 쓰지 않고,
  이해하지 못했을 때는 부드럽게 되묻는다.`;

const TOOLS = [
  {
    name: "create_calendar_event",
    description:
      "공주님이 일정을 등록해달라고 할 때 호출한다. 날짜가 명확할 때만 호출하고, 불명확하면 호출하지 말고 되묻는다.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description:
            "일정의 핵심 제목만. 날짜/시간 표현과 '등록해줘', '넣어줘' 같은 요청 표현은 제목에 넣지 않는다. 예: '내일 오후 3시에 대표님 미팅 잡아줘' → '대표님 미팅'",
        },
        start_date: { type: "string", description: "시작 날짜 YYYY-MM-DD" },
        start_time: { type: "string", description: "시작 시각 HH:MM (24시간). 시간이 없으면 생략" },
        end_date: { type: "string", description: "종료 날짜 YYYY-MM-DD. 하루짜리면 생략" },
        end_time: { type: "string", description: "종료 시각 HH:MM. 없으면 생략" },
        all_day: { type: "boolean", description: "종일/기간 일정 여부" },
        category: {
          type: "string",
          enum: ["work", "personal", "quest", "routine", "meeting", "serin", "rest", "event"],
          description: "일정 분류. 회의/미팅은 meeting, 업무는 work, 그 외 개인 일정은 personal",
        },
      },
      required: ["title", "start_date"],
    },
  },
  {
    name: "create_quest",
    description:
      "공주님이 해야 할 일(퀘스트/할 일/todo)을 말할 때 호출한다. '~해야 돼', '~할 일 추가해줘' 같은 실행형 요청에 쓴다.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description:
            "할 일의 핵심 제목만. 명사형으로 다듬고, '~해야 돼', '~까지', '만들어줘' 같은 요청/기한 표현은 제목에 넣지 않는다. 예: '내일까지 제안서 초안 작성해야 돼' → '제안서 초안 작성'",
        },
        due_date: { type: "string", description: "마감 날짜 YYYY-MM-DD. 없으면 생략(오늘로 처리됨)" },
        description: { type: "string", description: "부가 설명. 없으면 생략" },
      },
      required: ["title"],
    },
  },
  {
    name: "save_memory",
    description:
      "공주님이 '기억해줘'라고 하거나, 앞으로 계속 참고해야 할 선호/루틴/제약을 알려줄 때 호출한다.",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string", description: "기억할 내용 한 문장" },
        memory_type: {
          type: "string",
          enum: ["preference", "person", "routine", "goal", "constraint", "emotion", "work", "personal"],
          description: "기억 분류",
        },
      },
      required: ["content"],
    },
  },
];

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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

// Claude가 반환한 도구 입력을 검증해 프런트가 그대로 믿고 쓸 수 있는
// 구조화된 액션으로 바꿉니다. 형식이 어긋나면 액션을 버리고 대화로 처리합니다.
function toAction(toolUse) {
  const input = toolUse.input ?? {};
  if (toolUse.name === "create_calendar_event") {
    if (!input.title || !DATE_RE.test(input.start_date ?? "")) return null;
    return {
      type: "calendar.create",
      title: String(input.title),
      startDate: input.start_date,
      startTime: TIME_RE.test(input.start_time ?? "") ? input.start_time : null,
      endDate: DATE_RE.test(input.end_date ?? "") ? input.end_date : null,
      endTime: TIME_RE.test(input.end_time ?? "") ? input.end_time : null,
      allDay: Boolean(input.all_day),
      category: input.category ?? "personal",
    };
  }
  if (toolUse.name === "create_quest") {
    if (!input.title) return null;
    return {
      type: "quest.create",
      title: String(input.title),
      dueDate: DATE_RE.test(input.due_date ?? "") ? input.due_date : null,
      description: input.description ? String(input.description) : null,
    };
  }
  if (toolUse.name === "save_memory") {
    if (!input.content) return null;
    return {
      type: "memory.save",
      content: String(input.content),
      memoryType: input.memory_type ?? "preference",
    };
  }
  return null;
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

  const { message, history, today } = payload;
  if (!message || typeof message !== "string") {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "message가 필요합니다." }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }) };
  }

  const todayLine =
    typeof today === "string" && DATE_RE.test(today) ? `\n\n오늘 날짜(한국 기준): ${today}` : "";

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
        max_tokens: 500,
        system: SYSTEM_PROMPT_BASE + todayLine,
        tools: TOOLS,
        messages: buildAnthropicMessages(history, message),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: 502, headers, body: JSON.stringify({ error: `Anthropic API 오류: ${errText}` }) };
    }

    const data = await response.json();
    const blocks = Array.isArray(data?.content) ? data.content : [];
    const textBlock = blocks.find((block) => block.type === "text");
    const toolBlock = blocks.find((block) => block.type === "tool_use");
    const reply = textBlock?.text?.trim() ?? "";
    const action = toolBlock ? toAction(toolBlock) : null;

    if (!reply && !action) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "AI 응답을 해석하지 못했습니다." }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ reply, action }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(error) }) };
  }
};
