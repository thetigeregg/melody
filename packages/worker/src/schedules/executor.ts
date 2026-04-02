import { CronExpressionParser } from "cron-parser";
import { createDb, createLogger } from "@melody/shared";
import { sendDiscordWebhook } from "../notifications/discord";
import { generateRecommendations } from "../recommenders/engine";

export async function executeSchedules() {
  const db = createDb();
  const logger = createLogger("worker");
  const schedules = await db
    .selectFrom("notification_schedules")
    .selectAll()
    .where("enabled", "=", true)
    .execute();

  for (const schedule of schedules) {
    const lastTriggeredAt = schedule.last_triggered_at ? new Date(schedule.last_triggered_at as unknown as string) : undefined;
    const interval = CronExpressionParser.parse(schedule.cron_expression, {
      currentDate: new Date(),
      tz: schedule.timezone
    });
    const previous = interval.prev().toDate();

    if (lastTriggeredAt && lastTriggeredAt >= previous) {
      continue;
    }

    const scheduleConfig = typeof schedule.schedule_config === "string"
      ? JSON.parse(schedule.schedule_config)
      : schedule.schedule_config as Record<string, unknown>;
    const channelConfig = typeof schedule.channel_config === "string"
      ? JSON.parse(schedule.channel_config)
      : schedule.channel_config as Record<string, unknown>;

    const recommendation = await generateRecommendations("scheduled", {
      externalRatio: Number(scheduleConfig.externalRatio ?? 0.7),
      localRatio: Number(scheduleConfig.localRatio ?? 0.3),
      limit: Number(scheduleConfig.limit ?? 10),
      includeExplanations: Boolean(scheduleConfig.includeExplanations ?? true)
    });

    await sendDiscordWebhook(
      String(channelConfig.webhookUrl ?? ""),
      schedule.name,
      recommendation.items,
      schedule.timezone
    );

    await db
      .updateTable("notification_schedules")
      .set({
        last_triggered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .where("id", "=", schedule.id)
      .execute();

    logger.info({
      job: "execute-schedules",
      event: "schedule_executed",
      schedule_id: schedule.id
    });
  }
}

