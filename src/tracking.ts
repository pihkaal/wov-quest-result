import { getPlayer } from "./wov";

const TRACKED_PLAYER_FILE = "./.cache/tracked.json";

type TrackedPlayers = Record<string, string[]>;

export async function initTracking(): Promise<void> {
  if (!(await Bun.file(TRACKED_PLAYER_FILE).exists())) {
    Bun.file(TRACKED_PLAYER_FILE).write("{}");
  }
}

export async function listTrackedPlayers(): Promise<string[]> {
  const trackedPlayers: TrackedPlayers =
    await Bun.file(TRACKED_PLAYER_FILE).json();

  return Object.keys(trackedPlayers);
}

export async function trackWovPlayer(playerId: string): Promise<
  | { event: "notFound" }
  | {
      event: "registered";
    }
  | { event: "changed"; oldUsernames: string[]; newUsername: string }
  | { event: "none" }
> {
  const trackedPlayers: TrackedPlayers =
    await Bun.file(TRACKED_PLAYER_FILE).json();

  const player = await getPlayer(playerId);
  if (!player) return { event: "notFound" };

  const currentUsernames = trackedPlayers[playerId];
  if (currentUsernames) {
    const oldUsernames = [...currentUsernames];
    if (!currentUsernames.includes(player.username)) {
      currentUsernames.push(player.username);

      await Bun.file(TRACKED_PLAYER_FILE).write(JSON.stringify(trackedPlayers));

      return {
        event: "changed",
        oldUsernames,
        newUsername: player.username,
      };
    } else {
      return {
        event: "none",
      };
    }
  } else {
    trackedPlayers[playerId] = [player.username];
    await Bun.file(TRACKED_PLAYER_FILE).write(JSON.stringify(trackedPlayers));
    return { event: "registered" };
  }
}
