// app/api/test/expiry/route.ts - Manual Test API
import { NextRequest, NextResponse } from "next/server";
import db from "@/app/lib/prismaClient";

export async function GET() {
  try {
    const now = new Date();

    // ข้อมูลสมาชิกทั้งหมด
    const allMembers = await db.user.findMany({
      where: { isMember: true },
      orderBy: { expireAt: "asc" },
    });

    // แยกประเภทสมาชิก
    const expired = allMembers.filter(
      (user) => user.expireAt && user.expireAt < now
    );
    const nearExpiry = allMembers.filter((user) => {
      if (!user.expireAt) return false;
      const threeDaysFromNow = new Date(
        now.getTime() + 3 * 24 * 60 * 60 * 1000
      );
      return user.expireAt > now && user.expireAt <= threeDaysFromNow;
    });
    const active = allMembers.filter((user) => {
      if (!user.expireAt) return false;
      const threeDaysFromNow = new Date(
        now.getTime() + 3 * 24 * 60 * 60 * 1000
      );
      return user.expireAt > threeDaysFromNow;
    });

    const report = {
      timestamp: now.toISOString(),
      summary: {
        totalMembers: allMembers.length,
        expired: expired.length,
        nearExpiry: nearExpiry.length,
        active: active.length,
      },
      details: {
        expired: expired.map((user) => ({
          displayName: user.displayName,
          userId: user.userId,
          expiredDate: user.expireAt?.toISOString(),
          daysOverdue: user.expireAt
            ? Math.floor(
                (now.getTime() - user.expireAt.getTime()) /
                  (24 * 60 * 60 * 1000)
              )
            : 0,
        })),
        nearExpiry: nearExpiry.map((user) => ({
          displayName: user.displayName,
          userId: user.userId,
          expireDate: user.expireAt?.toISOString(),
          daysRemaining: user.expireAt
            ? Math.ceil(
                (user.expireAt.getTime() - now.getTime()) /
                  (24 * 60 * 60 * 1000)
              )
            : 0,
        })),
        active: active.map((user) => ({
          displayName: user.displayName,
          userId: user.userId,
          expireDate: user.expireAt?.toISOString(),
          daysRemaining: user.expireAt
            ? Math.ceil(
                (user.expireAt.getTime() - now.getTime()) /
                  (24 * 60 * 60 * 1000)
              )
            : 0,
        })),
      },
    };

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}

// POST: สำหรับทดสอบการทำงานของ cron job แบบ manual
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === "simulate_expiry") {
      // จำลองการหมดอายุโดยการสร้าง test user ที่หมดอายุไปแล้ว
      const testUser = await db.user.create({
        data: {
          displayName: "Test Expired User",
          userId: `U${Date.now()}test`, // Fake user ID for testing
          isMember: true,
          expireAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // หมดอายุเมื่อวาน
        },
      });

      return NextResponse.json({
        success: true,
        message: "Test expired user created",
        testUser: {
          id: testUser.id,
          displayName: testUser.displayName,
          expireAt: testUser.expireAt,
        },
      });
    }

    if (action === "simulate_near_expiry") {
      // จำลองการใกล้หมดอายุ
      const testUser = await db.user.create({
        data: {
          displayName: "Test Near Expiry User",
          userId: `U${Date.now()}near`, // Fake user ID for testing
          isMember: true,
          expireAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // หมดอายุใน 2 วัน
        },
      });

      return NextResponse.json({
        success: true,
        message: "Test near-expiry user created",
        testUser: {
          id: testUser.id,
          displayName: testUser.displayName,
          expireAt: testUser.expireAt,
        },
      });
    }

    if (action === "cleanup_test") {
      // ลบ test users ที่สร้างไว้
      const deleted = await db.user.deleteMany({
        where: {
          userId: {
            contains: "test",
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Test users cleaned up",
        deletedCount: deleted.count,
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Use: simulate_expiry, simulate_near_expiry, or cleanup_test",
      },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
