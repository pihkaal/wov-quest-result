import { getAccountBalance, setAccountBalance } from "./account";
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

export const makeResultEmbed = async (
  result: QuestResult,
  exclude: Array<string>,
): Promise<DiscordMessage> => {
  const imageUrl = result.quest.promoImageUrl;
  const color = parseInt(result.quest.promoImagePrimaryColor.substring(1), 16);
  const participants = result.participants.toSorted((a, b) => b.xp - a.xp);

  let rewardsEmbed: DiscordEmbed | undefined;
  if (env.QUEST_REWARDS) {
    const rewardedParticipants = participants
      .map((x) => ({ id: x.playerId, username: x.username }))
      .filter((x) => !exclude.includes(x.username));
    const medals = ["🥇", "🥈", "🥉"].concat(
      new Array(rewardedParticipants.length).fill("🏅"),
    );

    const rewards = rewardedParticipants
      .slice(0, Math.min(rewardedParticipants.length, env.QUEST_REWARDS.length))
      .map(
        (x, i) =>
          `- ${medals[i]} ${x.username} - ${env.QUEST_REWARDS![i]} gemmes`,
      );

    const arr = rewardedParticipants.slice(
      0,
      Math.min(rewardedParticipants.length, env.QUEST_REWARDS.length),
    );
    for (let i = 0; i < arr.length; i++) {
      const balance = await getAccountBalance(arr[i].id);
      await setAccountBalance(
        arr[i].id,
        balance + parseInt(env.QUEST_REWARDS![i]),
      );
    }

    rewardsEmbed = {
      title: "Récompenses",
      description: `${rewards.join("\n")}\n\n-# \`@LBF gemmes\` pour voir votre nombre de gemmes. Puis avec ${env.DISCORD_REWARDS_GIVER} pour échanger contre des cadeaux !`,
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
          .filter((x) => !exclude.includes(x.username))
          .filter((_, i) => i < 8)
          .map((p, i) => `${i + 1}. ${p.username} - ${p.xp}xp`)
          .join("\n"),
        color,
      },
    ],
  };
};
