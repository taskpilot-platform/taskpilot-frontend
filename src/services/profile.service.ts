import { api, http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type {
  BeginCredentialLinkRequest,
  BeginCredentialLinkResponse,
} from "@/types/auth";
import type {
  ChangePasswordRequest,
  SelfDeactivateRequest,
  UpdateAvailabilityRequest,
  UpdateProfileRequest,
  UserProfile,
} from "@/types/user";

export const profileService = {
  getMe: () => api.get<UserProfile>("/v1/users/me"),
  updateMe: (payload: UpdateProfileRequest) => api.put<UserProfile>("/v1/users/me", payload),
  updateAvailability: (payload: UpdateAvailabilityRequest) =>
    api.put<UserProfile>("/v1/users/me/availability", payload),
  uploadAvatar: (file: File): Promise<ApiResponse<UserProfile>> => {
    const formData = new FormData();
    formData.append("file", file);
    return http
      .post<ApiResponse<UserProfile>>("/v1/users/me/avatar", formData)
      .then((r) => r.data);
  },
  changePassword: (payload: ChangePasswordRequest) => api.put<null>("/v1/users/me/password", payload),
  beginProviderLink: (payload: BeginCredentialLinkRequest) =>
    api.post<BeginCredentialLinkResponse>("/v1/users/me/identities/link/begin", payload),
  beginProviderReauth: (provider: string) =>
    api.post<BeginCredentialLinkResponse>(
      `/v1/users/me/identities/reauth/begin?provider=${encodeURIComponent(provider)}`,
    ),
  selfDeactivate: (payload: SelfDeactivateRequest) =>
    api.post<null>("/v1/users/me/self-deactivate", payload),
  deleteMe: (payload?: SelfDeactivateRequest) =>
    api.post<null>("/v1/users/me/self-deactivate", payload ?? { confirmation: "DEACTIVATE" }),
};
