"use client";

import { Check, Package, Truck, Home, XCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface OrderTimelineProps {
  status: string;
}

export default function OrderTimeline({ status }: OrderTimelineProps) {
  const normalizedStatus = status || "Pending";

  // Agar order cancel ho gaya ho toh clean red banner dikhao
  if (normalizedStatus === "Cancelled") {
    return (
      <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center space-x-3 text-rose-700">
        <XCircle size={20} className="shrink-0" />
        <div>
          <p className="text-xs font-bold">Order Cancelled</p>
          <p className="text-[11px] text-rose-600">
            This order was cancelled. Contact support if you have any questions.
          </p>
        </div>
      </div>
    );
  }

  // Steps define karte hain
  const steps = [
    { id: 1, label: "Order Placed", icon: Clock },
    { id: 2, label: "Confirmed & Packed", icon: Package },
    { id: 3, label: "Shipped", icon: Truck },
    { id: 4, label: "Delivered", icon: Home },
  ];

  // Current status ke hisaab se active step number nikalte hain
  const getCurrentStep = (currentStatus: string) => {
    switch (currentStatus) {
      case "Pending":
        return 1; // Order placed hai, confirmation/packing chal rahi hai
      case "Processing":
      case "Confirmed":
        return 2;
      case "Shipped":
        return 3;
      case "Delivered":
        return 4;
      default:
        return 1;
    }
  };

  const currentStep = getCurrentStep(normalizedStatus);
  // Progress bar ki width percentage calculate karte hain
  const progressWidth = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="mt-5 pt-4 border-t border-line">
      <div className="relative flex items-center justify-between w-full px-2 sm:px-6">
        
        {/* Background Grey Track Line */}
        <div className="absolute left-6 right-6 sm:left-10 sm:right-10 top-4 h-1 bg-line rounded-full z-0" />

        {/* Active Animated Brand Line */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `calc(${progressWidth}% - 20px)` }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute left-6 sm:left-10 top-4 h-1 bg-brand rounded-full z-0 max-w-[calc(100%-3rem)] sm:max-w-[calc(100%-5rem)]"
        />

        {steps.map((step) => {
          const Icon = step.icon;
          const isCompleted = step.id <= currentStep;
          const isCurrent = step.id === currentStep && normalizedStatus !== "Delivered";

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              {/* Step Circle */}
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? "bg-brand border-brand text-white shadow-md shadow-pop/25"
                    : "bg-canvas border-line-strong text-ink-mute"
                } ${isCurrent ? "ring-4 ring-brand/20" : ""}`}
              >
                {step.id < currentStep || normalizedStatus === "Delivered" ? (
                  <Check size={15} strokeWidth={3} />
                ) : (
                  <Icon size={15} />
                )}
              </div>

              {/* Step Label */}
              <span
                className={`mt-2 text-[10px] sm:text-xs font-semibold text-center max-w-[70px] sm:max-w-none leading-tight ${
                  isCompleted ? "text-ink" : "text-ink-mute"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}