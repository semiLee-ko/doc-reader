'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader, Center, Text } from '@mantine/core';
import * as pdfjsLib from 'pdfjs-dist';

interface PdfPreviewProps {
    fileUrl: string;
    width?: number; // Target width (canvas will scale to this)
    onLoad?: (pageCount: number) => void;
}

export default function PdfPreview({ fileUrl, width = 240, onLoad }: PdfPreviewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;

        // Ensure worker is set up correctly inside the effect to avoid top-level browser-API crashes
        const version = (pdfjsLib as any).version || '5.4.449';
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

        const renderPdf = async () => {
            try {
                setLoading(true);
                setError(null);

                const loadingTask = pdfjsLib.getDocument(fileUrl);
                const pdf = await loadingTask.promise;

                if (isCancelled) return;

                // Report page count to parent
                if (onLoad) {
                    onLoad(pdf.numPages);
                }

                const page = await pdf.getPage(1);

                if (isCancelled) return;

                const viewport = page.getViewport({ scale: 1 });
                const canvas = canvasRef.current;

                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        // Calculate scale to fit target width
                        const scale = width / viewport.width;
                        const scaledViewport = page.getViewport({ scale });

                        canvas.width = scaledViewport.width;
                        canvas.height = scaledViewport.height;

                        const renderContext = {
                            canvasContext: ctx,
                            viewport: scaledViewport,
                        };

                        await page.render(renderContext as any).promise;
                    }
                }
                setLoading(false);

            } catch (err) {
                console.error("PDF Render Error:", err);
                if (!isCancelled) setError("미리보기 실패");
                setLoading(false);
            }
        };

        if (fileUrl) {
            renderPdf();
        }

        return () => {
            isCancelled = true;
        };
    }, [fileUrl, width, onLoad]);

    return (
        <div style={{ position: 'relative', width: width, background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <canvas ref={canvasRef} style={{ display: loading || error ? 'none' : 'block', width: '100%', height: 'auto', borderRadius: '8px' }} />

            {/* Show loader with aspect ratio placeholder if loading */}
            {loading && (
                <div style={{ width: '100%', paddingBottom: '141%', position: 'relative' }}>
                    <Center style={{ position: 'absolute', inset: 0 }}>
                        <Loader size="sm" color="gray" />
                    </Center>
                </div>
            )}

            {error && (
                <Center style={{ position: 'absolute', inset: 0 }}>
                    <Text size="xs" c="red">{error}</Text>
                </Center>
            )}
        </div>
    );
}
