import { Client } from "@line/bot-sdk";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://7420b31bbd15.ngrok-free.app/";

const initializeLineConfig = () => {
  // Fix: Use consistent variable names
  const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN; // Fixed!
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelAccessToken) {
    console.error(
      "❌ CHANNEL_ACCESS_TOKEN is missing from environment variables"
    );
    return null;
  }

  if (!channelSecret) {
    console.error(
      "❌ LINE_CHANNEL_SECRET is missing from environment variables"
    );
    return null;
  }

  console.log("✅ LINE Bot configuration initialized successfully");
  return {
    channelAccessToken,
    channelSecret,
  };
};

const config = initializeLineConfig();
export const lineClient = config ? new Client(config) : null;

// Simple test function to check if LINE messaging works
export async function testLineMessage() {
  if (!lineClient) {
    console.error("LINE client not initialized");
    return false;
  }

  const adminUserId = process.env.CURRENT_ADMIN_ID;
  if (!adminUserId) {
    console.error("CURRENT_ADMIN_ID not set");
    return false;
  }

  const cleanAdminUserId = adminUserId.trim();

  const testMessage = {
    type: "text" as const,
    text: "Test message from your LINE bot! If you see this, the configuration is working.",
  };

  try {
    await lineClient.pushMessage(cleanAdminUserId, testMessage);
    console.log("✅ Test message sent successfully!");
    return true;
  } catch (error) {
    console.error("❌ Test message failed:", error);
    return false;
  }
}

export async function sendPaymentNotification(
  displayName: string,
  userId: string,
  slipUrl: string,
  paymentId: string
) {
  if (!lineClient) {
    console.error("LINE client not initialized. Skipping notification.");
    return;
  }

  const rawAdminUserId = process.env.CURRENT_ADMIN_ID;
  if (!rawAdminUserId) {
    console.error("CURRENT_ADMIN_ID not set in environment variables");
    return;
  }

  const adminUserId = rawAdminUserId.replace(/\s+/g, "").trim();

  // ตรวจสอบว่า User ID มีรูปแบบที่ถูกต้อง
  if (!adminUserId.startsWith("U") || adminUserId.length !== 33) {
    console.error(`❌ Invalid Admin User ID format: ${adminUserId}`);
    console.error(
      "LINE User ID should start with 'U' and be 33 characters long"
    );
    return;
  }

  console.log(`Sending notification to admin: ${adminUserId}`);

  // สร้าง URL ที่มี paymentId เพื่อไฮไลท์สลิป
  const adminUrlWithPaymentId = `${BASE_URL}/admin?paymentId=${paymentId}`;

  // สร้าง Rich Card สวยงาม
  const richCardMessage = {
    type: "template" as const,
    altText: "🔔 การชำระเงินใหม่",
    template: {
      type: "buttons" as const,
      thumbnailImageUrl: "https://img.icons8.com/color/200/payment-history.png",
      imageAspectRatio: "rectangle" as const,
      imageSize: "cover" as const,
      imageBackgroundColor: "#FFE5CC",
      title: "🔔 การชำระเงินใหม่",
      text: `💰 ชื่อ: ${displayName}\nมีสลิปรอการตรวจสอบ`,
      defaultAction: {
        type: "uri" as const,
        uri: adminUrlWithPaymentId, // ใช้ URL ที่มี paymentId
      },
      actions: [
        {
          type: "uri" as const,
          label: "🖼️ ดูสลิป",
          uri: slipUrl,
        },
        {
          type: "uri" as const,
          label: "⚙️ อนุมัติสลิป",
          uri: adminUrlWithPaymentId, // ใช้ URL ที่มี paymentId
        },
      ],
    },
  };

  // ข้อความเพิ่มเติม - แก้ไขให้เข้าใจง่ายขึ้น
  const followUpMessage = {
    type: "text" as const,
    text: `🔗 กดปุ่ม "อนุมัติสลิป" เพื่อเข้าสู่หน้าจัดการ Admin\n\n✨ เมื่อเข้าหน้า Admin แล้ว สลิปที่คุณกดจาก LINE ข้อความนี้จะถูกไฮไลท์ให้เห็นชัดเจน ทำให้หาและจัดการได้ง่าย\n\n📋 คุณจะเห็นสลิปที่ต้องตรวจสอบถูกเน้นไว้ในหน้าแรก`,
  };

  try {
    // ส่งทั้งการ์ดสวยงามและข้อความเพิ่มเติม
    await lineClient.pushMessage(adminUserId, [
      richCardMessage,
      followUpMessage,
    ]);
    console.log("✅ Rich payment notification sent to admin successfully");
    console.log(`🎯 Admin URL with highlight: ${adminUrlWithPaymentId}`);
  } catch (error) {
    console.error("❌ Error sending LINE notification:", error);
    console.error("Admin User ID used:", adminUserId);

    // Fallback: ส่งข้อความธรรมดาแทน
    console.log("🔄 Attempting fallback with simple message...");
    try {
      const simpleMessage = {
        type: "text" as const,
        text: `🔔 การชำระเงินใหม่\n\nชื่อ: ${displayName}\nมีสลิปรอการตรวจสอบ\n\nดูสลิป: ${slipUrl}\n\nอนุมัติสลิป: ${adminUrlWithPaymentId}\n\nเมื่อกดลิงค์อนุมัติแล้ว สลิปนี้จะถูกไฮไลท์ให้เห็นชัดเจนในหน้า Admin`,
      };

      await lineClient.pushMessage(adminUserId, simpleMessage);
      console.log("✅ Fallback message sent successfully");
    } catch (fallbackError) {
      console.error("❌ Fallback message also failed:", fallbackError);
    }
  }
}

