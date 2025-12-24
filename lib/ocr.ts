let pdfjsLib: any = null;
let tesseractWorker: any = null;

async function getPdfJs() {
    if (pdfjsLib) return pdfjsLib;
    if (typeof window === 'undefined') return null;
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    return pdfjsLib;
}

async function getTesseractWorker() {
    if (tesseractWorker) return tesseractWorker;
    const { createWorker } = await import('tesseract.js');
    tesseractWorker = await createWorker(['kor', 'eng']);
    return tesseractWorker;
}

async function preprocessImage(imageSource: string): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const MAX_DIM = 1600; // Adjusted for better speed/accuracy balance
            let width = img.width;
            let height = img.height;

            let needsResize = false;
            // 1. Resizing (Only downscale)
            if (width > height) {
                if (width > MAX_DIM) {
                    height *= MAX_DIM / width;
                    width = MAX_DIM;
                    needsResize = true;
                }
            } else {
                if (height > MAX_DIM) {
                    width *= MAX_DIM / height;
                    height = MAX_DIM;
                    needsResize = true;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve(imageSource);
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                // 2. Grayscale & 3. Binarization
                const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
                const val = avg > 128 ? 255 : 0;
                data[i] = data[i + 1] = data[i + 2] = val;
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = imageSource;
    });
}

export async function extractTextFromImage(imageSource: string): Promise<string> {
    const processedImage = await preprocessImage(imageSource);
    const worker = await getTesseractWorker();
    const { data: { text } } = await worker.recognize(processedImage);
    return text;
}

/**
 * Detects and fixes text where every character is separated by a space.
 * Example: "게 임 물 관 리" -> "게임물 관리"
 */
function cleanSpacedKoreanText(text: string): string {
    // If the text has a pattern of (char space char space char)
    // We check if more than 70% of non-whitespace characters are followed by a space
    const chars = text.trim().split('');
    if (chars.length < 10) return text;

    let spaceCount = 0;
    let charCount = 0;
    for (let i = 0; i < chars.length - 1; i++) {
        if (chars[i] !== ' ') {
            charCount++;
            if (chars[i + 1] === ' ') {
                spaceCount++;
            }
        }
    }

    // Heuristic: if spaces are very frequent between characters
    if (charCount > 0 && spaceCount / charCount > 0.7) {
        // Join every single char-space-char, but preserve double spaces as word boundaries
        // Replace "A B C" with "ABC", but "A B  C D" with "ABC CD"
        return text
            .replace(/(\S) (?=\S)/g, '$1') // Join single char gaps
            .replace(/\s{2,}/g, ' ');      // Collapse multiple spaces to one
    }

    return text;
}

async function extractTextFromPdf(pdfUrl: string): Promise<string> {
    const pdfjs = await getPdfJs();
    if (!pdfjs) return "PDF extraction is only supported in the browser.";

    const loadingTask = pdfjs.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    let pdfText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        // 1. Try to extract digital text first
        const textContent = await page.getTextContent();
        const rawDigitalText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .trim();

        const digitalText = cleanSpacedKoreanText(rawDigitalText);

        if (digitalText.length > 20) {
            // It's a digital PDF with enough text
            pdfText += `\n[Page ${i} - Digital Text]\n${digitalText}\n`;
        } else {
            // It's likely a scanned PDF or has very little text, use OCR
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                await page.render({ canvasContext: context, canvas: canvas, viewport }).promise;
                const imageData = canvas.toDataURL('image/png');
                const text = await extractTextFromImage(imageData);
                pdfText += `\n[Page ${i} - Scanned/OCR Text]\n${text}\n`;
            }
        }
    }
    return pdfText;
}

export async function extractTextFromFiles(files: { type: 'image' | 'pdf', url: string }[]): Promise<string> {
    let combinedText = '';

    for (const file of files) {
        if (file.type === 'image') {
            const text = await extractTextFromImage(file.url);
            combinedText += `\n--- Image Part ---\n${text}\n`;
        } else {
            const text = await extractTextFromPdf(file.url);
            combinedText += `\n--- PDF Part ---\n${text}\n`;
        }
    }

    return combinedText;
}
