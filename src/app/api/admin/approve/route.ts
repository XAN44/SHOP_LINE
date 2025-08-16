// app/api/admin/approve/route.ts
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

    // ดึงข้อมูล Payment พร้อม User
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // อัปเดตสถานะการอนุมัติ
    await db.payment.update({
      where: { id: paymentId },
      data: { isApproved: true },
    });

    // อัปเดตสถานะสมาชิกและวันหมดอายุ
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 วัน
    await db.user.update({
      where: { userId: payment.userId },
      data: {
        isMember: true,
        expireAt: expiryDate,
      },
    });

    // ส่งการแจ้งเตือนให้ผู้ใช้
    await sendApprovalResult(
      payment.userId,
      payment.user.displayName,
      true,
      expiryDate
    );

    console.log(
      `✅ Payment ${paymentId} approved and notification sent to ${payment.userId}`
    );

    return NextResponse.json({
      success: true,
      message: "Payment approved and user notified",
    });
  } catch (error) {
    console.error("Error approving payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
