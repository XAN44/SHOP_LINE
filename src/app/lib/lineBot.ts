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

// ฟังก์ชันสำหรับส่งการ์ดการอนุมัติพร้อมปุ่ม // ฟังก์ชันสำหรับส่งการ์ดการอนุมัติพร้อมปุ่ม - ปรับปรุงแล้ว
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
    return false;
  }

  // ตรวจสอบ User ID format อย่างละเอียด
  if (!userId) {
    console.error("❌ User ID is empty or null");
    return false;
  }

  const cleanUserId = userId.trim();

  if (!cleanUserId.startsWith("U") || cleanUserId.length !== 33) {
    console.error(`❌ Invalid User ID format for approval: "${cleanUserId}"`);
    console.error(`   Expected: starts with 'U' and 33 characters long`);
    console.error(
      `   Received: starts with '${cleanUserId.charAt(0)}' and ${
        cleanUserId.length
      } characters`
    );
    return false;
  }

  console.log(`✅ Valid User ID format: ${cleanUserId}`);

  if (isApproved) {
    // การอนุมัติ - ใช้ข้อความธรรมดาก่อนเพื่อทดสอบ
    const approvalMessage = {
      type: "text" as const,
      text: `🎉 ยินดีด้วย! การชำระเงินได้รับการอนุมัติแล้ว

สวัสดี ${displayName} 
✅ คุณได้รับสิทธิ์สมาชิกแล้ว
📅 สมาชิกหมดอายุ: ${expiryDate?.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}

🎊 ขอบคุณที่เชื่อมั่นในบริการของเรา!
🌐 เข้าใช้งาน: ${BASE_URL}`,
    };

    try {
      console.log(`📤 Sending approval message to: ${cleanUserId}`);
      await lineClient.pushMessage(cleanUserId, approvalMessage);
      console.log(
        `✅ Approval message sent successfully to user: ${cleanUserId}`
      );
      return true;
    } catch (error) {
      console.error("❌ Error sending approval message:", error);

      // ลองส่งข้อความสั้นๆ แทน
      try {
        console.log("🔄 Attempting simple approval message...");
        const simpleMessage = {
          type: "text" as const,
          text: `🎉 การชำระเงินอนุมัติแล้ว!\nสวัสดี ${displayName}`,
        };

        await lineClient.pushMessage(cleanUserId, simpleMessage);
        console.log(`✅ Simple approval message sent to user: ${cleanUserId}`);
        return true;
      } catch (fallbackError) {
        console.error("❌ Simple approval message also failed:", fallbackError);
        return false;
      }
    }
  } else {
    // การปฏิเสธ - ใช้ข้อความธรรมดา
    const rejectionMessage = {
      type: "text" as const,
      text: `❌ การชำระเงินไม่ได้รับการอนุมัติ

สวัสดี ${displayName}
😔 ขออภัย สลิปการชำระเงินของคุณไม่ผ่านการตรวจสอบ

📋 กรุณาตรวจสอบ:
• ความชัดเจนของสลิป
• จำนวนเงินที่โอน
• วันที่และเวลาโอน

🔄 สามารถส่งสลิปใหม่ได้ที่: ${BASE_URL}
📞 หากมีข้อสงสัย กรุณาติดต่อเรา`,
    };

    try {
      console.log(`📤 Sending rejection message to: ${cleanUserId}`);
      await lineClient.pushMessage(cleanUserId, rejectionMessage);
      console.log(
        `✅ Rejection message sent successfully to user: ${cleanUserId}`
      );
      return true;
    } catch (error) {
      console.error("❌ Error sending rejection message:", error);

      // ลองส่งข้อความสั้นๆ แทน
      try {
        console.log("🔄 Attempting simple rejection message...");
        const simpleMessage = {
          type: "text" as const,
          text: `❌ การชำระเงินไม่อนุมัติ\nสวัสดี ${displayName} กรุณาส่งสลิปใหม่`,
        };

        await lineClient.pushMessage(cleanUserId, simpleMessage);
        console.log(`✅ Simple rejection message sent to user: ${cleanUserId}`);
        return true;
      } catch (fallbackError) {
        console.error(
          "❌ Simple rejection message also failed:",
          fallbackError
        );
        return false;
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
