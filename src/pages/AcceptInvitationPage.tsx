import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { CheckCircle2, FolderPlus, Loader2, LogIn } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { projectService } from "@/services/project.service";
import { getApiErrorMessage } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AcceptInvitationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const [token, setToken] = useState(searchParams.get("token")?.trim() ?? "");
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      toast.error(t("projects.p2.invite_token_required", { defaultValue: "Invitation token is required." }));
      return;
    }
    setIsAccepting(true);
    try {
      const res = await projectService.acceptInvitation({ token: trimmed });
      toast.success(
        t("projects.p2.invite_accept_success", { defaultValue: "You have joined the project!" }),
      );
      navigate(`/projects/${res.data.projectId}`, { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FolderPlus className="h-6 w-6" />
          </div>
          <CardTitle>
            {t("projects.p2.invite_accept_title", { defaultValue: "Accept Project Invitation" })}
          </CardTitle>
          <CardDescription>
            {t("projects.p2.invite_accept_desc", {
              defaultValue: "Private invitations are bound to your verified email address and can only be accepted once.",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAuthenticated ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                {t("projects.p2.invite_sign_in_required", {
                  defaultValue: "Sign in with the invited verified account to accept this project invitation.",
                })}
              </p>
              <Button
                className="w-full"
                onClick={() =>
                  navigate("/login", {
                    state: { from: `${location.pathname}${location.search}` },
                  })
                }
              >
                <LogIn className="mr-2 h-4 w-4" />
                {t("auth.login_btn", { defaultValue: "Sign In" })}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAccept} className="space-y-4">
              {user?.email && (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {t("projects.p2.invite_signed_in_as", {
                    defaultValue: "Signed in as {{email}}",
                    email: user.email,
                  })}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="invitation-token">
                  {t("projects.p2.invite_token_label", { defaultValue: "Invitation Token" })}
                </Label>
                <Input
                  id="invitation-token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={t("projects.p2.invite_token_placeholder", {
                    defaultValue: "Paste private invitation token",
                  })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isAccepting || !token.trim()}>
                {isAccepting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {t("projects.p2.invite_accept_btn", { defaultValue: "Accept Invitation" })}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
