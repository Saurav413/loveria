import { prisma } from "@/lib/prisma";
import { json, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson<{
    userId?: number;
    reminderDate?: string;
    note?: string;
  }>(request);
  const userId = Number(body.userId || 0);
  const reminderDate = body.reminderDate || "";
  const note = (body.note || "").trim();
  if (!userId || !reminderDate || !note) {
    return json({ error: "User ID, date, and note are required." }, 400);
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return json({ error: "User not found." }, 404);

  const reminder = await prisma.reminder.create({
    data: {
      userId,
      reminderDate: new Date(reminderDate),
      note,
    },
  });

  return json(
    {
      message: "Reminder created.",
      reminder: {
        id: reminder.id,
        user_id: reminder.userId,
        reminder_date: reminder.reminderDate.toISOString().slice(0, 10),
        note: reminder.note,
        is_notified: reminder.isNotified,
      },
    },
    201
  );
}