// ฟังก์ชันสำหรับส่งการ์ดการอนุมัติพร้อมปุ่ม
export async function sendApprovalResult(
  userId: string,
  displayName: string,
  isApproved: boolean,
  expiryDate?: Date
) {
  console.log(
    `🔔 Sending approval result to user: ${userId}, approved: ${isApproved}`
  );

  if (!lineClient) {
    console.log("❌ LINE client not available, skipping approval notification");
    return;
  }

  // ตรวจสอบ User ID format
  if (!userId || !userId.startsWith("U") || userId.length !== 33) {
    console.error(`❌ Invalid User ID format for approval: ${userId}`);
    return;
  }

  if (isApproved) {
    // การ์ดสำหรับการอนุมัติ
    const approvalCardMessage = {
      type: "template" as const,
      altText: "🎉 การชำระเงินได้รับการอนุมัติแล้ว!",
      template: {
        type: "buttons" as const,
        thumbnailImageUrl: "https://img.icons8.com/color/200/checked.png",
        imageAspectRatio: "rectangle" as const,
        imageSize: "cover" as const,
        imageBackgroundColor: "#E8F5E8",
        title: "🎉 การชำระเงินอนุมัติแล้ว",
        text: `สวัสดี ${displayName}\nสมาชิกจะหมดอายุ: ${expiryDate?.toLocaleDateString(
          "th-TH"
        )}`,
        actions: [
          {
            type: "uri" as const,
            label: "📱 เข้าใช้งานเว็บ",
            uri: BASE_URL,
          },
          {
            type: "postback" as const,
            label: "📞 ติดต่อเรา",
            data: "contact_support",
          },
        ],
      },
    };

    try {
      await lineClient.pushMessage(userId, approvalCardMessage);
      console.log(`✅ Approval card sent to user: ${userId}`);
    } catch (error) {
      console.error("Error sending approval card:", error);
      // Fallback เป็นข้อความธรรมดา
      const fallbackMessage = {
        type: "text" as const,
        text: `🎉 การชำระเงินได้รับการอนุมัติแล้ว!\n\nสวัสดี ${displayName}\nสมาชิกจะหมดอายุวันที่ ${expiryDate?.toLocaleDateString(
          "th-TH"
        )}`,
      };

      try {
        await lineClient.pushMessage(userId, fallbackMessage);
        console.log(`✅ Fallback approval message sent to user: ${userId}`);
      } catch (fallbackError) {
        console.error("❌ Fallback approval message failed:", fallbackError);
      }
    }
  } else {
    // การ์ดสำหรับการไม่อนุมัติ
    const rejectionCardMessage = {
      type: "template" as const,
      altText: "❌ การชำระเงินไม่ได้รับการอนุมัติ",
      template: {
        type: "buttons" as const,
        thumbnailImageUrl: "https://img.icons8.com/color/200/cancel.png",
        imageAspectRatio: "rectangle" as const,
        imageSize: "cover" as const,
        imageBackgroundColor: "#FFE5E5",
        title: "❌ การชำระเงินไม่อนุมัติ",
        text: `สวัสดี ${displayName}\nกรุณาตรวจสอบข้อมูลและทำรายการใหม่`,
        actions: [
          {
            type: "uri" as const,
            label: "🔄 ส่งสลิปใหม่",
            uri: BASE_URL,
          },
          {
            type: "postback" as const,
            label: "📞 ติดต่อสอบถาม",
            data: "contact_inquiry",
          },
        ],
      },
    };

    try {
      await lineClient.pushMessage(userId, rejectionCardMessage);
      console.log(`✅ Rejection card sent to user: ${userId}`);
    } catch (error) {
      console.error("Error sending rejection card:", error);
      // Fallback เป็นข้อความธรรมดา
      const fallbackMessage = {
        type: "text" as const,
        text: `❌ การชำระเงินไม่ได้รับการอนุมัติ\n\nสวัสดี ${displayName}\nกรุณาตรวจสอบข้อมูลและทำรายการใหม่`,
      };

      try {
        await lineClient.pushMessage(userId, fallbackMessage);
        console.log(`✅ Fallback rejection message sent to user: ${userId}`);
      } catch (fallbackError) {
        console.error("❌ Fallback rejection message failed:", fallbackError);
      }
    }
  }
}

