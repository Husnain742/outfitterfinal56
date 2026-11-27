"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { Truck, ArrowLeft, Loader2, CheckCircle2, CreditCard, ShieldCheck, Lock, Tag, XCircle } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { useLiveProducts } from "@/hooks/useLiveProducts";
import { getEffectivePrice } from "@/lib/pricing";
import { toast } from "sonner";

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { convertPrice } = useCurrency();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  // DB se fresh price/stock: checkout par dikhne wala total server ke total se match karega
  const { liveProducts, loaded: liveLoaded, refresh: refreshLive } = useLiveProducts();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    paymentMethod: "cod",
  });

  const [cardDetails, setCardDetails] = useState({
    cardHolder: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercentage: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || session.user?.name || "",
        email: prev.email || session.user?.email || "",
      }));
    }
  }, [session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      toast.error("Please sign in to proceed with secure checkout.");
      router.push("/login");
    }
  }, [status, router]);

  const getUnitPrice = (item: any) => {
    const live = liveProducts[item._id];
    return live ? getEffectivePrice(live) : item.price;
  };
  const getAvailableStock = (item: any) => {
    const live = liveProducts[item._id];
    return live ? live.stock ?? 0 : liveLoaded ? 0 : Infinity;
  };
  const qtyForProduct = (id: string) =>
    cart.reduce((sum: number, i: any) => (i._id === id ? sum + i.quantity : sum), 0);
  const stockProblemItem = mounted
    ? cart.find((item: any) => qtyForProduct(item._id) > getAvailableStock(item))
    : undefined;

  const subtotal = mounted ? cart.reduce((total: number, item: any) => total + getUnitPrice(item) * item.quantity, 0) : 0;
  const discountAmount = appliedCoupon ? (subtotal * appliedCoupon.discountPercentage) / 100 : 0;
  const shippingFee = 0;
  const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardDetails({ ...cardDetails, cardNumber: formatted });
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    const formatted = raw.length >= 3 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw;
    setCardDetails({ ...cardDetails, expiry: formatted });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await axios.post("/api/coupons/verify", { code: couponCode.trim() });
      if (res.data.success) {
        setAppliedCoupon({
          code: couponCode.trim().toUpperCase(),
          discountPercentage: res.data.discountPercentage,
        });
        setCouponCode("");
        toast.success(`Coupon "${couponCode.trim().toUpperCase()}" applied successfully! 🎉`);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Invalid or expired coupon code.";
      setCouponError(errorMsg);
      toast.error(errorMsg);
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    toast.info("Coupon removed");
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // double-click se do orders na banen
    if (!session) {
      toast.error("Authentication required!");
      return;
    }
    if (cart.length === 0) {
      toast.error("Your cart is empty!");
      return;
    }

    if (stockProblemItem) {
      toast.error(`"${stockProblemItem.title}" ka stock kam hai ya khatam ho gaya. Cart update karein.`);
      return;
    }

    if (formData.paymentMethod === "card") {
      const cleanCard = cardDetails.cardNumber.replace(/\s/g, "");
      if (cleanCard.length < 16 || cardDetails.expiry.length < 5 || cardDetails.cvv.length < 3) {
        toast.error("Please enter valid 16-digit Card Number, Expiry (MM/YY), and 3-digit CVV.");
        return;
      }
    }

    setLoading(true);

    try {
      // Fixed: Secure mapping supporting _id, id, and productId to ensure stock decreases properly
      const orderPayload = {
        customerDetails: formData,
        items: cart.map((item: any) => ({
          _id: item._id || item.id || item.productId,
          quantity: item.quantity,
          selectedSize: item.selectedSize || "Standard",
        })),
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        paymentInfo: formData.paymentMethod === "card" 
          ? { method: "card", last4: cardDetails.cardNumber.slice(-4), paymentStatus: "Paid" }
          : { method: "cod", paymentStatus: "Pending" },
      };

      const res = await axios.post("/api/orders", orderPayload);

      if (res.status === 201) {
        setOrderPlaced(true);
        clearCart();
        toast.success("Order placed successfully! ✨");
      }
    } catch (err: any) {
      console.error("Order submission failed:", err);
      toast.error(err.response?.data?.message || "Failed to place order. Please try again.");
      // Stock/price change hua ho sakta hai: fresh data dobara le lo
      refreshLive();
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={40} />
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-canvas text-ink font-sans flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full bg-surface border border-line p-8 rounded-3xl text-center shadow-sm">
            <div className="w-16 h-16 bg-surface-soft border border-line rounded-full flex items-center justify-center mx-auto mb-4 text-brand">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-ink mb-2">
              {formData.paymentMethod === "card" ? "Payment Verified & Order Placed!" : "Order Placed Successfully!"}
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft mb-6">
              Thank you for shopping with Outfitters. Your order is confirmed and being prepared for dispatch.
            </p>
            <Link
              href="/products"
              className="inline-block w-full bg-brand hover:bg-brand-hover text-white font-medium py-3.5 rounded-full transition-all text-sm shadow-md shadow-pop/20"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans flex flex-col">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow w-full">
        <Link
          href="/cart"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-ink-soft hover:text-brand mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Cart</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-serif font-bold text-ink flex items-center space-x-3">
            <Truck className="text-brand" size={32} />
            <span>Checkout & Shipping Details</span>
          </h1>
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-semibold">
            <ShieldCheck size={16} />
            <span>256-Bit Encrypted Checkout</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleCheckoutSubmit} className="lg:col-span-2 space-y-6 bg-surface border border-line p-6 sm:p-8 rounded-3xl shadow-sm">
            <h2 className="text-lg font-serif font-bold text-ink border-b border-line pb-3">
              Shipping Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Ali Raza"
                  className="w-full bg-canvas border border-line rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-ink placeholder-ink-mute focus:outline-none focus:border-brand font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ali@example.com"
                  className="w-full bg-canvas border border-line rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-ink placeholder-ink-mute focus:outline-none focus:border-brand font-medium transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+92 300 1234567"
                  className="w-full bg-canvas border border-line rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-ink placeholder-ink-mute focus:outline-none focus:border-brand font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">City</label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Gujrat / Lahore"
                  className="w-full bg-canvas border border-line rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-ink placeholder-ink-mute focus:outline-none focus:border-brand font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">Street Address</label>
              <input
                type="text"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                placeholder="House #123, Street #4, Area Name"
                className="w-full bg-canvas border border-line rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-ink placeholder-ink-mute focus:outline-none focus:border-brand font-medium transition-all"
              />
            </div>

            <h2 className="text-lg font-serif font-bold text-ink border-b border-line pt-4 pb-3">
              Payment Method
            </h2>

            <div className="space-y-3">
              {/* COD Option */}
              <label className={`flex items-center space-x-3 p-4 bg-canvas border rounded-2xl cursor-pointer transition-all ${formData.paymentMethod === "cod" ? "border-brand shadow-xs" : "border-line"}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={formData.paymentMethod === "cod"}
                  onChange={handleChange}
                  className="text-brand focus:ring-brand"
                />
                <div>
                  <span className="text-sm font-bold text-ink">Cash on Delivery (COD)</span>
                  <p className="text-xs text-ink-soft">Pay with cash when your order arrives at your doorstep.</p>
                </div>
              </label>

              {/* Online Card Option */}
              <label className={`flex items-center space-x-3 p-4 bg-canvas border rounded-2xl cursor-pointer transition-all ${formData.paymentMethod === "card" ? "border-brand shadow-xs" : "border-line"}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={formData.paymentMethod === "card"}
                  onChange={handleChange}
                  className="text-brand focus:ring-brand"
                />
                <div className="flex-grow flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-ink">Online Credit / Debit Card</span>
                    <p className="text-xs text-ink-soft">Pay securely using Visa, Mastercard, or UnionPay.</p>
                  </div>
                  <CreditCard className="text-brand" size={22} />
                </div>
              </label>

              {/* Card Details Form */}
              {formData.paymentMethod === "card" && (
                <div className="p-5 bg-canvas border border-brand/40 rounded-2xl space-y-4 mt-2">
                  <div className="flex items-center justify-between text-xs text-ink-soft border-b border-line pb-2">
                    <span className="font-bold text-ink flex items-center gap-1.5">
                      <Lock size={14} className="text-emerald-700" />
                      Secure Card Payment
                    </span>
                    <span>Test Mode Enabled</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      required={formData.paymentMethod === "card"}
                      value={cardDetails.cardHolder}
                      onChange={(e) => setCardDetails({ ...cardDetails, cardHolder: e.target.value })}
                      placeholder="Name on card"
                      className="w-full bg-surface/60 border border-line rounded-xl px-3.5 py-2 text-xs sm:text-sm text-ink focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">Card Number</label>
                    <input
                      type="text"
                      required={formData.paymentMethod === "card"}
                      value={cardDetails.cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4242 4242 4242 4242"
                      className="w-full bg-surface/60 border border-line rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono text-ink focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink-soft mb-1">Expiry Date</label>
                      <input
                        type="text"
                        required={formData.paymentMethod === "card"}
                        value={cardDetails.expiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        className="w-full bg-surface/60 border border-line rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono text-ink focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-soft mb-1">CVV / CVC</label>
                      <input
                        type="password"
                        maxLength={4}
                        required={formData.paymentMethod === "card"}
                        value={cardDetails.cvv}
                        onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value.replace(/\D/g, "") })}
                        placeholder="123"
                        className="w-full bg-surface/60 border border-line rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono text-ink focus:outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || Boolean(stockProblemItem)}
              className="w-full bg-brand hover:bg-brand-hover text-white font-medium py-3.5 rounded-full shadow-md shadow-pop/25 transition-all text-sm flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>{formData.paymentMethod === "card" ? "Verifying Payment..." : "Processing Order..."}</span>
                </>
              ) : (
                <span>
                  {formData.paymentMethod === "card"
                    ? `Pay Now & Place Order (${mounted ? convertPrice(totalAmount) : convertPrice(0)})`
                    : `Confirm & Place Order (${mounted ? convertPrice(totalAmount) : convertPrice(0)})`}
                </span>
              )}
            </button>
          </form>

          {/* Order Summary Sidebar with Promo Coupon Input */}
          <div className="bg-surface border border-line p-6 rounded-3xl h-fit shadow-sm space-y-5">
            <h3 className="text-lg font-serif font-bold text-ink border-b border-line pb-3">
              Order Summary ({mounted ? cart.length : 0} items)
            </h3>

            <div className="space-y-3 max-h-52 overflow-y-auto pr-2">
              {mounted && cart.map((item: any) => (
                <div key={`${item._id || item.id}-${item.selectedSize}`} className="flex justify-between items-center text-xs text-ink-soft font-medium">
                  <span className="line-clamp-1 w-36">
                    {item.title} {item.selectedSize && item.selectedSize !== "Standard" ? `(${item.selectedSize})` : ""} (x{item.quantity})
                  </span>
                  <span className="font-bold text-ink">{convertPrice(getUnitPrice(item) * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Promo / Coupon Code Section */}
            <div className="border-t border-line pt-4 space-y-2">
              <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Tag size={14} className="text-brand" />
                <span>Have a Promo / Coupon Code?</span>
              </label>

              {!appliedCoupon ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. LUMIERE20"
                    className="flex-grow bg-canvas border border-line rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-ink uppercase focus:outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="bg-brand hover:bg-brand-hover text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    {couponLoading ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs text-emerald-800 font-semibold">
                  <span>🎟️ {appliedCoupon.code} ({appliedCoupon.discountPercentage}% OFF)</span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-rose-600 hover:text-rose-800 cursor-pointer"
                    title="Remove coupon"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-[11px] text-rose-600 font-semibold">{couponError}</p>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="border-t border-line pt-4 space-y-2 text-sm text-ink-soft font-medium">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-ink font-bold">{mounted ? convertPrice(subtotal) : convertPrice(0)}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount ({appliedCoupon.discountPercentage}%)</span>
                  <span>- {convertPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="text-emerald-700 font-bold">Free</span>
              </div>

              <div className="border-t border-line pt-3 flex justify-between text-base font-serif font-bold text-ink">
                <span>Total Amount</span>
                <span className="text-brand">{mounted ? convertPrice(totalAmount) : convertPrice(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}