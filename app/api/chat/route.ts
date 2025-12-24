import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { message, context } = await request.json();
        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        if (!GROQ_API_KEY) {
            return NextResponse.json({
                error: 'GROQ_API_KEY가 설정되지 않았습니다.'
            }, { status: 500 });
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
                    { role: "user", content: message }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Groq Chat API Error:", error);
            return NextResponse.json({ error: 'AI 대화 서비스 호출에 실패했습니다.' }, { status: 500 });
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        return NextResponse.json({ reply });

    } catch (error) {
        console.error("Error in chat API:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
