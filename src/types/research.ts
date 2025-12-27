export interface ResearchProject {
    id: string;
    student_id: string;
    title: string;
    description?: string;
    subject?: string;
    deadline?: string;
    status: 'active' | 'completed' | 'archived';
    created_at: string;
    updated_at: string;
}

export interface ResearchSource {
    id: string;
    project_id: string;
    type: 'book' | 'article' | 'website' | 'paper' | 'other';
    title: string;
    author?: string;
    url?: string;
    access_date?: string;
    notes?: string;
    created_at: string;
}

export interface ResearchSession {
    id: string;
    project_id: string;
    start_time: string;
    end_time?: string;
    duration_seconds: number;
    urls_visited?: string[];
    notes?: string;
    created_at: string;
}

export interface PlagiarismCheck {
    id: string;
    project_id: string;
    text_content: string; // Snippet or full text checked
    similarity_score: number; // 0-100
    report_url?: string;
    created_at: string;
}
