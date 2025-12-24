export function speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Stop existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9; // Slightly slower for better clarity
    window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
}

export function startListening(onResult: (text: string) => void, onError?: (error: any) => void) {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("이 브라우저는 음성 인식을 지원하지 않아요.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        onResult(text);
    };

    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (onError) onError(event.error);
    };

    recognition.start();
    return recognition;
}
