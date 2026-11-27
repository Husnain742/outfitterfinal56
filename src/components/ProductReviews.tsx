"use client";

import { useState, useEffect } from "react";
import { Star, Upload, Loader2, MessageSquare, CheckCircle } from "lucide-react";
import axios from "axios";

export default function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [image, setImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchReviews();
    }
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`/api/reviews?productId=${productId}`);
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cloudinary image upload handler (jaise aapne products ke liye use kiya hai)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ecommerce_preset"); // Aapka exact preset

    try {
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/dfzkogxo/image/upload`, // Aapka exact cloud name
        formData
      );
      setImage(res.data.secure_url);
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Image upload failed. Please check Cloudinary config.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !comment) {
      alert("Please fill in your name and review comment.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post("/api/reviews", {
        productId,
        customerName,
        rating,
        comment,
        image,
      });

      if (res.status === 201) {
        setSuccessMsg("Review submitted successfully! ✨");
        setCustomerName("");
        setComment("");
        setImage("");
        setRating(5);
        fetchReviews();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate average rating
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : "5.0";

  return (
    <div className="space-y-8 mt-12 border-t border-line pt-10">
      {/* Header & Overall Rating */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-line p-6 rounded-3xl">
        <div>
          <h3 className="text-2xl font-serif font-bold text-ink">Customer Reviews & Photos</h3>
          <p className="text-xs text-ink-soft mt-1">Real feedback from clients who purchased this handmade item.</p>
        </div>
        <div className="flex items-center space-x-3 bg-canvas px-5 py-3 rounded-2xl border border-line">
          <div className="flex text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={18} fill={i < Math.round(Number(avgRating)) ? "currentColor" : "none"} />
            ))}
          </div>
          <span className="font-serif font-bold text-lg text-ink">{avgRating} <span className="text-xs text-ink-soft font-sans font-normal">({reviews.length} reviews)</span></span>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs flex items-center space-x-2">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Reviews List & Write Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left: Reviews List */}
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-brand" size={32} />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 bg-surface border border-line rounded-3xl p-6">
              <MessageSquare className="mx-auto text-brand mb-2" size={28} />
              <p className="text-sm font-bold text-ink">No reviews yet</p>
              <p className="text-xs text-ink-soft mt-1">Be the first to share your experience with this handmade creation!</p>
            </div>
          ) : (
            reviews.map((rev) => (
              <div key={rev._id} className="bg-surface border border-line p-5 rounded-3xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-ink">{rev.customerName}</span>
                  <div className="flex text-amber-500">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} size={14} fill="currentColor" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-ink-soft leading-relaxed">{rev.comment}</p>
                {rev.image && (
                  <div className="mt-2">
                    <img src={rev.image} alt="Customer Review Photo" className="w-24 h-24 object-cover rounded-2xl border border-line shadow-xs" />
                  </div>
                )}
                <p className="text-[10px] text-on-dark-mute">{new Date(rev.createdAt).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>

        {/* Right: Write a Review Form */}
        <div className="bg-surface border border-line p-6 sm:p-8 rounded-3xl space-y-6">
          <h4 className="text-lg font-serif font-bold text-ink">Leave Your Review & Photo</h4>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Your Name</label>
              <input
                type="text"
                placeholder="e.g. Ayesha Khan"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-canvas border border-line rounded-2xl p-3 text-xs font-medium text-ink focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Rating</label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      rating >= star ? "bg-brand text-white border-brand" : "bg-canvas text-ink-soft border-line"
                    }`}
                  >
                    <Star size={16} fill={rating >= star ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Review Comment</label>
              <textarea
                rows={3}
                placeholder="Write about the quality of this handmade item..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-canvas border border-line rounded-2xl p-3 text-xs font-medium text-ink focus:outline-none resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Upload Real Photo (Optional)</label>
              <div className="flex items-center space-x-4">
                <label className="flex-grow flex items-center justify-center px-4 py-3 bg-canvas border border-line rounded-2xl cursor-pointer hover:bg-canvas/80 transition-all text-xs font-semibold text-ink-soft">
                  <Upload size={16} className="mr-2 text-brand" />
                  <span>{uploadingImage ? "Uploading..." : image ? "Photo Uploaded ✔" : "Choose Image"}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {image && (
                  <img src={image} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-line" />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-brand hover:bg-brand-hover text-white font-medium rounded-full text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : <span>Submit Review</span>}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}