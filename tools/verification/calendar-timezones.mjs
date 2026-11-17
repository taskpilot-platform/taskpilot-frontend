import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const vitest = fileURLToPath(new URL("../../node_modules/vitest/vitest.mjs", import.meta.url));
for (const TZ of ["UTC", "Asia/Bangkok", "America/New_York"]) {
  console.log(`\nCalendar regression in native runtime TZ=${TZ}`);
  const result = spawnSync(process.execPath, [vitest, "run", "--pool=forks",
    "src/test/collab/P4CalendarViews.test.tsx", "src/test/collab/P4CalendarDay.test.ts",
    "src/test/collab/CalendarAndTabState.test.tsx", "src/test/navigation/P4MountedRouteSync.test.tsx",
    "src/test/collab/P4RealtimeAccess.test.tsx"], {
    cwd: root, env: { ...process.env, TZ, VITE_CALENDAR_TEST_TZ: TZ }, stdio: "inherit", timeout: 120_000,
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
