import { env as bunEnv } from "bun";
import { z } from "zod";

const schema = z.object({
  DISCORD_WEBHOOK_URL: z.string(),
  DISCORD_MENTION: z.string(),
  DISCORD_REWARDS_GIVER: z.string(),
  WOV_API_KEY: z.string(),
  WOV_CLAN_ID: z.string(),
  WOV_FETCH_INTERVAL: z.coerce.number(),
  QUEST_REWARDS: z
    .string()
    .transform((x) => x.split(",").map((x) => x.trim()))
    .optional(),
  QUEST_EXCLUDE: z
    .string()
    .transform((x) => x.split(",").map((x) => x.trim()))
    .optional()
    .default(""),
});

const result = schema.safeParse(bunEnv);
if (!result.success) {
  console.log("❌ Invalid environments variables:");
  console.log(
    result.error.errors
      .map((x) => `- ${x.path.join(".")}: ${x.message}`)
      .join("\n"),
  );
  process.exit(1);
}

export const env = result.data;
