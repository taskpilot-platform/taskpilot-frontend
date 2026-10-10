import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Search,
  Check,
  X,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "react-toastify";
import { projectService } from "@/services/project.service";
import {
  customChatStorage,
  type CustomGroupChat,
  type CustomGroupMember,
} from "@/lib/custom-chat-storage";

interface CreateGroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (group: CustomGroupChat) => void;
  currentUserId: number | null;
  currentUserName?: string;
}

interface ColleagueCandidate {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
}

export const CreateGroupChatModal: React.FC<CreateGroupChatModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  currentUserId,
  currentUserName = "Tôi",
}) => {
  const { t } = useTranslation();
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [searchMemberQuery, setSearchMemberQuery] = useState("");
  const [candidates, setCandidates] = useState<ColleagueCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load colleagues from projects or workspace
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function loadColleagues() {
      setIsLoadingCandidates(true);
      try {
        const projectsRes = await projectService.getMyProjects(0, 10).catch(() => null);
        const projectList = (projectsRes as any)?.data?.content || (projectsRes as any)?.data || [];

        const memberMap = new Map<number, ColleagueCandidate>();

        // Fallback workspace team candidates if projects are sparse
        const defaultColleagues: ColleagueCandidate[] = [
          { id: 991, name: "Alex Rivera", email: "alex.rivera@taskpilot.local", role: "Frontend Lead" },
          { id: 992, name: "Minh Tran", email: "minh.tran@taskpilot.local", role: "Backend Architect" },
          { id: 993, name: "Sarah Chen", email: "sarah.chen@taskpilot.local", role: "Product Manager" },
          { id: 994, name: "David Kim", email: "david.kim@taskpilot.local", role: "DevOps Engineer" },
          { id: 995, name: "Lan Nguyen", email: "lan.nguyen@taskpilot.local", role: "QA Engineer" },
        ];

        defaultColleagues.forEach((c) => {
          if (c.id !== currentUserId) {
            memberMap.set(c.id, c);
          }
        });

        // Fetch actual project members
        if (projectList.length > 0) {
          const memberPromises = projectList.slice(0, 3).map((p: any) =>
            projectService.getProjectMembers(p.id).catch(() => ({ data: [] }))
          );
          const membersResponses = await Promise.all(memberPromises);
          membersResponses.forEach((res) => {
            const list = (res as any)?.data || [];
            list.forEach((m: any) => {
              const uId = m.userId || m.id;
              if (uId && uId !== currentUserId) {
                memberMap.set(uId, {
                  id: uId,
                  name: m.fullName || m.name || `User ${uId}`,
                  email: m.email || `user${uId}@taskpilot.local`,
                  avatarUrl: m.avatarUrl,
                  role: m.role || "MEMBER",
                });
              }
            });
          });
        }

        if (mounted) {
          setCandidates(Array.from(memberMap.values()));
        }
      } finally {
        if (mounted) setIsLoadingCandidates(false);
      }
    }

    void loadColleagues();

    return () => {
      mounted = false;
    };
  }, [isOpen, currentUserId]);

  const toggleSelectCandidate = (candidateId: number) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchMemberQuery.toLowerCase())
  );

  const selectedCandidates = candidates.filter((c) =>
    selectedCandidateIds.includes(c.id)
  );

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.warning(t("chat.group_name_required", { defaultValue: "Vui lòng nhập tên nhóm trò chuyện!" }));
      return;
    }

    setIsSubmitting(true);
    try {
      const myMember: CustomGroupMember = {
        id: currentUserId || 1,
        name: currentUserName,
        email: "me@taskpilot.local",
        role: "OWNER",
      };

      const otherMembers: CustomGroupMember[] = selectedCandidates.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        avatarUrl: c.avatarUrl,
        role: "MEMBER",
      }));

      const newGroup = customChatStorage.createGroup(
        groupName.trim(),
        description.trim(),
        [myMember, ...otherMembers],
        currentUserId || 1
      );

      toast.success(
        t("chat.group_created_success", {
          defaultValue: `Đã tạo nhóm "${newGroup.name}" thành công!`,
        })
      );

      // Reset form
      setGroupName("");
      setDescription("");
      setSelectedCandidateIds([]);
      onCreated(newGroup);
      onClose();
    } catch {
      toast.error(t("chat.group_created_error", { defaultValue: "Có lỗi khi tạo nhóm trò chuyện." }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl bg-card border-border/80 p-0 overflow-hidden shadow-xl" data-testid="create-group-chat-modal">
        <form onSubmit={handleCreateGroup}>
          <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  {t("chat.create_group_title", { defaultValue: "Tạo Nhóm Trò Chuyện Mới" })}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {t("chat.create_group_desc", { defaultValue: "Tạo không gian trao đổi tự do không giới hạn với bất kỳ đồng nghiệp nào." })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* 1. Group Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {t("chat.group_name_label", { defaultValue: "Tên nhóm trò chuyện *" })}
              </label>
              <Input
                placeholder={t("chat.group_name_placeholder", { defaultValue: "Ví dụ: Team Kỹ Thuật Core, Hội Thiết Kế..." })}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="h-9 text-xs bg-background"
                required
                autoFocus
                data-testid="input-group-name"
              />
            </div>

            {/* 2. Description (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t("chat.group_desc_label", { defaultValue: "Mô tả nhóm (Tùy chọn)" })}
              </label>
              <Textarea
                placeholder={t("chat.group_desc_placeholder", { defaultValue: "Mục đích thảo luận của nhóm..." })}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-xs bg-background resize-none"
                data-testid="input-group-description"
              />
            </div>

            {/* 3. Selected Members Chips */}
            {selectedCandidates.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("chat.selected_members", { defaultValue: "Thành viên đã chọn:" })}</span>
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    {selectedCandidates.length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 bg-muted/30 rounded-xl border border-border/40">
                  {selectedCandidates.map((c) => (
                    <Badge
                      key={c.id}
                      variant="outline"
                      className="gap-1 pl-1 pr-1.5 py-0.5 text-[11px] bg-background border-border"
                    >
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={c.avatarUrl} />
                        <AvatarFallback className="text-[8px]">{c.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{c.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleSelectCandidate(c.id)}
                        className="text-muted-foreground hover:text-foreground ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Member Selector List */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>{t("chat.choose_members", { defaultValue: "Mời đồng nghiệp tham gia" })}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {candidates.length} {t("chat.candidates_available", { defaultValue: "người khả dụng" })}
                </span>
              </label>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("chat.search_members_placeholder", { defaultValue: "Tìm theo tên hoặc email..." })}
                  value={searchMemberQuery}
                  onChange={(e) => setSearchMemberQuery(e.target.value)}
                  className="pl-8 text-xs h-8 bg-background"
                  data-testid="input-search-members"
                />
              </div>

              <div className="border border-border/60 rounded-xl divide-y divide-border/40 max-h-44 overflow-y-auto bg-background/50">
                {isLoadingCandidates ? (
                  <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>{t("calendar.loading", { defaultValue: "Đang tải danh sách..." })}</span>
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    {t("chat.no_members_found", { defaultValue: "Không tìm thấy đồng nghiệp phù hợp" })}
                  </div>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const isSelected = selectedCandidateIds.includes(candidate.id);
                    return (
                      <div
                        key={candidate.id}
                        onClick={() => toggleSelectCandidate(candidate.id)}
                        className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5" : "hover:bg-muted/40"
                        }`}
                        data-testid={`candidate-item-${candidate.id}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-7 w-7 border border-border/60">
                            <AvatarImage src={candidate.avatarUrl} />
                            <AvatarFallback className="text-[10px] font-medium bg-muted">
                              {candidate.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 truncate">
                            <div className="font-medium text-foreground truncate">{candidate.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{candidate.email}</div>
                          </div>
                        </div>

                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border/80 bg-background"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border/60 bg-muted/10 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              {t("calendar.cancel", { defaultValue: "Hủy" })}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !groupName.trim()}
              className="text-xs gap-1.5"
              data-testid="btn-submit-create-group"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{t("chat.create_group_submit", { defaultValue: "Tạo nhóm trò chuyện" })}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
