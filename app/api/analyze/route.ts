import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { extractedText } = body;

        if (!extractedText) {
            return NextResponse.json({ error: '추출된 텍스트가 없습니다.' }, { status: 400 });
        }

        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        if (!GROQ_API_KEY) {
            return NextResponse.json({
                error: 'GROQ_API_KEY가 설정되지 않았습니다. 환경 변수에 추가해 주세요.'
            }, { status: 500 });
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
${extractedText.slice(0, 10000)}

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
            return NextResponse.json({ error: 'AI 분석 서비스 호출에 실패했습니다.' }, { status: 500 });
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        return NextResponse.json(JSON.parse(content));

    } catch (error) {
        console.error("Error in analyze API:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
