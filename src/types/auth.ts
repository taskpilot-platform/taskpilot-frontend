export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface OAuth2ExchangeRequest {
  code: string;
}

export type AuthOutcome =
  | "AUTHENTICATED"
  | "RESTORE_REQUIRED"
  | "EMAIL_VERIFICATION_REQUIRED"
  | "OAUTH_EMAIL_COLLISION"
  | "LINK_COMPLETED"
  | "REAUTH_COMPLETED";

export interface AuthResponse {
  token: string | null;
  refreshToken: string | null;
  type: string | null;
  expiresIn: number | null;
  outcome?: AuthOutcome;
  restoreTicket?: string;
  restoreExpiresIn?: number;
  reauthTicket?: string;
  reauthExpiresIn?: number;
  email?: string;
  provider?: string;
  message?: string;
}

export interface VerifyEmailRequest {
  token: string;
  newPassword: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface RestoreAccountRequest {
  ticket: string;
}

export interface CompletePasswordSetupRequest {
  token: string;
  newPassword: string;
}

export interface BeginCredentialLinkRequest {
  provider: string;
  currentPassword?: string;
  reauthTicket?: string;
}

export interface BeginCredentialLinkResponse {
  linkToken: string;
  provider: string;
  expiresInSeconds: number;
}
