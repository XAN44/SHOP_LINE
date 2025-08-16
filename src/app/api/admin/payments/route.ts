// app/api/admin/payments/route.ts
import { NextResponse } from "next/server";
import db from "@/app/lib/prismaClient";

export async function GET() {
  try {
    // ดึงการชำระเงินที่ยังไม่ได้อนุมัติ
    const payments = await db.payment.findMany({
      where: { isApproved: false },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      payments: payments,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
