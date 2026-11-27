"use client";

import React, { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useLiveProducts } from "@/hooks/useLiveProducts";
import { getEffectivePrice } from "@/lib/pricing";
import { Trash2, ShoppingBag, ArrowLeft, Plus, Minus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function CartPage() {
  const { cart, removeFromCart, addToCart, clearCart } = useCart();
  const { convertPrice } = useCurrency();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  // Database se fresh stock + price (Redis cache bypass), focus par auto-refresh
  const { liveProducts, loaded: liveLoaded } = useLiveProducts();

  useEffect(() => {
    setMounted(true);
  }, []);

  const getLive = (item: any) => liveProducts[item._id];
  const getUnitPrice = (item: any) => {
    const live = getLive(item);
    return live ? getEffectivePrice(live) : item.price;
  };
  const getAvailableStock = (item: any) => {
    const live = getLive(item);
    if (live) return live.stock ?? 0;
    return liveLoaded ? 0 : item.stock ?? 99; // loaded ho gaya magar product nahi mila = delete ho chuka
  };
  // Same product ki multiple sizes ka total (stock product-level hota hai)
  const totalQtyForProduct = (id: string) =>
    cart.reduce((sum: number, i: any) => (i._id === id ? sum + i.quantity : sum), 0);

  if (!mounted) return null;

  // Total price calculate karne ke liye
  const totalPrice = cart.reduce(
    (total: number, item: any) => total + getUnitPrice(item) * item.quantity,
    0
  );
  const hasStockIssue = cart.some(
    (item: any) => totalQtyForProduct(item._id) > getAvailableStock(item) || getAvailableStock(item) <= 0
  );

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans flex flex-col">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-12 flex-grow w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-line pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink flex items-center space-x-3">
              <ShoppingBag className="text-brand" size={28} />
              <span>Shopping Cart</span>
            </h1>
            <p className="text-xs sm:text-sm text-ink-soft mt-1">
              Review your items before proceeding to checkout
            </p>
          </div>

          {cart.length > 0 && (
            <button
              onClick={() => {
                clearCart();
                toast.info("Cart cleared successfully");
              }}
              className="text-xs text-rose-600 hover:text-rose-700 border border-rose-200 hover:border-rose-300 bg-rose-50 px-4 py-2 rounded-full transition-all cursor-pointer font-medium"
            >
              Clear Cart
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-20 bg-surface border border-line rounded-3xl shadow-sm">
            <ShoppingBag className="mx-auto text-ink-faint mb-4" size={48} />
            <h2 className="text-lg sm:text-xl font-serif font-bold text-ink mb-2">Your cart is empty</h2>
            <p className="text-xs text-ink-soft mb-6">
              Explore our catalog and add items to your cart.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center space-x-2 bg-brand hover:bg-brand-hover text-white text-xs sm:text-sm px-6 py-3 rounded-full transition-all shadow-md shadow-pop/20"
            >
              <ArrowLeft size={16} />
              <span>Start Shopping</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items List */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item: any) => {
                const imageUrl =
                  item.image ||
                  (Array.isArray(item.images) && item.images.length > 0
                    ? item.images[0]
                    : null);

                const availableStock = getAvailableStock(item);
                const isExceedingStock = totalQtyForProduct(item._id) > availableStock;
                const unitPrice = getUnitPrice(item);

                return (
                  <div
                    key={`${item._id}-${item.selectedSize}`}
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between bg-surface border p-4 sm:p-5 rounded-3xl gap-4 shadow-sm transition-all ${
                      isExceedingStock ? "border-rose-400 bg-rose-50/40" : "border-line"
                    }`}
                  >
                    <div className="flex items-center space-x-4 w-full sm:w-auto">
                      <div className="w-20 h-20 bg-canvas border border-line rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center p-2">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.title}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-ink-mute">No Image</span>
                        )}
                      </div>

                      <div className="flex-grow">
                        <h3 className="text-sm sm:text-base font-bold text-ink line-clamp-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-ink-soft mt-0.5 font-medium">
                          Category: {item.category || "General"}
                        </p>
                        {item.selectedSize && item.selectedSize !== "Standard" && (
                          <p className="text-xs text-ink-mute font-semibold mt-0.5">
                            Size: <span className="text-brand">{item.selectedSize}</span>
                          </p>
                        )}
                        {liveLoaded && (
                          <p
                            className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                              availableStock === 0
                                ? "text-rose-600"
                                : availableStock < 5
                                ? "text-amber-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {isExceedingStock && <AlertCircle size={12} />}
                            <span>
                              {availableStock === 0
                                ? "Out of stock"
                                : `In Stock: ${availableStock} left`}
                            </span>
                          </p>
                        )}
                        <div className="flex items-center text-ink font-serif font-extrabold text-sm mt-1 sm:hidden">
                          <span>{convertPrice(unitPrice * item.quantity)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Controls & Delete */}
                    <div className="flex items-center justify-between w-full sm:w-auto space-x-4 pt-2 sm:pt-0 border-t sm:border-0 border-line">
                      <div className="flex items-center space-x-2 bg-canvas border border-line rounded-full p-1.5 shadow-inner">
                        <button
                          onClick={() => {
                            if (item.quantity > 1) {
                              addToCart(item, -1);
                              toast.success("Quantity updated");
                            }
                          }}
                          className="p-1.5 hover:bg-surface rounded-full text-ink-soft transition-colors cursor-pointer"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-bold px-2 text-ink">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => {
                            if (totalQtyForProduct(item._id) >= availableStock) {
                              toast.error(`Sirf ${availableStock} pieces stock mein available hain!`);
                              return;
                            }
                            addToCart(item, 1);
                            toast.success("Quantity updated");
                          }}
                          className="p-1.5 hover:bg-surface rounded-full text-ink-soft transition-colors cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="hidden sm:flex items-center text-ink font-serif font-extrabold text-base w-28 justify-end">
                        <span>{convertPrice(unitPrice * item.quantity)}</span>
                      </div>

                      <button
                        onClick={() => {
                          removeFromCart(item._id, item.selectedSize);
                          toast.info("Item removed from cart");
                        }}
                        className="p-2 text-rose-600 hover:bg-rose-100/50 rounded-full transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary Box */}
            <div className="bg-surface border border-line p-6 rounded-3xl h-fit shadow-sm">
              <h3 className="text-lg font-serif font-bold text-ink mb-4 border-b border-line pb-3">
                Order Summary
              </h3>

              <div className="space-y-3 text-sm text-ink-soft mb-6 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-ink font-bold">{convertPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-emerald-700 font-bold">Free</span>
                </div>
                <div className="border-t border-line pt-3 flex justify-between text-base font-serif font-bold text-ink">
                  <span>Total</span>
                  <span className="text-brand">{convertPrice(totalPrice)}</span>
                </div>
              </div>

              {hasStockIssue && (
                <p className="text-[11px] text-rose-600 font-semibold mb-3 flex items-center gap-1">
                  <AlertCircle size={12} />
                  <span>Kuch items out of stock hain ya stock se zyada hain. Pehle cart theek karein.</span>
                </p>
              )}
              <button
                type="button"
                disabled={hasStockIssue}
                onClick={() => router.push("/checkout")}
                className="w-full bg-brand hover:bg-brand-hover text-white font-medium py-3.5 rounded-full shadow-md shadow-pop/25 transition-all text-sm cursor-pointer text-center block disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}