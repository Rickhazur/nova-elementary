import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Layout, PenTool, Languages, Search, BookOpen, Sparkles, ChevronRight, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ResearchReport } from "./ResearchReport";

interface AcademicBrowserProps {
    projectId: string;
    onSourceSaved?: () => void;
    initialQuery?: string;
    initialReportContent?: string;
    onSaveReport?: (content: string) => void;
    studentLevel?: 'primary' | 'highschool';
    grade?: number;
}

const MISSION_TEMPLATES = {
    primary: [
        {
            id: 'def',
            action: { es: "Buscar Definición", en: "Search Definition" },
            prompt: { es: "¿Qué es {topic}?", en: "What is {topic}?" },
            tips: { es: "Busca una frase corta que explique el tema.", en: "Look for a short sentence explaining the topic." }
        },
        {
            id: 'feat',
            action: { es: "Buscar Partes", en: "Search Parts" },
            prompt: { es: "¿Cuáles son las características de {topic}?", en: "What are the main features of {topic}?" },
            tips: { es: "Busca listas o puntos clave.", en: "Look for lists or bullet points." }
        },
        {
            id: 'fun',
            action: { es: "Dato Curioso", en: "Fun Fact" },
            prompt: { es: "Un dato sorprendente sobre {topic}", en: "A surprising fact about {topic}" },
            tips: { es: "Busca palabras como 'Sabías que' o 'Increíble'.", en: "Look for 'Did you know' or 'Amazing'." }
        }
    ]
};

