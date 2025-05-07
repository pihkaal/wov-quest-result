import { env } from "./env";
import type { QuestResult } from "./wov";

export type DiscordMessage = {
  content: string;
  embeds: Array<DiscordEmbed>;
};

export type DiscordEmbed = {
  title?: string;
  description: string;
  image?: {
    url: string;
  };
  color: number;
};

export const postEmbed = async (result: QuestResult): Promise<void> => {
  const embed = makeEmbed(result);
  await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    body: JSON.stringify(embed),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
};

const makeEmbed = (result: QuestResult): DiscordMessage => {
  const imageUrl = result.quest.promoImageUrl;
  const color = parseInt(result.quest.promoImagePrimaryColor.substring(1), 16);
  const participants = result.participants.toSorted((a, b) => b.xp - a.xp);

  let rewardsEmbed: DiscordEmbed | undefined;
  if (env.QUEST_REWARDS) {
    const rewardedParticipants = participants
      .map((x) => x.username)
      .filter((x) => !env.QUEST_EXCLUDE.includes(x));
    const medals = ["🥇", "🥈", "🥉"].concat(
      new Array(rewardedParticipants.length).fill("🏅"),
    );

    const rewards = rewardedParticipants
      .slice(0, Math.min(rewardedParticipants.length, env.QUEST_REWARDS.length))
      .map(
        (username, i) =>
          `- ${medals[i]} ${username} - ${env.QUEST_REWARDS![i]}`,
      );

    rewardsEmbed = {
      title: "Récompenses",
      description: `${rewards.join("\n")}\n\n-# Voir avec ${env.DISCORD_REWARDS_GIVER} pour récupérer les récompenses !`,
      color,
    };
  }

  return {
    content: `-# ||${env.DISCORD_MENTION}||`,
    embeds: [
      {
        description: `# Résultats de quête\n\nMerci à toutes et à tous d'avoir participé 🫡`,
        color,
        image: {
          url: imageUrl,
        },
      },
      ...(rewardsEmbed ? [rewardsEmbed] : []),
      {
        title: "Classement",
        description: participants
          .filter((x) => !env.QUEST_EXCLUDE.includes(x.username))
          .filter((_, i) => i < 8)
          .map((p, i) => `${i + 1}. ${p.username} - ${p.xp}xp`)
          .join("\n"),
        color,
      },
    ],
  };
};
