import { MLCEngine } from "@mlc-ai/web-llm";

let engine: MLCEngine | null = null;

const MODEL_ID = "gemma-2-2b-it-q4f16_1-MLC";

export async function initEngine(onProgress?: (progress: number, text: string) => void) {
    if (engine) return engine;

    engine = new MLCEngine();
    engine.setInitProgressCallback((progress) => {
        console.log("LLM Init Progress:", progress);
        if (onProgress) onProgress(progress.progress, progress.text);
    });

    await engine.reload(MODEL_ID, {
        context_window_size: 8192,
    });

    return engine;
}

export async function summarizeText(text: string): Promise<any> {
    const engine = await initEngine();

    const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, 6000);
    console.log("LLM 분석 요청 텍스트 (정제됨):", cleanText);

    const prompt = `당신은 문서 해석 전문가 비서입니다. 아래 [문서 원본]을 읽고 어르신들께 설명하듯 친절한 한국어로 분석해 주세요.

[분석 규칙]
1. 모든 답변은 한국어로만 하세요. 영어나 예시 텍스트를 절대 사용하지 마세요.
2. 예시 숫자가 아닌 [문서 원본]에 있는 실제 날짜, 금액, 결과, 이름(예: 게임명)을 반드시 포함하세요.
3. "무슨 내용이 담겨 있습니다" 같은 뻔한 설명 말고, "결과가 어떻다"라는 구체적인 사실을 알려주세요.
4. "문서를 자세히 확인하세요" 같은 말은 절대 하지 마세요. 대신 내용을 콕 짚어서 알려주세요.
5. 아래 JSON 형식 외에 다른 부연 설명은 하지 마세요.
6. **반드시 JSON 형식의 키 이름을 정확히 지키고, 배열의 마지막 항목 뒤에 쉼표(,)를 찍지 마세요.**

[문서 원본]
${cleanText}

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

    const messages = [
        { role: "user", content: prompt },
    ];

    const reply = await engine.chat.completions.create({
        messages: messages as any,
        temperature: 0.2, // Lower temperature for more stable JSON
        top_p: 0.95,
        repetition_penalty: 1.1, // Prevent loops
    });

    const rawContent = reply.choices[0].message.content || "";

    try {
        // More robust JSON extraction: find first '{' and last '}'
        const firstBrace = rawContent.indexOf('{');
        const lastBrace = rawContent.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            let cleanJson = rawContent.substring(firstBrace, lastBrace + 1);

            // Fix common LLM JSON errors
            cleanJson = cleanJson
                .replace(/,(\s*[\]}])/g, '$1') // Remove trailing commas
                .replace(/(\r\n|\n|\r)/gm, " "); // Replace newlines with spaces for easier parsing if needed

            try {
                const parsed = JSON.parse(cleanJson);

                // Normalize the object to ensure it has all required fields with correct types
                return {
                    doc_type: parsed.doc_type || "문서",
                    one_line: parsed.one_line || "문서 요약 정보를 읽지 못했습니다.",
                    what_it_is: Array.isArray(parsed.what_it_is) ? parsed.what_it_is :
                        (Array.isArray(parsed.what_it_s_about) ? parsed.what_it_s_about : ["상세 내용을 가져오지 못했습니다."]),
                    do_now: {
                        action: parsed.do_now?.action || (parsed.action_required?.action || "특별히 하실 일은 없어요."),
                        why: parsed.do_now?.why || (parsed.action_required?.why || "문서에 명시된 이유가 없습니다."),
                        deadline_hint: parsed.do_now?.deadline_hint || (parsed.action_required?.deadline_hint || "기한 정보 없음")
                    },
                    need_ocr_check: Boolean(parsed.need_ocr_check)
                };
            } catch (innerError) {
                console.warn("Standard JSON.parse failed, trying to sanitize more...", innerError);
                // Last ditch effort: remove anything that's not part of the structure
                return JSON.parse(cleanJson); // If this fails, it goes to the outer catch
            }
        }

        // If no JSON found but there is text, try to create a dummy JSON from the text
        if (rawContent.trim().length > 5) {
            console.warn("LLM didn't return JSON, but returned text. Attempting fallback.", rawContent);
            return {
                doc_type: "문서",
                one_line: "문서 내용을 분석하는 중이에요.",
                what_it_is: [rawContent.trim().slice(0, 100) + "..."],
                do_now: {
                    action: "내용을 직접 확인해 보시는 것이 좋겠어요.",
                    why: "AI가 분석 형식을 맞추지 못했어요.",
                    deadline_hint: "확인 필요"
                },
                need_ocr_check: true
            };
        }

        throw new Error("JSON structure not found");
    } catch (e) {
        console.error("Failed to parse LLM JSON:", rawContent, e);
        throw new Error("분석 결과 형식이 올바르지 않습니다. 다시 시도해 주세요.");
    }
}

export async function askLlm(prompt: string, context?: string): Promise<string> {
    const engine = await initEngine();

    const systemPrompt = `당신은 어르신을 돕는 친절한 '문서 해석 비서'입니다. 
사용자의 질문에 손주가 설명하듯 예의 바르고 다정하게 답해주세요.
직관적이고 쉬운 단어를 사용하세요.
반드시 한국어로만 답변하세요.

${context ? `[참고 문서 내용]\n${context}\n` : ""}
`;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
    ];

    const reply = await engine.chat.completions.create({
        messages: messages as any,
    });

    return reply.choices[0].message.content || "죄송해요, 잘 이해하지 못했어요.";
}
