'use client';

import { Container, Title, Text, Button, Stack, ThemeIcon, Paper, rem, Modal, Image, Loader, Badge, ActionIcon, Alert, Center, Group } from '@mantine/core';
import { Camera, Image as ImageIcon, ScanFace, X, Sparkles, Plus, AlertCircle, Bot } from 'lucide-react';
import { useState, useRef } from 'react';
import { useDisclosure } from '@mantine/hooks';
import dynamic from 'next/dynamic';

import RollingGuide from './components/RollingGuide';
import ResultView from './components/ResultView';
import ZoomModal from './components/ZoomModal';
import ScanningLoader from './components/ScanningLoader';
import { AnalysisResult, FileItem } from './types';
import { extractTextFromFiles } from '@/lib/ocr';
import { summarizeText, initEngine } from '@/lib/llm';
import { Progress } from '@mantine/core';

// PDF Preview is still used in the thumbnail list
const PdfPreview = dynamic(() => import('./components/PdfPreview'), { ssr: false });

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [pdfPageCounts, setPdfPageCounts] = useState<Record<string, number>>({}); // Track pages per PDF
  const [zoomedFile, setZoomedFile] = useState<FileItem | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [llmProgress, setLlmProgress] = useState<number | null>(null);
  const [statusText, setStatusText] = useState('');

  // Results Modal
  const [resultOpened, { open: openResult, close: closeResult }] = useDisclosure(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);

  // Calculate total pages (Images = 1, PDFs = actual pages or 1 if loading)
  const totalPageCount = selectedFiles.reduce((acc, file) => {
    if (file.type === 'pdf') {
      return acc + (pdfPageCounts[file.url] || 1);
    }
    return acc + 1;
  }, 0);

  const isPageLimitExceeded = false; // Always false for testing

  const handlePdfLoad = (fileUrl: string, pageCount: number) => {
    setPdfPageCounts(prev => ({
      ...prev,
      [fileUrl]: pageCount
    }));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (selectedFiles.length + files.length > 5) {
      alert(`최대 5장까지만 선택할 수 있어요.\n(현재: ${selectedFiles.length}장, 추가 시도: ${files.length}장)`);
      event.target.value = '';
      return;
    }

    const newFiles: FileItem[] = [];

    // Simple Promise-based file reading
    const readFile = (file: File): Promise<FileItem> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            type: file.type.includes('pdf') ? 'pdf' : 'image',
            url: e.target?.result as string,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      });
    };

    for (let i = 0; i < files.length; i++) {
      newFiles.push(await readFile(files[i]));
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    event.target.value = '';
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setAnalysisResult(null);
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) return;

    setIsAnalyzing(true);
    try {
      // 1. OCR Step
      setStatusText('문서에서 글자를 읽고 있어요...');
      const extractedText = await extractTextFromFiles(selectedFiles);

      if (!extractedText.trim()) {
        throw new Error('문서에서 텍스트를 추출하지 못했습니다.');
      }

      // 2. LLM Initialization Step (Gemma 2)
      setStatusText('AI 모델 불러오는 중.');
      await initEngine((progress) => {
        setLlmProgress(progress * 100);
      });

      // 3. Summarization Step
      setStatusText('AI가 내용을 분석하고 있어요...');
      const result = await summarizeText(extractedText);

      setAnalysisResult(result);
      openResult();
    } catch (error: any) {
      console.error(error);
      alert(error.message || '분석에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsAnalyzing(false);
      setLlmProgress(null);
      setStatusText('');
    }
  };

  return (
    <Container size="xs" p={0} h="100vh" bg="#F2F4F6">
      <Stack h="100%" gap={0}>

        {/* Hidden Inputs */}
        <input
          type="file"
          accept="image/*, application/pdf"
          capture="environment"
          ref={cameraInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <input
          type="file"
          accept="image/*, application/pdf"
          multiple
          ref={albumInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />


        {/* Header Logo */}
        <Center pt="xl" pb="xs">
          <Group gap={8} align="center">
            <ThemeIcon variant="light" radius="md" size="lg" color="blue">
              <Bot size={22} strokeWidth={2} />
            </ThemeIcon>
            <Text fw={900} size="xl" c="blue.9" style={{ letterSpacing: -1 }}>우리집비서</Text>
          </Group>
        </Center>

        {/* Top Content Area */}
        <Stack p="lg" gap="xl" align="center" justify="center" style={{ flex: 1, minHeight: 0 }}>

          {selectedFiles.length > 0 ? (
            /* Files Preview Mode */
            <Stack align="center" gap="md" w="100%" style={{ flex: 1, justifyContent: 'center' }}>

              {/* Scrollable Container for multiple files */}
              <div style={{
                display: 'flex',
                gap: '12px',
                overflowX: 'auto',
                width: '100%',
                padding: '8px 4px',
                whiteSpace: 'nowrap',
                justifyContent: 'flex-start'
              }}>
                {selectedFiles.map((file, idx) => (
                  <Paper
                    key={idx}
                    p={0}
                    radius="lg"
                    bg="white"
                    shadow="md"
                    w="220px"
                    h="300px"
                    onClick={() => setZoomedFile(file)}
                    style={{
                      flexShrink: 0,
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      maxHeight: '60vh',
                      cursor: 'pointer',
                      border: '1px solid #eee'
                    }}
                  >
                    {/* Delete Button */}
                    {!isAnalyzing && (
                      <ActionIcon
                        variant="filled"
                        color="gray"
                        radius="xl"
                        size="sm"
                        style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(idx);
                        }}
                      >
                        <X size={14} />
                      </ActionIcon>
                    )}

                    {file.type === 'pdf' ? (
                      <>
                        <PdfPreview
                          fileUrl={file.url}
                          width={220}
                          onLoad={(count) => handlePdfLoad(file.url, count)}
                        />
                        {pdfPageCounts[file.url] && (
                          <Badge
                            color="dark"
                            size="sm"
                            variant="filled"
                            style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 10 }}
                          >
                            {pdfPageCounts[file.url]}쪽
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Image
                        src={file.url}
                        radius="md"
                        fit="contain"
                        w="100%"
                        style={{ maxHeight: '100%', objectFit: 'contain' }}
                      />
                    )}
                  </Paper>
                ))}

                {/* Add Button (If < 5 files AND page limit not exceeded) */}
                {selectedFiles.length < 5 && !isAnalyzing && !isPageLimitExceeded && (
                  <Paper
                    p={0}
                    radius="lg"
                    bg="gray.1"
                    w="100px"
                    h="300px"
                    onClick={() => albumInputRef.current?.click()}
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: '2px dashed #CFD4DA'
                    }}
                  >
                    <Plus size={32} color="#868E96" />
                    <Text size="sm" fw={600} c="gray.6" mt="xs">추가</Text>
                  </Paper>
                )}
              </div>

              {!isAnalyzing && (
                <Stack gap={4} align="center">
                  <Text c={isPageLimitExceeded ? "red" : "gray.6"} size="sm" fw={500}>
                    총 {totalPageCount}/5쪽 (파일 {selectedFiles.length}개)
                  </Text>
                  {isPageLimitExceeded && (
                    <Alert variant="light" color="red" title="페이지 수 초과" icon={<AlertCircle size={16} />}>
                      총 5쪽까지만 분석할 수 있어요.<br />불필요한 파일을 삭제해주세요.
                    </Alert>
                  )}
                </Stack>
              )}
            </Stack>
          ) : (
            /* Default Mode */
            <>
              <Stack align="center" gap="sm" style={{ flexShrink: 1 }}>
                <ThemeIcon
                  variant="light"
                  size={100}
                  radius={100}
                  color="blue"
                  style={{ border: '1px solid var(--mantine-color-blue-1)' }}
                >
                  <ScanFace size={50} strokeWidth={1.5} />
                </ThemeIcon>

                <Stack gap={4} align="center" style={{ textAlign: 'center' }}>
                  <Title order={1} size={rem(26)} c="#191F28" fw={700} style={{ lineHeight: 1.3 }}>
                    읽기 힘든 문서,<br />
                    제가 도와드릴게요
                  </Title>
                  <Text size="md" c="#8B95A1" style={{ whiteSpace: 'pre-wrap' }}>
                    {"관공서 안내문, 청구서, 약봉투 등\n무엇이든 찍어만 주세요."}
                  </Text>
                </Stack>
              </Stack>

              <Paper
                p="lg"
                radius="xl"
                bg="white"
                w="calc(100% - 16px)" // Minimal margins (8px per side)
                mx="auto"
                shadow="sm"
                withBorder
                style={{ borderColor: '#E5E8EB', flexShrink: 0 }}
              >
                <Stack gap="md">
                  <Text size="md" fw={700} c="#333D4B">이렇게 활용해 보세요</Text>
                  <RollingGuide />
                </Stack>
              </Paper>
            </>
          )}

        </Stack>

        {/* Bottom Actions Fixed Area */}
        <Paper
          p="lg"
          pb="xl"
          radius="tl-xl tr-xl"
          bg="white"
          shadow="lg"
          style={{
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
            flexShrink: 0
          }}
        >
          {selectedFiles.length > 0 ? (
            /* Action Buttons for Preview Mode */
            <Stack gap="sm">
              <Button
                fullWidth
                size="xl"
                h={62}
                radius="xl"
                color="blue"
                leftSection={isAnalyzing ? undefined : <Sparkles size={24} strokeWidth={2} />}
                onClick={handleAnalyze}
                loading={isAnalyzing}
                disabled={selectedFiles.length === 0 || isAnalyzing || isPageLimitExceeded}
                styles={{
                  root: {
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    background: (isAnalyzing || isPageLimitExceeded) ? '#f1f3f5' : 'var(--mantine-color-blue-6)',
                    color: (isAnalyzing || isPageLimitExceeded) ? '#adb5bd' : 'white',
                  }
                }}
              >
                {isAnalyzing ? '문서를 읽고 있어요...' : '이대로 분석하기'}
              </Button>
              <Button
                fullWidth
                variant="subtle"
                size="lg"
                h={50}
                radius="xl"
                c="red.6"
                leftSection={<X size={22} />}
                onClick={clearFiles}
                disabled={isAnalyzing}
                styles={{ root: { fontSize: '1.05rem', fontWeight: 600 } }}
              >
                새로 선택하기
              </Button>
            </Stack>
          ) : (
            /* Default Buttons */
            <Stack gap="sm">
              <Button
                fullWidth
                size="xl"
                h={62}
                radius="xl"
                color="blue"
                leftSection={<Camera size={26} strokeWidth={2} />}
                styles={{
                  root: { fontSize: '1.25rem', fontWeight: 700 },
                  section: { marginRight: 12 }
                }}
                onClick={() => cameraInputRef.current?.click()}
              >
                카메라로 찍기
              </Button>

              <Button
                fullWidth
                variant="subtle"
                size="lg"
                h={50}
                radius="xl"
                c="#4E5968"
                leftSection={<ImageIcon size={22} />}
                styles={{
                  root: { fontSize: '1.05rem', fontWeight: 600 }
                }}
                onClick={() => albumInputRef.current?.click()}
              >
                앨범에서 불러오기
              </Button>
            </Stack>
          )}
        </Paper>

        {/* Full Screen Loading Overlay */}
        {isAnalyzing && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Stack align="center" gap="md" w="100%" px="xl">
              <ScanningLoader />
              <Text fw={700} size="lg" c="blue.9">{statusText}</Text>
              {llmProgress !== null && (
                <Stack gap={4} w="100%" maw={300}>
                  <Progress value={llmProgress} animated color="blue" size="lg" radius="xl" />
                  <Text size="xs" c="gray.6" ta="center">AI 모델 불러오는 중: {Math.round(llmProgress)}%</Text>
                  <Text size="xs" c="gray.5" ta="center" mt={4}>* 처음 한 번만 다운로드하며, 이후에는 캐시에서 불러옵니다.</Text>
                </Stack>
              )}
            </Stack>
          </div>
        )}

        {/* Result Modal - Using extracted component */}
        <Modal
          opened={resultOpened}
          onClose={closeResult}
          fullScreen
          transitionProps={{ transition: 'slide-up' }}
          padding={0}
          withCloseButton={false}
        >
          {analysisResult && <ResultView result={analysisResult} onClose={closeResult} />}
        </Modal>

        {/* Zoom Modal - Using extracted component */}
        <ZoomModal
          zoomedFile={zoomedFile}
          onClose={() => setZoomedFile(null)}
        />

      </Stack>
    </Container>
  );
}
