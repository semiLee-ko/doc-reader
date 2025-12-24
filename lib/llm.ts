// lib/llm.ts - Frontend wrapper for Server-side API Routes

export async function initEngine(onProgress?: (progress: number, text: string) => void) {
    if (onProgress) onProgress(1, "준비 완료");
    return true;
}

/**
 * AI를 사용하여 텍스트 분석 (서버 API 호출)
 */
export async function summarizeText(text: string): Promise<any> {
    const response = await fetch('/api/analyze/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ extractedText: text })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Analysis API Error:", errorData);
        throw new Error(errorData.error || 'AI 분석 서비스 호출에 실패했습니다.');
    }

    return response.json();
}

/**
 * AI와 대화하기 (서버 API 호출)
 */
export async function askLlm(prompt: string, context?: string): Promise<string> {
    const response = await fetch('/api/chat/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: prompt, context })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Chat API Error:", errorData);
        return "죄송해요, AI와 연결하는 중에 문제가 생겼어요.";
    }

    const data = await response.json();
    return data.reply;
}
