import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key', // Fallback for build time, will fail at runtime if invalid
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { files } = body;

        let processedFiles: { type: 'image' | 'pdf', media_type: string, data: string }[] = [];

        // Support new 'files' array format
        if (files && Array.isArray(files) && files.length > 0) {
            processedFiles = files.map((f: any) => {
                const matches = f.data.match(/^data:(.+);base64,(.+)$/);
                if (!matches) return null;
                return {
                    type: f.type,
                    media_type: matches[1],
                    data: matches[2]
                };
            }).filter((item): item is { type: 'image' | 'pdf', media_type: string, data: string } => item !== null);
        }
        // Backward compatibility for single image
        else if (body.imageBase64) {
            const matches = body.imageBase64.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                processedFiles.push({
                    type: 'image',
                    media_type: matches[1],
                    data: matches[2]
                });
            } else {
                // simple base64 without prefix check
                processedFiles.push({
                    type: 'image',
                    media_type: 'image/jpeg',
                    data: body.imageBase64
                });
            }
        }

        if (processedFiles.length === 0) {
            return NextResponse.json({ error: 'No valid file data provided' }, { status: 400 });
        }

        // Check if API key is configured
        if (!process.env.ANTHROPIC_API_KEY) {
            console.warn("ANTHROPIC_API_KEY is missing. Returning mock data.");
            return NextResponse.json(MOCK_RESPONSE);
        }

        // Construct Content Blocks for Claude
        const contentBlocks: any[] = processedFiles.map(file => {
            if (file.type === 'pdf') {
                return {
                    type: "document",
                    source: {
                        type: "base64",
                        media_type: "application/pdf", // Claude strictly requires this for PDFs
                        data: file.data
                    }
                };
            } else {
                return {
                    type: "image",
                    source: {
                        type: "base64",
                        media_type: file.media_type as any, // 'image/jpeg', 'image/png', etc.
                        data: file.data
                    }
                };
            }
        });

        // Add the text prompt
        contentBlocks.push({
            type: "text",
            text: `이 ${processedFiles.length > 1 ? processedFiles.length + '장의 ' : ''}문서를 읽고 어르신이 이해하기 쉽게 해석해줘.`,
        });

        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1024,
            system: `당신은 어르신을 돕는 친절한 '문서 해석 비서'입니다. 
      어떤 문서든(이미지 또는 PDF) 내용을 보면 그 핵심을 아주 쉽고 간단하게 요약해서 알려줘야 합니다.
      여러 장의 문서가 제공되면 내용을 종합해서 설명하세요.
      
      [톤앤매너]
      - 손주가 할머니/할아버지께 설명하듯 예의 바르고 다정하게(존댓말)
      - 어려운 전문 용어는 빼고 쉬운 말로 풀어서
      - 한번에 너무 많은 정보를 주지 말고, '지금 당장 해야 할 일' 위주로
      
      [필수 요구사항]
      - 주민등록번호, 여권번호 등 민감한 개인정보(PII)는 절대 출력물에 포함하지 마세요.
      - 결과는 반드시 아래 JSON 형식으로만 출력하세요. 마크다운 코드블록 없이 JSON만 반환하세요.
      
      {
        "doc_type": "문서 종류 (예: 세금 고지서, 병원 처방전, 등기 우편, 은행 서류, 기타)",
        "one_line": "이 문서가 무엇인지 한 줄 요약 (예: OO은행에서 온 대출 이자 안내문이에요.)",
        "what_it_is": ["핵심 내용 1", "핵심 내용 2"],
        "do_now": {
            "action": "지금 당장 해야 할 행동 (없으면 '그냥 보관하시면 돼요')",
            "why": "그 행동을 해야 하는 이유",
            "deadline_hint": "납부 기한이나 제출 기한 (없으면 null)"
        },
        "need_ocr_check": boolean // 날짜, 금액 등 정확한 수치 추출이 100% 필요한 경우 true
      }`,
            messages: [
                {
                    role: "user",
                    content: contentBlocks,
                },
            ],
        });

        const contentBlock = response.content[0];
        if (contentBlock.type === 'text') {
            try {
                const jsonResult = JSON.parse(contentBlock.text);
                return NextResponse.json(jsonResult);
            } catch (e) {
                console.error("Failed to parse JSON from Claude:", contentBlock.text);
                return NextResponse.json({ error: 'Failed to parse interpretation result' }, { status: 500 });
            }
        } else {
            return NextResponse.json({ error: 'Unexpected response format' }, { status: 500 });
        }

    } catch (error) {
        console.error("Error analyzing files:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

const MOCK_RESPONSE = {
    "doc_type": "세금 고지서 (예시)",
    "one_line": "구청에서 보내온 재산세 고지서예요.",
    "what_it_is": ["7월분 재산세를 내라는 안내입니다.", "합계 금액은 125,000원입니다."],
    "do_now": {
        "action": "7월 31일까지 은행에 가서 내시거나, 손주에게 이체해달라고 하세요.",
        "why": "기한을 넘기면 가산금(연체료)이 붙어요.",
        "deadline_hint": "2024년 7월 31일"
    },
    "need_ocr_check": true
};
