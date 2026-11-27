"use client";

import { useState, useEffect, useRef } from "react";
import { Zap } from "lucide-react";

type Props = {
  endDate: string;
  variant?: "card" | "banner";
  onExpire?: () => void;
};

const pad = (n: number) => String(n).padStart(2, "0");

export default function FlashSaleTimer({ endDate, variant = "card", onExpire }: Props) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    const targetTime = new Date(endDate).getTime();
    let interval: ReturnType<typeof setInterval> | undefined;
    let expired = false;

    const updateTimer = () => {
      const difference = targetTime - Date.now();

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        if (!expired) {
          expired = true;
          if (interval) clearInterval(interval);
          onExpireRef.current?.();
        }
      }
    };

    updateTimer();
    if (!expired) interval = setInterval(updateTimer, 1000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [endDate]);

  if (variant === "banner") {
    const boxes = [
      { value: timeLeft.hours, label: "HRS" },
      { value: timeLeft.minutes, label: "MIN" },
      { value: timeLeft.seconds, label: "SEC" },
    ];
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] sm:text-xs font-semibold text-on-dark-soft">Ends in</span>
        <div className="flex items-center gap-1">
          {boxes.map((b, i) => (
            <div key={b.label} className="flex items-center gap-1">
              <div className="bg-black/30 border border-white/20 rounded-lg px-2 py-1 text-center min-w-[2.6rem]">
                <p className="font-mono font-extrabold text-sm sm:text-base leading-none text-pop-soft">{pad(b.value)}</p>
                <p className="text-[8px] tracking-widest text-on-dark-soft mt-0.5">{b.label}</p>
              </div>
              {i < boxes.length - 1 && <span className="font-bold text-pop-soft">:</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand text-white px-4 py-2 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-sm">
      <div className="flex items-center space-x-1.5">
        <Zap size={14} className="text-pop-soft animate-pulse" />
        <span>Flash Sale Ends In:</span>
      </div>
      <div className="flex space-x-1 font-mono font-bold">
        <span className="bg-black/20 px-2 py-0.5 rounded-lg">{pad(timeLeft.hours)}h</span>
        <span>:</span>
        <span className="bg-black/20 px-2 py-0.5 rounded-lg">{pad(timeLeft.minutes)}m</span>
        <span>:</span>
        <span className="bg-black/20 px-2 py-0.5 rounded-lg">{pad(timeLeft.seconds)}s</span>
      </div>
    </div>
  );
}