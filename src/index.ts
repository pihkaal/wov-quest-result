import { getAccountBalance, initAccounts, setAccountBalance } from "./account";
import { makeResultEmbed } from "./discord";
import { env } from "./env";
import {
  checkForNewQuest,
  getClanInfos,
  getClanMembers,
  getLatestQuest,
  searchPlayer,
  type QuestResult,
} from "./wov";

import {
  ChannelType,
  Client,
  GatewayIntentBits,
  Message,
  Partials,
} from "discord.js";

// user mode = write in console, send in channel
const flagIndex = process.argv.indexOf("--user");
let userMode: { enabled: true; channelId: string } | { enabled: false } = {
  enabled: false,
};
if (flagIndex !== -1) {
  const channelId = process.argv[flagIndex + 1];
  if (channelId === undefined) {
    console.error("ERROR: --user expects channelId as a paramater");
    process.exit(1);
  }

  userMode = { enabled: true, channelId };
}

console.log(`User mode: ${userMode.enabled ? "enabled" : "disabled"}`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel],
});

const askForGrinders = async (quest: QuestResult) => {
  const adminChannel = await client.channels.fetch(env.DISCORD_ADMIN_CHANNEL);
  if (!adminChannel || adminChannel.type !== ChannelType.GuildText)
    throw "Invalid admin channel provided";

  const top10 = quest.participants
    .filter((x) => !env.QUEST_EXCLUDE.includes(x.username))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10)
    .map((p, i) => `${i + 1}. ${p.username} - ${p.xp}xp`)
    .join("\n");

  const color = parseInt(quest.quest.promoImagePrimaryColor.substring(1), 16);

  await adminChannel.send({
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
          "Merci d'entrer les pseudos des joueurs qui ont grind.\n\nFormat:```@LBF laulau,Yuno,...```\n**Attention les majuscules comptent**\nPour entrer la liste des joueurs, il faut __mentionner le bot__, si personne n'a grind, `@LBF tg`",
        color,
      },
    ],
  });

  const filter = (msg: Message) =>
    msg.channel.id === adminChannel.id &&
    !msg.author.bot &&
    msg.content.startsWith(`<@${client.user!.id}>`);

  let confirmed = false;
  let answer: string | null = null;
  while (!confirmed) {
    const collected = await adminChannel.awaitMessages({ filter, max: 1 });
    answer = collected.first()?.content || null;
    if (!answer) continue;

    answer = answer.replace(`<@${client.user!.id}>`, "").trim();
    if (answer.toLowerCase() === "tg") {
      answer = "";
      break;
    }

    const players = answer
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    await adminChannel.send({
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
      msg.channel.id === adminChannel.id &&
      !msg.author.bot &&
      ["oui", "non", "yes", "no"].includes(msg.content.toLowerCase());
    const confirmCollected = await adminChannel.awaitMessages({
      filter: confirmFilter,
      max: 1,
    });
    const confirmation = confirmCollected.first()?.content.toLowerCase();
    if (confirmation === "oui" || confirmation === "yes") {
      confirmed = true;
      await adminChannel.send({ content: "Ok" });
    } else {
      await adminChannel.send({
        content: "D'accord, veuillez réessayer. Qui a grind ?",
      });
    }
  }

  if (answer === null) throw "unreachable";

  const exclude = answer
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const embed = await makeResultEmbed(quest, [
    ...env.QUEST_EXCLUDE,
    ...exclude,
  ]);
  const rewardChannel = await client.channels.fetch(
    env.DISCORD_REWARDS_CHANNEL,
  );
  if (rewardChannel && rewardChannel.type === ChannelType.GuildText) {
    await rewardChannel.send(embed);
  } else {
    throw "Invalid reward channel";
  }

  await adminChannel.send("Envoyé !");
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

  if (userMode.enabled) {
    const chan = client.channels.cache.get(userMode.channelId);
    if (chan?.type !== ChannelType.GuildText) {
      console.error("ERROR: invalid channel");
      process.exit(1);
    }
    process.stdout.write(`${chan.name} ~ `);
    for await (const line of console) {
      await chan.send(line);
      process.stdout.write(`${chan.name} ~ `);
    }
  } else {
    await initAccounts();

    await fn();
    setInterval(fn, env.WOV_FETCH_INTERVAL);
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || userMode.enabled) return;

  const displayName = message.member?.displayName || message.author.username;

  if (message.content.startsWith(`<@${client.user!.id}>`)) {
    const [command, ...args] = message.content
      .replace(`<@${client.user!.id}>`, "")
      .trim()
      .split(" ");
    if (command === "ping") {
      await message.reply("pong");
    } else if (command === "icone") {
      let playerName = args[0];
      if (!playerName) {
        await message.reply({
          embeds: [
            {
              description: `### ❌ Erreur\n\n\n\nUsage:\`@LBF icone NOM_JOUEUR\`, exemple: \`@LBF icone Yuno\`.\n**Attention les majuscules sont importantes**`,
              color: 15335424,
            },
          ],
        });
        return;
      }

      const player = await searchPlayer(playerName);
      if (!player) {
        await message.reply({
          embeds: [
            {
              description: `### ❌ Erreur\n\n\n\nJoueur·euse non trouvé·e.\n**Attention les majuscules sont importantes**`,
              color: 15335424,
            },
          ],
        });
        return;
      }

      if (!player.clanId) {
        await message.reply({
          embeds: [
            {
              description: `### ❌ Erreur\n\n\n\nCette personne __n'a pas de clan__ ou __a caché son clan__.\n**Attention les majuscules sont importantes**`,
              color: 15335424,
            },
          ],
        });
        return;
      }

      const clan = await getClanInfos(player.clanId);
      if (!clan) {
        await message.reply({
          embeds: [
            {
              description: `### ❌ Erreur\n\n\n\nImpossible de récupérer les informations du clan.`,
              color: 15335424,
            },
          ],
        });
        return;
      }

      await message.reply({
        embeds: [
          {
            description: `### ✅ Informations du clan\n\n**Nom:** \`\`\`${clan.name}\`\`\`\n**Tag:** \`\`\`${clan.tag}\`\`\``,
            color: 65280,
          },
        ],
      });
    } else if (command === "result") {
      const quest = await getLatestQuest();
      await askForGrinders(quest);
    } else if (command === "gemmes") {
      let playerName = displayName.replace("🕸 |", "").trim();
      if (args.length >= 1) {
        playerName = args[0];
      }

      const clanMembers = await getClanMembers();

      let clanMember = clanMembers.find((x) => x.username === playerName);
      if (!clanMember) {
        await message.reply({
          embeds: [
            {
              description: `### ❌ Erreur\n\n\n\`${playerName}\` n'est pas dans le clan (la honte).\n**Attention les majuscules sont importantes**`,
              color: 15335424,
            },
          ],
        });
      } else {
        if (args.length === 2 && message.member) {
          if (!message.member.roles.cache.has("1147963065640439900")) {
            await message.reply({
              embeds: [
                {
                  description:
                    "### ❌ Erreur\n\n\nTu t'es cru chez mémé ou quoi faut être staff",
                  color: 15335424,
                },
              ],
            });
            return;
          }

          if (
            (args[1][0] !== "+" && args[1][0] !== "-") ||
            !args[1] ||
            isNaN(Number(args[1].substring(1)))
          ) {
            await message.reply({
              embeds: [
                {
                  description:
                    "### ❌ Erreur\n\n\nFormat: \`@LBF gemmes <pseudo> <+GEMMES|-GEMMES>\`\nExemple:\`@LBF gemmes Yuno -10000\`\n**Attention les majuscules sont importantes**",
                  color: 15335424,
                },
              ],
            });
            return;
          }

          const mult = args[1][0] === "+" ? 1 : -1;
          const delta = Number(args[1].substring(1)) * mult;
          const balance = await getAccountBalance(clanMember.playerId);
          await setAccountBalance(
            clanMember.playerId,
            Math.max(0, balance + delta),
          );
        }

        const balance = await getAccountBalance(clanMember.playerId);
        // await message.reply(`Gemmes accumulées par ${playerName}: ${balance}`);
        await message.reply({
          embeds: [
            {
              description: `### 💎 Compte de ${playerName}\n\n\nGemmes disponibles: **${balance}**\n\n-# Voir avec <@294871767820795904> pour échanger contre skin/carte etc`,
              color: 4360641,
            },
          ],
        });
      }
    }
  }
});

await client.login(env.DISCORD_BOT_TOKEN);
