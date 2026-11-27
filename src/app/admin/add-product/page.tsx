"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import dynamic from "next/dynamic";
import { PackagePlus, UploadCloud, DollarSign, Loader2, Percent, Trash2, Ruler } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const CldUploadWidget = dynamic(
  () => import("next-cloudinary").then((mod) => mod.CldUploadWidget),
  { ssr: false }
);

export default function AddProductPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Electronics");

  // Images Gallery State
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [stock, setStock] = useState("10");

  // Sizes State
  const [sizesInput, setSizesInput] = useState("7, 8, 9, 10, 11");

  // Flash Sale States
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [saleEndDate, setSaleEndDate] = useState("");

  useEffect(() => {
    if (category === "Fashion") {
      setSizesInput("Small (S), Medium (M), Large (L), XL");
    } else if (category === "Accessories") {
      setSizesInput("7, 8, 9, 10, 11");
    } else {
      setSizesInput("Standard");
    }
  }, [category]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user?.email !== ADMIN_EMAIL) {
      toast.error("Access Denied: Only admin can access this page!");
      router.push("/");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={40} />
      </div>
    );
  }

  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imagesList.length === 0) {
      toast.error("Please upload at least one product image!");
      return;
    }

    setLoading(true);

    const formattedSizes = sizesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await axios.post("/api/products", {
        title,
        description,
        price: Number(price),
        category,
        stock: Number(stock),
        images: imagesList,
        sizes: formattedSizes,
        discountPercentage: discountPercentage ? Number(discountPercentage) : 0,
        saleEndDate: saleEndDate ? new Date(saleEndDate).toISOString() : null,
      });

      if (res.status !== 201 && res.status !== 200) {
        throw new Error("Failed to create product");
      }

      toast.success("Product published successfully with custom sizes! 🎉");

      setTitle("");
      setDescription("");
      setPrice("");
      setStock("10");
      setImagesList([]);
      setDiscountPercentage("");
      setSaleEndDate("");

      router.refresh();
    } catch (err: any) {
      console.error("❌ [ADD PRODUCT ERROR]:", err);
      toast.error(err.response?.data?.error || err.message || "Failed to publish product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans flex flex-col">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-12 flex-grow w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-line p-6 sm:p-8 rounded-3xl shadow-sm"
        >
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-surface-soft border border-line rounded-2xl text-brand mb-3">
              <PackagePlus size={32} />
            </div>
            <h1 className="text-2xl font-serif font-bold text-ink">Add New Product</h1>
            <p className="text-xs sm:text-sm text-ink-soft mt-1">
              Upload product details, multi-angle gallery, and available inventory sizes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                Product Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sneaker Shoes / Luxury Kurti"
                className="w-full bg-canvas border border-line rounded-2xl px-4 py-3 text-xs sm:text-sm text-ink placeholder-ink-mute focus:outline-none focus:border-brand font-medium transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                  Original Price (Rs.)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-3.5 text-ink-mute" size={18} />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="2999"
                    className="w-full bg-canvas border border-line rounded-2xl px-4 py-3 pl-10 text-xs sm:text-sm text-ink placeholder-ink-mute focus:outline-none focus:border-brand font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                  Stock Qty
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="10"
                  className="w-full bg-canvas border border-line rounded-2xl px-4 py-3 text-xs sm:text-sm text-ink placeholder-ink-mute focus:outline-none focus:border-brand font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-canvas border border-line rounded-2xl px-4 py-3 text-xs sm:text-sm text-ink focus:outline-none focus:border-brand font-medium transition-all"
                >
                  <option value="Electronics">Electronics</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Home & Living">Home & Living</option>
                </select>
              </div>
            </div>

            {/* Available Sizes Input Configuration */}
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Ruler size={14} className="text-brand" />
                Available Sizes (Comma Separated)
              </label>
              <input
                type="text"
                value={sizesInput}
                onChange={(e) => setSizesInput(e.target.value)}
                placeholder="e.g. 7, 8, 9 or Small, Medium, Large"
                className="w-full bg-canvas border border-line rounded-2xl px-4 py-3 text-xs sm:text-sm text-ink placeholder-ink-mute focus:outline-none focus:border-brand font-medium transition-all"
              />
              <p className="text-[11px] text-ink-mute mt-1">
                Enter sizes separated by commas. Leave empty or type "Standard" if sizes do not apply.
              </p>
            </div>

            {/* Flash Sale Section */}
            <div className="bg-canvas border border-line rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5">
                  ⚡ Flash Sale Configuration (Optional)
                </span>
                <span className="text-[11px] text-ink-mute">Leave blank for regular price</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Discount Percentage (%)
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3.5 top-3 text-ink-mute" size={16} />
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(e.target.value)}
                      placeholder="e.g. 20"
                      className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 pl-9 text-xs sm:text-sm text-ink placeholder-ink-mute focus:outline-none focus:border-brand font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Sale Ends At (Date & Time)
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={saleEndDate}
                      onChange={(e) => setSaleEndDate(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:outline-none focus:border-brand font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Image Gallery Upload Section */}
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
                Product Gallery Images (Upload multiple angles / colors)
              </label>

              {/* Uploaded Thumbnails Preview */}
              <div className="grid grid-cols-4 gap-3 mb-3">
                {imagesList.map((url, index) => (
                  <div key={index} className="relative h-20 bg-white border border-line rounded-xl overflow-hidden group">
                    <img src={url} alt={`Angle ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImagesList(imagesList.filter((_, i) => i !== index));
                        toast.info("Image removed from gallery");
                      }}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Cloudinary Upload Widget */}
              <CldUploadWidget
                uploadPreset={UPLOAD_PRESET}
                options={{
                  cloudName: CLOUD_NAME,
                  multiple: true,
                  sources: ["local", "camera"],
                }}
                onSuccess={(result: any) => {
                  const secureUrl = result?.info?.secure_url;
                  if (secureUrl) {
                    setImagesList((prev) => [...prev, secureUrl]);
                    toast.success("Image uploaded to gallery! 📸");
                  }
                }}
                onError={(err: any) => {
                  console.error("❌ [CLOUDINARY UPLOAD ERROR]:", err);
                  toast.error("Cloudinary upload popup/widget error! Check preset & cloud name.");
                }}
              >
                {({ open, isLoading }) => (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      if (!UPLOAD_PRESET || !CLOUD_NAME) {
                        toast.error("Cloudinary env variables missing! Check .env.local or Vercel.");
                        return;
                      }
                      open?.();
                    }}
                    className="w-full border-2 border-dashed border-line hover:border-brand bg-canvas p-6 rounded-2xl flex flex-col items-center justify-center space-y-2 transition-all cursor-pointer group disabled:opacity-60"
                  >
                    <div className="p-3 bg-surface-soft rounded-2xl text-brand group-hover:scale-110 transition-transform">
                      {isLoading ? <Loader2 className="animate-spin" size={24} /> : <UploadCloud size={24} />}
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-ink group-hover:text-brand transition-colors">
                      {isLoading ? "Loading uploader..." : "+ Click to add another angle / color image"}
                    </span>
                    <span className="text-[10px] text-ink-mute font-medium">You can upload multiple photos</span>
                  </button>
                )}
              </CldUploadWidget>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed features about product..."
                className="w-full bg-canvas border border-line rounded-2xl px-4 py-3 text-xs sm:text-sm text-ink placeholder-ink-mute focus:outline-none focus:border-brand font-medium transition-all resize-none"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-brand hover:bg-brand-hover text-white font-medium py-3.5 rounded-full shadow-md shadow-pop/25 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Publish Product with Sizes & Gallery</span>}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}