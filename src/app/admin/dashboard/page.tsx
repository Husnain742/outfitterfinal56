"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  ShoppingBag,
  Loader2,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Download,
  LayoutDashboard,
  Users,
  BarChart3,
  Store,
  Tag,
  Trash2,
  Megaphone,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  LogOut,
  Printer,
  Crown,
  Trophy,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const LOW_STOCK_LIMIT = 5;
const VIP_SPENT_LIMIT = 100000;

const COLORS = ["#E63946", "#F4A261", "#E9C46A", "#2A9D8F", "#457B9D", "#9b5de5"];
const STATUS_COLORS: Record<string, string> = {
  Pending: "#E9A23B",
  Shipped: "#457B9D",
  Delivered: "#2A9D8F",
  Cancelled: "#E63946",
};
const AXIS_TICK = { fill: "#3A2E28", fontSize: 11 };
const TOOLTIP_STYLE = {
  backgroundColor: "#EFEAE5",
  borderColor: "#E5DFDA",
  borderRadius: "1rem",
  color: "#1A120E",
};
const CARD = "bg-[#EFEAE5] border border-[#E5DFDA] rounded-3xl p-6 sm:p-8 shadow-sm";
const INPUT =
  "w-full bg-[#FAF7F5] border border-[#E5DFDA] rounded-2xl p-3 text-xs font-medium text-[#1A120E]";
