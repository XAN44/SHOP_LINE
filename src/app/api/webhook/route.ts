// app/api/line/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { WebhookEvent, PostbackEvent } from "@line/bot-sdk";
import { sendApprovalResult } from "@/app/lib/lineBot";
import db from "@/app/lib/prismaClient";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events: WebhookEvent[] = body.events;

    for (const event of events) {
      if (event.type === "postback") {
        await handlePostback(event);
      }
    }

    return NextResponse.json({ message: "OK" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handlePostback(event: PostbackEvent) {
  const data = event.postback.data;
  const params = new URLSearchParams(data);

  const action = params.get("action");
  const paymentId = params.get("paymentId");
  const userId = params.get("userId");
  const displayName = decodeURIComponent(params.get("displayName") || "");

  if (!action || !paymentId || !userId) {
    console.error("Missing required parameters in postback");
    return;
  }

  try {
    const isApproved = action === "approve";

    // อัปเดตสถานะในฐานข้อมูล
    const updatedPayment = await db.payment.update({
      where: { id: paymentId },
      data: {
        isApproved: isApproved,
      },
    });

    console.log(updatedPayment);

    // ถ้าอนุมัติ ให้อัปเดตข้อมูลสมาชิกใน User table ด้วย
    if (isApproved) {
      await db.user.upsert({
        where: { userId: userId },
        update: {
          isMember: true,
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 วัน
        },
        create: {
          userId: userId,
          displayName: displayName,
          isMember: true,
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 วัน
        },
      });
    }

    //
    const user = await db.user.findUnique({
      where: { userId: userId },
    });

    await sendApprovalResult(
      userId,
      displayName,
      isApproved,
      user?.expireAt ?? undefined
    );

    console.log(`Payment ${paymentId} ${isApproved ? "approved" : "rejected"}`);
  } catch (error) {
    console.error("Error processing payment approval:", error);
  }
}
