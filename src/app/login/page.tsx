"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, LogIn, Loader2, Mail, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      toast.error(res.error || "Invalid email or password!");
      setLoading(false);
    } else {
      toast.success("Welcome back! Successfully logged in. 🎉");
      router.push("/");
      router.refresh();
    }
  };

  const handleGoogleLogin = () => {
    toast.info("Redirecting to Google Sign In...");
    signIn("google", { callbackUrl: "/" });
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
              <LogIn size={28} className="sm:w-8 sm:h-8" />
            </motion.div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#1A120E]">
              Welcome Back
            </h2>
            <p className="text-xs sm:text-sm text-[#5E4E46] mt-1">
              Sign in to your account to continue shopping
            </p>
          </div>

          <form onSubmit={handleCredentialsLogin} className="space-y-4">
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

            <div>
              {/* Password label ke saath Forgot Password link add kiya hai */}
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#5E4E46]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[#8C5E73] hover:text-[#784E60] underline underline-offset-4 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-[#7A6A62]" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#8C5E73] hover:bg-[#784E60] text-white font-medium py-3.5 rounded-full shadow-md shadow-[#8C5E73]/25 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <span>Sign In</span>
              )}
            </motion.button>
          </form>

          <div className="my-6 flex items-center justify-between">
            <span className="border-b border-[#E5DFDA] w-1/5"></span>
            <span className="text-[10px] sm:text-xs text-[#7A6A62] uppercase tracking-wider font-semibold">Or continue with</span>
            <span className="border-b border-[#E5DFDA] w-1/5"></span>
          </div>

          {/* Google Sign In Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            type="button"
            className="w-full bg-[#FAF7F5] hover:bg-[#E5DFDA]/50 border border-[#E5DFDA] text-[#1A120E] font-medium py-3.5 rounded-full transition-all flex items-center justify-center space-x-3 text-sm cursor-pointer shadow-xs"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
            </svg>
            <span>Google</span>
          </motion.button>

          <div className="mt-6 text-center text-xs sm:text-sm text-[#5E4E46]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#8C5E73] hover:text-[#784E60] font-semibold underline underline-offset-4">
              Create Account
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}