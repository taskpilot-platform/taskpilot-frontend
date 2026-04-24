import OneSignal from "react-onesignal";

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

  await OneSignal.init({
    appId,
    allowLocalhostAsSecureOrigin: true,
  });

  initialized = true;
  OneSignal.Slidedown.promptPush();
}

export async function oneSignalLogin(userId: string | number): Promise<void> {
  const appId = getOneSignalAppId();
  if (!appId) {
    return;
  }

  await initOneSignal();
  await OneSignal.login(String(userId));
}

export async function oneSignalLogout(): Promise<void> {
  const appId = getOneSignalAppId();
  if (!appId || !initialized) {
    return;
  }

  await OneSignal.logout();
}
