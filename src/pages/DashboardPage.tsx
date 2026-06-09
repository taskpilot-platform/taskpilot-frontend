import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeSelector } from "@/components/theme-selector";
import "react-toastify/dist/ReactToastify.css";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { UserProfile, UserSkill } from "@/types/user";
import type { MyProject } from "@/types/project";
import { profileService } from "@/services/profile.service";
import { skillService } from "@/services/skill.service";
import { projectService } from "@/services/project.service";
import { getApiErrorMessage } from "@/lib/http";
import { 
  Briefcase, 
  CheckCircle2, 
  ChevronRight, 
  FolderKanban, 
  Loader2, 
  ShieldCheck, 
  Zap,
  CalendarDays,
  LayoutDashboard
} from "lucide-react";

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);



  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [profileResponse, skillsResponse, projectsResponse] = await Promise.all([
          profileService.getMe(),
          skillService.getMySkills(),
          projectService.getMyProjects(0, 5) // Fetch up to 5 recent projects
        ]);

        setProfile(profileResponse.data);
        setSkills(skillsResponse.data);
        setProjects(projectsResponse.data.content || []);
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const handleShowToast = () => {
    toast.success("Frontend đã kết nối API backend thành công");
  };

  const currentDate = new Date().toLocaleDateString(undefined, { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen space-y-8 p-6 md:p-8 relative max-w-7xl mx-auto">
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-background/50 backdrop-blur-xl flex flex-col items-center justify-center text-muted-foreground transition-all duration-300">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium animate-pulse">{t("dashboard.loading", { defaultValue: "Loading your workspace..." })}</p>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border/50 shadow-sm">
        <div className="absolute inset-0 bg-grid-white/10 dark:bg-grid-black/10 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between p-8 md:p-12 gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 backdrop-blur-md shadow-sm">
              <CalendarDays className="h-4 w-4" />
              {currentDate}
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                {t("dashboard.welcome", { defaultValue: "Welcome back," })} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">{profile?.fullName?.split(' ')[0] || 'User'}!</span>
              </h1>
              <p className="text-lg text-muted-foreground mt-2 max-w-xl">
                {t("dashboard.desc", { defaultValue: "Here's an overview of your active workload and projects. Let's make today productive." })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ThemeSelector />
            <Button onClick={handleShowToast} variant="outline" className="shadow-sm hover:bg-primary hover:text-primary-foreground transition-all">
              <Zap className="h-4 w-4 mr-2" /> {t("dashboard.check_conn_btn", { defaultValue: "Test API" })}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border-border/60 shadow-sm hover:shadow-md transition-all duration-300 group">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <ShieldCheck className="h-5 w-5" />
              </div>
              {t("dashboard.current_user", { defaultValue: "Profile Info" })}
            </CardTitle>
            <CardDescription className="font-mono text-xs">{profile?.email || "-"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t("dashboard.fullname", { defaultValue: "Full Name" })}</p>
            <p className="text-xl font-bold text-foreground">{profile?.fullName || "-"}</p>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border-border/60 shadow-sm hover:shadow-md transition-all duration-300 group">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              {t("dashboard.account_status", { defaultValue: "Account Status" })}
            </CardTitle>
            <CardDescription>{t("dashboard.account_status_desc", { defaultValue: "Your current standing and role" })}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Badge className="px-3 py-1 rounded-md text-sm shadow-sm bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">{profile?.status || "UNKNOWN"}</Badge>
            <Badge variant="secondary" className="px-3 py-1 rounded-md text-sm border-border/50">{profile?.role || "-"}</Badge>
          </CardContent>
        </Card>

        {/* Workload Card */}
        <Card className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border-border/60 shadow-sm hover:shadow-md transition-all duration-300 group">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Briefcase className="h-5 w-5" />
              </div>
              {t("dashboard.workload", { defaultValue: "Active Workload" })}
            </CardTitle>
            <CardDescription>{t("dashboard.workload_desc", { defaultValue: "Tasks currently assigned to you" })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-foreground">{profile?.currentWorkload || 0}</span>
              <span className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Tasks</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* My Projects */}
        <Card className="border-border/60 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FolderKanban className="h-5 w-5 text-primary" /> My Projects
                </CardTitle>
                <CardDescription className="mt-1">Projects you are actively contributing to</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10" onClick={() => navigate('/projects')}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {projects.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                <FolderKanban className="h-10 w-10 mb-3 opacity-20" />
                <p>No active projects found.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>Browse Projects</Button>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {projects.map((project) => (
                  <div key={project.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-sm shrink-0">
                        <LayoutDashboard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer" onClick={() => navigate(`/projects/${project.id}/overview`)}>
                          {project.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground font-mono">PRJ-{project.id}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 border-border/50">{project.myRole}</Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigate(`/projects/${project.id}/board`)}>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Skills */}
        <Card className="border-border/60 shadow-sm flex flex-col">
          <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-amber-500" /> {t("dashboard.my_skills", { defaultValue: "My Skills" })}
                </CardTitle>
                <CardDescription className="mt-1">{t("dashboard.my_skills_desc", { defaultValue: "Your verified technical capabilities" })}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10" onClick={() => navigate('/my-skills')}>
                Manage <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-1">
            {skills.length === 0 ? (
              <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                <Zap className="h-10 w-10 mb-3 opacity-20" />
                <p>{t("dashboard.my_skills_empty", { defaultValue: "No skills configured yet." })}</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/my-skills')}>Add Skills</Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {skills.map((skill) => {
                  const getLevelColor = (level: number) => {
                    if (level >= 8) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                    if (level >= 5) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
                    return "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400";
                  };
                  
                  return (
                    <div key={skill.skillId} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-default ${getLevelColor(skill.level)}`}>
                      <span className="font-semibold text-sm">{skill.name}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40"></span>
                      <span className="text-xs font-bold opacity-80">Lvl {skill.level}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
