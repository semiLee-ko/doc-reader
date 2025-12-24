export interface AnalysisResult {
    doc_type: string;
    one_line: string;
    what_it_is: string[];
    do_now: {
        action: string;
        why: string;
        deadline_hint: string | null;
    };
    warnings?: string[];
}

export interface FileItem {
    type: 'image' | 'pdf';
    url: string; // Base64 or Object URL for preview
    name: string;
}
