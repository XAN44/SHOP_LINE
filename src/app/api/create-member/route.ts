import db from "@/app/lib/prismaClient";
import { NextResponse } from "next/server";

const ADMIN_USER_ID = process.env.ADMIN_ID;

export async function POST(req: Request) {
  try {
    const { userId, displayName } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: {
        userId: userId,
      },
    });

    const role = userId === ADMIN_USER_ID ? "admin" : "user";

    if (existingUser) {
      const updatedUser = await db.user.update({
        where: { userId: userId },
        data: {
          displayName: displayName,
          role: role,
        },
      });

      return NextResponse.json({
        message: "User updated successfully",
        user: updatedUser,
      });
    }

    const newUser = await db.user.create({
      data: {
        userId: userId,
        displayName: displayName,
        role: role,
      },
    });

    return NextResponse.json({
      message: "User created successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
