import { NextResponse } from "next/server";
import mongoose from "mongoose";
import axios from "axios";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { orderRatelimit, getClientIp, safeLimit } from "@/lib/ratelimit";
import { getEffectivePrice } from "@/lib/pricing";
import { reserveStock, restoreStock, linesFromOrderItems, StockError, StockLine } from "@/lib/stock";
import { invalidateProductCache, NO_STORE_HEADERS } from "@/lib/cache";
import Product from "@/models/Products";
import Coupon from "@/models/Coupon";
import Order from "@/models/Order";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const ALLOWED_STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

function formatWhatsAppNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.trim().replace(/[\s\-\+\(\)]/g, "");
  if (cleaned.startsWith("0")) cleaned = "92" + cleaned.slice(1);
  else if (cleaned.length === 10 && cleaned.startsWith("3")) cleaned = "92" + cleaned;
  return cleaned;
}

async function sendWhatsAppNotification(phone: string, message: string) {
  try {
    const instanceId = process.env.WHATSAPP_INSTANCE_ID;
    const token = process.env.WHATSAPP_TOKEN;
    if (!instanceId || !token) {
      console.warn("WhatsApp credentials missing in .env");
      return;
    }
    const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
    const response = await axios.post(url, { token, to: formatWhatsAppNumber(phone), body: message });
    console.log("✅ UltraMsg WhatsApp message sent:", response.data);
  } catch (error: any) {
    console.error("❌ UltraMsg notification failed:", error?.response?.data || error?.message || error);
  }
}

