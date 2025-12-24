// lib/llm.ts - Client-side Groq API call (Compatible with Static Hosting like GitHub Pages)

export async function initEngine(onProgress?: (progress: number, text: string) => void) {
    if (onProgress) onProgress(1, "준비 완료");
    return true;
}

export async function summarizeText(text: string): Promise<any> {
    const GROQ_API_KEY = "YOUR_GROQ_API_KEY_HERE"; // 사용자가 여기에 직접 키를 입력해야 합니다.

    if (GROQ_API_KEY === "YOUR_GROQ_API_KEY_HERE") {
        throw new Error("분석을 시작하려면 lib/llm.ts 파일에 Groq API 키를 입력해 주세요.");
    }

    const prompt = `당신은 문서 해석 전문가 비서입니다. 아래 [문서 원본]을 읽고 어르신들께 설명하듯 친절한 한국어로 분석해 주세요.

[분석 규칙]
1. 모든 답변은 한국어로만 하세요. 영어나 예시 텍스트를 절대 사용하지 마세요.
2. 예시 숫자가 아닌 [문서 원본]에 있는 실제 날짜, 금액, 결과, 이름(예: 게임명)을 반드시 포함하세요.
3. "무슨 내용이 담겨 있습니다" 같은 뻔한 설명 말고, "결과가 어떻다"라는 구체적인 사실을 알려주세요.
4. "문서를 자세히 확인하세요" 같은 말은 절대 하지 마세요. 대신 내용을 콕 짚어서 알려주세요.
5. 아래 JSON 형식 외에 다른 부연 설명은 하지 마세요.
6. 반드시 JSON 형식의 키 이름을 정확히 지켜주세요.

[문서 원본]
${text.slice(0, 10000)}

[결과 JSON 양식]
{
  "doc_type": "문서 종류",
  "one_line": "한 줄 요약",
  "what_it_is": ["주요 내용 1", "주요 내용 2"],
  "do_now": {
      "action": "해야 할 일(없으면 '특별히 하실 일 없음')",
      "why": "이유",
      "deadline_hint": "날짜"
  },
  "need_ocr_check": false
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "user", content: prompt }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) {
        const error = await response.json();
        console.error("Groq API Error:", error);
        throw new Error('AI 분석 서비스 호출에 실패했습니다.');
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
}

export async function askLlm(prompt: string, context?: string): Promise<string> {
    const GROQ_API_KEY = "YOUR_GROQ_API_KEY_HERE"; // 동일한 키 사용

    if (GROQ_API_KEY === "YOUR_GROQ_API_KEY_HERE") {
        return "AI와 대화하려면 먼저 API 키를 설정해 주세요.";
    }

    const systemPrompt = `당신은 어르신을 돕는 친절한 '문서 해석 비서'입니다. 
사용자의 질문에 손주가 설명하듯 예의 바르고 다정하게 답해주세요.
직관적이고 쉬운 단어를 사용하세요.
반드시 한국어로만 답변하세요.

[참고할 문서 내용]
${context || "문서 내용이 제공되지 않았습니다."}
`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature: 0.7
        })
    });

    if (!response.ok) {
        return "죄송해요, AI와 연결하는 중에 문제가 생겼어요.";
    }

    const data = await response.json();
    return data.choices[0].message.content;
}
