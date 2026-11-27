"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, ArrowRight, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { toast } from "sonner"; // <-- Sonner toast import kiya

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"register" | "otp">("register");
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // 6 separate boxes state for OTP
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Handle Registration Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setStep("otp");
      toast.success("OTP sent to your email! Please verify. 📧");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle individual OTP box change
  const handleOtpChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;

    const newOtp = [...otpDigits];
    newOtp[index] = value.substring(value.length - 1);
    setOtpDigits(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace navigation
  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to resend OTP");

      toast.success("New OTP has been sent to your email! 📩");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  // Handle Paste 6 digits directly
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (pastedData.length === 6 && !isNaN(Number(pastedData))) {
      const digits = pastedData.split("");
      setOtpDigits(digits);
      inputRefs.current[5]?.focus();
      toast.info("OTP pasted successfully");
    }
  };

  // Handle OTP Verification Submit
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalOtp = otpDigits.join("");
    if (finalOtp.length < 6) {
      toast.error("Please enter all 6 digits");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: finalOtp }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Invalid OTP");

      toast.success("Account verified successfully! Please sign in. 🎉");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP verification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans flex flex-col">
      <Navbar />

      <div className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-sm sm:max-w-md bg-surface border border-line p-6 sm:p-8 rounded-[2.5rem] shadow-sm"
        >
          <div className="text-center mb-6 sm:mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex p-3 bg-pop/10 border border-brand/20 rounded-2xl text-brand mb-3 sm:mb-4"
            >
              {step === "register" ? (
                <User size={28} className="sm:w-8 sm:h-8" />
              ) : (
                <ShieldCheck size={28} className="sm:w-8 sm:h-8" />
              )}
            </motion.div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-ink">
              {step === "register" ? "Create an Account" : "Enter OTP Code"}
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft mt-1 whitespace-pre-line">
              {step === "register"
                ? "Join Lumière for a curated shopping experience"
                : `We have sent a 6-digit OTP to\n${email}`}
            </p>
          </div>

          {step === "register" ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 text-ink-mute" size={18} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-canvas border border-line rounded-2xl px-4 py-3 pl-11 text-xs sm:text-sm text-ink placeholder-ink-mute focus:outline-none focus:border-brand font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 text-ink-mute" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-canvas border border-line rounded-2xl px-4 py-3 pl-11 text-xs sm:text-sm text-ink placeholder-ink-mute focus:outline-none focus:border-brand font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 text-ink-mute" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-canvas border border-line rounded-2xl px-4 py-3 pl-11 pr-11 text-xs sm:text-sm text-ink placeholder-ink-mute focus:outline-none focus:border-brand font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-ink-mute hover:text-ink cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-brand hover:bg-brand-hover text-white font-medium py-3.5 rounded-full shadow-md shadow-pop/25 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>Continue to Verification</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-3 text-center">
                  Enter 6-Digit Verification Code
                </label>
                {/* 6 Individual Digit Inputs */}
                <div className="flex justify-between gap-2 sm:gap-3">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, index)}
                      onKeyDown={(e) => handleOtpKeyDown(e, index)}
                      onPaste={handleOtpPaste}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold bg-canvas border border-line rounded-2xl text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition-all shadow-xs"
                    />
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-brand hover:bg-brand-hover text-white font-medium py-3.5 rounded-full shadow-md shadow-pop/25 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <span>Verify & Complete Registration</span>
                )}
              </motion.button>

              <div className="text-center text-xs text-ink-soft">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-brand hover:text-brand-hover font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Resend
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-xs sm:text-sm text-ink-soft">
            Already have an account?{" "}
            <Link href="/login" className="text-brand hover:text-brand-hover font-semibold underline underline-offset-4">
              Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}