// ฟังก์ชันทดสอบส่งข้อความอนุมัติ
export async function testApprovalMessage(userId: string, displayName: string) {
  console.log(`🧪 Testing approval message to user: ${userId}`);

  if (!lineClient) {
    console.error("LINE client not initialized for test");
    return false;
  }

  try {
    await sendApprovalResult(
      userId,
      displayName,
      true,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
    console.log("✅ Test approval message sent successfully!");
    return true;
  } catch (error) {
    console.error("❌ Test approval message failed:", error);
    return false;
  }
}

// ฟังก์ชันเพิ่มเติมสำหรับส่งข้อความต้อนรับ
export async function sendWelcomeMessage(userId: string, displayName: string) {
  if (!lineClient) {
    console.log("LINE client not available, skipping welcome message");
    return;
  }

  const welcomeCardMessage = {
    type: "template" as const,
    altText: "🎊 ยินดีต้อนรับ!",
    template: {
      type: "buttons" as const,
      thumbnailImageUrl: "https://img.icons8.com/color/200/guest-male.png",
      imageAspectRatio: "rectangle" as const,
      imageSize: "cover" as const,
      imageBackgroundColor: "#E6F3FF",
      title: "🎊 ยินดีต้อนรับ!",
      text: `สวัสดี ${displayName}!\nขอบคุณที่เข้าร่วมกับเรา ✨`,
      actions: [
        {
          type: "uri" as const,
          label: "🏠 เยี่ยมชมเว็บไซต์",
          uri: BASE_URL,
        },
        {
          type: "postback" as const,
          label: "📋 วิธีใช้งาน",
          data: "how_to_use",
        },
      ],
    },
  };

  try {
    await lineClient.pushMessage(userId, welcomeCardMessage);
    console.log(`✅ Welcome card sent to user: ${userId}`);
  } catch (error) {
    console.error("Error sending welcome message:", error);
  }
}
