const utf8Encoder = new TextEncoder();

export const PASSWORD_MIN_CODE_POINTS = 8;
export const PASSWORD_MAX_UTF8_BYTES = 72;

export type PasswordValidationError = "too_short" | "too_long_bytes";

export function utf8ByteLength(value: string): number {
  return utf8Encoder.encode(value).length;
}

export function codePointLength(value: string): number {
  return Array.from(value).length;
}

export function validatePassword(value: string): PasswordValidationError | null {
  if (codePointLength(value) < PASSWORD_MIN_CODE_POINTS) {
    return "too_short";
  }
  if (utf8ByteLength(value) > PASSWORD_MAX_UTF8_BYTES) {
    return "too_long_bytes";
  }
  return null;
}
