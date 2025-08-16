// app/api/admin/reject/route.ts - ปรับปรุงแล้ว
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

    console.log(`🔄 Processing rejection for payment: ${paymentId}`);

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

    // เก็บข้อมูลผู้ใช้ก่อนลบ payment
    const userInfo = {
      userId: payment.userId,
      displayName: payment.user.displayName,
    };

    // ลบ Payment record (หรือจะเปลี่ยนเป็น mark as rejected ก็ได้)
    await db.payment.delete({
      where: { id: paymentId },
    });

    console.log(`🗑️ Payment record deleted`);

    // ส่งการแจ้งเตือนให้ผู้ใช้
    console.log(`📤 Attempting to send rejection notification...`);
    console.log(`   Target user: ${userInfo.userId}`);
    console.log(`   Display name: ${userInfo.displayName}`);

    const notificationSent = await sendApprovalResult(
      userInfo.userId,
      userInfo.displayName,
      false // ไม่อนุมัติ
    );

    if (notificationSent) {
      console.log(
        `✅ Rejection notification sent successfully to ${userInfo.userId}`
      );
    } else {
      console.error(
        `❌ Failed to send rejection notification to ${userInfo.userId}`
      );
    }

    console.log(`✅ Payment ${paymentId} rejection process completed`);

    return NextResponse.json({
      success: true,
      message: "Payment rejected",
      notificationSent: notificationSent,
      userInfo: userInfo,
    });
  } catch (error) {
    console.error("❌ Error in rejection process:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
