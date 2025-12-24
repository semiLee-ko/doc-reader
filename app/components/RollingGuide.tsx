'use client';

import { useState, useEffect } from 'react';
import { Group, Center, Text, rem, Transition } from '@mantine/core';
import { FileText, Pill, Mail, Landmark } from 'lucide-react';

const GUIDES = [
    { Icon: FileText, text: "복잡한 세금 고지서, 얼마 내야 하지?" },
    { Icon: Pill, text: "이 약은 언제 먹는 거더라?" },
    { Icon: Mail, text: "주민센터 등기, 무슨 내용이지?" },
    { Icon: Landmark, text: "은행 서류, 어디에 서명해야 돼?" },
];

export default function RollingGuide() {
    const [index, setIndex] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setVisible(false);
            setTimeout(() => {
                setIndex((prev) => (prev + 1) % GUIDES.length);
                setVisible(true);
            }, 400); // Wait for exit animation
        }, 3000); // Change every 3 seconds

        return () => clearInterval(interval);
    }, []);

    const { Icon, text } = GUIDES[index];

    return (
        <div style={{ height: '60px', overflow: 'hidden', position: 'relative', width: '100%' }}>
            <Transition mounted={visible} transition="slide-up" duration={400} timingFunction="ease">
                {(styles) => (
                    <div style={styles}>
                        <Group align="center" gap="lg" wrap="nowrap" h={60}>
                            <Center
                                w={56}
                                h={56}
                                bg="blue.0"
                                style={{ borderRadius: '16px', flexShrink: 0 }}
                            >
                                <Icon size={30} color="var(--mantine-color-blue-6)" strokeWidth={2} />
                            </Center>
                            <Text c="#333D4B" fw={600} style={{ lineHeight: 1.3, fontSize: rem(17) }}>
                                {text}
                            </Text>
                        </Group>
                    </div>
                )}
            </Transition>
        </div>
    );
}
