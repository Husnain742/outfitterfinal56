import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { ratelimit } from '@/lib/ratelimit';

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting Check (IP based)
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
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required!" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    // 6-digit OTP generate karna (10 minutes expiry)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      // Agar user pehle se verified hai toh duplicate account na banne dein
      if (existingUser.isVerified) {
        return NextResponse.json(
          { error: "User already exists!" },
          { status: 400 }
        );
      }

      // Agar unverified user dobara register kar raha hai toh info aur OTP refresh karein
      existingUser.name = name.trim();
      existingUser.password = hashedPassword;
      existingUser.otp = otp;
      existingUser.otpExpires = otpExpires;
      await existingUser.save();
    } else {
      await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: 'user',
        isVerified: false,
        otp,
        otpExpires,
      });
    }

    // Nodemailer transporter setup
    const senderEmail = process.env.EMAIL_USER || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verification OTP email bhejna
    await transporter.sendMail({
      from: senderEmail,
      to: normalizedEmail,
      subject: 'Verify your E-Commerce Account OTP',
      html: `<h2>Your OTP Code is: <b>${otp}</b></h2><p>Valid for 10 minutes.</p>`,
    });

    return NextResponse.json(
      { message: "OTP sent to your email!" },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}