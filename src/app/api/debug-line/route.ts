// สร้างไฟล์ app/api/debug-line/route.ts
import { NextResponse } from "next/server";
import { Client } from "@line/bot-sdk";

export async function GET() {
  try {
    const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN;
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const adminId = process.env.ADMIN_ID;

    console.log("=== DEBUG INFO ===");
    console.log(
      "Channel Access Token:",
      channelAccessToken
        ? `${channelAccessToken.substring(0, 20)}...`
        : "MISSING"
    );
    console.log(
      "Channel Secret:",
      channelSecret ? `${channelSecret.substring(0, 10)}...` : "MISSING"
    );
    console.log("Admin ID:", adminId);

    if (!channelAccessToken || !channelSecret) {
      return NextResponse.json(
        {
          error: "Missing LINE configuration",
          details: {
            hasToken: !!channelAccessToken,
            hasSecret: !!channelSecret,
            hasAdminId: !!adminId,
          },
        },
        { status: 400 }
      );
    }

    const client = new Client({
      channelAccessToken,
      channelSecret,
    });

    // ทดสอบส่งข้อความธรรมดา
    try {
      const testMessage = {
        type: "text" as const,
        text:
          "🧪 ทดสอบการเชื่อมต่อ LINE Bot - " +
          new Date().toLocaleString("th-TH"),
      };

      await client.pushMessage(adminId!, testMessage);

      return NextResponse.json({
        success: true,
        message: "Text message sent successfully!",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Push message error:", error);

      let errorDetails = {};
      if (error.response?.data) {
        errorDetails = error.response.data;
        console.log("LINE API Error Response:", error.response.data);
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to send message",
          statusCode: error.statusCode || error.status,
          errorMessage: error.message,
          lineApiError: errorDetails,
          adminId: adminId,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      {
        error: "Debug endpoint failed",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
