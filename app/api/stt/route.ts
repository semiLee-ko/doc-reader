import { NextResponse } from 'next/server';
// import OpenAI from 'openai'; // Uncomment when installing OpenAI SDK

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as Blob;

        if (!file) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        // Mock STT Response
        // In real implementation, send 'file' to OpenAI Whisper API

        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing

        // Return a dummy recognized text
        return NextResponse.json({
            text: "이거 언제까지 내야 하는 거야?"
        });

    } catch (error) {
        console.error("Error in STT API:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
