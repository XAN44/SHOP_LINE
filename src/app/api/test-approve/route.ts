// app/api/test-approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendApprovalResult } from "@/app/lib/lineBot";

export async function POST(request: NextRequest) {
  try {
    const { userId, displayName } = await request.json();

    if (!userId || !displayName) {
      return NextResponse.json(
        { error: "Missing userId or displayName" },
        { status: 400 }
      );
    }

    const isApproved = true;

    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await sendApprovalResult(userId, displayName, isApproved, expiryDate);

    console.log(
      `✅ Test approval message sent to user: ${displayName} (${userId})`
    );

    return NextResponse.json({
      success: true,
      message: "Test approval message sent successfully.",
    });
  } catch (error) {
    console.error("❌ Error sending test approval message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
