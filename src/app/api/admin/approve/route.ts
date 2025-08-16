// app/api/admin/approve/route.ts - ปรับปรุงแล้ว
import { NextRequest, NextResponse } from "next/server";
import { sendApprovalResult } from "@/app/lib/lineBot";
import db from "@/app/lib/prismaClient";

export async function POST(request: NextRequest) {
  try {
    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }

    console.log(`🔄 Processing approval for payment: ${paymentId}`);

    // ดึงข้อมูล Payment พร้อม User
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      console.error(`❌ Payment not found: ${paymentId}`);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    console.log(
      `📋 Payment found for user: ${payment.user.displayName} (${payment.userId})`
    );

    // อัปเดตสถานะการอนุมัติ
    await db.payment.update({
      where: { id: paymentId },
      data: { isApproved: true },
    });

    console.log(`✅ Payment status updated to approved`);

    // อัปเดตสถานะสมาชิกและวันหมดอายุ
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 วัน
    await db.user.update({
      where: { userId: payment.userId },
      data: {
        isMember: true,
        expireAt: expiryDate,
      },
    });

    console.log(
      `👤 User membership updated, expires: ${expiryDate.toISOString()}`
    );

    // ส่งการแจ้งเตือนให้ผู้ใช้
    console.log(`📤 Attempting to send approval notification...`);
    console.log(`   Target user: ${payment.userId}`);
    console.log(`   Display name: ${payment.user.displayName}`);

    const notificationSent = await sendApprovalResult(
      payment.userId,
      payment.user.displayName,
      true,
      expiryDate
    );

    if (notificationSent) {
      console.log(
        `✅ Approval notification sent successfully to ${payment.userId}`
      );
    } else {
      console.error(
        `❌ Failed to send approval notification to ${payment.userId}`
      );
    }

    console.log(`✅ Payment ${paymentId} approval process completed`);

    return NextResponse.json({
      success: true,
      message: "Payment approved",
      notificationSent: notificationSent,
      userInfo: {
        userId: payment.userId,
        displayName: payment.user.displayName,
        expiryDate: expiryDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error in approval process:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
