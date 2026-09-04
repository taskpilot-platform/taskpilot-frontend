import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { projectService } from "@/services/project.service";
import { getApiErrorMessage } from "@/lib/http";
import type { ProjectMember } from "@/types/project";

export function useLeaveProject(projectId: number, projectMembers: ProjectMember[], myUserId: number | null) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLeaveProject = async () => {
    const activeManagers = projectMembers.filter((m) => m.role === "MANAGER");
    const isCurrentUserManager = projectMembers.find((m) => m.userId === myUserId)?.role === "MANAGER";

    if (isCurrentUserManager && activeManagers.length <= 1) {
      toast.error(
        t("projects.leave_error_last_manager", {
          defaultValue:
            "Bạn không thể rời dự án vì bạn là Manager duy nhất còn lại. Vui lòng bổ nhiệm người khác làm Manager trước khi rời.",
        })
      );
      return;
    }

    const confirmed = await confirm({
      title: t("projects.leave_title", { defaultValue: "Rời dự án" }),
      message: t("projects.leave_confirm", { defaultValue: "Are you sure you want to leave this project?" }),
      variant: "warning",
    });
    if (!confirmed) return;

    setIsLeaving(true);
    try {
      await projectService.leaveProject(projectId);
      toast.success(t("projects.leave_success", { defaultValue: "Left project successfully" }));
      navigate("/projects");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsLeaving(false);
    }
  };

  return { isLeaving, handleLeaveProject };
}
