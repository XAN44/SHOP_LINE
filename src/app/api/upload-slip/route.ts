// app/api/upload-slip/route.ts
import { NextRequest, NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";
import { sendPaymentNotification } from "@/app/lib/lineBot";
import db from "@/app/lib/prismaClient";

const utapi = new UTApi();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;
    const displayName = formData.get("displayName") as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadFile = new File([buffer], file.name, {
      type: file.type,
    });

    // Upload file using UTApi
    const uploadResponse = await utapi.uploadFiles([uploadFile]);

    if (!uploadResponse[0] || uploadResponse[0].error) {
      throw new Error("Failed to upload file");
    }

    const slipUrl = uploadResponse[0].data.url;

    // Create or update user first
    await db.user.upsert({
      where: { userId: userId },
      update: { displayName: displayName },
      create: {
        userId: userId,
        displayName: displayName,
      },
    });

    // Save payment record to database
    const payment = await db.payment.create({
      data: {
        slipPath: slipUrl,
        userId: userId,
      },
    });

    // Send LINE notification to admin
    await sendPaymentNotification(displayName, userId, slipUrl, payment.id);

    return NextResponse.json({
      success: true,
      message: "Payment slip uploaded and notification sent",
    });
  } catch (error) {
    console.error("Error uploading slip:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
