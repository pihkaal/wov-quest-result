import { makeResultEmbed } from "./discord";
import { env } from "./env";
import { checkForNewQuest, getLatestQuest, type QuestResult } from "./wov";

import { ChannelType, Client, GatewayIntentBits, Message } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const askForGrinders = async (quest: QuestResult) => {
  const channel = await client.channels.fetch(env.DISCORD_ADMIN_CHANNEL);
  if (!channel || channel.type !== ChannelType.GuildText)
    throw "Invalid admin channel provided";

  const top10 = quest.participants
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10)
    .map((p, i) => `${i + 1}. ${p.username} - ${p.xp}xp`)
    .join("\n");

  const color = parseInt(quest.quest.promoImagePrimaryColor.substring(1), 16);

  await channel.send({
    content: `-# ||${env.DISCORD_ADMIN_MENTION}||`,
    embeds: [
      {
        title: "Quête terminée !",
        color,
      },
      {
        title: "Top 10 XP",
        description: top10,
        color,
      },
      {
        title: "Qui a grind ?",
        description:
          "Merci d'entrer les pseudos des joueurs qui ont grind.\n\nFormat:```laulau18,Yuno,...```\n**Attention aux majuscules**",
        color,
      },
    ],
  });

  const filter = (msg: Message) =>
    msg.channel.id === channel.id && !msg.author.bot;

  let confirmed = false;
  let answer: string | null = null;
  while (!confirmed) {
    const collected = await channel.awaitMessages({ filter, max: 1 });
    answer = collected.first()?.content || null;
    if (!answer) continue;

    const players = answer
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    await channel.send({
      embeds: [
        {
          title: "Joueurs entrés",
          description: players.length
            ? players.map((name) => `- ${name}`).join("\n")
            : "*Aucun joueur entré*",
          color,
        },
      ],
      content: `Est-ce correct ? (oui/non)`,
    });
    const confirmFilter = (msg: Message) =>
      msg.channel.id === channel.id &&
      !msg.author.bot &&
      ["oui", "non", "yes", "no"].includes(msg.content.toLowerCase());
    const confirmCollected = await channel.awaitMessages({
      filter: confirmFilter,
      max: 1,
    });
    const confirmation = confirmCollected.first()?.content.toLowerCase();
    if (confirmation === "oui" || confirmation === "yes") {
      confirmed = true;
      await channel.send({ content: "Ok" });
    } else {
      await channel.send({
        content: "D'accord, veuillez réessayer. Qui a grind ?",
      });
    }
  }

  if (!answer) throw "unreachable";

  const exclude = answer
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const embed = makeResultEmbed(quest, [...env.QUEST_EXCLUDE, ...exclude]);
  const rewardChannel = await client.channels.fetch(env.DISCORD_ADMIN_CHANNEL);
  if (rewardChannel && rewardChannel.type === ChannelType.GuildText) {
    await rewardChannel.send(embed);
  } else {
    throw "Invalid reward channel";
  }
  console.log(`Quest result posted at: ${new Date().toISOString()}`);
};

const fn = async () => {
  const quest = await checkForNewQuest();
  if (quest) {
    await askForGrinders(quest);
  }
};

client.on("ready", async (client) => {
  console.log(`Logged in as ${client.user.username}`);

  const quest = await getLatestQuest();
  await askForGrinders(quest);

  // await fn();
  // setInterval(fn, env.WOV_FETCH_INTERVAL);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  message.channel;

  // await message.channel.send({
  // content: `-# ||${env.DISCORD_ADMIN_MENTION}||`,
  // embeds: [
  //   {
  //     title: "Quête terminée !",
  //     description: "Entrez les pseudos des gens à exclure de la quête",
  //     color: 0x3498db,
  //   },
  // ],
  // })
});

await client.login(env.DISCORD_BOT_TOKEN);
