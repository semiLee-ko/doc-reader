'use client';

import { useState, useEffect } from 'react';
import { Modal, ActionIcon, Group, Paper, Text } from '@mantine/core';
import { X, Minus, Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { FileItem } from '../types';

const PdfPreview = dynamic(() => import('./PdfPreview'), { ssr: false });

interface ZoomModalProps {
    zoomedFile: FileItem | null;
    onClose: () => void;
}

export default function ZoomModal({ zoomedFile, onClose }: ZoomModalProps) {
    const [zoomLevel, setZoomLevel] = useState(1);

    useEffect(() => {
        if (zoomedFile) setZoomLevel(1);
    }, [zoomedFile]);

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 3));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 1)); // Min 1x to avoid too small

    return (
        <Modal
            opened={!!zoomedFile}
            onClose={onClose}
            fullScreen
            withCloseButton={false}
            transitionProps={{ transition: 'fade', duration: 200 }}
            styles={{
                header: { display: 'none' }, // Custom close button, hide default header to maximize space
                body: { background: 'black', width: '100%', height: '100%', padding: 0, position: 'relative', overflow: 'hidden' }
            }}
        >
            {/* Custom Close Button Area */}
            <ActionIcon
                variant="transparent"
                color="white"
                size="xl"
                style={{ position: 'absolute', top: 20, right: 20, zIndex: 200, filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.5))' }}
                onClick={onClose}
            >
                <X size={32} />
            </ActionIcon>

            {/* Scroll Container */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 10
                }}
            >
                <div
                    style={{
                        flex: '1 1 auto',
                        minHeight: '100%',
                        minWidth: '100%',
                        display: 'flex',
                        alignItems: zoomLevel > 1 ? 'flex-start' : 'center',
                        justifyContent: zoomLevel > 1 ? 'flex-start' : 'center',
                        // Fix style conflict by using explicit properties
                        paddingTop: zoomLevel > 1 ? '40px' : '20px',
                        paddingLeft: zoomLevel > 1 ? '40px' : '20px',
                        paddingRight: zoomLevel > 1 ? '40px' : '20px',
                        paddingBottom: '120px', // Ensure space for controls
                        boxSizing: 'border-box'
                    }}
                >
                    {zoomedFile && (
                        <div style={{
                            // Use same pixel-based logic for both types to ensure consistent scaling
                            width: window.innerWidth * zoomLevel - (zoomLevel > 1 ? 40 : 0),
                            maxWidth: 'none', // Ensure not constrained by parent
                            flexShrink: 0,    // CRITICAL: Prevents flex container from shrinking this element
                            transition: 'width 0.2s ease-out',
                            margin: 'auto',
                            position: 'relative'
                        }}>
                            {zoomedFile.type === 'pdf' ? (
                                <PdfPreview fileUrl={zoomedFile.url} width={window.innerWidth * zoomLevel - (zoomLevel > 1 ? 40 : 0)} />
                            ) : (
                                <img
                                    src={zoomedFile.url}
                                    style={{ width: '100%', height: 'auto', display: 'block' }}
                                    alt="Zoomed document"
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Zoom Controls (Floating above scroll container) */}
            <Group
                gap="sm"
                wrap="nowrap"
                style={{
                    position: 'absolute',
                    bottom: 60, // Moved up for better access
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100,
                }}
            >
                <ActionIcon
                    variant="filled"
                    color="dark"
                    size={56}
                    radius="xl"
                    style={{ border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(30,30,30,0.85)' }}
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 1}
                >
                    <Minus size={28} />
                </ActionIcon>

                <Paper px="lg" py={6} radius="xl" bg="rgba(30,30,30,0.85)" withBorder style={{ borderColor: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap', minWidth: 80, display: 'flex', justifyContent: 'center' }}>
                    <Text c="white" fw={700} size="md">
                        {Math.round(zoomLevel * 100)}%
                    </Text>
                </Paper>

                <ActionIcon
                    variant="filled"
                    color="dark"
                    size={56}
                    radius="xl"
                    style={{ border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(30,30,30,0.85)' }}
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 3}
                >
                    <Plus size={28} />
                </ActionIcon>
            </Group>
        </Modal>
    );
}
