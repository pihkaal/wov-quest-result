import { postEmbed } from "./discord";
import { env } from "./env";
import { checkForNewQuest } from "./wov";

const fn = async () => {
  const quest = await checkForNewQuest();
  if (quest) {
    await postEmbed(quest);
    console.log(`Quest result posted at: ${new Date().toISOString()}`);
  }
};

await fn();
setInterval(fn, env.WOV_FETCH_INTERVAL);
