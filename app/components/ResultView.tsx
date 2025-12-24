'use client';

import { useState, useRef, useEffect } from 'react';
import { Container, Paper, Group, ActionIcon, Text, Stack, Card, Badge, Title, ThemeIcon, Center, Loader, TextInput, Button } from '@mantine/core';
import { X, Check, Calendar, ChevronRight, ScanFace, Volume2, Mic, Square } from 'lucide-react';
import { AnalysisResult } from '../types';
import { speak, stopSpeaking, startListening } from '@/lib/voice';
import { summarizeText, askLlm } from '@/lib/llm';

interface ResultViewProps {
    result: AnalysisResult;
    onClose: () => void;
}

export default function ResultView({ result, onClose }: ResultViewProps) {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    // Scroll handling
    const viewportRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (viewportRef.current) {
            viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    const handleSendMessage = async (textOveride?: string) => {
        const textToSend = textOveride || inputValue;
        if (!textToSend.trim()) return;

        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
        setIsThinking(true);

        try {
            const context = `
문서 종류: ${result.doc_type}
한줄 요약: ${result.one_line}
상세 내용: ${result.what_it_is.join(', ')}
지금 해야할 일: ${result.do_now.action} (${result.do_now.why})
`;
            const replyText = await askLlm(textToSend, context);

            setMessages(prev => [...prev, { role: 'assistant', text: replyText }]);
            speak(replyText);
        } catch (e) {
            console.error(e);
            alert('대화에 실패했습니다.');
        } finally {
            setIsThinking(false);
        }
    };

    const handleVoiceClick = () => {
        if (isListening) {
            recognition?.stop();
            setIsListening(false);
            return;
        }

        setIsListening(true);
        const rec = startListening(
            (text) => {
                setIsListening(false);
                handleSendMessage(text);
            },
            (err) => {
                setIsListening(false);
                console.error(err);
            }
        );
        setRecognition(rec);
    };

    const handleSpeakToggle = (text: string) => {
        speak(text);
    };

    return (
        <Container size="xs" p={0} bg="#F2F4F6" h="100vh" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Paper p="md" shadow="xs" style={{ zIndex: 10 }}>
                <Group justify="space-between" align="center">
                    <ActionIcon variant="transparent" c="black" onClick={onClose}>
                        <X size={28} />
                    </ActionIcon>
                    <Text fw={800} size="lg" c="#191F28">분석 결과</Text>
                    <div style={{ width: 28 }} />
                </Group>
            </Paper>

            {/* Content Scroll Area */}
            <div ref={viewportRef} style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
                <Stack p="lg" gap="lg">
                    {/* Summary Card */}
                    <Card radius="lg" p="xl" withBorder>
                        <Stack gap="xs">
                            <Badge color="blue" size="lg" variant="light">{result.doc_type}</Badge>
                            <Title order={3} size={22} c="dark.9" fw={700} style={{ lineHeight: 1.4 }}>
                                {result.one_line}
                            </Title>
                        </Stack>
                    </Card>

                    {/* Action Item Card */}
                    <Card radius="lg" p="xl" bg="blue.0" style={{ border: '1px solid var(--mantine-color-blue-2)' }}>
                        <Stack gap="md">
                            <Group align="center" gap="sm">
                                <ThemeIcon color="blue" size="lg" variant="white" radius="xl">
                                    <Check size={20} />
                                </ThemeIcon>
                                <Text fw={700} size="lg" c="blue.9">지금 해야 할 일</Text>
                            </Group>
                            <Text size="xl" fw={700} c="blue.9">
                                {result?.do_now?.action || '특별히 하실 일은 없어요.'}
                            </Text>
                            {result?.do_now?.deadline_hint && (
                                <Group gap="xs" align="center">
                                    <Calendar size={18} className="text-blue-600" />
                                    <Text size="sm" c="blue.7" fw={600}>
                                        기한: {result.do_now.deadline_hint}
                                    </Text>
                                </Group>
                            )}
                            <Text size="sm" c="blue.8" bg="white" p="sm" style={{ borderRadius: 8 }}>
                                💡 {result?.do_now?.why || '문서에 특별한 이유가 명시되지 않았습니다.'}
                            </Text>
                        </Stack>
                    </Card>

                    {/* Details */}
                    <Stack gap="sm">
                        <Text fw={700} c="gray.7" size="sm" ml={4}>상세 내용</Text>
                        {(result?.what_it_is || []).map((item, idx) => (
                            <Card key={idx} radius="md" p="md" withBorder>
                                <Group align="start" gap="sm" wrap="nowrap">
                                    <ThemeIcon size={24} radius="xl" color="gray" variant="light">
                                        <ChevronRight size={14} />
                                    </ThemeIcon>
                                    <Text size="md" c="dark.8" style={{ lineHeight: 1.5 }}>{item}</Text>
                                </Group>
                            </Card>
                        ))}
                    </Stack>

                    {/* Chat History Section (Appears if there are messages) */}
                    {messages.length > 0 && (
                        <Stack gap="md" pt="md" style={{ borderTop: '1px solid #E5E8EB' }}>
                            <Center><Badge variant="dot" color="gray">대화 기록</Badge></Center>
                            {messages.map((msg, idx) => (
                                <Group key={idx} justify={msg.role === 'user' ? 'flex-end' : 'flex-start'} align="flex-start" wrap="nowrap">
                                    {msg.role === 'assistant' && (
                                        <ThemeIcon size={32} radius="xl" color="blue" variant="light" style={{ flexShrink: 0 }}>
                                            <ScanFace size={18} />
                                        </ThemeIcon>
                                    )}
                                    <Paper
                                        p="md"
                                        radius="lg"
                                        bg={msg.role === 'user' ? 'blue.6' : 'white'}
                                        c={msg.role === 'user' ? 'white' : 'dark'}
                                        shadow="xs"
                                        style={{
                                            maxWidth: '80%',
                                            borderBottomRightRadius: msg.role === 'user' ? 4 : undefined,
                                            borderBottomLeftRadius: msg.role === 'assistant' ? 4 : undefined
                                        }}
                                    >
                                        <Stack gap="xs">
                                            <Text size="md" style={{ lineHeight: 1.5, wordBreak: 'keep-all' }}>{msg.text}</Text>
                                            {msg.role === 'assistant' && (
                                                <Group justify="flex-end">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="gray"
                                                        size="sm"
                                                        onClick={() => handleSpeakToggle(msg.text)}
                                                    >
                                                        <Volume2 size={16} />
                                                    </ActionIcon>
                                                </Group>
                                            )}
                                        </Stack>
                                    </Paper>
                                </Group>
                            ))}
                            {isThinking && (
                                <Group justify="flex-start">
                                    <ThemeIcon size={32} radius="xl" color="blue" variant="light">
                                        <ScanFace size={18} />
                                    </ThemeIcon>
                                    <Paper p="sm" px="md" radius="xl" bg="white" withBorder>
                                        <Loader size="xs" color="gray" type="dots" />
                                    </Paper>
                                </Group>
                            )}
                        </Stack>
                    )}
                </Stack>
            </div>

            {/* Bottom Chat Bar */}
            <Paper p="md" shadow="lg" bg="white" style={{ borderTop: '1px solid #eee' }}>
                <Group gap="xs" align="center">
                    {/* Text Input - Now on the left */}
                    <Paper
                        flex={1}
                        radius="xl"
                        bg="gray.0"
                        px="sm"
                        style={{ border: '1px solid #E5E8EB', display: 'flex', alignItems: 'center', height: 46 }}
                    >
                        <TextInput
                            variant="unstyled"
                            w="100%"
                            placeholder="궁금한 점을 물어보세요"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.currentTarget.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            styles={{
                                input: {
                                    fontSize: '1rem',
                                    color: '#191F28',
                                    fontWeight: 500
                                }
                            }}
                        />
                    </Paper>

                    {/* Action Button (Right Side) - Swaps between Voice and Send */}
                    <Button
                        w={50} h={50} radius="xl" p={0}
                        color={isListening ? "red" : "blue"}
                        onClick={inputValue ? () => handleSendMessage() : handleVoiceClick}
                        variant="filled"
                    >
                        {inputValue ? <ChevronRight size={28} /> : (isListening ? <Square size={20} fill="currentColor" /> : <Mic size={24} />)}
                    </Button>
                </Group>
            </Paper>
        </Container>
    );
}
