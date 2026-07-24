import { prisma } from "@/lib/prisma";
import { json, mapUser, readJson } from "@/lib/http";

function nicknameFromEmail(email: string) {
  const local = email.split("@")[0] || "Love";
  return local.slice(0, 24);
}

export async function POST(request: Request) {
  const body = await readJson<{ userId?: number; code?: string }>(request);
  const userId = Number(body.userId || 0);
  const code = (body.code || "").trim().toUpperCase();
  if (!userId || !code) {
    return json({ error: "Valid user ID and code are required." }, 400);
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const pair = await tx.pairingCode.findUnique({ where: { code } });
      if (!pair) throw new Error("NOT_FOUND");
      if (pair.status !== "active") throw new Error("USED");
      if (pair.ownerUserId === userId) throw new Error("OWN");

      const ownerId = pair.ownerUserId;
      const owner = await tx.user.findUnique({ where: { id: ownerId } });
      const joiner = await tx.user.findUnique({ where: { id: userId } });
      if (!owner || !joiner) throw new Error("NOT_FOUND");

      await tx.user.update({
        where: { id: ownerId },
        data: {
          partnerUserId: userId,
          // If owner is missing partner nickname, use joiner's name when available
          partnerNickname:
            owner.partnerNickname ||
            joiner.nickname ||
            nicknameFromEmail(joiner.email),
        },
      });

      // Joiner inherits shared journey fields from the partner — only profile photo left.
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          partnerUserId: ownerId,
          gender: joiner.gender || owner.gender || "others",
          nickname: joiner.nickname || nicknameFromEmail(joiner.email),
          partnerNickname: joiner.partnerNickname || owner.nickname || "Partner",
          relationshipDate: joiner.relationshipDate || owner.relationshipDate,
        },
      });

      await tx.pairingCode.update({
        where: { id: pair.id },
        data: {
          status: "connected",
          connectedUserId: userId,
          connectedAt: new Date(),
        },
      });
      return updated;
    });

    return json({
      message: "Connected with your partner successfully.",
      user: mapUser(user),
      pairedOnboarding: true,
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message === "NOT_FOUND") return json({ error: "Pairing code not found." }, 404);
    if (message === "USED") return json({ error: "Pairing code has already been used." }, 400);
    if (message === "OWN") return json({ error: "You cannot use your own pairing code." }, 400);
    return json({ error: "Database error." }, 500);
  }
}