const LABEL = "text-xs font-bold text-[#5E4E46] mb-1 block";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "coupons", label: "Coupons", icon: Tag },
  { id: "announcement", label: "Announcement Bar", icon: Megaphone },
  { id: "customers", label: "Customers", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

const formatRs = (n: number) => `Rs. ${Math.round(n || 0).toLocaleString("en-US")}`;
const shortNumber = (n: number) =>
  n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
const shortName = (v: string) => (v && v.length > 10 ? `${v.slice(0, 9)}…` : v);
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const escapeHtml = (s: any) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const dayLabel = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const getOrderDate = (o: any) => new Date(o.createdAt || Date.now());

const percentChange = (current: number, previous: number): number | null => {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
};

const statusBadge = (status: string) =>
  status === "Delivered"
    ? "bg-emerald-100 text-emerald-800"
    : status === "Shipped"
    ? "bg-blue-100 text-blue-800"
    : status === "Cancelled"
    ? "bg-rose-100 text-rose-800"
    : "bg-amber-100 text-amber-800";

const segmentOf = (c: { spent: number; orders: number }) =>
  c.spent >= VIP_SPENT_LIMIT || c.orders >= 3 ? "VIP" : c.orders === 1 ? "New" : "Regular";

const GrowthBadge = ({ value, show }: { value: number | null; show: boolean }) => {
  if (!show) return null;
  if (value === null) {
    return (
      <span className="inline-flex items-center text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
        New
      </span>
    );
  }
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
        up ? "text-emerald-700 bg-emerald-100" : "text-rose-700 bg-rose-100"
      }`}
    >
      {up ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
      {up ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("overview");
  const [dateFilter, setDateFilter] = useState("7days");
  const [mobileAdminMenuOpen, setMobileAdminMenuOpen] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [productLoading, setProductLoading] = useState(true);
  const [productSearch, setProductSearch] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");

  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponForm, setCouponForm] = useState({ code: "", discountPercentage: "", expiryDate: "" });
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);

  const [announcementText, setAnnouncementText] = useState("✨ Special Offer: Use code at checkout to get 20% OFF!");
  const [announcementCode, setAnnouncementCode] = useState("LUMIERE20");
  const [isAnnouncementActive, setIsAnnouncementActive] = useState(true);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ title: "", price: "", stock: "", description: "", discountPercentage: "", saleEndDate: "" });
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.email !== ADMIN_EMAIL) {
      toast.error("Access Denied: Authorized Admin Only!");
      router.push("/");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.email === ADMIN_EMAIL) {
      fetchOrders();
      fetchProducts();
      fetchCoupons();
      fetchAnnouncement();
    }
  }, [session]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get("/api/orders");
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      toast.error("Failed to fetch orders");
    } finally {
      setOrderLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get("/api/products");
      setProducts(res.data.products || []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      toast.error("Failed to fetch products");
    } finally {
      setProductLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const res = await axios.get("/api/coupons");
      setCoupons(res.data.coupons || []);
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
    }
  };

  const fetchAnnouncement = async () => {
    try {
      const res = await axios.get("/api/announcement");
      if (res.data.success && res.data.banner) {
        setAnnouncementText(res.data.banner.text);
        setAnnouncementCode(res.data.banner.couponCode);
        setIsAnnouncementActive(res.data.banner.isActive);
      }
    } catch (err) {
      console.error("Failed to fetch announcement:", err);
    }
  };

  const handleSaveAnnouncement = async () => {
    setIsSavingAnnouncement(true);
    try {
      const res = await axios.post("/api/announcement", {
        text: announcementText,
        couponCode: announcementCode,
        isActive: isAnnouncementActive,
      });
      if (res.data.success) {
        toast.success("Announcement banner updated successfully!");
        router.refresh();
      }
    } catch (err) {
      toast.error("Failed to update announcement");
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code || !couponForm.discountPercentage || !couponForm.expiryDate) return;
    setIsCreatingCoupon(true);
    try {
      const res = await axios.post("/api/coupons", couponForm);
      if (res.data.success) {
        setCoupons([res.data.coupon, ...coupons]);
        setCouponForm({ code: "", discountPercentage: "", expiryDate: "" });
        toast.success("Coupon created successfully!");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create coupon");
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Delete this coupon code?")) return;
    try {
      const res = await axios.delete(`/api/coupons?id=${id}`);
      if (res.data.success) {
        setCoupons(coupons.filter((c) => c._id !== id));
        toast.success("Coupon deleted");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to delete coupon:", err);
      toast.error("Failed to delete coupon");
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await axios.patch("/api/orders", { orderId, status: newStatus });
      if (res.status === 200) {
        setOrders(orders.map((order) => (order._id === orderId ? { ...order, status: newStatus } : order)));
        toast.success(`Order status updated to ${newStatus}`);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await axios.delete(`/api/products/${id}`);
      if (res.data.success) {
        setProducts(products.filter((p) => p._id !== id));
        toast.success("Product deleted successfully");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to delete product:", err);
      toast.error("Failed to delete product");
    }
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setEditForm({
      title: product.title,
      price: product.price,
      stock: product.stock ?? 0,
      description: product.description || "",
      discountPercentage: product.discountPercentage ?? "",
      saleEndDate: product.saleEndDate ? new Date(product.saleEndDate).toISOString().slice(0, 16) : "",
    });
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsUpdatingProduct(true);
    try {
      const res = await axios.put(`/api/products/${editingProduct._id}`, {
        ...editForm,
        price: Number(editForm.price),
        stock: Number(editForm.stock),
        discountPercentage: editForm.discountPercentage ? Number(editForm.discountPercentage) : 0,
        saleEndDate: editForm.saleEndDate ? new Date(editForm.saleEndDate).toISOString() : null,
      });
      if (res.data.success) {
        setProducts(products.map((p) => (p._id === editingProduct._id ? res.data.product : p)));
        setEditingProduct(null);
        toast.success("Product updated successfully! ✨");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to update product:", err);
      toast.error("Failed to update product");
    } finally {
      setIsUpdatingProduct(false);
    }
  };

  const handlePrintInvoice = (order: any) => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) {
      toast.error("Popup blocked! Browser mein popups allow karein.");
      return;
    }
    const c = order.customerDetails || {};
    const rows = (order.items || [])
      .map(
        (item: any) =>
          `<tr><td>${escapeHtml(item.title)}</td><td style="text-align:center">${escapeHtml(item.quantity)}</td><td style="text-align:right">${formatRs(item.price)}</td><td style="text-align:right">${formatRs(item.price * item.quantity)}</td></tr>`
      )
      .join("");
    const discountRow = order.couponApplied
      ? `<p style="color:#047857">Promo (${escapeHtml(order.couponApplied)}): - ${formatRs(order.discountAmount || 0)}</p>`
      : "";
    w.document.write(`<html><head><title>Invoice</title>
      <style>
        body{font-family:Georgia,serif;padding:40px;color:#1A120E}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{padding:10px;border-bottom:1px solid #ddd;font-size:14px;text-align:left}
        h1{margin:0;color:#8C5E73}
        .total{text-align:right;font-size:20px;font-weight:bold;margin-top:20px}
      </style></head><body>
      <h1>Lumière</h1>
      <p>Invoice #${escapeHtml(order._id.slice(-6).toUpperCase())} | ${getOrderDate(order).toLocaleDateString()}</p>
      <p><strong>${escapeHtml(c.fullName)}</strong><br/>${escapeHtml(c.phone)}<br/>${escapeHtml(c.email)}<br/>${escapeHtml(c.address)}, ${escapeHtml(c.city)}</p>
      <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
      ${discountRow}
      <p class="total">Total: ${formatRs(order.totalAmount)}</p>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const exportOrdersToCSV = () => {
    if (!orders || orders.length === 0) {
      toast.info("No orders to export!");
      return;
    }
    const cell = (v: any) => `"${String(v ?? "N/A").replace(/"/g, '""')}"`;
    const headers = ["Order ID", "Date", "Customer Name", "Email", "Phone", "City", "Address", "Total Amount (Rs.)", "Status"];
    const csvRows = orders.map((o: any) =>
      [
        cell(`#${o._id.slice(-6).toUpperCase()}`),
        cell(getOrderDate(o).toLocaleDateString()),
        cell(o.customerDetails?.fullName),
        cell(o.customerDetails?.email),
        cell(o.customerDetails?.phone),
        cell(o.customerDetails?.city),
        cell(o.customerDetails?.address),
        Number(o.totalAmount || 0).toFixed(2),
        cell(o.status || "Pending"),
      ].join(",")
    );
    const blob = new Blob([[headers.join(","), ...csvRows].join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Orders_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Orders report downloaded successfully!");
  };

  if (status === "loading" || orderLoading || productLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F5] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-[#8C5E73]" size={48} />
        <p className="text-sm text-[#5E4E46] font-medium">Loading Admin Portal...</p>
      </div>
    );
  }

  if (!session || session.user?.email !== ADMIN_EMAIL) return null;

  // ---------- Date range (current period + previous period for growth %) ----------
  const now = new Date();
  const todayStart = startOfDay(now);
  const periodDays = dateFilter === "today" ? 1 : dateFilter === "7days" ? 7 : dateFilter === "30days" ? 30 : 0;
  const periodStart: Date | null = periodDays > 0 ? addDays(todayStart, -(periodDays - 1)) : null;
  const prevStart: Date | null = periodStart ? addDays(periodStart, -periodDays) : null;
  const hasPrevPeriod = periodStart !== null;
  const prevLabel = periodDays === 1 ? "vs yesterday" : `vs previous ${periodDays} days`;

  const sortedOrders = [...orders].sort((a, b) => getOrderDate(b).getTime() - getOrderDate(a).getTime());
  // Cancelled orders revenue/orders mein count nahi hote
  const activeOrders = sortedOrders.filter((o) => o.status !== "Cancelled");

  const inPeriod = (o: any) => !periodStart || getOrderDate(o) >= periodStart;
  const inPrevPeriod = (o: any) => {
    if (!periodStart || !prevStart) return false;
    const d = getOrderDate(o);
    return d >= prevStart && d < periodStart;
  };

  const filteredByDateOrders = activeOrders.filter(inPeriod);
  const prevPeriodOrders = activeOrders.filter(inPrevPeriod);

  const sumAmount = (list: any[]) => list.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  const totalRevenue = sumAmount(filteredByDateOrders);
  const totalOrders = filteredByDateOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const prevRevenue = sumAmount(prevPeriodOrders);
  const prevOrdersCount = prevPeriodOrders.length;
  const prevAverage = prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0;

  const revenueGrowth = percentChange(totalRevenue, prevRevenue);
  const ordersGrowth = percentChange(totalOrders, prevOrdersCount);
  const averageGrowth = percentChange(averageOrderValue, prevAverage);

  // ---------- Order status counts ----------
  const statusCounts: Record<string, number> = { Pending: 0, Shipped: 0, Delivered: 0, Cancelled: 0 };
  orders.forEach((o) => {
    const s = o.status || "Pending";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  const pendingOrdersCount = statusCounts.Pending;
  const statusPieData = Object.entries(statusCounts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  // ---------- Inventory ----------
  const lowStockProducts = products
    .filter((p) => (p.stock ?? 0) < LOW_STOCK_LIMIT)
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));

  // ---------- Sales line chart: har din (khali din = 0), purani date pehle ----------
  const salesLineChartData = (() => {
    const buckets: { key: string; date: string; revenue: number }[] = [];

    if (dateFilter === "today") {
      for (let h = 0; h < 24; h++) buckets.push({ key: String(h), date: `${h}:00`, revenue: 0 });
      filteredByDateOrders.forEach((o) => {
        buckets[getOrderDate(o).getHours()].revenue += o.totalAmount || 0;
      });
      return buckets;
    }

    let start = periodStart;
    if (!start) {
      const oldest = activeOrders.length
        ? Math.min(...activeOrders.map((o) => getOrderDate(o).getTime()))
        : todayStart.getTime();
      start = startOfDay(new Date(oldest));
      const maxStart = addDays(todayStart, -364);
      if (start < maxStart) start = maxStart;
    }

    for (let d = new Date(start); d <= todayStart; d = addDays(d, 1)) {
      buckets.push({ key: dayKey(d), date: dayLabel(d), revenue: 0 });
    }
    const index = new Map(buckets.map((b, i) => [b.key, i] as [string, number]));
    filteredByDateOrders.forEach((o) => {
      const i = index.get(dayKey(getOrderDate(o)));
      if (i !== undefined) buckets[i].revenue += o.totalAmount || 0;
    });
    return buckets;
  })();

  // ---------- Customers (unique, orders + spent) ----------
  const buildCustomers = (list: any[]) => {
    const map = new Map<string, { name: string; email: string; phone: string; city: string; orders: number; spent: number; lastOrder: Date }>();
    list.forEach((o) => {
      const d = o.customerDetails || {};
      const key = String(d.email || d.phone || d.fullName || o._id).toLowerCase();
      const existing = map.get(key);
      const amount = o.status === "Cancelled" ? 0 : o.totalAmount || 0;
      if (existing) {
        existing.orders += 1;
        existing.spent += amount;
      } else {
        map.set(key, {
          name: d.fullName || `#${o._id.slice(-6).toUpperCase()}`,
          email: d.email || "",
          phone: d.phone || "",
          city: d.city || "",
          orders: 1,
          spent: amount,
          lastOrder: getOrderDate(o),
        });
      }
    });
    return Array.from(map.values());
  };

  const allCustomers = buildCustomers(sortedOrders).sort((a, b) => b.spent - a.spent);
  const periodCustomers = buildCustomers(filteredByDateOrders);

  const customerBarChartData = [...periodCustomers]
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 8)
    .map((c) => ({ name: c.name, totalAmount: c.spent }));

  const topCustomersChartData = [...periodCustomers]
    .sort((a, b) => b.orders - a.orders || b.spent - a.spent)
    .slice(0, 5)
    .map((c) => ({ name: c.name, orders: c.orders }));

  // ---------- Top selling products ----------
  const productSalesMap: Record<string, { title: string; qty: number; revenue: number }> = {};
  filteredByDateOrders.forEach((o) =>
    (o.items || []).forEach((item: any) => {
      const key = item.title || "Unknown";
      if (!productSalesMap[key]) productSalesMap[key] = { title: key, qty: 0, revenue: 0 };
      productSalesMap[key].qty += Number(item.quantity || 0);
      productSalesMap[key].revenue += Number(item.price || 0) * Number(item.quantity || 0);
    })
  );
  const topProducts = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const maxTopQty = topProducts[0]?.qty || 1;

  // ---------- Sales by city ----------
  const cityMap: Record<string, number> = {};
  filteredByDateOrders.forEach((o) => {
    const raw = (o.customerDetails?.city || "").trim();
    const city = raw ? titleCase(raw) : "Unknown";
    cityMap[city] = (cityMap[city] || 0) + (o.totalAmount || 0);
  });
  const cityChartData = Object.entries(cityMap)
    .map(([city, revenue]) => ({ city, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // ---------- Categories ----------
  const categoryData = products.reduce((acc: any, product: any) => {
    const cat = product.category || "General";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const pieChartData = Object.keys(categoryData).map((key) => ({ name: key, value: categoryData[key] }));

  // ---------- Search / filters ----------
  const filteredOrders = sortedOrders.filter((o) => {
    const q = orderSearch.toLowerCase();
    const matchSearch =
      o._id.toLowerCase().includes(q) || o.customerDetails?.fullName?.toLowerCase().includes(q);
    const matchStatus = orderStatusFilter === "All" || (o.status || "Pending") === orderStatusFilter;
    return matchSearch && matchStatus;
  });
  const filteredProducts = products.filter(
    (p) =>
      p.title?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category?.toLowerCase().includes(productSearch.toLowerCase())
  );
  const filteredCustomers = allCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
  );

  const pieLabel = { fill: "#1A120E", fontSize: 12 };
  const pieLegendFormatter = (value: string) => (
    <span style={{ color: "#1A120E", fontSize: 12 }}>{value}</span>
  );

  return (
    <div className="min-h-screen bg-[#FAF7F5] text-[#2C2420] font-sans flex flex-col">
      <Navbar />

      <div className="flex flex-grow w-full relative">
        <aside className="w-64 bg-[#2A1424] text-[#EFEAE5] hidden md:flex flex-col justify-between p-6 border-r border-[#3D2036] shadow-2xl sticky top-[73px] h-[calc(100vh-73px)] flex-shrink-0">
          <div className="space-y-8">
            <div className="flex items-center space-x-3 px-2">
              <div className="p-2.5 bg-[#8C5E73] rounded-2xl text-white shadow-md">
                <Store size={22} />
              </div>
              <span className="font-serif text-xl font-bold tracking-wide text-white">Lumière</span>
            </div>

            <nav className="space-y-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#542B49] text-white shadow-lg font-bold border border-[#753B64]"
                        : "text-[#D9C4CF] hover:bg-[#3B1E34] hover:text-white"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="pt-6 border-t border-[#3D2036] space-y-3">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium text-[#D9C4CF] hover:bg-[#3B1E34] hover:text-white transition-all cursor-pointer"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
            <p className="text-[11px] text-[#A88B9A] font-medium text-center">Lumière Admin Panel</p>
          </div>
        </aside>

        <main className="flex-grow p-4 sm:p-8 pt-4 sm:pt-6 space-y-8 overflow-y-auto min-w-0">
          <div className="md:hidden bg-[#2A1424] text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-2">
              <Store size={18} className="text-[#D9C4CF]" />
              <span className="font-serif font-bold text-sm capitalize">{activeTab}</span>
            </div>
            <button
              onClick={() => setMobileAdminMenuOpen(!mobileAdminMenuOpen)}
              className="px-3.5 py-1.5 bg-[#8C5E73] rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <LayoutDashboard size={14} />
              <span>{mobileAdminMenuOpen ? "Close Menu" : "Admin Menu"}</span>
            </button>
          </div>

          {mobileAdminMenuOpen && (
            <div className="md:hidden bg-[#2A1424] text-[#EFEAE5] p-3 rounded-2xl grid grid-cols-2 gap-2 border border-[#3D2036] shadow-xl">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileAdminMenuOpen(false);
                    }}
                    className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive ? "bg-[#8C5E73] text-white shadow-md" : "bg-[#3B1E34]/60 text-[#D9C4CF] hover:text-white"
                    }`}
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#3B1E34]/60 text-[#D9C4CF] hover:text-white cursor-pointer"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          )}

          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#EFEAE5] border border-[#E5DFDA] p-6 sm:p-8 rounded-3xl shadow-sm">
                <div>
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#F7EBEF] border border-[#E5DFDA] text-[#8C5E73] text-xs font-semibold mb-2">
                    <ShieldCheck size={14} />
                    <span>Verified Admin Portal</span>
                  </div>
                  <h1 className="text-3xl font-serif font-bold text-[#1A120E]">Dashboard Overview</h1>
                  <p className="text-xs sm:text-sm text-[#5E4E46] mt-1">Monitor store activity, revenue trends, and order progress.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center bg-[#FAF7F5] border border-[#E5DFDA] rounded-full px-4 py-2 text-xs font-bold text-[#5E4E46]">
                    <Calendar size={14} className="mr-2 text-[#8C5E73]" />
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="bg-transparent border-none outline-none cursor-pointer text-[#1A120E]"
                    >
                      <option value="today">Today</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="all">All Time</option>
                    </select>
                  </div>

                  <Link href="/admin/add-product">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-[#8C5E73] hover:bg-[#784E60] text-white font-medium px-5 py-2.5 rounded-full shadow-md text-xs flex items-center space-x-2 cursor-pointer whitespace-nowrap">
                      <PlusCircle size={16} />
                      <span>Add Product</span>
                    </motion.button>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-amber-100 rounded-2xl text-amber-800"><Clock size={22} /></div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-amber-900">Pending Fulfillment</h4>
                      <p className="text-[11px] text-amber-700">{pendingOrdersCount} order(s) need to be shipped.</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveTab("orders")} className="px-4 py-2 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-full font-bold text-xs cursor-pointer">
                    Manage Orders
                  </button>
                </div>

                <div className={`border p-5 rounded-3xl flex items-center justify-between shadow-xs ${lowStockProducts.length > 0 ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-emerald-50 border-emerald-200 text-emerald-900"}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-2xl ${lowStockProducts.length > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {lowStockProducts.length > 0 ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold">Inventory Status</h4>
                      <p className="text-[11px]">{lowStockProducts.length > 0 ? `${lowStockProducts.length} product(s) stock < ${LOW_STOCK_LIMIT} (Low Stock)` : "All product stocks are healthy!"}</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveTab("products")} className={`px-4 py-2 rounded-full font-bold text-xs cursor-pointer ${lowStockProducts.length > 0 ? "bg-rose-200 hover:bg-rose-300 text-rose-900" : "bg-emerald-200 hover:bg-emerald-300 text-emerald-900"}`}>
                    View Stock
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-[#EFEAE5] border border-[#E5DFDA] p-6 rounded-3xl shadow-sm flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-[#5E4E46] uppercase">Total Revenue</p>
                      <GrowthBadge value={revenueGrowth} show={hasPrevPeriod} />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-[#1A120E] mt-2">{formatRs(totalRevenue)}</h3>
                    {hasPrevPeriod && <p className="text-[10px] text-[#5E4E46] mt-1">{prevLabel}</p>}
                  </div>
                  <div className="p-4 bg-[#FAF7F5] border border-[#E5DFDA] rounded-2xl text-emerald-700 font-bold">Rs.</div>
                </div>

                <div className="bg-[#EFEAE5] border border-[#E5DFDA] p-6 rounded-3xl shadow-sm flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-[#5E4E46] uppercase">Total Orders</p>
                      <GrowthBadge value={ordersGrowth} show={hasPrevPeriod} />
                    </div>
                    <h3 className="text-3xl font-serif font-bold text-[#1A120E] mt-2">{totalOrders}</h3>
                    {hasPrevPeriod && <p className="text-[10px] text-[#5E4E46] mt-1">{prevLabel}</p>}
                  </div>
                  <div className="p-4 bg-[#FAF7F5] border border-[#E5DFDA] rounded-2xl text-[#8C5E73]"><Package size={28} /></div>
                </div>

                <div className="bg-[#EFEAE5] border border-[#E5DFDA] p-6 rounded-3xl shadow-sm flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-[#5E4E46] uppercase">Avg. Order Value</p>
                      <GrowthBadge value={averageGrowth} show={hasPrevPeriod} />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-[#1A120E] mt-2">{formatRs(averageOrderValue)}</h3>
                    {hasPrevPeriod && <p className="text-[10px] text-[#5E4E46] mt-1">{prevLabel}</p>}
                  </div>
                  <div className="p-4 bg-[#FAF7F5] border border-[#E5DFDA] rounded-2xl text-[#8C5E73]"><TrendingUp size={28} /></div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {["Pending", "Shipped", "Delivered", "Cancelled"].map((s) => (
                  <div key={s} className="bg-[#EFEAE5] border border-[#E5DFDA] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${statusBadge(s)}`}>{s}</span>
                    <span className="text-2xl font-serif font-bold text-[#1A120E]">{statusCounts[s]}</span>
                  </div>
                ))}
              </div>

              <div className={`${CARD} space-y-4`}>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-serif font-bold text-[#1A120E]">Sales Revenue Over Time (Date-wise)</h3>
                  <span className="text-xs text-[#5E4E46] font-medium">Filtered by: {dateFilter.toUpperCase()}</span>
                </div>
                <div className="h-72 w-full">
                  {filteredByDateOrders.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-[#5E4E46]">No sales data available for this range.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={salesLineChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5DFDA" />
                        <XAxis dataKey="date" tick={AXIS_TICK} minTickGap={20} />
                        <YAxis tick={AXIS_TICK} tickFormatter={shortNumber} width={50} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [formatRs(Number(v)), "Revenue"]} />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#8C5E73"
                          strokeWidth={3}
                          dot={salesLineChartData.length <= 14 ? { fill: "#8C5E73", r: 4 } : false}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${CARD} space-y-4`}>
                  <h3 className="text-lg font-serif font-bold text-[#1A120E]">Sales by Customer / Order</h3>
                  <div className="h-64 w-full">
                    {customerBarChartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-[#5E4E46]">No data for this range.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={customerBarChartData}>
                          <XAxis dataKey="name" tick={{ ...AXIS_TICK, fontSize: 10 }} tickFormatter={shortName} />
                          <YAxis tick={AXIS_TICK} tickFormatter={shortNumber} width={50} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [formatRs(Number(v)), "Total"]} />
                          <Bar dataKey="totalAmount" fill="#8C5E73" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className={`${CARD} space-y-4`}>
                  <h3 className="text-lg font-serif font-bold text-[#1A120E]">Top Customers (Most Orders)</h3>
                  <div className="h-64 w-full">
                    {topCustomersChartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-[#5E4E46]">No data for this range.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topCustomersChartData} layout="vertical" margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5DFDA" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} />
                          <YAxis type="category" dataKey="name" tick={AXIS_TICK} width={90} tickFormatter={shortName} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [v, "Orders"]} />
                          <Bar dataKey="orders" fill="#2A9D8F" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${CARD} space-y-4`}>
                  <h3 className="text-lg font-serif font-bold text-[#1A120E] flex items-center gap-2"><Trophy size={18} className="text-[#8C5E73]" /> Top Selling Products</h3>
                  {topProducts.length === 0 ? (
                    <p className="text-xs text-[#5E4E46]">No product sales in this range.</p>
                  ) : (
                    <div className="space-y-4">
                      {topProducts.map((p, i) => (
                        <div key={p.title}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-[#1A120E] line-clamp-1">{i + 1}. {p.title}</span>
                            <span className="text-[#5E4E46] whitespace-nowrap ml-2">{p.qty} sold · {formatRs(p.revenue)}</span>
                          </div>
                          <div className="h-2 bg-[#FAF7F5] rounded-full overflow-hidden border border-[#E5DFDA]">
                            <div className="h-full bg-[#8C5E73] rounded-full" style={{ width: `${(p.qty / maxTopQty) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`${CARD} space-y-4`}>
                  <h3 className="text-lg font-serif font-bold text-[#1A120E]">Products by Category</h3>
                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value" label={pieLabel}>
                          {pieChartData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend formatter={pieLegendFormatter} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${CARD} space-y-4`}>
                  <h3 className="text-lg font-serif font-bold text-[#1A120E]">Sales by City</h3>
                  <div className="h-64 w-full">
                    {cityChartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-[#5E4E46]">No data for this range.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cityChartData}>
                          <XAxis dataKey="city" tick={{ ...AXIS_TICK, fontSize: 10 }} tickFormatter={shortName} />
                          <YAxis tick={AXIS_TICK} tickFormatter={shortNumber} width={50} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [formatRs(Number(v)), "Revenue"]} />
                          <Bar dataKey="revenue" fill="#457B9D" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className={`${CARD} space-y-4`}>
                  <h3 className="text-lg font-serif font-bold text-[#1A120E]">Low Stock Products</h3>
                  {lowStockProducts.length === 0 ? (
                    <div className="flex items-center space-x-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                      <CheckCircle2 size={16} /> <span>Sab products ka stock theek hai.</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E5DFDA]">
                      {lowStockProducts.slice(0, 6).map((p) => (
                        <div key={p._id} className="flex items-center justify-between py-2.5 text-xs">
                          <div className="flex items-center space-x-3 min-w-0">
                            <img src={p.images?.[0] || p.image || "https://placehold.co/100"} alt="" className="w-9 h-9 rounded-xl object-cover border border-[#E5DFDA]" />
                            <span className="font-bold text-[#1A120E] line-clamp-1">{p.title}</span>
                          </div>
                          <span className={`px-3 py-1 rounded-full font-bold whitespace-nowrap ${(p.stock ?? 0) === 0 ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-800"}`}>
                            {(p.stock ?? 0) === 0 ? "Out of stock" : `${p.stock} left`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={`${CARD} space-y-4`}>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-serif font-bold text-[#1A120E]">Recent Orders Feed</h3>
                  <button onClick={() => setActiveTab("orders")} className="text-xs font-bold text-[#8C5E73] hover:underline cursor-pointer">View All →</button>
                </div>
                {orders.length === 0 ? (
                  <p className="text-xs text-[#5E4E46]">No orders received yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E5DFDA] text-[#5E4E46] uppercase text-[10px]">
                          <th className="pb-3">Order ID</th>
                          <th className="pb-3">Customer</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5DFDA]">
                        {sortedOrders.slice(0, 5).map((o) => (
                          <tr key={o._id}>
                            <td className="py-3 font-mono font-bold text-[#8C5E73]">#{o._id.slice(-6).toUpperCase()}</td>
                            <td className="py-3 font-medium text-[#1A120E]">{o.customerDetails?.fullName}</td>
                            <td className="py-3 font-serif font-bold">{formatRs(o.totalAmount)}</td>
                            <td className="py-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusBadge(o.status || "Pending")}`}>
                                {o.status || "Pending"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "products" && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`${CARD} space-y-6`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5DFDA] pb-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#1A120E]">Manage Store Products ({products.length})</h2>
                  <p className="text-xs text-[#5E4E46] mt-0.5">Edit product details, stock levels (Items with stock less than {LOW_STOCK_LIMIT} are highlighted in red).</p>
                </div>
                <input type="text" placeholder="Search products..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="w-full sm:w-64 bg-[#FAF7F5] border border-[#E5DFDA] rounded-2xl py-2.5 px-4 text-xs font-medium text-[#1A120E]" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-[#E5DFDA] text-[#5E4E46] uppercase text-[11px] tracking-wider">
                      <th className="pb-4 font-semibold">Product</th>
                      <th className="pb-4 font-semibold">Category</th>
                      <th className="pb-4 font-semibold">Price</th>
                      <th className="pb-4 font-semibold">Stock</th>
                      <th className="pb-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DFDA] text-[#2C2420]">
                    {filteredProducts.map((p) => {
                      const isLowStock = (p.stock ?? 0) < LOW_STOCK_LIMIT;
                      return (
                        <tr key={p._id} className={`hover:bg-[#FAF7F5]/60 transition-colors ${isLowStock ? "bg-rose-50/50" : ""}`}>
                          <td className="py-4 flex items-center space-x-3">
                            <img src={p.images?.[0] || p.image || "https://placehold.co/100"} alt="" className="w-12 h-12 rounded-2xl object-cover border border-[#E5DFDA]" />
                            <div>
                              <p className="font-bold text-[#1A120E] line-clamp-1">{p.title}</p>
                              <p className="text-[11px] text-[#5E4E46] line-clamp-1">{p.description}</p>
                            </div>
                          </td>
                          <td className="py-4"><span className="px-3 py-1 bg-[#FAF7F5] border border-[#E5DFDA] text-[#8C5E73] rounded-full text-[11px] font-bold uppercase">{p.category || "General"}</span></td>
                          <td className="py-4 font-serif font-extrabold text-[#1A120E] text-sm sm:text-base">{formatRs(p.price)}</td>
                          <td className="py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isLowStock ? "bg-rose-100 text-rose-800 border border-rose-300" : "bg-emerald-100 text-emerald-800"}`}>
                              {(p.stock ?? 0) === 0 ? "Out of stock ⚠️" : `${p.stock} left ${isLowStock ? "⚠️" : ""}`}
                            </span>
                          </td>
                          <td className="py-4 text-right space-x-2">
                            <button onClick={() => openEditModal(p)} className="px-3.5 py-1.5 bg-[#FAF7F5] hover:bg-[#8C5E73] text-[#8C5E73] hover:text-white border border-[#E5DFDA] rounded-full font-semibold transition-all cursor-pointer text-xs">Edit</button>
                            <button onClick={() => handleDeleteProduct(p._id)} className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-full font-semibold transition-all cursor-pointer text-xs">Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === "orders" && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`${CARD} space-y-6`}>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-[#E5DFDA] pb-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#1A120E]">Customer Orders Management ({filteredOrders.length})</h2>
                  <p className="text-xs text-[#5E4E46] mt-0.5">Change fulfillment status, view detailed receipts, or export sales report.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                  <button onClick={exportOrdersToCSV} className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold rounded-full text-xs flex items-center justify-center space-x-1 cursor-pointer">
                    <Download size={14} />
                    <span>Export CSV</span>
                  </button>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="bg-[#FAF7F5] border border-[#E5DFDA] rounded-full px-4 py-2 text-xs font-bold text-[#1A120E] cursor-pointer"
                  >
                    <option value="All">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <input type="text" placeholder="Search orders..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="flex-grow sm:w-64 bg-[#FAF7F5] border border-[#E5DFDA] rounded-2xl py-2 px-4 text-xs font-medium" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-[#E5DFDA] text-[#5E4E46] uppercase text-[11px] tracking-wider">
                      <th className="pb-4 font-semibold">Order ID</th>
                      <th className="pb-4 font-semibold">Date</th>
                      <th className="pb-4 font-semibold">Customer</th>
                      <th className="pb-4 font-semibold">Total</th>
                      <th className="pb-4 font-semibold">Status</th>
                      <th className="pb-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DFDA] text-[#2C2420]">
                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-[#5E4E46]">No orders found.</td>
                      </tr>
                    )}
                    {filteredOrders.map((o) => {
                      const currentStatus = o.status || "Pending";
                      return (
                        <tr key={o._id} className="hover:bg-[#FAF7F5]/60 transition-colors">
                          <td className="py-4 font-mono text-xs text-[#8C5E73] font-bold">#{o._id.slice(-6).toUpperCase()}</td>
                          <td className="py-4 text-xs text-[#5E4E46] whitespace-nowrap">{getOrderDate(o).toLocaleDateString()}</td>
                          <td className="py-4">
                            <p className="font-bold text-[#1A120E]">{o.customerDetails?.fullName}</p>
                            <p className="text-[11px] text-[#5E4E46]">{o.customerDetails?.phone}</p>
                          </td>
                          <td className="py-4 font-serif font-extrabold text-[#1A120E] text-base">{formatRs(o.totalAmount)}</td>
                          <td className="py-4">
                            <select
                              value={currentStatus}
                              disabled={updatingId === o._id}
                              onChange={(e) => handleStatusChange(o._id, e.target.value)}
                              className={`text-xs font-bold px-3.5 py-1.5 rounded-full border cursor-pointer transition-all disabled:opacity-60 ${
                                currentStatus === "Pending" ? "bg-amber-100 border-amber-300 text-amber-800" :
                                currentStatus === "Shipped" ? "bg-blue-100 border-blue-300 text-blue-800" :
                                currentStatus === "Delivered" ? "bg-emerald-100 border-emerald-300 text-emerald-800" :
                                "bg-rose-100 border-rose-300 text-rose-800"
                              }`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="py-4 text-right">
                            <button onClick={() => setSelectedOrder(o)} className="px-4 py-1.5 bg-[#FAF7F5] hover:bg-[#8C5E73] text-[#8C5E73] hover:text-white border border-[#E5DFDA] rounded-full font-bold transition-all cursor-pointer text-xs shadow-xs">View Details</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === "coupons" && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className={CARD}>
                <h2 className="text-xl font-serif font-bold text-[#1A120E] mb-1">Create Promo Coupon</h2>
                <p className="text-xs text-[#5E4E46] mb-6">Generate discount codes for customers to redeem during checkout.</p>

                <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className={LABEL}>Coupon Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. LUMIERE20"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                      className={`${INPUT} font-mono font-bold uppercase`}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Discount (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      required
                      placeholder="e.g. 20"
                      value={couponForm.discountPercentage}
                      onChange={(e) => setCouponForm({ ...couponForm, discountPercentage: e.target.value })}
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Expiry Date</label>
                    <input
                      type="datetime-local"
                      required
                      value={couponForm.expiryDate}
                      onChange={(e) => setCouponForm({ ...couponForm, expiryDate: e.target.value })}
                      className={INPUT}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingCoupon}
                    className="w-full bg-[#8C5E73] hover:bg-[#784E60] text-white font-bold py-3 rounded-2xl text-xs transition-all cursor-pointer shadow-md"
                  >
                    {isCreatingCoupon ? "Creating..." : "+ Create Coupon"}
                  </button>
                </form>
              </div>

              <div className={CARD}>
                <h3 className="text-lg font-serif font-bold text-[#1A120E] mb-4">Active Promo Codes ({coupons.length})</h3>
                {coupons.length === 0 ? (
                  <p className="text-xs text-[#5E4E46]">No coupons created yet. Add one above!</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {coupons.map((c) => {
                      const isExpired = new Date() > new Date(c.expiryDate);
                      return (
                        <div key={c._id} className="bg-[#FAF7F5] border border-[#E5DFDA] p-4 rounded-2xl flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-sm text-[#8C5E73]">{c.code}</span>
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {c.discountPercentage}% OFF
                              </span>
                            </div>
                            <p className={`text-[11px] mt-1 font-medium ${isExpired ? "text-rose-600" : "text-[#5E4E46]"}`}>
                              {isExpired ? "Expired" : `Expires: ${new Date(c.expiryDate).toLocaleDateString()}`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteCoupon(c._id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Delete Coupon"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "announcement" && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`${CARD} space-y-6 max-w-xl`}>
              <div>
                <h2 className="text-xl font-serif font-bold text-[#1A120E]">📢 Manage Announcement Bar</h2>
                <p className="text-xs text-[#5E4E46] mt-0.5">Control the top notification banner text, featured coupon code, or turn it on/off.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={LABEL}>Banner Message</label>
                  <input type="text" value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} className={INPUT} />
                </div>

                <div>
                  <label className={LABEL}>Featured Coupon Code</label>
                  <input type="text" value={announcementCode} onChange={(e) => setAnnouncementCode(e.target.value)} className={`${INPUT} font-mono font-bold uppercase`} />
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <input
                    type="checkbox"
                    checked={isAnnouncementActive}
                    onChange={(e) => setIsAnnouncementActive(e.target.checked)}
                    className="w-5 h-5 text-[#8C5E73] accent-[#8C5E73] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#1A120E]">Show Banner on Website (On / Off)</span>
                </div>

                <button
                  onClick={handleSaveAnnouncement}
                  disabled={isSavingAnnouncement}
                  className="w-full bg-[#8C5E73] hover:bg-[#784E60] text-white py-3 rounded-2xl text-xs font-bold cursor-pointer shadow-md transition-all mt-4"
                >
                  {isSavingAnnouncement ? "Saving..." : "Save & Update Banner"}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === "customers" && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`${CARD} space-y-6`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#1A120E]">Customers ({allCustomers.length})</h2>
                  <p className="text-xs text-[#5E4E46] mt-0.5">Buyers who have ordered on Lumière, with their order count and total spending.</p>
                </div>
                <input type="text" placeholder="Search name, email, phone..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="w-full sm:w-64 bg-[#FAF7F5] border border-[#E5DFDA] rounded-2xl py-2.5 px-4 text-xs font-medium text-[#1A120E]" />
              </div>
              <div className="overflow-x-auto bg-[#FAF7F5] p-4 rounded-2xl border border-[#E5DFDA]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5DFDA] text-[#5E4E46] uppercase text-[10px] tracking-wider">
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">City</th>
                      <th className="pb-3 text-center">Orders</th>
                      <th className="pb-3">Total Spent</th>
                      <th className="pb-3">Last Order</th>
                      <th className="pb-3">Segment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DFDA]">
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[#5E4E46]">No customers found.</td>
                      </tr>
                    )}
                    {filteredCustomers.map((c, i) => {
                      const seg = segmentOf(c);
                      return (
                        <tr key={i}>
                          <td className="py-3">
                            <p className="font-bold text-[#1A120E] text-sm">{c.name}</p>
                            <p className="text-[#5E4E46] text-[11px]">📧 {c.email || "N/A"} | 📞 {c.phone || "N/A"}</p>
                          </td>
                          <td className="py-3 text-[#5E4E46]">{c.city || "N/A"}</td>
                          <td className="py-3 text-center font-bold">{c.orders}</td>
                          <td className="py-3 font-serif font-bold text-[#1A120E]">{formatRs(c.spent)}</td>
                          <td className="py-3 text-[#5E4E46] whitespace-nowrap">{c.lastOrder.toLocaleDateString()}</td>
                          <td className="py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              seg === "VIP" ? "bg-amber-100 text-amber-800" : seg === "New" ? "bg-blue-100 text-blue-800" : "bg-[#EFEAE5] text-[#5E4E46]"
                            }`}>
                              {seg === "VIP" && <Crown size={10} />}
                              {seg}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === "analytics" && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`${CARD} space-y-6`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#1A120E]">Store Analytics & Charts</h2>
                  <p className="text-xs text-[#5E4E46]">In-depth performance analytics and sales breakdown.</p>
                </div>
                <div className="flex items-center bg-[#FAF7F5] border border-[#E5DFDA] rounded-full px-4 py-2 text-xs font-bold text-[#5E4E46]">
                  <Calendar size={14} className="mr-2 text-[#8C5E73]" />
                  <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-transparent border-none outline-none cursor-pointer text-[#1A120E]">
                    <option value="today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80 w-full bg-[#FAF7F5] p-4 rounded-2xl border border-[#E5DFDA]">
                  <h3 className="text-sm font-bold mb-2 text-[#1A120E]">Sales Over Time</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <LineChart data={salesLineChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5DFDA" />
                      <XAxis dataKey="date" tick={{ ...AXIS_TICK, fontSize: 10 }} minTickGap={20} />
                      <YAxis tick={AXIS_TICK} tickFormatter={shortNumber} width={50} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [formatRs(Number(v)), "Revenue"]} />
                      <Line type="monotone" dataKey="revenue" stroke="#8C5E73" strokeWidth={3} dot={salesLineChartData.length <= 14 ? { fill: "#8C5E73", r: 3 } : false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-80 w-full bg-[#FAF7F5] p-4 rounded-2xl border border-[#E5DFDA]">
                  <h3 className="text-sm font-bold mb-2 text-[#1A120E]">Category Distribution</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" label={pieLabel}>
                        {pieChartData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend formatter={pieLegendFormatter} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-80 w-full bg-[#FAF7F5] p-4 rounded-2xl border border-[#E5DFDA]">
                  <h3 className="text-sm font-bold mb-2 text-[#1A120E]">Order Status Breakdown</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" label={pieLabel}>
                        {statusPieData.map((s) => (<Cell key={s.name} fill={STATUS_COLORS[s.name] || "#999"} />))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend formatter={pieLegendFormatter} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-80 w-full bg-[#FAF7F5] p-4 rounded-2xl border border-[#E5DFDA]">
                  <h3 className="text-sm font-bold mb-2 text-[#1A120E]">Sales by City</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={cityChartData}>
                      <XAxis dataKey="city" tick={{ ...AXIS_TICK, fontSize: 10 }} tickFormatter={shortName} />
                      <YAxis tick={AXIS_TICK} tickFormatter={shortNumber} width={50} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [formatRs(Number(v)), "Revenue"]} />
                      <Bar dataKey="revenue" fill="#457B9D" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-[#EFEAE5] border border-[#E5DFDA] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-xl space-y-4">
              <h3 className="text-xl font-serif font-bold text-[#1A120E]">Edit Product & Inventory</h3>
              <form onSubmit={handleUpdateProduct} className="space-y-4">
                <div>
                  <label className={LABEL}>Product Title</label>
                  <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className={INPUT} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Price (Rs.)</label>
                    <input type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Stock Quantity</label>
                    <input type="number" min="0" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} className={INPUT} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#8C5E73] mb-1 block">Discount Percentage (%)</label>
                    <input type="number" min="0" max="99" value={editForm.discountPercentage} onChange={(e) => setEditForm({ ...editForm, discountPercentage: e.target.value })} placeholder="e.g. 20" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Flash Sale End Date</label>
                    <input type="datetime-local" value={editForm.saleEndDate} onChange={(e) => setEditForm({ ...editForm, saleEndDate: e.target.value })} className={INPUT} />
                  </div>
                </div>

                <div>
                  <label className={LABEL}>Description</label>
                  <textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className={`${INPUT} resize-none`} />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 bg-[#FAF7F5] border border-[#E5DFDA] rounded-full text-xs font-bold text-[#5E4E46] cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isUpdatingProduct} className="px-5 py-2 bg-[#8C5E73] text-white rounded-full text-xs font-bold cursor-pointer">{isUpdatingProduct ? "Saving..." : "Save Changes"}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-[#EFEAE5] border border-[#E5DFDA] rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-serif font-bold text-[#1A120E]">Order Receipt #{selectedOrder._id.slice(-6).toUpperCase()}</h3>
                  <p className="text-[11px] text-[#5E4E46] mt-0.5">{getOrderDate(selectedOrder).toLocaleString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${statusBadge(selectedOrder.status || "Pending")}`}>
                  {selectedOrder.status || "Pending"}
                </span>
              </div>

              <div className="bg-[#FAF7F5] p-4 rounded-2xl border border-[#E5DFDA] text-xs space-y-1 text-[#5E4E46]">
                <p>Customer: <strong className="text-[#1A120E]">{selectedOrder.customerDetails?.fullName}</strong></p>
                <p>📞 {selectedOrder.customerDetails?.phone || "N/A"}</p>
                <p>📧 {selectedOrder.customerDetails?.email || "N/A"}</p>
                <p>📍 {selectedOrder.customerDetails?.address || "N/A"}, {selectedOrder.customerDetails?.city || ""}</p>
              </div>

              <div className="bg-[#FAF7F5] p-4 rounded-2xl border border-[#E5DFDA] space-y-2">
                {selectedOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span>{item.title} (x{item.quantity})</span>
                    <span className="font-bold">{formatRs(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              {selectedOrder.couponApplied && (
                <div className="flex justify-between text-xs text-emerald-700 font-semibold px-1">
                  <span>Promo Applied ({selectedOrder.couponApplied})</span>
                  <span>- {formatRs(selectedOrder.discountAmount || 0)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-[#E5DFDA]">
                <span className="text-xs font-bold uppercase text-[#5E4E46]">Total Amount</span>
                <span className="text-lg font-serif font-bold text-[#8C5E73]">{formatRs(selectedOrder.totalAmount)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePrintInvoice(selectedOrder)} className="flex-1 py-2.5 bg-[#FAF7F5] border border-[#E5DFDA] text-[#8C5E73] rounded-full text-xs font-bold cursor-pointer flex items-center justify-center space-x-1.5">
                  <Printer size={14} />
                  <span>Print Invoice</span>
                </button>
                <button onClick={() => setSelectedOrder(null)} className="flex-1 py-2.5 bg-[#8C5E73] text-white rounded-full text-xs font-bold cursor-pointer">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}