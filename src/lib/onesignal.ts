import OneSignal from "react-onesignal";

declare global {
  interface Window {
    OneSignalDeferred?: any[];
  }
}

let initialized = false;

function getOneSignalAppId(): string {
  return import.meta.env.VITE_ONESIGNAL_APP_ID?.trim() ?? "";
}

export async function initOneSignal(): Promise<void> {
  if (initialized || typeof window === "undefined") {
    return;
  }

  const appId = getOneSignalAppId();
  if (!appId) {
    return;
  }

  initialized = true;
  try {
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
    });
    OneSignal.Slidedown.promptPush();
  } catch {
    // Ignore duplicate init calls
  }
}

export async function oneSignalLogin(userId: string | number): Promise<void> {
  const appId = getOneSignalAppId();
  if (!appId || !userId) {
    return;
  }

  try {
    await initOneSignal();
    if (typeof window !== "undefined") {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (oneSignal: any) => {
        try {
          if (oneSignal && typeof oneSignal.login === "function") {
            await oneSignal.login(String(userId));
          }
        } catch {
          // Ignore OneSignal SDK internal errors (e.g. 409 conflict, uninitialized properties)
        }
      });
    }
  } catch {
    // Ignore initialization errors
  }
}

export async function oneSignalLogout(): Promise<void> {
  const appId = getOneSignalAppId();
  if (!appId || !initialized) {
    return;
  }

  try {
    if (typeof window !== "undefined" && window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async (oneSignal: any) => {
        try {
          if (oneSignal && typeof oneSignal.logout === "function") {
            await oneSignal.logout();
          }
        } catch {
          // Ignore logout errors
        }
      });
    }
  } catch {
    // Ignore logout errors
  }
}
