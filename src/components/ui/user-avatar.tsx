import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string;
  className?: string;
}

export function UserAvatar({ avatarUrl, name, className }: UserAvatarProps) {
  const initials = name
    ? name
        .split(" ")
        .filter((n) => n.length > 0)
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "U";

  return (
    <Avatar className={cn("h-8 w-8 bg-primary/10", className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name || "User avatar"} className="object-cover" />}
      <AvatarFallback className="text-xs font-medium text-primary bg-primary/10">{initials}</AvatarFallback>
    </Avatar>
  );
}
