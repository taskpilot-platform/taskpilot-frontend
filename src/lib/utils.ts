import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    
    const pad = base64.length % 4;
    const paddedBase64 = pad ? base64 + "=".repeat(4 - pad) : base64;
    
    const decoded = JSON.parse(atob(paddedBase64));
    
    if (decoded.exp) {
      // Token is valid if current time is less than expiration time
      return decoded.exp * 1000 > Date.now();
    }
    return true;
  } catch (e) {
    return false;
  }
}
