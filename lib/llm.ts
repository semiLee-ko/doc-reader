// lib/llm.ts - Using internal API Routes instead of Local LLM for mobile performance

export async function initEngine(onProgress?: (progress: number, text: string) => void) {
    // No-op for cloud-based LLM, but kept for interface compatibility
    if (onProgress) onProgress(1, "준비 완료");
    return true;
}

export async function summarizeText(text: string): Promise<any> {
    const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedText: text })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '문서 분석 중 오류가 발생했습니다.');
    }

    return await response.json();
}

export async function askLlm(prompt: string, context?: string): Promise<string> {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, context: context })
    });

    if (!response.ok) {
        throw new Error('AI와 대화 중 오류가 발생했습니다.');
    }

    const data = await response.json();
    return data.reply || "죄송해요, 조금 뒤에 다시 물어봐 주시겠어요?";
}
