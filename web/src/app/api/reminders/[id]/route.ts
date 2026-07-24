import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: raw } = await context.params;
  const userId = Number(raw);
  if (!userId) return json({ error: "Invalid user ID." }, 400);
  const reminders = await prisma.reminder.findMany({
    where: { userId },
    orderBy: { reminderDate: "asc" },
  });
  return json({
    reminders: reminders.map((r) => ({
      id: r.id,
      user_id: r.userId,
      reminder_date: r.reminderDate.toISOString().slice(0, 10),
      note: r.note,
      is_notified: r.isNotified,
    })),
  });
}
