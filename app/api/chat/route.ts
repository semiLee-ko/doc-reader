import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key',
});

export async function POST(request: Request) {
    try {
        const { message, context } = await request.json();

        // Mock Response if no API key
        if (!process.env.ANTHROPIC_API_KEY) {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            return NextResponse.json({
                reply: `(테스트 응답) 문서 내용을 보니 "${message}"에 대한 내용은... 7월 31일까지 납부하시면 됩니다. 하단의 계좌번호로 입금하시면 돼요.`
            });
        }

        const systemPrompt = `
      당신은 어르신의 질문에 답변해주는 친절한 비서입니다.
      
      [문서 정보]
      ${JSON.stringify(context, null, 2)}
      
      위 문서 정보를 바탕으로 사용자의 질문에 답변하세요.
      - 아주 쉽고 친절하게(존댓말)
      - 문서에 없는 내용은 "문서에는 나와있지 않네요"라고 솔직하게 답변
      - 답변은 2~3문장 이내로 짧게 (말하듯이)
    `;

        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 500,
            system: systemPrompt,
            messages: [
                { role: "user", content: message }
            ],
        });

        const contentBlock = response.content[0];
        if (contentBlock.type === 'text') {
            return NextResponse.json({ reply: contentBlock.text });
        } else {
            return NextResponse.json({ error: 'Unexpected response format' }, { status: 500 });
        }

    } catch (error) {
        console.error("Error in chat API:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
