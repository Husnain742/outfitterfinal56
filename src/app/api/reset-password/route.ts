import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { ratelimit } from '@/lib/ratelimit';

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting Check (Brute-force OTP guessing rokne ke liye)
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Bohat ziyaada ghalat koshishein ho gayi hain. Baraye meharbaani 1 minute baad koshish karein.",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }

    await dbConnect();
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Email, OTP, and new password are required!" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password kam se kam 6 characters ka hona chahiye!" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json({ error: "User not found!" }, { status: 400 });
    }

    // Reset OTP aur expiry check karein
    if (
      !user.resetPasswordOtp ||
      !user.resetPasswordOtpExpires ||
      user.resetPasswordOtp !== otp.trim() ||
      new Date() > new Date(user.resetPasswordOtpExpires)
    ) {
      return NextResponse.json(
        { error: "Invalid or expired OTP!" },
        { status: 400 }
      );
    }

    // Naya password hash karein aur reset OTP fields clear karein
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    return NextResponse.json(
      { message: "Password reset successfully! You can now sign in." },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}