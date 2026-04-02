import { createLogger } from "@melody/shared";
import type { RecommendationItemResult } from "../types";

export async function sendDiscordWebhook(
  webhookUrl: string,
  scheduleName: string,
  items: RecommendationItemResult[],
  timezone: string
) {
  if (!webhookUrl) {
    return;
  }

  const logger = createLogger("worker");
  const description = items
    .map((item) => `${item.rank}. ${item.displayName} - ${item.explanation ?? item.tier}`)
    .join("\n");

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      content: `**${scheduleName}**`,
      embeds: [
        {
          title: "Melody Recommendations",
          description,
          footer: {
            text: `Generated ${new Date().toLocaleString("en-CH", { timeZone: timezone })} ${timezone}`
          }
        }
      ]
    })
  });

  if (!response.ok) {
    logger.error({
      job: "execute-schedules",
      event: "discord_delivery_failed",
      status: response.status
    });
  }
}