export function AcademicBrowser({
    projectId,
    onSourceSaved,
    initialQuery,
    initialReportContent = "",
    onSaveReport,
    studentLevel = 'primary',
    grade = 1,
}: AcademicBrowserProps) {
    const { toast } = useToast();

    const [topic, setTopic] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchLang, setSearchLang] = useState<'es' | 'en'>('es');

    const [activeStep, setActiveStep] = useState(0);
    const [missionData, setMissionData] = useState<Record<string, string>>({});

    const [showReport, setShowReport] = useState(true);
    const [reportContent, setReportContent] = useState(initialReportContent);

    useEffect(() => {
        setReportContent(initialReportContent);
    }, [initialReportContent]);

    useEffect(() => {
        if (initialQuery && initialQuery.length > 2) {
            setTopic(initialQuery);
            setIsSearching(true);
        }
    }, [initialQuery]);

    const steps = MISSION_TEMPLATES['primary'];

    const handleStartMission = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (topic.trim()) setIsSearching(true);
    };

    const handleStrictSearch = (engine: 'scholar' | 'khan' | 'kiddle' | 'vikidia') => {
        const currentStep = steps[activeStep];
        const queryTerm = topic;

        let url = "";

        if (engine === 'scholar') {
            const q = `${queryTerm} ${searchLang === 'en' ? currentStep.prompt.en : currentStep.prompt.es}`;
            url = `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}&hl=${searchLang}`;
        } else if (engine === 'kiddle') {
            url = `https://www.kiddle.co/s.php?q=${encodeURIComponent(queryTerm)}`;
        } else if (engine === 'vikidia') {
            const langPrefix = searchLang === 'en' ? 'en' : 'es';
            url = `https://${langPrefix}.vikidia.org/wiki/Special:Search?search=${encodeURIComponent(queryTerm)}`;
        } else {
            const langPrefix = searchLang === 'en' ? 'www' : 'es';
            url = `https://${langPrefix}.khanacademy.org/search?page_search_query=${encodeURIComponent(queryTerm)}`;
        }

        window.open(url, '_blank', 'noopener,noreferrer');
        toast({ title: "Abriendo Fuente Segura", description: `Buscando en ${engine} (${searchLang.toUpperCase()})` });
    };

    const handleStepInput = (val: string) => {
        setMissionData(prev => ({ ...prev, [steps[activeStep].id]: val }));
    };

    const nextStep = () => {
        if (activeStep < steps.length - 1) {
            addStepToReport(activeStep);
            setActiveStep(prev => prev + 1);
        } else {
            addStepToReport(activeStep);
            toast({ title: "¡Investigación Completada!", description: "Revisa tu reporte a la derecha." });
        }
    };

    const addStepToReport = (stepIdx: number) => {
        const step = steps[stepIdx];
        const content = missionData[step.id];
        if (!content) return;

        const snippet = `\n### ${step.prompt[searchLang].replace('{topic}', topic)}\n${content}\n`;
        const newReport = reportContent + snippet;
        setReportContent(newReport);
        onSaveReport?.(newReport);
    };

    // Tutoría inteligente dinámica
    const raw = missionData[`${steps[activeStep].id}_raw`] || "";
    const paraphrased = missionData[steps[activeStep].id] || "";
    const isEsp = searchLang === 'es';

    const analyzeText = (text: string) => {
        if (!text.trim()) {
            return {
                teacherKey: isEsp
                    ? "Pega texto para que te ayude a empezar."
                    : "Paste text so I can help you start.",
                starters: isEsp
                    ? ["La célula es como...", "Imagina que es...", "Sirve para..."]
                    : ["It is like a...", "Imagine it is...", "It helps to..."]
            };
        }

        const hasList = text.includes("•") || text.includes("- ") || text.includes("1.") || text.includes(":");
        const hasDates = /\d{4}/.test(text);
        const isLong = text.length > 200;

        let teacherKey = isEsp
            ? "Usa tus propias palabras para explicar esto."
            : "Use your own words to explain this.";

        let starters = isEsp
            ? ["La célula es como...", "Imagina que es...", "Sirve para..."]
            : ["It is like a...", "Imagine it is...", "It helps to..."];

        if (hasList) {
            teacherKey = isEsp
                ? "🔑 Clave: Detecto una lista. Elige solo los 3 puntos más importantes."
                : "🔑 Key: I see a list. Pick only the top 3 points.";
            starters = isEsp
                ? ["Los puntos clave son...", "Tres ideas importantes son...", "En resumen..."]
                : ["The key points are...", "Three important ideas are...", "In summary..."];
        } else if (hasDates) {
            teacherKey = isEsp
                ? "🔑 Clave: ¡Fechas! Crea una línea de tiempo o menciónalas primero."
                : "🔑 Key: Dates! Create a timeline or mention them first.";
            starters = isEsp
                ? ["Las fechas importantes son...", "En la línea de tiempo...", "Primero ocurrió..."]
                : ["The important dates are...", "On the timeline...", "First happened..."];
        } else if (isLong) {
            teacherKey = isEsp
                ? "🔑 Clave: Es mucho texto. Resume la idea principal en una frase."
                : "🔑 Key: Too much text. Summarize the main idea in one sentence.";
            starters = isEsp
                ? ["La idea principal es...", "En pocas palabras...", "Resumiendo..."]
                : ["The main idea is...", "In short...", "To summarize..."];
        }

        return { teacherKey, starters };
    };

    const { teacherKey, starters } = useMemo(() => {
        if (paraphrased.trim().length > 0) {
            return analyzeText(paraphrased);
        }
        return analyzeText(raw);
    }, [raw, paraphrased, isEsp]);

    return (
        <div className="flex gap-4 h-[750px]">
            {/* LEFT: Universal Guide */}
            <div className={`flex flex-col border rounded-xl overflow-hidden bg-slate-50 shadow-sm transition-all duration-300 ${showReport ? 'w-2/3' : 'w-full'}`}>

                {/* 1. TOP BAR */}
                <div className="bg-white p-4 border-b flex items-center gap-4 shadow-sm z-10">
                    <div className="bg-orange-100 p-2 rounded-lg">
                        <Target className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                        <form onSubmit={handleStartMission} className="flex gap-2">
                            <Input
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                placeholder={searchLang === 'es' ? "Tema a investigar..." : "Research topic..."}
                                className="font-semibold text-lg border-transparent focus:border-orange-200 bg-transparent px-0 shadow-none placeholder:font-normal"
                            />
                            {!isSearching && <Button type="submit" className="bg-orange-500 hover:bg-orange-600">Start</Button>}
                        </form>
                    </div>

                    {/* Language Toggler */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-2 text-xs ${searchLang === 'es' ? 'bg-white shadow-sm font-bold' : 'text-slate-500'}`}
                            onClick={() => setSearchLang('es')}
                        >ES</Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-2 text-xs ${searchLang === 'en' ? 'bg-white shadow-sm font-bold' : 'text-slate-500'}`}
                            onClick={() => setSearchLang('en')}
                        >EN</Button>
                    </div>

                    <Button variant="ghost" size="icon" onClick={() => setShowReport(!showReport)}><Layout className="w-4 h-4" /></Button>
                </div>

                {/* 2. MAIN CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {!isSearching ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                            <Languages className="w-16 h-16 mb-4 text-orange-300" />
                            <h2 className="text-2xl font-bold text-slate-700 mb-2">Bilingual Research Guide</h2>
                            <p className="max-w-md">Type a topic and choose English or Spanish. We will guide you through safe sources.</p>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-8">
                            {/* Active Step Card */}
                            <Card className="border-2 border-orange-100 shadow-md ring-4 ring-orange-50/50">
                                <CardHeader className="bg-gradient-to-r from-orange-50 to-white border-b pb-4">
                                    <div className="flex justify-between items-center">
                                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                            {searchLang === 'es' ? `Paso ${activeStep + 1}` : `Step ${activeStep + 1}`}
                                        </Badge>
                                        <div className="flex items-center gap-1 text-orange-600 text-xs font-bold uppercase tracking-wider">
                                            <Bot className="w-4 h-4" />
                                            Active Coach
                                        </div>
                                    </div>
                                    <CardTitle className="text-xl text-slate-800 mt-2">
                                        {steps[activeStep].prompt[searchLang].replace('{topic}', topic)}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="p-6 space-y-6">
                                    {/* STRICT SOURCES - ADAPTED BY LEVEL */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {studentLevel === 'primary' ? (
                                            <>
                                                <Button
                                                    className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 shadow-sm"
                                                    variant="outline"
                                                    onClick={() => handleStrictSearch('kiddle')}
                                                >
                                                    <div className="flex items-center gap-2 font-bold">
                                                        <Search className="w-4 h-4" />
                                                        Kiddle (Buscador)
                                                    </div>
                                                    <span className="text-[10px] opacity-70">Google Visual Seguro</span>
                                                </Button>

                                                <Button
                                                    className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 shadow-sm"
                                                    variant="outline"
                                                    onClick={() => handleStrictSearch('vikidia')}
                                                >
                                                    <div className="flex items-center gap-2 font-bold">
                                                        <BookOpen className="w-4 h-4" />
                                                        Vikidia (Enciclopedia)
                                                    </div>
                                                    <span className="text-[10px] opacity-70">Wikipedia para Niños</span>
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button
                                                    className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                                                    variant="outline"
                                                    onClick={() => handleStrictSearch('scholar')}
                                                >
                                                    <div className="flex items-center gap-2 font-bold">
                                                        <BookOpen className="w-4 h-4" />
                                                        Google Scholar
                                                    </div>
                                                    <span className="text-[10px] opacity-70">Papers & Citas Académicas</span>
                                                </Button>

                                                <Button
                                                    className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-green-50 text-green-700 border border-green-200 shadow-sm"
                                                    variant="outline"
                                                    onClick={() => handleStrictSearch('khan')}
                                                >
                                                    <div className="flex items-center gap-2 font-bold">
                                                        <Sparkles className="w-4 h-4" />
                                                        Khan Academy
                                                    </div>
                                                    <span className="text-[10px] opacity-70">Video Lessons ({searchLang.toUpperCase()})</span>
                                                </Button>
                                            </>
                                        )}
                                    </div>

                                    {/* READING TIPS ( The Guide "Watching" ) */}
                                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex gap-3">
                                        <Languages className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                                        <div>
                                            <h4 className="font-bold text-yellow-800 text-sm mb-1">
                                                {searchLang === 'es' ? "Tips de Lectura" : "Reading Tips"}
                                            </h4>
                                            <p className="text-sm text-yellow-700 leading-snug">
                                                {steps[activeStep].tips[searchLang]}
                                            </p>
                                        </div>
                                    </div>

                                    {/* PARAPHRASING STUDIO & TEACHER */}
                                    <div className="flex flex-col gap-4">
                                        {/* Stage 1: Capture Raw Text */}
                                        <div className="bg-slate-100 p-3 rounded-lg border border-dashed border-slate-300">
                                            <label className="text-xs uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                                                <BookOpen className="w-3 h-3" />
                                                Step 1: Pega aquí lo que encontraste (Copy-Paste)
                                            </label>
                                            <textarea
                                                className="w-full p-2 rounded-md border border-slate-200 text-xs bg-white text-slate-600 min-h-[60px] resize-none focus:ring-1 focus:ring-slate-300"
                                                placeholder="Pega el texto exacto de Kiddle/Vikidia aquí..."
                                                value={raw}
                                                onChange={(e) => setMissionData(prev => ({ ...prev, [`${steps[activeStep].id}_raw`]: e.target.value }))}
                                            />
                                        </div>

                                        {/* Coach & Sentence Starters */}
                                        {raw && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">

                                                {/* TEAM CHAT / VISION ANALYSIS */}
                                                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex gap-3 animate-in fade-in slide-in-from-left-2">
                                                    <div className="bg-indigo-100 p-1 h-fit rounded-full"><Bot className="w-4 h-4 text-indigo-600" /></div>
                                                    <div>
                                                        <p className="text-xs font-bold text-indigo-800 mb-1">
                                                            {isEsp ? "👁️ Análisis de Visión" : "👁️ Vision Analysis"}
                                                        </p>
                                                        <p className="text-xs text-indigo-700 leading-snug font-medium">
                                                            {teacherKey}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* TEACHING TOOLS: Sentence Starters */}
                                                <div className="bg-white border rounded-lg p-3 shadow-sm">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">✨ Ideas para empezar (Sentence Starters)</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {starters.map((starter, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => handleStepInput(starter + " ")}
                                                                className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-100 hover:bg-orange-100 transition-colors"
                                                            >
                                                                {starter}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Stage 2: Paraphrase Input */}
                                        <div className="relative">
                                            <label className="text-sm font-bold text-indigo-700 mb-2 block flex items-center gap-2">
                                                <PenTool className="w-4 h-4" />
                                                Step 2: Tu Reporte (Parafraseado)
                                            </label>
                                            <textarea
                                                className={`w-full min-h-[120px] p-4 rounded-lg border focus:ring-2 transition-all text-base ${missionData[steps[activeStep].id] === raw && missionData[steps[activeStep].id]?.length > 10
                                                    ? "border-red-300 ring-2 ring-red-100 bg-red-50 text-red-900"
                                                    : "border-slate-200 focus:ring-orange-500/20 focus:border-orange-500"
                                                    }`}
                                                placeholder="Escribe aquí..."
                                                value={paraphrased}
                                                onChange={(e) => handleStepInput(e.target.value)}
                                            />

                                            {/* PLAGIARISM WARNING */}
                                            {missionData[steps[activeStep].id] === raw && missionData[steps[activeStep].id]?.length > 10 && (
                                                <div className="absolute bottom-4 right-4 bg-red-100 text-red-700 text-xs px-3 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2 animate-pulse">
                                                    <Layout className="w-4 h-4" />
                                                    ¡Alerta! Eso es copiar. Cambia las palabras.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-slate-50 border-t p-4 flex justify-end">
                                    <Button onClick={nextStep} disabled={!missionData[steps[activeStep].id]} className="bg-orange-600 hover:bg-orange-700">
                                        {activeStep === steps.length - 1
                                            ? (searchLang === 'es' ? "Finalizar" : "Finish")
                                            : (searchLang === 'es' ? "Siguiente" : "Next")}
                                        <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </CardFooter>
                            </Card>

                            {/* Progress */}
                            <div className="flex gap-2 justify-center">
                                {steps.map((s, idx) => (
                                    <div key={idx} className={`h-2 rounded-full transition-all duration-300 ${idx <= activeStep ? "w-8 bg-orange-500" : "w-2 bg-slate-200"}`} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Live Report */}
            {showReport && (
                <div className="w-1/3 min-w-[300px] transition-all duration-300">
                    <ResearchReport
                        projectId={projectId}
                        initialContent={reportContent}
                        onSave={(c) => { setReportContent(c); onSaveReport?.(c); }}
                    />
                </div>
            )}
        </div>
    );
}