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

export function mergeById<T extends { id: number; createdAt?: string | null }>(prev: T[], incoming: T[]): T[] {
  const map = new Map<number, T>();
  for (const item of prev) map.set(item.id, item);
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values()).sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA === timeB) return b.id - a.id;
    return timeB - timeA;
  });
}
