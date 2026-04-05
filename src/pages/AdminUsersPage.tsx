import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Key,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  Wrench,
  X
} from "lucide-react";
import { toast } from "react-toastify";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/http";
import { adminUserService } from "@/services/admin.service";
import type { AdminUserResponse } from "@/types/admin";

export default function AdminUsersPage() {
  const { t } = useTranslation();
  
  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [mode, setMode] = useState<"list" | "create" | "detail">("list");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  // Form Create
  const [createEmail, setCreateEmail] = useState("");
  const [createFullName, setCreateFullName] = useState("");
  const [createRole, setCreateRole] = useState("MEMBER");

  // Form Edit
  const [editRole, setEditRole] = useState("MEMBER");
  const [editStatus, setEditStatus] = useState("AVAILABLE");
  const [editWorkload, setEditWorkload] = useState<number>(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalElements / pageSize)), [totalElements, pageSize]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId],
  );

  const filteredUsers = useMemo(() => {
    if (!keyword.trim()) return users;
    const lowerKeyword = keyword.toLowerCase();
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(lowerKeyword) ||
        u.fullName?.toLowerCase().includes(lowerKeyword)
    );
  }, [users, keyword]);

  const loadUsersList = async (targetPage = currentPage, limit = pageSize) => {
    setIsLoading(true);
    try {
      const response = await adminUserService.getAllUsers(targetPage, limit);
      setUsers(response.data.content);
      setTotalElements(response.data.totalElements);
      setCurrentPage(response.data.number);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsersList(0, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedUser) {
      setMode("detail");
      setEditRole(selectedUser.role);
      setEditStatus(selectedUser.status);
      setEditWorkload(selectedUser.currentWorkload || 0);
    }
  }, [selectedUser]);

  const handleModeChange = (newMode: "create" | "list" | "detail") => {
    if (newMode === "list") {
      setSelectedUserId(null); // Clear selection if any
    }
    setMode(newMode);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    void loadUsersList(0, newSize);
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsMutating(true);
    try {
      await adminUserService.createUser({
        email: createEmail.trim(),
        fullName: createFullName.trim(),
        role: createRole,
      });

      toast.success(t("admin.create_success")); // user created
      setCreateEmail("");
      setCreateFullName("");
      setCreateRole("MEMBER");
      setMode("list");
      await loadUsersList(0, pageSize);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateRoleStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUserId) return;

    setIsMutating(true);
    try {
      await adminUserService.updateUser(selectedUserId, {
        role: editRole,
        status: editStatus,
        currentWorkload: editWorkload,
      });
      setMode("list");
      toast.success(t("admin.update_success"));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!selectedUserId) { toast.error(t("admin.detail_empty")); return; }
    setIsMutating(true);
    try {
      await adminUserService.deactivateUser(selectedUserId);
      toast.success(t("admin.deactivate_success"));
      await loadUsersList();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUserId) { toast.error(t("admin.detail_empty")); return; }
    setIsMutating(true);
    try {
      await adminUserService.resetPassword(selectedUserId);
      toast.success(t("admin.reset_pw_success"));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="min-h-screen space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.users_management")}</h1>
          <p className="text-muted-foreground">{t("admin.users_desc")}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="gap-2"
            onClick={() => handleModeChange(mode === "create" ? "list" : "create")}
            disabled={isMutating || isLoading}
          >
            <PlusCircle className="h-4 w-4" />
            {mode === "create" ? t("projects.cancel_btn") : t("admin.add_user")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={() => void loadUsersList(currentPage, pageSize)}
            disabled={isMutating || isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            {t("skills.reload_btn")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Bảng dữ liệu chiếm full (col-span-3) nếu không có mode tạo hay chi tiết, ngược lại co lại còn col-span-2 */}
        <Card className={mode === "list" ? "xl:col-span-3 transition-all duration-300" : "xl:col-span-2 transition-all duration-300"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("admin.users")}
            </CardTitle>
            <CardDescription>
              {t("admin.users.total", { total: totalElements })} {t("admin.page", { page: currentPage + 1, totalPages })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-2">
              <Input
                placeholder={t("admin.users.search")}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="max-w-sm"
              />
              <Button type="button" variant="secondary" size="icon" disabled={isLoading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("dashboard.loading")}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.col_id")}</TableHead>
                      <TableHead>{t("admin.col_email")}</TableHead>
                      <TableHead>{t("admin.col_name")}</TableHead>
                      <TableHead>{t("admin.col_role")}</TableHead>
                      <TableHead>{t("admin.col_status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          {t("skills.no_data")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow
                          key={user.id}
                          className={selectedUserId === user.id ? "bg-accent/40 cursor-pointer" : "cursor-pointer"}
                          onClick={() => {
                            if (selectedUserId === user.id) {
                              handleModeChange("list");
                            } else {
                              setSelectedUserId(user.id);
                            }
                          }}
                        >
                          <TableCell className="font-medium">{user.id}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.fullName}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.status === "AVAILABLE" ? "outline" : "destructive"}>
                              {user.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t("projects.show")}</span>
                    <select
                      className="h-8 rounded-md border bg-background px-2 py-1 text-sm"
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <span>{t("projects.rows")}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadUsersList(Math.max(0, currentPage - 1), pageSize)}
                      disabled={currentPage === 0 || isMutating || isLoading}
                    >
                      {t("projects.btn_prev")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadUsersList(Math.min(totalPages - 1, currentPage + 1), pageSize)}
                      disabled={currentPage >= totalPages - 1 || isMutating || isLoading}
                    >
                      {t("projects.btn_next")}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {mode !== "list" && (
          <div className="space-y-4">
            {mode === "create" && (
              <Card className="animate-in slide-in-from-right-8 duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <div className="flex items-center gap-2">
                      <PlusCircle className="h-4 w-4" />
                      {t("admin.add_user")}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleModeChange("list")} className="h-6 w-6">
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-3" onSubmit={handleCreateUser}>
                    <div className="space-y-1.5">
                      <Label htmlFor="createEmail">{t("admin.email")}</Label>
                      <Input
                        id="createEmail"
                        type="email"
                        value={createEmail}
                        onChange={(event) => setCreateEmail(event.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="createFullName">{t("admin.full_name")}</Label>
                      <Input
                        id="createFullName"
                        value={createFullName}
                        onChange={(event) => setCreateFullName(event.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="createRole">{t("admin.role")}</Label>
                      <select
                        id="createRole"
                        value={createRole}
                        onChange={(event) => setCreateRole(event.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <option value="MEMBER">MEMBER</option>
                        <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>

                    <Button type="submit" className="w-full gap-2" disabled={isMutating}>
                      <PlusCircle className="h-4 w-4" />
                      {t("admin.create_btn")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {mode === "detail" && (
              <Card className="animate-in slide-in-from-right-8 duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      {t("admin.detail_title")}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleModeChange("list")} className="h-6 w-6">
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    {selectedUser ? selectedUser.email : t("admin.detail_empty")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedUser ? (
                    <p className="text-sm text-muted-foreground">{t("projects.detail_empty")}</p>
                  ) : (
                    <div className="space-y-4">
                      <form className="space-y-3" onSubmit={handleUpdateRoleStatus}>
                        <div className="space-y-1.5">
                          <Label htmlFor="editRole">{t("admin.role")}</Label>
                          <select
                            id="editRole"
                            value={editRole}
                            onChange={(event) => setEditRole(event.target.value)}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          >
                            <option value="MEMBER">MEMBER</option>
                            <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="editStatus">{t("admin.status")}</Label>
                          <select
                            id="editStatus"
                            value={editStatus}
                            onChange={(event) => setEditStatus(event.target.value)}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          >
                            <option value="AVAILABLE">AVAILABLE</option>
                            <option value="BUSY">BUSY</option>
                            <option value="DEACTIVATED">DEACTIVATED</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="editWorkload">{t("admin.workload")}</Label>
                          <Input
                            id="editWorkload"
                            type="number"
                            min={0}
                            value={editWorkload}
                            onChange={(event) => setEditWorkload(Number(event.target.value))}
                            required
                          />
                        </div>

                        <Button type="submit" className="w-full gap-2" variant="outline" disabled={isMutating}>
                          <ShieldAlert className="h-4 w-4" />
                          {t("admin.update_btn")}
                        </Button>
                      </form>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="w-full gap-2"
                          variant="secondary"
                          disabled={isMutating}
                          onClick={() => void handleResetPassword()}
                        >
                          <Key className="h-4 w-4" />
                          {t("admin.reset_pw_btn")}
                        </Button>
                        <Button
                          type="button"
                          className="w-full gap-2"
                          variant="destructive"
                          disabled={isMutating || selectedUser.status === "DEACTIVATED"}
                          onClick={() => void handleDeactivateUser()}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("admin.deactivate_btn")}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
