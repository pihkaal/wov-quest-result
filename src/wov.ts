import { env } from "./env";

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

export const checkForNewQuest = async (): Promise<QuestResult | null> => {
  const response = await fetch(
    `https://api.wolvesville.com/clans/${env.WOV_CLAN_ID}/quests/history`,
    {
      method: "GET",
      headers: { Authorization: `Bot ${env.WOV_API_KEY}` },
    },
  );
  const history = (await response.json()) as Array<QuestResult>;

  const lastId = history[0].quest.id;
  const cacheFile = Bun.file(".quest_cache");
  if ((await cacheFile.exists()) && (await cacheFile.text()) === lastId) {
    return null;
  }

  cacheFile.write(lastId);
  return history[0];
};
