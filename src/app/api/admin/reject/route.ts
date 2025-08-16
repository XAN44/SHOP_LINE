// app/api/admin/reject/route.ts
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

    // ลบ Payment record (หรือจะเปลี่ยนเป็น mark as rejected ก็ได้)
    await db.payment.delete({
      where: { id: paymentId },
    });

    // ส่งการแจ้งเตือนให้ผู้ใช้
    await sendApprovalResult(
      payment.userId,
      payment.user.displayName,
      false // ไม่อนุมัติ
    );

    console.log(
      `❌ Payment ${paymentId} rejected and notification sent to ${payment.userId}`
    );

    return NextResponse.json({
      success: true,
      message: "Payment rejected and user notified",
    });
  } catch (error) {
    console.error("Error rejecting payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
