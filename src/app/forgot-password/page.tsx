"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Mail, KeyRound, Lock, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // step 1 = email bhejna, step 2 = OTP + naya password set karna
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to send OTP!");
      } else {
        toast.success(data.message || "Reset OTP sent to your email!");
        setStep(2);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords match nahi kar rahe!");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to reset password!");
      } else {
        toast.success(data.message || "Password reset successfully!");
        router.push("/login");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F5] text-[#2C2420] font-sans flex flex-col">
      <Navbar />

      <div className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-sm sm:max-w-md bg-[#EFEAE5] border border-[#E5DFDA] p-6 sm:p-8 rounded-[2.5rem] shadow-sm"
        >
          <div className="text-center mb-6 sm:mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex p-3 bg-[#8C5E73]/10 border border-[#8C5E73]/20 rounded-2xl text-[#8C5E73] mb-3 sm:mb-4"
            >
              <KeyRound size={28} className="sm:w-8 sm:h-8" />
            </motion.div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#1A120E]">
              {step === 1 ? "Forgot Password" : "Reset Password"}
            </h2>
            <p className="text-xs sm:text-sm text-[#5E4E46] mt-1">
              {step === 1
                ? "Apna registered email daalein, hum OTP bhej denge"
                : `${email} par bheja gaya 6-digit OTP aur naya password daalein`}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5E4E46] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 text-[#7A6A62]" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#FAF7F5] border border-[#E5DFDA] rounded-2xl px-4 py-3 pl-11 text-xs sm:text-sm text-[#1A120E] placeholder-[#8A7A72] focus:outline-none focus:border-[#8C5E73] font-medium transition-all"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#8C5E73] hover:bg-[#784E60] text-white font-medium py-3.5 rounded-full shadow-md shadow-[#8C5E73]/25 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Send Reset OTP</span>}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5E4E46] mb-1.5">
                  6-Digit OTP
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 text-[#7A6A62]" size={18} />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-[#FAF7F5] border border-[#E5DFDA] rounded-2xl px-4 py-3 pl-11 text-xs sm:text-sm text-[#1A120E] placeholder-[#8A7A72] focus:outline-none focus:border-[#8C5E73] font-medium tracking-widest transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5E4E46] mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 text-[#7A6A62]" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#FAF7F5] border border-[#E5DFDA] rounded-2xl px-4 py-3 pl-11 pr-11 text-xs sm:text-sm text-[#1A120E] placeholder-[#8A7A72] focus:outline-none focus:border-[#8C5E73] font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-[#7A6A62] hover:text-[#1A120E] cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5E4E46] mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 text-[#7A6A62]" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#FAF7F5] border border-[#E5DFDA] rounded-2xl px-4 py-3 pl-11 text-xs sm:text-sm text-[#1A120E] placeholder-[#8A7A72] focus:outline-none focus:border-[#8C5E73] font-medium transition-all"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#8C5E73] hover:bg-[#784E60] text-white font-medium py-3.5 rounded-full shadow-md shadow-[#8C5E73]/25 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Reset Password</span>}
              </motion.button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-xs font-semibold text-[#5E4E46] hover:text-[#1A120E] pt-1 cursor-pointer"
              >
                Change Email / Resend OTP
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs sm:text-sm text-[#5E4E46]">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-[#8C5E73] hover:text-[#784E60] font-semibold underline underline-offset-4"
            >
              <ArrowLeft size={15} />
              <span>Back to Login</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}