// ---------------------------------------------------------------------------
// POST: order create + stock decrease (atomic)
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  let reservedLines: StockLine[] = [];
  try {
    const { success } = await safeLimit(orderRatelimit, getClientIp(req));
    if (!success) {
      return NextResponse.json(
        { message: "Bohat ziyaada order requests aa gayi hain. Baraye meharbaani kuch der baad koshish karein." },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ message: "Unauthorized: Please sign in to place an order." }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { customerDetails, items, couponCode } = body ?? {};

    if (!customerDetails || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: "Invalid order data or empty cart" }, { status: 400 });
    }

    // 1) Cart lines validate karo
    const cartLines: { id: string; quantity: number; selectedSize: string }[] = [];
    for (const item of items) {
      const quantity = Math.floor(Number(item?.quantity));
      const prodId = String(item?._id || item?.productId || item?.id || "");
      if (!prodId || !Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json({ message: "Invalid item quantity or product ID detected." }, { status: 400 });
      }
      if (!mongoose.Types.ObjectId.isValid(prodId)) {
        return NextResponse.json({ message: `Invalid Product ID format: ${prodId}` }, { status: 400 });
      }
      cartLines.push({ id: prodId, quantity, selectedSize: String(item?.selectedSize || "Standard") });
    }

    // 2) Products DB se fresh lo (cache se nahi)
    const uniqueIds = [...new Set(cartLines.map((l) => l.id))];
    const dbProducts = await Product.find({ _id: { $in: uniqueIds } }).lean();
    const productMap = new Map(dbProducts.map((p: any) => [String(p._id), p]));

    // 3) Same product ki multiple sizes ko merge karke total stock check karo
    const totalQtyByProduct = new Map<string, number>();
    for (const line of cartLines) {
      totalQtyByProduct.set(line.id, (totalQtyByProduct.get(line.id) || 0) + line.quantity);
    }
    for (const [id, qty] of totalQtyByProduct) {
      const p: any = productMap.get(id);
      if (!p) return NextResponse.json({ message: `Product not found: ${id}` }, { status: 404 });
      if ((Number(p.stock) || 0) < qty) {
        return NextResponse.json(
          { message: `Insufficient stock for "${p.title}". Available: ${Number(p.stock) || 0}` },
          { status: 409 }
        );
      }
    }

    // 4) Server-side price calculation (client ki price par bharosa nahi)
    let subtotal = 0;
    const verifiedItems = cartLines.map((line) => {
      const p: any = productMap.get(line.id);
      const effectivePrice = getEffectivePrice(p);
      subtotal += effectivePrice * line.quantity;
      return {
        _id: p._id,
        title: p.title,
        price: effectivePrice,
        originalPrice: Number(p.price),
        quantity: line.quantity,
        selectedSize: line.selectedSize,
        image: p.images?.[0] || p.image || "",
      };
    });

    let discountAmount = 0;
    let appliedCouponName: string | null = null;
    if (couponCode) {
      const validCoupon: any = await Coupon.findOne({
        code: String(couponCode).toUpperCase().trim(),
        isActive: true,
      }).lean();
      if (validCoupon && new Date() <= new Date(validCoupon.expiryDate)) {
        discountAmount = (subtotal * validCoupon.discountPercentage) / 100;
        appliedCouponName = validCoupon.code;
      }
    }
    const finalTotalAmount = Math.max(0, subtotal - discountAmount);

    // 5) STOCK DECREASE: atomic $inc (condition: stock >= qty)
    const stockLines: StockLine[] = [...totalQtyByProduct].map(([id, qty]) => ({
      productId: id,
      quantity: qty,
      title: (productMap.get(id) as any)?.title,
    }));
    const { reserved, newStock } = await reserveStock(stockLines);
    reservedLines = reserved;

    // 6) Order save. Fail ho to stock wapas (catch block mein)
    const isCard = customerDetails.paymentMethod === "card";
    const safeCustomer = {
      fullName: String(customerDetails.fullName ?? "").trim(),
      email: String(customerDetails.email ?? "").trim(),
      phone: String(customerDetails.phone ?? "").trim(),
      city: String(customerDetails.city ?? "").trim(),
      address: String(customerDetails.address ?? "").trim(),
      paymentMethod: isCard ? "card" : "cod",
    };

    const newOrder = await Order.create({
      userEmail: session.user.email,
      customerDetails: safeCustomer,
      paymentInfo: {
        method: isCard ? "card" : "cod",
        paymentStatus: isCard ? "Paid" : "Pending",
        last4: isCard && body?.paymentInfo?.last4 ? String(body.paymentInfo.last4).slice(-4) : undefined,
      },
      items: verifiedItems,
      couponApplied: appliedCouponName,
      discountAmount: Number(discountAmount.toFixed(2)),
      totalAmount: Number(finalTotalAmount.toFixed(2)),
      status: "Pending",
    });
    reservedLines = []; // order save ho gaya, rollback ki zaroorat nahi

    if (safeCustomer.phone) {
      const orderShortId = newOrder._id.toString().slice(-6).toUpperCase();
      const paymentText = isCard ? "Paid via Card" : "Cash on Delivery";
      const message = `Hello ${safeCustomer.fullName}! ✨ Aapka Outfitters store par order #${orderShortId} (${paymentText}) successfully place ho gaya hai. Total Amount: Rs. ${finalTotalAmount.toLocaleString()}. Shukriya!`;
      sendWhatsAppNotification(safeCustomer.phone, message).catch((err) =>
        console.error("Background WhatsApp Error:", err)
      );
    }

    return NextResponse.json(
      { message: "Order placed successfully", orderId: newOrder._id, totalAmount: newOrder.totalAmount, newStock },
      { status: 201, headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    // Order save fail hua magar stock minus ho chuka tha -> wapas karo
    if (reservedLines.length > 0) {
      await restoreStock(reservedLines);
    }
    if (error instanceof StockError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error?.name === "ValidationError") {
      return NextResponse.json({ message: "Please fill all shipping details correctly.", error: error.message }, { status: 400 });
    }
    console.error("❌ Error saving order / decreasing stock:", error);
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET: user ke apne orders (admin ko sab)
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const isAdmin = session.user.email === ADMIN_EMAIL;
    const query = isAdmin
      ? {}
      : { $or: [{ userEmail: session.user.email }, { "customerDetails.email": session.user.email }] };

    const orders = await Order.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ orders }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ message: "Failed to fetch orders", error: error.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH: admin status update (cancel par stock restore, sirf ek baar)
// ---------------------------------------------------------------------------
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ message: "Forbidden: Admin only." }, { status: 403 });
    }
    await dbConnect();
    const { orderId, status } = await req.json();

    if (!orderId || !status) {
      return NextResponse.json({ message: "Order ID and status are required" }, { status: 400 });
    }
    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ message: "Invalid status value" }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json({ message: "Invalid order ID" }, { status: 400 });
    }

    const existingOrder: any = await Order.findById(orderId);
    if (!existingOrder) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    if (existingOrder.status === "Cancelled" && status !== "Cancelled") {
      return NextResponse.json(
        { message: "Cancelled order dobara active nahi ho sakta (stock pehle hi wapas ja chuka hai). Naya order banwayen." },
        { status: 400 }
      );
    }

    let updatedOrder: any;
    if (status === "Cancelled") {
      // Atomic: sirf wohi request stock restore karegi jo status ko pehli baar Cancelled karti hai
      const before: any = await Order.findOneAndUpdate(
        { _id: orderId, status: { $ne: "Cancelled" } },
        { status: "Cancelled" },
        { new: false }
      );
      if (before) await restoreStock(linesFromOrderItems(before.items));
      updatedOrder = await Order.findById(orderId);
    } else {
      updatedOrder = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
    }

    const customerPhone = updatedOrder?.customerDetails?.phone;
    if (customerPhone) {
      const orderShortId = updatedOrder._id.toString().slice(-6).toUpperCase();
      const message = `Hello ${updatedOrder.customerDetails?.fullName || "Customer"}! 📦 Aapka Outfitters store ka order #${orderShortId} ka status update ho kar *${status}* ho gaya hai. Shukriya! ✨`;
      sendWhatsAppNotification(customerPhone, message).catch((err) =>
        console.error("Background Status WhatsApp Error:", err)
      );
    }

    return NextResponse.json({ message: "Order status updated successfully", order: updatedOrder }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating order status:", error);
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 });
  }
}
