"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useCart } from "@/context/CartContext";
import ProductReviews from "@/components/ProductReviews";
import FlashSaleTimer from "@/components/FlashSaleTimer";
import { ShoppingBag, ArrowLeft, Loader2, CheckCircle2, ShieldCheck, Eye, X, Ruler } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";

function ProductDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const { cart, addToCart } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Image Gallery States
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Size Guide Modal State & Selected Size State
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>("");
  
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  
  // Timer active check for sale expiration
  const [isSaleActive, setIsSaleActive] = useState(true);

  // Single product DB se FRESH lo (Redis cache bypass) taake order ke baad stock foran sahi dikhe.
  // `silent` = true par spinner nahi dikhta aur user ka selected size/image reset nahi hota.
  const fetchProductDetails = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await axios.get(`/api/products/${id}`, { params: { fresh: 1, t: Date.now() } });
      const found = res.data.product;
      if (!found) {
        setProduct(null);
        return;
      }
      setProduct(found);

      const initialImg = found.images && found.images.length > 0 ? found.images[0] : found.image;
      setActiveImage((prev) => prev ?? initialImg ?? null);

      setSelectedSize((prev) => {
        const sizes: string[] = found.sizes || [];
        if (prev && (sizes.includes(prev) || (sizes.length === 0 && prev === "Standard"))) return prev;
        return sizes.length > 0 ? sizes[0] : "Standard";
      });

      if (!silent) {
        const existingViews = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
        const updatedViews = [found._id, ...existingViews.filter((itemId: string) => itemId !== found._id)].slice(0, 4);
        localStorage.setItem("recentlyViewed", JSON.stringify(updatedViews));
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setProduct(null);
      } else {
        console.error("Failed to fetch product details:", err);
        if (!silent) toast.error("Product details load karne mein masla hua!");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // "Recently viewed" ke liye list (cache se theek hai, sirf title/price/image chahiye)
  const fetchAllProducts = async () => {
    try {
      const res = await axios.get("/api/products");
      setAllProducts(res.data.products || []);
    } catch (err) {
      console.error("Failed to fetch products list:", err);
    }
  };

  useEffect(() => {
    if (!id) return;
    setActiveImage(null);
    setSelectedSize("");
    fetchProductDetails();
    fetchAllProducts();

    // Tab par wapas aane par (e.g. checkout/orders ke baad) stock dobara sync karo
    const resync = () => {
      if (document.visibilityState === "visible") fetchProductDetails(true);
    };
    window.addEventListener("focus", resync);
    document.addEventListener("visibilitychange", resync);
    return () => {
      window.removeEventListener("focus", resync);
      document.removeEventListener("visibilitychange", resync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!product?.saleEndDate) return;

    const checkSaleStatus = () => {
      const now = new Date().getTime();
      const end = new Date(product.saleEndDate).getTime();
      if (now > end) {
        setIsSaleActive(false);
      } else {
        setIsSaleActive(true);
      }
    };

    checkSaleStatus();
    const interval = setInterval(checkSaleStatus, 1000);
    return () => clearInterval(interval);
  }, [product]);

  const getRecentlyViewedProducts = () => {
    if (typeof window === "undefined") return [];
    const viewedIds = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
    return viewedIds
      .filter((vId: string) => vId !== id)
      .map((vId: string) => allProducts.find((p) => p._id === vId))
      .filter(Boolean);
  };

  const recentlyViewedList = getRecentlyViewedProducts();

  if (loading && !product) {
    return (
      <div className="min-h-screen bg-canvas text-ink font-sans">
        <Navbar />
        <div className="flex justify-center items-center py-40">
          <Loader2 className="animate-spin text-brand" size={40} />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-canvas text-ink font-sans">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h2 className="text-xl font-serif font-bold text-ink">Product not found</h2>
          <button
            onClick={() => router.push("/products")}
            className="mt-4 bg-brand text-white px-6 py-2.5 rounded-full text-xs font-semibold cursor-pointer"
          >
            Back to Catalog
          </button>
        </div>
      </div>
    );
  }

  const productImages = product.images && product.images.length > 0 
    ? product.images 
    : product.image ? [product.image] : [];

  const displayImage = activeImage || productImages[0] || null;
  const isOutOfStock = (product.stock ?? 0) <= 0;

  const hasDiscount = Boolean(
    product.discountPercentage && product.discountPercentage > 0 && product.saleEndDate && isSaleActive
  );

  const originalPrice = Number(product.price);
  const discountPercent = product.discountPercentage || 0;
  const discountedPrice = hasDiscount
    ? originalPrice - (originalPrice * discountPercent) / 100
    : originalPrice;

  const productForCart = {
    ...product,
    price: discountedPrice,
    originalPrice: originalPrice,
    hasDiscount: hasDiscount,
    image: displayImage,
    selectedSize: selectedSize,
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // Stock product-level hota hai: is product ki saari sizes ka cart quantity jama karo
    const currentQtyInCart = cart
      .filter((item: any) => item._id === product._id)
      .reduce((sum: number, item: any) => sum + item.quantity, 0);
    const availableStock = product.stock ?? 0;

    if (currentQtyInCart + quantity > availableStock) {
      const remaining = Math.max(0, availableStock - currentQtyInCart);
      toast.error(
        remaining === 0
          ? `Aap pehle hi saare ${availableStock} available pieces cart mein daal chuke hain.`
          : `Sorry! Sirf ${remaining} aur item add ho sakte hain.`
      );
      return;
    }

    addToCart(productForCart, quantity);
    setAdded(true);
    toast.success(`Added ${product.title} (${selectedSize}) to cart! 🛒`);
    setTimeout(() => setAdded(false), 2500);
    fetchProductDetails(true);
  };

  const categoryStr = (product.category || "").toLowerCase();
  const titleStr = (product.title || "").toLowerCase();
  const isFootwear = /shoe|sneaker|snicker|chappal|footwear|sandal/i.test(categoryStr) || /shoe|sneaker|snicker|chappal|footwear|sandal/i.test(titleStr);
  
  const availableSizes = (product.sizes && product.sizes.length > 0) 
    ? product.sizes 
    : [];

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans flex flex-col">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow w-full">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push("/products")}
            className="inline-flex items-center space-x-2 text-xs font-semibold text-ink-soft hover:text-brand transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to catalog</span>
          </button>
        </div>

        <div className="bg-surface border border-line rounded-3xl p-6 sm:p-10 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          
          <div className="space-y-4">
            <div 
              onClick={() => displayImage && setSelectedImage(displayImage)}
              className="w-full h-80 sm:h-96 bg-canvas border border-line rounded-2xl overflow-hidden flex items-center justify-center p-6 relative cursor-pointer group shadow-xs"
            >
              {displayImage ? (
                <>
                  <img
                    src={displayImage}
                    alt={product.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-brand text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg flex items-center space-x-1.5">
                      <Eye size={16} />
                      <span>Click to Zoom</span>
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-xs text-ink-mute">No Image Available</span>
              )}
              
              <span className="absolute top-4 left-4 bg-surface/90 backdrop-blur-md text-brand text-xs font-bold px-3 py-1.5 rounded-full border border-line">
                {product.category || "General"}
              </span>

              {hasDiscount && (
                <span className="absolute top-4 right-4 bg-pop text-ink text-xs font-extrabold px-3 py-1.5 rounded-full shadow-md animate-pulse">
                  -{discountPercent}% OFF
                </span>
              )}
            </div>

            {productImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {productImages.map((imgUrl: string, idx: number) => {
                  const isSelected = displayImage === imgUrl;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(imgUrl)}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden bg-white border-2 transition-all flex-shrink-0 cursor-pointer ${
                        isSelected ? "border-brand shadow-md scale-105" : "border-line hover:border-brand/50 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl sm:text-4xl font-serif font-bold text-ink">
                  {product.title}
                </h1>
                {availableSizes.length > 0 && availableSizes[0] !== "Standard" && (
                  <button
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="inline-flex items-center space-x-1.5 bg-canvas border border-line hover:border-brand text-brand text-xs font-bold px-3.5 py-2 rounded-full transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    <Ruler size={14} />
                    <span>Size Guide</span>
                  </button>
                )}
              </div>

              {product.saleEndDate && isSaleActive && (
                <div className="mb-4">
                  <FlashSaleTimer endDate={product.saleEndDate} />
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl sm:text-3xl font-serif font-extrabold text-ink">
                  Rs. {discountedPrice.toLocaleString()}
                </div>

                {hasDiscount && (
                  <>
                    <div className="text-sm sm:text-base text-ink-mute line-through font-serif">
                      Rs. {originalPrice.toLocaleString()}
                    </div>
                    <span className="bg-rose-500/10 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-1 rounded-full">
                      Save {discountPercent}%
                    </span>
                  </>
                )}
              </div>

              <p className="text-sm text-ink-soft leading-relaxed mb-5">
                {product.description}
              </p>

              {availableSizes.length > 0 && availableSizes[0] !== "Standard" && (
                <div className="mb-6 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-ink-soft">
                    <span>Select Available Size</span>
                    <span className="text-brand font-bold">Selected: {selectedSize}</span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {availableSizes.map((size: string) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`text-xs font-bold px-4 py-2.5 rounded-2xl transition-all cursor-pointer border ${
                          selectedSize === size
                            ? "bg-brand text-white border-brand shadow-md scale-105"
                            : "bg-white text-ink-soft border-line hover:border-brand"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Only show "Out of Stock" badge when stock is 0 or less. Stock numbers are completely hidden from regular users. */}
              {isOutOfStock && (
                <div className="inline-flex items-center space-x-2 text-xs font-semibold px-3.5 py-1.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                  <ShieldCheck size={16} />
                  <span>Out of Stock</span>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-line">
              <motion.button
                whileHover={!isOutOfStock ? { scale: 1.02 } : {}}
                whileTap={!isOutOfStock ? { scale: 0.98 } : {}}
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`w-full font-medium py-3.5 rounded-full shadow-md transition-all flex items-center justify-center space-x-2 text-sm ${
                  isOutOfStock 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                    : 'bg-brand hover:bg-brand-hover text-white shadow-pop/25 cursor-pointer'
                }`}
              >
                {added ? (
                  <>
                    <CheckCircle2 size={18} className="text-emerald-300" />
                    <span>Added {availableSizes.length > 0 && availableSizes[0] !== "Standard" ? `(${selectedSize})` : ''}!</span>
                  </>
                ) : isOutOfStock ? (
                  <span>Out of Stock</span>
                ) : (
                  <>
                    <ShoppingBag size={18} />
                    <span>Add to Cart</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>

        <ProductReviews productId={product._id} />

        {recentlyViewedList.length > 0 && (
          <div className="mt-16 pt-10 border-t border-line">
            <h3 className="text-xl font-serif font-bold text-ink mb-6">
              Recently Viewed Products
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {recentlyViewedList.map((item: any) => {
                const itemImg = (item.images && item.images[0]) || item.image;
                return (
                  <div
                    key={item._id}
                    onClick={() => router.push(`/products/${item._id}`)}
                    className="bg-surface border border-line rounded-2xl p-4 cursor-pointer hover:border-brand transition-all group"
                  >
                    <div className="w-full h-36 bg-canvas rounded-xl overflow-hidden mb-3 p-2 flex items-center justify-center">
                      <img
                        src={itemImg}
                        alt={item.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <h4 className="text-xs font-bold text-ink truncate mb-1">
                      {item.title}
                    </h4>
                    <div className="text-xs font-serif font-bold text-brand">
                      Rs. {Number(item.price).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      <AnimatePresence>
        {selectedImage && (
          <div 
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
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
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSizeGuideOpen && (
          <div 
            onClick={() => setIsSizeGuideOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg w-full bg-surface border border-line rounded-3xl p-6 sm:p-8 shadow-2xl"
            >
              <button
                onClick={() => setIsSizeGuideOpen(false)}
                className="absolute top-5 right-5 text-ink-mute hover:text-ink p-2 rounded-full hover:bg-black/5 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2.5 bg-brand text-white rounded-2xl shadow-md">
                  <Ruler size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-ink">
                    {isFootwear ? "Footwear Size Guide" : "Clothing Size Guide"}
                  </h3>
                  <p className="text-xs text-ink-soft">
                    {isFootwear ? "Find your perfect shoe size in UK/US & CM" : "Exact measurements for standard comfort fit"}
                  </p>
                </div>
              </div>

              {isFootwear ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-line rounded-2xl bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-canvas border-b border-line text-brand font-bold">
                        <tr>
                          <th className="p-3">UK / PK</th>
                          <th className="p-3">US</th>
                          <th className="p-3">EU</th>
                          <th className="p-3">Foot Length</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line text-ink-soft">
                        <tr><td className="p-3 font-bold text-ink">7</td><td className="p-3">8</td><td className="p-3">40</td><td className="p-3">25.0 cm</td></tr>
                        <tr><td className="p-3 font-bold text-ink">8</td><td className="p-3">9</td><td className="p-3">41</td><td className="p-3">26.0 cm</td></tr>
                        <tr><td className="p-3 font-bold text-ink">9</td><td className="p-3">10</td><td className="p-3">42-43</td><td className="p-3">27.0 cm</td></tr>
                        <tr><td className="p-3 font-bold text-ink">10</td><td className="p-3">11</td><td className="p-3">44</td><td className="p-3">28.0 cm</td></tr>
                        <tr><td className="p-3 font-bold text-ink">11</td><td className="p-3">12</td><td className="p-3">45</td><td className="p-3">29.0 cm</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-line rounded-2xl bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-canvas border-b border-line text-brand font-bold">
                        <tr>
                          <th className="p-3">Size</th>
                          <th className="p-3">Chest (Inches)</th>
                          <th className="p-3">Length (Inches)</th>
                          <th className="p-3">Shoulder</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line text-ink-soft">
                        <tr><td className="p-3 font-bold text-ink">Small (S)</td><td className="p-3">36 - 38"</td><td className="p-3">27"</td><td className="p-3">17"</td></tr>
                        <tr><td className="p-3 font-bold text-ink">Medium (M)</td><td className="p-3">40 - 42"</td><td className="p-3">28"</td><td className="p-3">18"</td></tr>
                        <tr><td className="p-3 font-bold text-ink">Large (L)</td><td className="p-3">44 - 46"</td><td className="p-3">29"</td><td className="p-3">19"</td></tr>
                        <tr><td className="p-3 font-bold text-ink">XL</td><td className="p-3">48 - 50"</td><td className="p-3">30"</td><td className="p-3">20"</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <button
                  onClick={() => setIsSizeGuideOpen(false)}
                  className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-semibold py-3 rounded-full transition-all cursor-pointer shadow-md"
                >
                  Got It, Close Guide
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={40} />
      </div>
    }>
      <ProductDetailContent />
    </Suspense>
  );
}