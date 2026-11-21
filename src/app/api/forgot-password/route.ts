import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import nodemailer from 'nodemailer';
import { ratelimit } from '@/lib/ratelimit';

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting Check (Spamming rokne ke liye)
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Bohat ziyaada requests aa gayi hain. Baraye meharbaani kuch der baad koshish karein.",
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
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required!" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json({ error: "User not found!" }, { status: 400 });
    }

    if (!user.password) {
      return NextResponse.json(
        { error: "This account uses Google Sign-In. Please continue with Google." },
        { status: 400 }
      );
    }

    // Naya 6-digit password reset OTP generate karein (10 minutes expiry)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = otpExpires;
    await user.save();

    const senderEmail = process.env.EMAIL_USER || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: senderEmail,
      to: normalizedEmail,
      subject: 'Reset Your E-Commerce Account Password (OTP)',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Password Reset Request</h2>
          <p>Apna naya password set karne ke liye yeh 6-digit OTP code use karein:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
          <p>Yeh OTP <strong>10 minutes</strong> tak valid hai. Agar aapne request nahi ki toh is email ko ignore kar dein.</p>
        </div>
      `,
    });

    return NextResponse.json(
      { message: "Password reset OTP sent to your email!" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}