import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: raw } = await context.params;
  const id = Number(raw);
  if (!id) return json({ error: "Invalid reminder ID." }, 400);
  try {
    await prisma.reminder.update({
      where: { id },
      data: { isNotified: true },
    });
    return json({ message: "Reminder marked as notified." });
  } catch {
    return json({ error: "Reminder not found." }, 404);
  }
}
