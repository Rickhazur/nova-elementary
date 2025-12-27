import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Shield, Globe, Loader2, BookOpen, Eye, EyeOff, Gift, Users } from "lucide-react";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AccountType = "student" | "guardian";
type EducationLevel = "PRIMARY" | "HIGHSCHOOL";

const authSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
  accountType: z.enum(["student", "guardian"]).optional(),
  educationLevel: z.enum(["PRIMARY", "HIGHSCHOOL"]).optional(),
});

interface SelectedPlan {
  id: 'BASIC' | 'PRO' | 'ELITE';
  tokenAllowance: number;
  trialTokens: number;
}

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, role, profile, signIn, signUp, loading } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState<AppRole>("student");
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [isSignUp, setIsSignUp] = useState(searchParams.get('signup') === 'true');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] = useState<AccountType | "">("");
  const [educationLevel, setEducationLevel] = useState<EducationLevel | "">("");
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string; 
    fullName?: string;
    accountType?: string;
    educationLevel?: string;
  }>({});

  const t = {
    es: {
      title: "Nova Schola",
      subtitle: "Academia IA",
      student: "Estudiante",
      admin: "Administrativo",
      login: "Iniciar Sesión",
      signup: "Crear Cuenta",
      email: "Correo electrónico",
      password: "Contraseña",
      fullName: "Nombre completo",
      noAccount: "¿No tienes cuenta?",
      hasAccount: "¿Ya tienes cuenta?",
      createAccount: "Crear cuenta",
      loginHere: "Inicia sesión",
      welcome: "Bienvenido de vuelta",
      createNew: "Crea tu cuenta",
      studentDesc: "Accede a tu tutoría personalizada",
      adminDesc: "Panel de control y reportes",
      guardianDesc: "Gestiona el progreso de tus hijos",
      loginSuccess: "Sesión iniciada",
      signupSuccess: "Cuenta creada exitosamente",
      error: "Error",
      accountType: "Tipo de cuenta",
      studentAccount: "Estudiante",
      guardianAccount: "Acudiente (Padre/Madre)",
      educationLevel: "Nivel educativo",
      primary: "Primaria",
      highschool: "Bachillerato",
      selectAccountType: "Selecciona el tipo de cuenta",
      selectEducationLevel: "Selecciona el nivel educativo",
      accountTypeRequired: "Debes seleccionar un tipo de cuenta",
      educationLevelRequired: "Debes seleccionar el nivel educativo",
    },
    en: {
      title: "Nova Schola",
      subtitle: "AI Academy",
      student: "Student",
      admin: "Administrative",
      login: "Log In",
      signup: "Sign Up",
      email: "Email address",
      password: "Password",
      fullName: "Full name",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      createAccount: "Create account",
      loginHere: "Log in",
      welcome: "Welcome back",
      createNew: "Create your account",
      studentDesc: "Access your personalized tutoring",
      adminDesc: "Control panel and reports",
      guardianDesc: "Manage your children's progress",
      loginSuccess: "Logged in successfully",
      signupSuccess: "Account created successfully",
      error: "Error",
      accountType: "Account type",
      studentAccount: "Student",
      guardianAccount: "Guardian (Parent)",
      educationLevel: "Education level",
      primary: "Primary",
      highschool: "High School",
      selectAccountType: "Select account type",
      selectEducationLevel: "Select education level",
      accountTypeRequired: "You must select an account type",
      educationLevelRequired: "You must select an education level",
    },
  };

  const text = t[language];

  // Load selected plan from localStorage (if coming from select-plan page)
  useEffect(() => {
    const storedPlan = localStorage.getItem('selectedPlan');
    if (storedPlan) {
      try {
        setSelectedPlan(JSON.parse(storedPlan));
      } catch (e) {
        console.error('Error parsing stored plan:', e);
      }
    }
  }, []);

  // Apply selected plan after successful signup with trial fields
  const applySelectedPlan = async (userId: string) => {
    if (!selectedPlan) return;
    
    try {
      // Wait a moment for the profile to be created by the trigger
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 3);
      
      const { error } = await supabase
        .from('student_profiles')
        .update({
          plan: selectedPlan.id,
          token_allowance: selectedPlan.trialTokens, // Use trial limit (10/day)
          tokens_used_this_month: 0,
          token_reset_date: new Date().toISOString().split('T')[0],
          is_trial_active: true,
          trial_ends_at: trialEndsAt.toISOString(),
          is_paid: false,
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error applying plan:', error);
      } else {
        // Clear stored plan
        localStorage.removeItem('selectedPlan');
      }
    } catch (err) {
      console.error('Error applying selected plan:', err);
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && role) {
      if (role === "admin") {
        navigate("/app/panel-control");
      } else if (role === "guardian") {
        navigate("/guardian/my-students");
      } else if (role === "student") {
        // If we have a selected plan, apply it first
        if (selectedPlan) {
          applySelectedPlan(user.id).then(() => {
            navigate("/app/onboarding");
          });
        } else if (profile?.onboarding_completed) {
          navigate("/app/dashboard");
        } else {
          navigate("/app/onboarding");
        }
      }
    }
  }, [user, role, profile, loading, navigate, selectedPlan]);

  // Reset education level when account type changes
  useEffect(() => {
    if (accountType !== "student") {
      setEducationLevel("");
    }
  }, [accountType]);

  const validateForm = () => {
    const fieldErrors: typeof errors = {};
    
    try {
      authSchema.parse({
        email,
        password,
        fullName: isSignUp ? fullName : undefined,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof typeof fieldErrors] = err.message;
          }
        });
      }
    }

    // Custom validation for signup
    if (isSignUp && selectedRole === "student") {
      if (!accountType) {
        fieldErrors.accountType = text.accountTypeRequired;
      }
      if (accountType === "student" && !educationLevel) {
        fieldErrors.educationLevel = text.educationLevelRequired;
      }
    }

    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      if (isSignUp) {
        // Determine the role based on account type selection
        const roleToUse: AppRole = selectedRole === "student" 
          ? (accountType === "guardian" ? "guardian" : "student")
          : "admin";
        
        // Convert education level to grade level for database
        const gradeLevel = educationLevel === "PRIMARY" ? 5 : educationLevel === "HIGHSCHOOL" ? 9 : undefined;
        
        const { error } = await signUp(email, password, roleToUse, fullName, language, gradeLevel);
        if (error) {
          toast({
            title: text.error,
            description: error.message,
            variant: "destructive",
          });
        } else {
          const description = roleToUse === "guardian" 
            ? text.guardianDesc 
            : roleToUse === "student" 
              ? text.studentDesc 
              : text.adminDesc;
          toast({
            title: text.signupSuccess,
            description,
          });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: text.error,
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: text.loginSuccess,
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-background to-secondary/20 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-secondary">
              <BookOpen className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-4">{text.title}</h1>
          <p className="text-xl text-muted-foreground">{text.subtitle}</p>
          <div className="mt-12 grid grid-cols-2 gap-6 max-w-md mx-auto">
            <div className="p-4 rounded-xl bg-card/50 backdrop-blur border border-border/50">
              <div className="text-3xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground">Estudiantes</div>
            </div>
            <div className="p-4 rounded-xl bg-card/50 backdrop-blur border border-border/50">
              <div className="text-3xl font-bold text-secondary">95%</div>
              <div className="text-sm text-muted-foreground">Mejora</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Language toggle */}
          <div className="flex justify-end mb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === "es" ? "en" : "es")}
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              {language === "es" ? "English" : "Español"}
            </Button>
          </div>

          {/* Logo for mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">{text.title}</h1>
            </div>
            <p className="text-muted-foreground">{text.subtitle}</p>
          </div>

          {/* Selected Plan Badge */}
          {selectedPlan && isSignUp && (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Gift className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Plan {selectedPlan.id} seleccionado
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3 días de prueba gratis • 10 mensajes/día
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Role tabs */}
          <Tabs value={selectedRole} onValueChange={(v) => {
            setSelectedRole(v as AppRole);
            // Reset account type when switching tabs
            if (v === "admin") {
              setAccountType("");
              setEducationLevel("");
            }
          }} className="mb-8">
            <TabsList className="grid w-full grid-cols-2 h-14">
              <TabsTrigger value="student" className="gap-2 text-base">
                <GraduationCap className="h-5 w-5" />
                {text.student}
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-2 text-base">
                <Shield className="h-5 w-5" />
                {text.admin}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Form */}
          <div className="bg-card rounded-2xl border border-border p-8">
            <h2 className="text-2xl font-bold mb-2">
              {isSignUp ? text.createNew : text.welcome}
            </h2>
            <p className="text-muted-foreground mb-6">
              {selectedRole === "student" 
                ? (accountType === "guardian" ? text.guardianDesc : text.studentDesc) 
                : text.adminDesc}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">{text.fullName}</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={errors.fullName ? "border-destructive" : ""}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>
              )}

              {/* Account Type Selection - Only show for signup in student tab */}
              {isSignUp && selectedRole === "student" && (
                <div className="space-y-3">
                  <Label>{text.accountType} <span className="text-destructive">*</span></Label>
                  <RadioGroup
                    value={accountType}
                    onValueChange={(value) => setAccountType(value as AccountType)}
                    className="grid grid-cols-1 gap-3"
                  >
                    <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      accountType === "student" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}>
                      <RadioGroupItem value="student" id="account-student" />
                      <Label htmlFor="account-student" className="flex items-center gap-3 cursor-pointer flex-1">
                        <span className="text-2xl">👤</span>
                        <div>
                          <p className="font-medium">{text.studentAccount}</p>
                          <p className="text-sm text-muted-foreground">{text.studentDesc}</p>
                        </div>
                      </Label>
                    </div>
                    <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      accountType === "guardian" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}>
                      <RadioGroupItem value="guardian" id="account-guardian" />
                      <Label htmlFor="account-guardian" className="flex items-center gap-3 cursor-pointer flex-1">
                        <span className="text-2xl">👨‍👩‍👧</span>
                        <div>
                          <p className="font-medium">{text.guardianAccount}</p>
                          <p className="text-sm text-muted-foreground">{text.guardianDesc}</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                  {errors.accountType && (
                    <p className="text-sm text-destructive">{errors.accountType}</p>
                  )}
                </div>
              )}

              {/* Education Level - Only show when account type is student */}
              {isSignUp && selectedRole === "student" && accountType === "student" && (
                <div className="space-y-2">
                  <Label htmlFor="educationLevel">{text.educationLevel} <span className="text-destructive">*</span></Label>
                  <Select
                    value={educationLevel}
                    onValueChange={(value) => setEducationLevel(value as EducationLevel)}
                  >
                    <SelectTrigger className={errors.educationLevel ? "border-destructive" : ""}>
                      <SelectValue placeholder={text.selectEducationLevel} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRIMARY">
                        <div className="flex items-center gap-2">
                          <span>📚</span>
                          {text.primary}
                        </div>
                      </SelectItem>
                      <SelectItem value="HIGHSCHOOL">
                        <div className="flex items-center gap-2">
                          <span>🎓</span>
                          {text.highschool}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.educationLevel && (
                    <p className="text-sm text-destructive">{errors.educationLevel}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{text.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{text.password}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? "border-destructive pr-10" : "pr-10"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base"
                variant="orange"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isSignUp ? (
                  text.signup
                ) : (
                  text.login
                )}
              </Button>
            </form>

            {!isSignUp && (
              <div className="text-center mt-4">
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {isSignUp ? text.hasAccount : text.noAccount}{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary hover:underline font-medium"
                >
                  {isSignUp ? text.loginHere : text.createAccount}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
