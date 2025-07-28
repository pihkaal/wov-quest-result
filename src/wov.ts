import { env } from "./env";
import { mkdir } from "node:fs/promises";

export type QuestResult = {
  quest: {
    id: string;
    promoImageUrl: string;
    promoImagePrimaryColor: string;
  };
  participants: Array<QuestParticipant>;
};

export type QuestParticipant = {
  playerId: string;
  username: string;
  xp: number;
};

export const getLatestQuest = async (): Promise<QuestResult> => {
  const response = await fetch(
    `https://api.wolvesville.com/clans/${env.WOV_CLAN_ID}/quests/history`,
    {
      method: "GET",
      headers: { Authorization: `Bot ${env.WOV_API_KEY}` },
    },
  );
  const history = (await response.json()) as Array<QuestResult>;
  return history[0];
};

export const checkForNewQuest = async (): Promise<QuestResult | null> => {
  const lastQuest = await getLatestQuest();

  const lastId = lastQuest.quest.id;
  const cacheFile = Bun.file(".cache/.quest_cache");
  await mkdir(".cache", { recursive: true });
  if (await cacheFile.exists()) {
    const cachedQuestId = await cacheFile.text();
    if(cachedQuestId === lastId || cachedQuestId === "IGNORE") {
      return null;
    }
  }

  await cacheFile.write(lastId);
  return lastQuest;
};
export const getClanMembers = async (): Promise<
  Array<{ playerId: string; username: string }>
> => {
  const cacheFile = Bun.file(".clan_members_cache");
  await mkdir(".cache", { recursive: true });

  let cached: {
    timestamp: number;
    data: Array<{ playerId: string; username: string }>;
  } | null = null;
  if (await cacheFile.exists()) {
    try {
      cached = JSON.parse(await cacheFile.text());
      if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) {
        return cached.data;
      }
    } catch {}
  }

  const response = await fetch(
    `https://api.wolvesville.com/clans/${env.WOV_CLAN_ID}/members`,
    {
      method: "GET",
      headers: { Authorization: `Bot ${env.WOV_API_KEY}` },
    },
  );
  const data = (await response.json()) as Array<{
    playerId: string;
    username: string;
  }>;
  await cacheFile.write(JSON.stringify({ timestamp: Date.now(), data }));
  return data;
};
