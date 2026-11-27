"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductSkeleton from "@/components/ProductSkeleton";
import FlashSaleTimer from "@/components/FlashSaleTimer";
import ProductCardImageSlider from "@/components/ProductCardImageSlider";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, ShoppingBag, Eye, Clock, Search, X, Heart, ShieldCheck, Truck, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useWishlist } from "@/context/WishlistContext";
import { useCurrency } from "@/context/CurrencyContext";
import { toast } from "sonner";

// Background aesthetic slideshow images
const backgroundImages = [
  "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555529771-835f59fc5efe?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=1600&auto=format&fit=crop"
];

// Professional E-commerce Fashion & Shopping Models
const heroShoppingModels = [
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?q=80&w=1000&auto=format&fit=crop"
];

function getProductGallery(product: any): string[] {
  const list: string[] = [];
  if (Array.isArray(product?.images)) {
    for (const img of product.images) {
      if (typeof img === "string" && img.trim() && !list.includes(img.trim())) {
        list.push(img.trim());
      }
    }
  }
  if (typeof product?.image === "string" && product.image.trim() && !list.includes(product.image.trim())) {
    list.unshift(product.image.trim());
  }
  return list;
}

export default function Home() {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [modelImageIndex, setModelImageIndex] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  // Date.now() render ke dauran nahi chalta (Next.js error), isliye state mein rakha hai
  const [nowMs, setNowMs] = useState(0);

  const { wishlist, addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { convertPrice } = useCurrency();

  useEffect(() => {
    setMounted(true);
    const bgTimer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 4000);

    const modelTimer = setInterval(() => {
      setModelImageIndex((prev) => (prev + 1) % heroShoppingModels.length);
    }, 3500);

    return () => {
      clearInterval(bgTimer);
      clearInterval(modelTimer);
    };
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
      setNowMs(Date.now());
    };
    updateClock();
    const clockTimer = setInterval(updateClock, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const res = await axios.get("/api/products");
      setProducts(res.data.products || []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      toast.error("Products load karne mein masla hua!");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [products, searchQuery]
  );

  // ---------- Flash Deals: jin products par sale abhi chal rahi hai ----------
  const flashDeals = useMemo(
    () =>
      products
        .filter(
          (p) =>
            nowMs > 0 &&
            Number(p.discountPercentage) > 0 &&
            p.saleEndDate &&
            new Date(p.saleEndDate).getTime() > nowMs
        )
        .sort((a, b) => Number(b.discountPercentage) - Number(a.discountPercentage)),
    [products, nowMs]
  );

  const flashEndDate = useMemo(() => {
    const flashEndTimes = flashDeals.map((p) => new Date(p.saleEndDate).getTime());
    return flashEndTimes.length > 0 ? new Date(Math.min(...flashEndTimes)).toISOString() : null;
  }, [flashDeals]);

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans overflow-x-clip">
      <Navbar />

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative overflow-hidden pt-2 sm:pt-4 pb-10 lg:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
      >
        <div className="relative rounded-[1.75rem] sm:rounded-[3rem] overflow-hidden bg-surface border border-line shadow-xl py-8 sm:py-16 px-4 sm:px-12 lg:px-14 backdrop-blur-xl">

          <div className="absolute inset-0 z-0">
            {backgroundImages.map((img, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                  index === currentImageIndex ? "opacity-35 scale-105" : "opacity-0 scale-100"
                }`}
              >
                <img src={img} alt="Slider Background" className="w-full h-full object-cover filter brightness-95" />
              </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-r from-canvas/95 via-canvas/85 to-canvas/70" />
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">

            <div className="lg:col-span-6 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-6"
              >
                <div className="inline-flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-pop/15 border border-brand/30 text-brand text-[11px] sm:text-sm font-semibold shadow-sm">
                  <Sparkles size={15} className="animate-spin" />
                  <span>Lumière Luxury Collection 2026</span>
                </div>

                <div className="inline-flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-[11px] sm:text-sm font-bold shadow-sm">
                  <Clock size={15} className="animate-pulse" />
                  <span>{currentTime || "Loading time..."}</span>
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-[1.1] text-ink"
              >
                Elevate Your <br />
                <span className="italic font-normal text-brand drop-shadow-sm">
                  Lifestyle & Style
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="mt-4 sm:mt-5 text-sm sm:text-base text-ink-soft max-w-xl leading-relaxed font-medium mx-auto lg:mx-0"
              >
                Experience seamless shopping with ultra-fast secure checkout, multi-angle product galleries, live tracking, and premium curated items just for you.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
              >
                <Link href="/products" className="w-full sm:w-auto">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto bg-brand hover:bg-brand-hover text-white font-semibold px-6 sm:px-8 py-3.5 sm:py-4 rounded-full shadow-lg shadow-pop/30 transition-all flex items-center justify-center space-x-2 text-sm sm:text-base cursor-pointer"
                  >
                    <span>Explore Collection</span>
                    <ArrowRight size={18} />
                  </motion.button>
                </Link>

                <Link href="/wishlist" className="w-full sm:w-auto">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto bg-canvas/90 hover:bg-canvas border border-line text-ink font-semibold px-6 sm:px-8 py-3.5 sm:py-4 rounded-full shadow-sm transition-all flex items-center justify-center space-x-2 text-sm sm:text-base cursor-pointer"
                  >
                    <Heart size={18} className="text-brand" />
                    <span>View Wishlist ({mounted ? wishlist.length : 0})</span>
                  </motion.button>
                </Link>
              </motion.div>
            </div>

            {/* Soft Rounded Editorial Slideshow Frame Integrated with Hero */}
            <div className="lg:col-span-6 w-full">
              <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[430px] rounded-[2rem] overflow-hidden border border-line bg-canvas/80 shadow-xl">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={modelImageIndex}
                    src={heroShoppingModels[modelImageIndex]}
                    alt="Featured Collection Showcase"
                    initial={{ opacity: 0.2, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0.2, scale: 0.98 }}
                    transition={{ duration: 0.7, ease: "easeInOut" }}
                    className="w-full h-full object-cover"
                  />
                </AnimatePresence>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md border border-line px-4 py-2 rounded-2xl shadow-lg flex items-center space-x-2"
                >
                  <ShoppingBag size={17} className="text-brand" />
                  <span className="text-xs font-bold text-ink">Hot Trend 2026 🔥</span>
                </motion.div>

                {/* Slide Indicators */}
                <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-black/25 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
                  {heroShoppingModels.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setModelImageIndex(idx)}
                      aria-label={`Slide ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === modelImageIndex ? "w-5 bg-white" : "w-1.5 bg-white/60 hover:bg-white/85"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-line bg-white/40 p-4 rounded-2xl"
          >
            <div className="flex items-center space-x-3 justify-center sm:justify-start">
              <div className="p-2.5 bg-pop/15 text-brand rounded-2xl font-bold">
                <Truck size={22} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-ink">Fast Delivery</h4>
                <p className="text-[11px] sm:text-xs font-semibold text-ink-soft">Quick & reliable shipping</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 justify-center sm:justify-start">
              <div className="p-2.5 bg-pop/15 text-brand rounded-2xl font-bold">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-ink">Secure Pay</h4>
                <p className="text-[11px] sm:text-xs font-semibold text-ink-soft">100% Protected transactions</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 justify-center sm:justify-start">
              <div className="p-2.5 bg-pop/15 text-brand rounded-2xl font-bold">
                <Zap size={22} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-ink">Flash Deals</h4>
                <p className="text-[11px] sm:text-xs font-semibold text-ink-soft">Exciting daily discounts</p>
              </div>
            </div>
          </motion.div>

        </div>
      </motion.section>

      {/* Flash Deals Section (sirf tab dikhta hai jab koi sale chal rahi ho) */}
      {!loading && flashDeals.length > 0 && (
        <section id="flash-deals" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div
            className="rounded-[1.75rem] sm:rounded-[2.5rem] p-5 sm:p-8 text-white shadow-xl"
            style={{ background: "linear-gradient(135deg, #3A0F1B 0%, #5C1A2B 100%)" }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-pop text-ink rounded-2xl shadow-md">
                  <Zap size={22} className="fill-ink" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-3xl font-serif font-bold">Flash Deals</h2>
                  <p className="text-xs sm:text-sm text-on-dark-soft">Limited time offers, jaldi karein!</p>
                </div>
              </div>
              {flashEndDate && <FlashSaleTimer endDate={flashEndDate} variant="banner" />}
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory -mx-1 px-1">
              {flashDeals.map((product, idx) => {
                const dealGallery = getProductGallery(product);
                const dealPercent = Number(product.discountPercentage);
                const dealOriginal = Number(product.price);
                const dealPrice = dealOriginal - (dealOriginal * dealPercent) / 100;

                return (
                  <Link
                    key={product._id}
                    href={`/products/${product._id}`}
                    className="snap-start shrink-0 w-44 sm:w-56 bg-surface text-ink rounded-3xl p-3 hover:-translate-y-1 hover:shadow-2xl transition-all relative"
                  >
                    <span className="absolute top-5 left-5 z-10 bg-pop text-ink text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md">
                      -{dealPercent}%
                    </span>
                    <div className="w-full h-36 sm:h-44 bg-canvas border border-line rounded-2xl overflow-hidden flex items-center justify-center p-2 mb-3">
                      {dealGallery.length > 0 ? (
                        <ProductCardImageSlider
                          images={dealGallery}
                          title={product.title}
                          intervalMs={2600}
                          staggerDelayMs={(idx % 4) * 650}
                        />
                      ) : (
                        <span className="text-xs text-ink-mute">No Image</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold line-clamp-1">{product.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-serif font-extrabold text-sm">{convertPrice(dealPrice)}</span>
                      <span className="text-[11px] text-ink-mute line-through font-serif">{convertPrice(dealOriginal)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Trending Products Section */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.8 }}
        className="py-10 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 border-b border-line pb-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-brand font-bold">Curated For You</span>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-ink mt-1">Trending Products</h2>
            <p className="text-xs sm:text-sm text-ink-soft mt-1">Browse our top-rated catalog items with instant search</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-3.5 text-ink-mute" size={18} />
              <input
                type="text"
                placeholder="Search products by title/category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-line rounded-full py-3 pl-11 pr-10 text-xs sm:text-sm text-ink placeholder-ink-mute focus:outline-none focus:border-brand transition-all shadow-sm font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-3.5 text-ink-mute hover:text-ink cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                fetchFeaturedProducts();
                router.refresh();
                toast.success("Catalog refreshed!");
              }}
              className="bg-surface hover:bg-line border border-line text-brand text-xs font-semibold px-4 py-3 rounded-full transition-all cursor-pointer shadow-xs whitespace-nowrap"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-surface border border-line rounded-3xl shadow-sm">
            <ShoppingBag size={48} className="mx-auto text-ink-faint mb-3" />
            <p className="text-base font-bold text-ink">No matching products found</p>
            <p className="text-xs text-ink-soft mt-1">Try searching with a different keyword</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => {
              const gallery = getProductGallery(product);
              const primaryImageUrl = gallery[0] || null;
              const isFav = mounted && isInWishlist(product._id);

              const isSaleActive = product.saleEndDate ? nowMs > 0 && nowMs < new Date(product.saleEndDate).getTime() : false;
              const hasDiscount = Boolean(product.discountPercentage && product.discountPercentage > 0 && isSaleActive);
              const originalPrice = Number(product.price);
              const discountPercent = product.discountPercentage || 0;
              const discountedPrice = hasDiscount ? originalPrice - (originalPrice * discountPercent) / 100 : originalPrice;

              return (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  whileHover={{ y: -6 }}
                  className="bg-surface border border-line rounded-3xl p-4 flex flex-col justify-between hover:shadow-xl transition-all group relative"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isFav) {
                        removeFromWishlist(product._id);
                        toast.info("Removed from wishlist");
                      } else {
                        addToWishlist(product);
                        toast.success("Added to wishlist! ❤️");
                      }
                    }}
                    className="absolute top-6 right-6 z-10 bg-white/90 backdrop-blur-md p-2 rounded-full transition-all shadow-sm hover:scale-110 cursor-pointer"
                    title={isFav ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <Heart
                      size={18}
                      className={
                        isFav
                          ? "fill-red-500 text-red-500"
                          : "text-gray-600 hover:text-red-500"
                      }
                    />
                  </button>

                  <div>
                    <div
                      onClick={() => primaryImageUrl && setSelectedImage(primaryImageUrl)}
                      className="w-full h-56 bg-canvas border border-line rounded-2xl overflow-hidden mb-4 flex items-center justify-center p-3 relative cursor-pointer group/img"
                    >
                      {gallery.length > 0 ? (
                        <>
                          <ProductCardImageSlider
                            images={gallery}
                            title={product.title}
                            intervalMs={2600}
                            staggerDelayMs={(index % 4) * 650}
                          />
                          <div className="pointer-events-none absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-brand text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-lg flex items-center space-x-1">
                              <Eye size={14} />
                              <span>Click to Zoom</span>
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-ink-mute">No Image</span>
                      )}
                      <span className="absolute top-3 left-3 z-10 bg-surface/90 backdrop-blur-md border border-line text-brand text-[10px] font-bold px-3 py-1 rounded-full">
                        {product.category || "General"}
                      </span>

                      {hasDiscount && (
                        <span className="absolute bottom-3 left-3 bg-pop text-ink text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md z-10 animate-pulse">
                          -{discountPercent}% OFF
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-ink line-clamp-1 mb-1">{product.title}</h3>
                    <p className="text-xs text-ink-soft line-clamp-2 mb-4">{product.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-line">
                    <div className="flex items-center gap-2">
                      <span className="text-ink font-serif font-extrabold text-base">
                        {convertPrice(discountedPrice)}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-ink-mute line-through font-serif">
                          {convertPrice(originalPrice)}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/products/${product._id}`}
                      className="bg-surface-soft hover:bg-brand text-brand hover:text-white text-xs font-semibold px-4 py-2.5 rounded-full transition-all flex items-center space-x-1 cursor-pointer shadow-sm"
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      <Footer />

      {/* Full-Screen Image Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] bg-surface border border-line rounded-3xl p-4 sm:p-6 shadow-2xl flex items-center justify-center"
            >
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 z-10 bg-line hover:bg-line-strong text-ink p-2.5 rounded-full transition-all cursor-pointer shadow-md"
              >
                <X size={20} />
              </button>
              <img
                src={selectedImage}
                alt="Full View"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}