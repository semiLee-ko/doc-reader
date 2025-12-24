'use client';

import { Stack, ThemeIcon, Text, rem } from '@mantine/core';
import { ScanFace } from 'lucide-react';

export default function ScanningLoader() {
    return (
        <Stack align="center" gap="md" py="xl">
            {/* CSS Animation Injection */}
            <style>{`
        @keyframes scan-move {
          0% { top: 5%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 95%; opacity: 0; }
        }
        .scan-line {
          animation: scan-move 2s infinite linear;
        }
      `}</style>

            <div style={{ position: 'relative', width: 100, height: 100 }}>
                {/* Base Icon */}
                <ThemeIcon
                    variant="light"
                    size={100}
                    radius={100}
                    color="blue"
                    style={{ border: '1px solid var(--mantine-color-blue-1)' }}
                >
                    <ScanFace size={50} strokeWidth={1.5} />
                </ThemeIcon>

                {/* Scanning Overlay */}
                <div
                    className="scan-line"
                    style={{
                        position: 'absolute',
                        left: '10%',
                        right: '10%',
                        height: '2px',
                        background: 'var(--mantine-color-blue-5)',
                        boxShadow: '0 0 8px var(--mantine-color-blue-4)',
                        borderRadius: '50%',
                        zIndex: 10
                    }}
                />

                {/* Scan Gradient Overlay (Optional cool effect) */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: 'linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.1) 50%, transparent 100%)',
                    pointerEvents: 'none'
                }} />
            </div>

            <Stack gap={0} align="center">
                <Text fw={700} c="blue.7" size="lg" style={{ animation: 'pulse 1.5s infinite' }}>
                    문서를 분석하고 있어요...
                </Text>
                <Text c="gray.5" size="sm">
                    잠시만 기다려 주세요
                </Text>
            </Stack>
        </Stack>
    );
}
