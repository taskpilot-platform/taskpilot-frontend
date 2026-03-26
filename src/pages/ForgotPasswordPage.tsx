import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/http";
import { authService } from "@/services/auth.service";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const response = await authService.forgotPassword({ email });
      toast.success(response.message || "Đã gửi yêu cầu đặt lại mật khẩu");
      navigate("/reset-password");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Quên mật khẩu"
      description="Nhập email để nhận hướng dẫn đặt lại mật khẩu"
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Quay lại đăng nhập
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu đặt lại mật khẩu"}
        </Button>
      </form>
    </AuthShell>
  );
}
