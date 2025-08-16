import { NextResponse } from "next/server";
import db from "@/app/lib/prismaClient";

// --- API Route: /api/check-member ---
// This function handles GET requests to check a user's membership and role.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Find the user in the database and select only the required fields.
    const user = await db.user.findUnique({
      where: {
        userId: userId,
      },
      select: {
        role: true,
        isMember: true,
      },
    });

    if (user) {
      // If the user exists, return their actual membership status and role.
      return NextResponse.json({
        isMember: user.isMember,
        role: user.role,
      });
    } else {
      return NextResponse.json({
        isMember: false,
        role: "user",
      });
    }
  } catch (error) {
    console.error("Error in check-member API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
