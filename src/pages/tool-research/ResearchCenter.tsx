import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    BookOpen,
    Library,
    Clock,
    Search,
    Plus,
    AlertTriangle,
    CheckCircle2,
    MoreVertical,
    Timer
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
    getResearchProjects,
    createResearchProject,
    getResearchSources,
    startResearchSession,
    endResearchSession,
    checkPlagiarism,
    getProjectReport,
    saveProjectReport
} from "@/services/research";
import { ResearchProject, ResearchSource } from "@/types/research";
import { useToast } from "@/hooks/use-toast";
import { AcademicBrowser } from "@/components/research/AcademicBrowser";

export default function ResearchCenter() {
    const { user, isHighSchoolStudent } = useAuth();
    const { toast } = useToast();

    const [projects, setProjects] = useState<ResearchProject[]>([]);
    const [selectedProject, setSelectedProject] = useState<ResearchProject | null>(null);
    const [sources, setSources] = useState<ResearchSource[]>([]);

    // Report Draft State
    const [reportContent, setReportContent] = useState("");

    // New Project State
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newSubject, setNewSubject] = useState("");

    // Loading States
    const [loading, setLoading] = useState(true);

    // Timer State
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [timerSeconds, setTimerSeconds] = useState(0);

    // Load Projects
    useEffect(() => {
        if (user) {
            loadProjects();
        }
    }, [user]);

    // Load Report when project provided
    useEffect(() => {
        if (selectedProject) {
            getProjectReport(selectedProject.id).then(setReportContent);
        }
    }, [selectedProject]);

    const loadProjects = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await getResearchProjects(user.id);
            setProjects(data);
            if (data.length > 0 && !selectedProject) {
                setSelectedProject(data[0]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Handle New Project
    const handleCreateProject = async () => {
        if (!user || !newTitle) return;
        try {
            const newProj = await createResearchProject({
                student_id: user.id,
                title: newTitle,
                subject: newSubject,
                status: 'active',
                description: ''
            });

            if (newProj) {
                setProjects([newProj, ...projects]);
                setSelectedProject(newProj);
                setIsCreating(false);
                setNewTitle("");
                toast({ title: "Proyecto creado", description: "Comienza a investigar." });
            }
        } catch (e) {
            toast({ title: "Error", description: "No se pudo crear el proyecto.", variant: "destructive" });
        }
    };

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (activeSessionId) {
            interval = setInterval(() => {
                setTimerSeconds(s => s + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeSessionId]);

    const toggleTimer = async () => {
        if (!selectedProject) return;

        if (activeSessionId) {
            // Stop Timer
            await endResearchSession(activeSessionId, new Date().toISOString(), timerSeconds);
            setActiveSessionId(null);
            setTimerSeconds(0);
            toast({ title: "Sesión Finalizada", description: "Tiempo registrado exitosamente." });
        } else {
            // Start Timer
            try {
                const session = await startResearchSession(selectedProject.id);
                if (session) {
                    setActiveSessionId(session.id);
                    toast({ title: "Investigación Iniciada", description: "El cronómetro está corriendo." });
                }
            } catch {
                // Fallback for demo if backend fails
                setActiveSessionId("demo-session");
            }
        }
    };

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <AppLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Library className="w-8 h-8 text-indigo-500" />
                            Centro de Investigación
                        </h1>
                        <p className="text-muted-foreground">Gestiona tus fuentes, citas y tiempo de estudio.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {activeSessionId && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-full animate-pulse border border-red-200">
                                <Timer className="w-4 h-4" />
                                <span className="font-mono font-bold">{formatTime(timerSeconds)}</span>
                            </div>
                        )}
                        <Button
                            onClick={toggleTimer}
                            variant={activeSessionId ? "destructive" : "default"}
                            className={activeSessionId ? "" : "bg-indigo-600 hover:bg-indigo-700"}
                            disabled={!selectedProject}
                        >
                            {activeSessionId ? "Detener Sesión" : "Iniciar Sesión"}
                        </Button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* Sidebar: Projects List */}
                    <Card className="lg:col-span-1 h-fit">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Mis Proyectos</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setIsCreating(!isCreating)}>
                                    <Plus className="w-5 h-5" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {isCreating && (
                                <div className="p-3 bg-muted rounded-lg space-y-2 mb-2">
                                    <Input
                                        placeholder="Título del proyecto"
                                        className="h-8 text-sm"
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                    />
                                    <Input
                                        placeholder="Materia (ej: Historia)"
                                        className="h-8 text-sm"
                                        value={newSubject}
                                        onChange={e => setNewSubject(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                                        <Button size="sm" onClick={handleCreateProject}>Crear</Button>
                                    </div>
                                </div>
                            )}

                            {projects.length === 0 && !loading && !isCreating && (
                                <p className="text-sm text-muted-foreground text-center py-4">No tienes proyectos activos.</p>
                            )}

                            {projects.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedProject(p)}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${selectedProject?.id === p.id
                                        ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800"
                                        : "hover:bg-accent border-transparent"
                                        }`}
                                >
                                    <h4 className="font-medium truncate">{p.title}</h4>
                                    <p className="text-xs text-muted-foreground">{p.subject || "Sin materia"}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Main Area: Details */}
                    <div className="lg:col-span-3 space-y-6">
                        {selectedProject ? (
                            <>
                                {/* Project Header */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex justify-between">
                                            <div>
                                                <Badge variant="outline" className="mb-2">{selectedProject.status}</Badge>
                                                <CardTitle className="text-2xl">{selectedProject.title}</CardTitle>
                                                <CardDescription>{selectedProject.description || "Sin descripción"}</CardDescription>
                                            </div>
                                            <Button variant="outline">
                                                <AlertTriangle className="w-4 h-4 mr-2" />
                                                Chequear Plagio
                                            </Button>
                                        </div>
                                    </CardHeader>
                                </Card>

                                {/* Tabs with BROWSER TAB ADDED */}
                                <Tabs defaultValue="browser" className="w-full">
                                    <TabsList className="grid w-full grid-cols-4">
                                        <TabsTrigger value="browser">Navegador Nova</TabsTrigger>
                                        <TabsTrigger value="sources">Fuentes</TabsTrigger>
                                        <TabsTrigger value="sessions">Sesiones & Tiempo</TabsTrigger>
                                        <TabsTrigger value="notes">Notas & Boradores</TabsTrigger>
                                    </TabsList>

                                    {/* --- BROWSER TAB CONTENT --- */}
                                    <TabsContent value="browser" className="mt-4">
                                        <AcademicBrowser
                                            projectId={selectedProject.id}
                                            onSourceSaved={() => setSources([...sources])}
                                            initialQuery={selectedProject.subject || selectedProject.title || "Investigación"}
                                            initialReportContent={reportContent}
                                            onSaveReport={(c) => saveProjectReport(selectedProject.id, c)}
                                            studentLevel={isHighSchoolStudent() ? 'highschool' : 'primary'}
                                        />
                                    </TabsContent>

                                    <TabsContent value="sources" className="mt-4">
                                        <Card>
                                            <CardHeader>
                                                <div className="flex justify-between items-center">
                                                    <CardTitle className="text-lg">Fuentes Consultadas</CardTitle>
                                                    <Button size="sm" variant="secondary">
                                                        <Plus className="w-4 h-4 mr-2" /> Agregar Fuente
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-center py-12 text-muted-foreground">
                                                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                    <p>No has registrado fuentes aún.</p>
                                                    <p className="text-sm">Tus fuentes guardadas desde el Navegador aparecerán aquí.</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="sessions" className="mt-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg">Historial de Trabajo</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-center py-12 text-muted-foreground">
                                                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                    <p>Inicia el cronómetro para registrar tu primera sesión.</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="notes" className="mt-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg">Notas Rápidas</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-center py-12 text-muted-foreground">
                                                    <p>Usa el "Navegador Nova" para escribir tu reporte completo.</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                </Tabs>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl p-12">
                                <Search className="w-16 h-16 mb-4 opacity-20" />
                                <h3 className="text-xl font-semibold">Selecciona un Proyecto</h3>
                                <p>O crea uno nuevo para comenzar a investigar.</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </AppLayout>
    );
}

function Badge({ children, variant, className }: any) {
    return <span className={`px-2 py-1 rounded-full text-xs font-medium border ${className} ${variant === 'outline' ? 'border-border' : 'bg-primary text-primary-foreground'}`}>{children}</span>
}
