// app/api/cron/check-expiry/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/app/lib/prismaClient";
import { lineClient } from "@/app/lib/lineBot";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://7420b31bbd15.ngrok-free.app/";
export async function GET(request: NextRequest) {
  try {
    // ตรวจสอบ Authorization (เพื่อความปลอดภัย)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const results = {
      totalChecked: 0,
      expired: 0,
      notified: 0,
      errors: 0,
      expiredUsers: [] as any[],
      nearExpiry: [] as any[],
    };

    // หาสมาชิกที่หมดอายุแล้ว (expireAt < วันนี้)
    const expiredUsers = await db.user.findMany({
      where: {
        isMember: true,
        expireAt: {
          lt: now,
        },
      },
    });

    console.log(`🔍 Found ${expiredUsers.length} expired users`);
    results.totalChecked = expiredUsers.length;

    // อัปเดตสถานะผู้ใช้ที่หมดอายุ
    if (expiredUsers.length > 0) {
      const expiredUserIds = expiredUsers.map((user) => user.id);

      await db.user.updateMany({
        where: {
          id: { in: expiredUserIds },
        },
        data: {
          isMember: false,
          // อาจจะเก็บ expireAt ไว้เพื่อ history หรือลบออกก็ได้
          // expireAt: null
        },
      });

      results.expired = expiredUsers.length;
      results.expiredUsers = expiredUsers.map((user) => ({
        displayName: user.displayName,
        userId: user.userId,
        expiredDate: user.expireAt?.toISOString(),
      }));

      // ส่งการแจ้งเตือนให้ผู้ใช้ที่หมดอายุ
      for (const user of expiredUsers) {
        try {
          await sendExpiryNotification(user.userId, user.displayName);
          results.notified++;
        } catch (error) {
          console.error(`Failed to notify user ${user.userId}:`, error);
          results.errors++;
        }
      }
    }

    // หาสมาชิกที่ใกล้หมดอายุ (3 วันก่อนหมดอายุ)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const nearExpiryUsers = await db.user.findMany({
      where: {
        isMember: true,
        expireAt: {
          gt: now,
          lte: threeDaysFromNow,
        },
      },
    });

    // ส่งการแจ้งเตือนให้ผู้ใช้ที่ใกล้หมดอายุ
    for (const user of nearExpiryUsers) {
      try {
        await sendNearExpiryNotification(
          user.userId,
          user.displayName,
          user.expireAt!
        );
        results.nearExpiry.push({
          displayName: user.displayName,
          userId: user.userId,
          expireDate: user.expireAt?.toISOString(),
        });
      } catch (error) {
        console.error(
          `Failed to notify near-expiry user ${user.userId}:`,
          error
        );
      }
    }

    // ส่งรายงานให้ Admin
    if (results.expired > 0 || results.nearExpiry.length > 0) {
      await sendAdminReport(results, now);
    }

    console.log(`✅ Expiry check completed:`, results);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results: results,
    });
  } catch (error) {
    console.error("❌ Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}

// ส่งการแจ้งเตือนให้ผู้ใช้ที่หมดอายุ
async function sendExpiryNotification(userId: string, displayName: string) {
  if (!lineClient) return;

  const expiredCardMessage = {
    type: "template" as const,
    altText: "⏰ สมาชิกหมดอายุแล้ว",
    template: {
      type: "buttons" as const,
      thumbnailImageUrl: "https://img.icons8.com/color/200/clock.png",
      imageAspectRatio: "rectangle" as const,
      imageSize: "cover" as const,
      imageBackgroundColor: "#FFF2E5",
      title: "⏰ สมาชิกหมดอายุแล้ว",
      text: `สวัสดี ${displayName}\nสมาชิกรายเดือนของคุณหมดอายุแล้ว`,
      actions: [
        {
          type: "uri" as const,
          label: "🔄 ต่ออายุสมาชิก",
          uri: BASE_URL,
        },
        {
          type: "postback" as const,
          label: "📞 ติดต่อสอบถาม",
          data: "contact_renewal",
        },
      ],
    },
  };

  await lineClient.pushMessage(userId, expiredCardMessage);
}

// ส่งการแจ้งเตือนให้ผู้ใช้ที่ใกล้หมดอายุ
async function sendNearExpiryNotification(
  userId: string,
  displayName: string,
  expireDate: Date
) {
  if (!lineClient) return;

  const daysRemaining = Math.ceil(
    (expireDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );

  const nearExpiryCardMessage = {
    type: "template" as const,
    altText: "⚠️ สมาชิกใกล้หมดอายุ",
    template: {
      type: "buttons" as const,
      thumbnailImageUrl: "https://img.icons8.com/color/200/warning-shield.png",
      imageAspectRatio: "rectangle" as const,
      imageSize: "cover" as const,
      imageBackgroundColor: "#FFF8E1",
      title: "⚠️ สมาชิกใกล้หมดอายุ",
      text: `สวัสดี ${displayName}\nสมาชิกจะหมดอายุใน ${daysRemaining} วัน\n(${expireDate.toLocaleDateString(
        "th-TH"
      )})`,
      actions: [
        {
          type: "uri" as const,
          label: "🔄 ต่ออายุล่วงหน้า",
          uri: BASE_URL,
        },
        {
          type: "postback" as const,
          label: "📅 ตั้งเตือนใหม่",
          data: "set_reminder",
        },
      ],
    },
  };

  await lineClient.pushMessage(userId, nearExpiryCardMessage);
}

// ส่งรายงานให้ Admin
async function sendAdminReport(results: any, timestamp: Date) {
  if (!lineClient) return;

  const adminUserId = process.env.CURRENT_ADMIN_ID?.trim();
  if (!adminUserId) return;

  const reportText = `📊 รายงานการตรวจสอบสมาชิก
  
🕐 เวลา: ${timestamp.toLocaleString("th-TH")}

📈 สรุปผล:
• สมาชิกหมดอายุ: ${results.expired} คน
• ใกล้หมดอายุ (3 วัน): ${results.nearExpiry.length} คน
• ส่งแจ้งเตือน: ${results.notified} คน
• ข้อผิดพลาด: ${results.errors} ครั้ง

${
  results.expiredUsers.length > 0
    ? `
🔴 ผู้ใช้ที่หมดอายุ:
${results.expiredUsers
  .map(
    (u: { displayName: string; expiredDate: string }) =>
      `• ${u.displayName} (หมดอายุ: ${new Date(
        u.expiredDate
      ).toLocaleDateString("th-TH")})`
  )
  .join("\n")}
`
    : ""
}

${
  results.nearExpiry.length > 0
    ? `
🟡 ผู้ใช้ใกล้หมดอายุ:
${results.nearExpiry
  .map(
    (u: { displayName: string; expireDate: string }) =>
      `• ${u.displayName} (หมดอายุ: ${new Date(u.expireDate).toLocaleDateString(
        "th-TH"
      )})`
  )
  .join("\n")}
`
    : ""
}`;

  await lineClient.pushMessage(adminUserId, {
    type: "text",
    text: reportText,
  });
}
