"use client";

import React, { useState, useEffect } from "react";
import { useWishlist } from "@/context/WishlistContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Trash2, ShoppingBag } from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

export default function WishlistPage() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans flex flex-col">
      <Navbar />

      {/* Main Container with proper top padding to prevent navbar overlap */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-12 flex-grow w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 border-b border-line pb-6 gap-3">
          <div>
            <h1 className="text-3xl font-serif font-bold text-ink">My Wishlist</h1>
            <p className="text-sm text-ink-soft mt-1">
              Save your favorite luxury pieces for later. ({wishlist.length} items)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                router.refresh();
                toast.success("Wishlist synchronized!");
              }}
              className="bg-surface hover:bg-line border border-line text-brand text-xs font-semibold px-4 py-2 rounded-full transition-all cursor-pointer shadow-xs"
            >
              ↻ Refresh
            </button>
            <Link
              href="/products"
              className="text-sm font-medium text-brand hover:underline cursor-pointer"
            >
              Continue Shopping &rarr;
            </Link>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <div className="text-center py-20 bg-surface border border-line rounded-3xl shadow-sm p-8">
            <Heart className="w-16 h-16 text-brand mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-serif text-ink">Your wishlist is empty</h3>
            <p className="text-ink-soft text-xs mt-2 mb-6">
              Explore our collection and tap the heart icon on items you love.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-full text-xs font-semibold hover:bg-brand-hover transition shadow-md"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlist.map((item) => {
              const imageUrl = item.images?.[0] || item.image || "";
              return (
                <div
                  key={item._id}
                  className="bg-surface border border-line rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition flex flex-col relative"
                >
                  <button
                    onClick={() => {
                      removeFromWishlist(item._id);
                      router.refresh();
                      toast.info("Removed from wishlist");
                    }}
                    className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-md p-2 rounded-full text-red-500 hover:bg-white transition shadow-sm cursor-pointer"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="relative h-52 w-full bg-canvas border-b border-line p-4 flex items-center justify-center">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-ink-mute">No Image</span>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-grow justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-ink text-base line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-brand font-serif font-extrabold text-base mt-2">
                        Rs. {Number(item.price).toLocaleString()}
                      </p>
                    </div>
                    <Link
                      href={`/products/${item._id}`}
                      className="mt-4 w-full flex items-center justify-center gap-2 bg-surface-soft hover:bg-brand text-brand hover:text-white py-2.5 rounded-full text-xs font-semibold border border-line transition"
                    >
                      <ShoppingBag className="w-4 h-4" /> View Product
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}