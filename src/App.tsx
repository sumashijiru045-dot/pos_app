import React, { useEffect, useMemo, useState } from "react";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import * as XLSX from "xlsx";

// ファイル先頭付近に追加
const LS_ORDERS = "pos.orders.v2";
const LS_ACTIVE = "pos.activeOrder.v2";
const LS_MENU = "pos.menu.v2";

// 衝突しにくいID（日時＋ランダム）
const nextOrderId = () =>
  `${todayPrefix()}-${Math.floor(Date.now() / 1000)
    .toString()
    .slice(-5)}-${Math.random().toString(36).slice(2,5)}`;

interface MenuItem {
  id: string | number;
  name: string;
  price: number;
  category: "Drink" | "Food" | "Cookie" | "Other";
  imageUrl?: string;
}

interface OrderItem extends MenuItem {
  qty: number;
}

type PaymentMethod = "Cash" | "QR" | "";

type OrderStatus = "Open" | "Closed" | "Void";

interface Order {
  id: string;
  createdAt: string;
  items: OrderItem[];
  subtotal: number;
  total?: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  change?: number;
  status: OrderStatus;
  note?: string;
  discountName?: string;
  discountAmount?: number;
  kipCashAmount?: number;
  fxAmount?: number;
  fxRate?: number;
  fxCurrency?: "USD" | "THB" | "";
}

const formatKip = (v: number) => `${v.toLocaleString()}₭`;
const todayPrefix = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};

async function fileToResizedDataUrl(file: File, maxSize = 800, quality = 0.72): Promise<string> {
  const img = document.createElement("img");
  const reader = new FileReader();
  const dataUrl: string = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  await new Promise((res, rej) => {
    img.onload = () => res(null);
    img.onerror = rej;
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  const { width, height } = img;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

const DEFAULT_MENU: MenuItem[] = [
  //  Drink Items
  { id: "drink_001", name: "Hot drip coffee", price: 35000, category: "Drink", imageUrl: "/images/Hot_drip_coffee.jpg" },
  { id: "drink_002", name: "Hot latte", price: 35000, category: "Drink", imageUrl: "/images/Hot_latte.jpg" },
  { id: "drink_003", name: "Hot cappuccino", price: 35000, category: "Drink", imageUrl: "/images/Hot_cappuccino.jpg" },
  { id: "drink_004", name: "Espresso", price: 25000, category: "Drink", imageUrl: "/images/Espresso.jpg" },
  { id: "drink_005", name: "Hot cocoa", price: 35000, category: "Drink", imageUrl: "/images/Hot_cocoa.jpg" },
  { id: "drink_006", name: "Americano", price: 30000, category: "Drink", imageUrl: "/images/Americano.jpg" },
  { id: "drink_007", name: "Hot chocolate", price: 35000, category: "Drink", imageUrl: "/images/Hot_chocolate.jpg" },
  { id: "drink_008", name: "Matcha latte", price: 40000, category: "Drink", imageUrl: "/images/Matcha_latte.jpg" },
  { id: "drink_009", name: "Iced latte", price: 40000, category: "Drink", imageUrl: "/images/Iced_latte.jpg" },
  { id: "drink_010", name: "Iced americano", price: 30000, category: "Drink", imageUrl: "/images/Iced_americano.jpg" },
  { id: "drink_011", name: "Cold brewed", price: 30000, category: "Drink", imageUrl: "/images/Cold_brewed.jpg" },
  { id: "drink_012", name: "Lemonade", price: 40000, category: "Drink", imageUrl: "/images/Lemonade.jpg" },
  { id: "drink_013", name: "Butterfly pea lemon soda", price: 40000, category: "Drink", imageUrl: "/images/Butterfly_pea_lemon_soda.jpg" },
  { id: "drink_014", name: "Iced black coffee", price: 40000, category: "Drink", imageUrl: "/images/Iced_black_coffee.jpg" },
  { id: "drink_015", name: "Orange coffee", price: 35000, category: "Drink", imageUrl: "/images/Orange_coffee.jpg" },
  { id: "drink_016", name: "Iced mocha", price: 40000, category: "Drink", imageUrl: "/images/Iced_mocha.jpg" },
  { id: "drink_017", name: "Iced cappuccino", price: 40000, category: "Drink", imageUrl: "/images/Iced_cappuccino.jpg" },
  { id: "drink_018", name: "Rooibos tea", price: 40000, category: "Drink", imageUrl: "/images/Rooibos_tea.jpg" },
  { id: "drink_019", name: "Iced chocolate",       price: 40000, category: "Drink", imageUrl: "/images/Iced_chocolate.jpg" },
  { id: "drink_020", name: "Mocha shake",           price: 40000, category: "Drink", imageUrl: "/images/Mocha_shake.jpg" },
  { id: "drink_021", name: "Chocolate shake",       price: 40000, category: "Drink", imageUrl: "/images/Chocolate_shake.jpg" },
  { id: "drink_022", name: "Yogurt mango shake",    price: 40000, category: "Drink", imageUrl: "/images/Yogurt_mango_shake.jpg" },
  { id: "drink_023", name: "Pineapple shake",       price: 35000, category: "Drink", imageUrl: "/images/Pineapple_shake.jpg" },
  { id: "drink_024", name: "Mango shake",           price: 35000, category: "Drink", imageUrl: "/images/Mango_shake.jpg" },
  { id: "drink_025", name: "Apple shake",           price: 30000, category: "Drink", imageUrl: "/images/Apple_shake.jpg" },
  { id: "drink_026", name: "Dragon shake",          price: 30000, category: "Drink", imageUrl: "/images/Dragon_shake.jpg" },
  { id: "drink_027", name: "Mixed fruit shake",     price: 40000, category: "Drink", imageUrl: "/images/Mixed_fruit_shake.jpg" },
  { id: "drink_028", name: "Soda Lao",              price: 15000, category: "Drink", imageUrl: "/images/Soda_Lao.jpg" },
  //  Food Items
  { id: "food_001", name: "A set bread",            price: 100000, category: "Food", imageUrl: "/images/A_set_bread.jpg" },
  { id: "food_002", name: "B set bread",            price: 100000, category: "Food", imageUrl: "/images/B_set_bread.jpg" },
  { id: "food_003", name: "French toast set",       price: 80000,  category: "Food", imageUrl: "/images/French_toast_set.jpg" },
  { id: "food_004", name: "French toast with fruit",price: 70000,  category: "Food", imageUrl: "/images/French_toast_with_fruit.jpg" },
  { id: "food_005", name: "Curry and rice set",     price: 100000, category: "Food", imageUrl: "/images/Curry_and_rice_set.jpg" },
  { id: "food_006", name: "Spaghetti set",          price: 80000,  category: "Food", imageUrl: "/images/Spaghetti_set.jpg" },
  { id: "food_007", name: "Carbonara set",          price: 80000,  category: "Food", imageUrl: "/images/Carbonara_set.jpg" },
  { id: "food_008", name: "Curry and rice",         price: 70000,  category: "Food", imageUrl: "/images/Curry_and_rice.jpg" },
  { id: "food_009", name: "Spaghetti",              price: 70000,  category: "Food", imageUrl: "/images/Spaghetti.jpg" },
  { id: "food_010", name: "Carbonara",              price: 70000,  category: "Food", imageUrl: "/images/Carbonara.jpg" },
  { id: "food_011", name: "HOP bun",                price: 35000,  category: "Food", imageUrl: "/images/HOP_bun.jpg" },
  { id: "food_012", name: "Fried egg",              price: 10000,  category: "Food", imageUrl: "/images/Fried_egg.jpg" },
  { id: "food_013", name: "Pudding",                price: 35000,  category: "Food", imageUrl: "/images/Pudding.jpg" },
  // Cookie Items
  { id: "cookie_001", name: "Cookies", price: 25000, category: "Cookie", imageUrl: "/images/Cookies.jpg" },
  { id: "cookie_002", name: "Sabaidee Laos", price: 200000, category: "Cookie", imageUrl: "/images/Sabaidee_Laos.jpg" },
  { id: "cookie_003", name: "Sabaidee cookies box", price: 70000, category: "Cookie", imageUrl: "/images/Sabaidee_cookies_box.jpg" },
  { id: "cookie_004", name: "70th anniversary cookies box", price: 80000, category: "Cookie", imageUrl: "/images/70th_anniversary_cookies_box.jpg" },
  { id: "cookie_005", name: "Lanexang cookies box", price: 70000, category: "Cookie", imageUrl: "/images/Lanexang_cookies_box.jpg" },
  { id: "cookie_006", name: "Patuxay cookies box", price: 65000, category: "Cookie", imageUrl: "/images/Patuxay_cookies_box.jpg" },
  { id: "cookie_007", name: "Dokmai Lao cookies box", price: 65000, category: "Cookie", imageUrl: "/images/Dokmai_Lao_cookies_box.jpg" },
  // Cookie Items
  { id: "other_001", name: "Lao sign language", price: 65000, category: "Other", imageUrl: "/images/Lao_sign_language.jpg" },

];

export default function App() {
  const [view, setView] = useState<"home" | "orders" | "checkout" | "receipt" | "settings" | "history">("home");
  const [tab, setTab] = useState<"All" | "Drink" | "Food" | "Cookie" | "Other">("All");
  const [menu, setMenu] = useState<MenuItem[]>(() => {
  try { const s = localStorage.getItem(LS_MENU); return s ? JSON.parse(s) : DEFAULT_MENU; }
  catch { return DEFAULT_MENU; }
});
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [justAddedId, setJustAddedId] = useState<string | number | null>(null);
  const [drawerFlash, setDrawerFlash] = useState(false);
  const [ariaMsg, setAriaMsg] = useState("");
  const [orders, setOrders] = useState<Order[]>(() => {
  try { const s = localStorage.getItem(LS_ORDERS); return s ? JSON.parse(s) : []; }
  catch { return []; }
});
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => {
  try { return localStorage.getItem(LS_ACTIVE) as string | null; }
  catch { return null; }
});
  const activeOrder = useMemo(() => orders.find((o) => o.id === activeOrderId) || null, [orders, activeOrderId]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const [cartNote, setCartNote] = useState("");
  const [cartDiscountName, setCartDiscountName] = useState<string>("");
  const [cartDiscountAmount, setCartDiscountAmount] = useState<number>(0);

  const [fxAmount, setFxAmount] = useState<number>(0);
  const [fxRate, setFxRate] = useState<number>(0);
  const [fxCurrency, setFxCurrency] = useState<"USD" | "THB" | "">("USD");

  useEffect(() => {
    setFxAmount(0);
    setFxRate(0);
    setFxCurrency("USD");
  }, [activeOrderId]);

  useEffect(() => {
  try { localStorage.setItem(LS_MENU, JSON.stringify(menu)); } catch {}
}, [menu]);

useEffect(() => {
  try { localStorage.setItem(LS_ORDERS, JSON.stringify(orders)); } catch {}
}, [orders]);

useEffect(() => {
  try {
    if (activeOrderId) localStorage.setItem(LS_ACTIVE, activeOrderId);
    else localStorage.removeItem(LS_ACTIVE);
  } catch {}
}, [activeOrderId]);


  const filteredMenu = tab === "All" ? menu : menu.filter((m) => m.category === tab);

  const addItem = (item: MenuItem) => {
    setSelectedItems((prev) => {
      const idx = prev.findIndex((i) => String(i.id) === String(item.id));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, { ...item, qty: 1 }];
    });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { (navigator as any).vibrate(15); } catch {}
    }
    setJustAddedId(item.id);
    setDrawerFlash(true);
    setAriaMsg(`${item.name} added`);
    setTimeout(() => setJustAddedId(null), 450);
    setTimeout(() => setDrawerFlash(false), 600);
  };

  const inc = (id: string | number) => setSelectedItems((p) => p.map((i) => (String(i.id) === String(id) ? { ...i, qty: i.qty + 1 } : i)));
  const dec = (id: string | number) => setSelectedItems((p) => p.map((i) => (String(i.id) === String(id) ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0));
  const removeItem = (id: string | number) => setSelectedItems((p) => p.filter((i) => String(i.id) !== String(id)));
  const cartSubtotal = selectedItems.reduce((acc, i) => acc + i.price * i.qty, 0);
  const cartTotal = Math.max(0, cartSubtotal - cartDiscountAmount);

  const saveOrder = () => {
    if (selectedItems.length === 0) return;
    if (editingOrderId) {
      setOrders((prev) => prev.map((o) => (o.id === editingOrderId ? { ...o, items: selectedItems, subtotal: cartSubtotal, total: cartTotal, note: cartNote, discountName: cartDiscountName, discountAmount: cartDiscountAmount } : o)));
      setSelectedItems([]);
      setCartNote("");
      setCartDiscountName("");
      setCartDiscountAmount(0);
      setEditingOrderId(null);
      return;
    }
    const id = nextOrderId();
    const now = new Date().toISOString();
    const newOrder: Order = { id, createdAt: now, items: selectedItems, subtotal: cartSubtotal, total: cartTotal, paymentMethod: "", status: "Open", discountName: cartDiscountName, discountAmount: cartDiscountAmount, note: cartNote };
    setOrders((prev) => [newOrder, ...prev]);
    setSelectedItems([]);
    setCartNote("");
    setCartDiscountName("");
    setCartDiscountAmount(0);
  };

  const goCheckoutFromCart = () => {
    if (selectedItems.length === 0) return;
    if (editingOrderId) {
      setOrders((prev) => prev.map((o) => (o.id === editingOrderId ? { ...o, items: selectedItems, subtotal: cartSubtotal, total: cartTotal, note: cartNote, discountName: cartDiscountName, discountAmount: cartDiscountAmount } : o)));
      setActiveOrderId(editingOrderId);
      setSelectedItems([]);
      setCartNote("");
      setCartDiscountName("");
      setCartDiscountAmount(0);
      setEditingOrderId(null);
      setView("checkout");
      return;
    }
    const id = nextOrderId();
    const now = new Date().toISOString();
    const newOrder: Order = { id, createdAt: now, items: selectedItems, subtotal: cartSubtotal, total: cartTotal, paymentMethod: "", status: "Open", discountName: cartDiscountName, discountAmount: cartDiscountAmount, note: cartNote };
    setOrders((prev) => [newOrder, ...prev]);
    setSelectedItems([]);
    setCartNote("");
    setCartDiscountName("");
    setCartDiscountAmount(0);
    setActiveOrderId(id);
    setView("checkout");
  };

  const openOrders = orders.filter((o) => o.status === "Open");
  const openForCheckout = (id: string) => {
    setActiveOrderId(id);
    setView("checkout");
  };
  const editOrder = (id: string) => {
    const o = orders.find((x) => x.id === id);
    if (!o) return;
    setSelectedItems(o.items.map((it) => ({ ...it })));
    setCartNote(o.note || "");
    setCartDiscountName(o.discountName || "");
    setCartDiscountAmount(o.discountAmount || 0);
    setEditingOrderId(id);
    setTab("All");
    setView("home");
  };

  const setPaymentMethod = (pm: PaymentMethod) => {
    if (!activeOrder) return;
    setOrders((prev) => prev.map((o) => (o.id === activeOrder.id ? { ...o, paymentMethod: pm } : o)));
  };

  const recomputeCash = (kip: number, fxAmt: number, rate: number, basis: number, currency: "USD" | "THB" | "") => {
    const totalCash = Math.max(0, kip) + Math.max(0, fxAmt) * Math.max(0, rate);
    const change = Math.max(0, totalCash - basis);
    setOrders((prev) => prev.map((o) => (o.id === activeOrderId ? { ...o, cashReceived: totalCash, change, kipCashAmount: Math.max(0, kip), fxAmount: Math.max(0, fxAmt), fxRate: Math.max(0, rate), fxCurrency: currency } : o)));
    return totalCash;
  };

  const setCashReceived = (value: number) => {
    if (!activeOrder) return;
    const basis = Math.max(0, activeOrder.total ?? activeOrder.subtotal);
    recomputeCash(value, fxAmount, fxRate, basis, fxCurrency);
  };

  const finalizePayment = () => {
    if (!activeOrder) return;
    if (activeOrder.paymentMethod === "") {
      alert("Select payment method (Cash / QR)");
      return;
    }
    const basis = Math.max(0, activeOrder.total ?? activeOrder.subtotal);
    if (activeOrder.paymentMethod === "Cash") {
      const totalCash = Math.max(0, activeOrder.cashReceived || 0);
      if (totalCash < basis) {
        alert("Cash received is less than total.");
        return;
      }
    }
    setOrders((prev) => prev.map((o) => (o.id === activeOrder.id ? { ...o, status: "Closed" } : o)));
    setView("receipt");
  };

  const exportExcel = async () => {
    const closed = orders.filter((o) => o.status === "Closed");
    const byDate: Record<string, { Cash: number; QR: number; Total: number }> = {};
    const cashFlow: Record<string, { KipIn: number; KipOut: number; KipNet: number; USDIn: number; THBIn: number }> = {};
    closed.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!byDate[key]) byDate[key] = { Cash: 0, QR: 0, Total: 0 };
      if (!cashFlow[key]) cashFlow[key] = { KipIn: 0, KipOut: 0, KipNet: 0, USDIn: 0, THBIn: 0 };
      const net = Math.max(0, o.total ?? o.subtotal);
      if (o.paymentMethod === "Cash") byDate[key].Cash += net;
      if (o.paymentMethod === "QR") byDate[key].QR += net;
      byDate[key].Total += net;
      if (o.paymentMethod === "Cash") {
        const kipIn = Math.max(0, o.kipCashAmount || 0);
        const change = Math.max(0, o.change || 0);
        cashFlow[key].KipIn += kipIn;
        cashFlow[key].KipOut += change;
        cashFlow[key].KipNet += kipIn - change;
        if (o.fxCurrency === "USD") cashFlow[key].USDIn += Math.max(0, o.fxAmount || 0);
        if (o.fxCurrency === "THB") cashFlow[key].THBIn += Math.max(0, o.fxAmount || 0);
      }
    });
    const dailyRows = Object.entries(byDate).map(([Date, v]) => ({ Date, Cash: v.Cash, QR: v.QR, Total: v.Total }));
    const cashRows = Object.entries(cashFlow).map(([Date, v]) => ({ Date, KipIn: v.KipIn, KipOut: v.KipOut, KipNet: v.KipNet, USDIn: v.USDIn, THBIn: v.THBIn }));
    const ordersRows = closed.map((o) => ({
      OrderID: o.id,
      OrderDatetime: new Date(o.createdAt).toLocaleString(),
      Items: o.items.map((i) => `${i.name} x${i.qty} (${i.price})`).join(", "),
      PaymentMethod: o.paymentMethod,
      Subtotal: o.subtotal,
      Discount: o.discountAmount || 0,
      Total: o.total ?? o.subtotal,
      CashReceived: o.cashReceived ?? "",
      Change: o.change ?? "",
      KipCash: o.kipCashAmount ?? "",
      FxCurrency: o.fxCurrency ?? "",
      FxAmount: o.fxAmount ?? "",
      FxRate: o.fxRate ?? "",
      Status: o.status,
      Note: o.note ?? "",
    }));
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(dailyRows.length ? dailyRows : [{ Date: "", Cash: 0, QR: 0, Total: 0 }]);
    XLSX.utils.book_append_sheet(wb, ws1, "DailySummary");
    const wsCF = XLSX.utils.json_to_sheet(cashRows.length ? cashRows : [{ Date: "", KipIn: 0, KipOut: 0, KipNet: 0, USDIn: 0, THBIn: 0 }]);
    XLSX.utils.book_append_sheet(wb, wsCF, "CashFlow");
    const ws2 = XLSX.utils.json_to_sheet(ordersRows.length ? ordersRows : [{ OrderID: "", OrderDatetime: "", Items: "", PaymentMethod: "", Subtotal: 0, Discount: 0, Total: 0, CashReceived: "", Change: "", KipCash: "", FxCurrency: "", FxAmount: "", FxRate: "", Status: "", Note: "" }]);
    XLSX.utils.book_append_sheet(wb, ws2, "OrdersLog");
    try {
      const ab = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([ab], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `minnano_pos_${todayPrefix()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      try {
        const ab = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([ab], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      } catch (e2) {
        alert("Export failed. Please try another browser or check permissions.");
      }
    }
  };

  const updateMenuItem = (id: string | number, patch: Partial<MenuItem>) => {
    setMenu((prev) => prev.map((m) => (String(m.id) === String(id) ? { ...m, ...patch } : m)));
  };
  const handleUpload = async (id: string | number, file: File | null) => {
    if (!file) return;
    try {
      const resized = await fileToResizedDataUrl(file, 800, 0.72);
      updateMenuItem(id, { imageUrl: resized });
    } catch (e) {
      alert("Failed to load image");
      console.error(e);
    }
  };
  const addMenuItem = () => {
    const nextId = (menu.reduce((max, m) => Math.max(max, Number(m.id)), 0) || 0) + 1;
    const newItem: MenuItem = { id: nextId, name: "New Item", price: 0, category: "Drink", imageUrl: "" };
    setMenu((prev) => [...prev, newItem]);
  };
  const deleteMenuItem = (id: string | number) => {
    if (!confirm("Delete this menu item?")) return;
    setMenu((prev) => prev.filter((m) => String(m.id) !== String(id)));
  };

  if (typeof window !== "undefined") {
    setTimeout(() => {
      try {
        const a = [{ id: 1, name: "A", price: 1000, category: "Drink" } as MenuItem];
        let state: OrderItem[] = [];
        const add = (item: MenuItem) => {
          const idx = state.findIndex((i) => String(i.id) === String(item.id));
          if (idx >= 0) {
            const copy = [...state];
            copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
            state = copy;
          } else {
            state = [...state, { ...item, qty: 1 }];
          }
        };
        add(a[0]);
        add(a[0]);
        console.assert(state.find((i) => String(i.id) === "1")?.qty === 2, "addItem should increment qty");
        const subtotal = state.reduce((acc, i) => acc + i.price * i.qty, 0);
        console.assert(subtotal === 2000, "subtotal calculation");
        const withDisc = Math.max(0, subtotal - 5000);
        console.assert(withDisc === 0, "discount should not go below zero");
      } catch {}
    }, 0);
  }

  return (
    <div className="p-4 max-w-screen-md mx-auto">
      <style>{`@media print { body * { visibility: hidden; } #printable-receipt, #printable-receipt * { visibility: visible; } #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; } }`}</style>
      <header className="mb-3 print:hidden">
        <h1 className="text-2xl font-bold">Minnano Café</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant={view === "home" ? "default" : "outline"} onClick={() => setView("home")}>Home</Button>
          <Button variant={view === "orders" ? "default" : "outline"} onClick={() => setView("orders")}>Orders</Button>
          <Button variant={view === "history" ? "default" : "outline"} onClick={() => setView("history")}>History</Button>
          <Button variant={view === "settings" ? "default" : "outline"} onClick={() => setView("settings")}>Settings</Button>
          <Button variant="outline" onClick={exportExcel}>Export Excel</Button>
        </div>
        <div className="sr-only" aria-live="polite">{ariaMsg}</div>
      </header>

      {view === "home" && (
        <>
          <div className="flex gap-2 mb-3">
            {["All", "Drink", "Food", "Cookie", "Other"].map((t) => (
              <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => setTab(t as any)}>{t}</Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filteredMenu.map((item) => (
              <Card key={item.id} className={`cursor-pointer text-center p-0 overflow-hidden relative transition transform ${justAddedId===item.id ? 'animate-pulse ring-2 ring-green-500 scale-95' : ''}`} onClick={() => addItem(item)}>
                <div className="relative w-full" style={{ paddingTop: "100%" }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">No Image</div>
                  )}
                  {justAddedId===item.id && (
                    <div className="absolute top-1 right-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded">+1</div>
                  )}
                </div>
                <CardContent className="p-3">
                  <p className="text-lg font-semibold leading-tight">{item.name}</p>
                  <p className="opacity-80">{formatKip(item.price)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {selectedItems.length > 0 && (
            <div className={`mt-5 p-3 rounded-xl transition ${drawerFlash ? 'bg-green-50 ring-2 ring-green-400' : 'bg-gray-50'}`}>
              <h2 className="text-lg font-bold mb-2">Selected Items {editingOrderId ? `(Editing ${editingOrderId})` : ""}</h2>
              <div className="space-y-1">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <span className="truncate mr-2">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => dec(item.id)}>-</Button>
                      <span className="w-6 text-center">{item.qty}</span>
                      <Button size="sm" variant="outline" onClick={() => inc(item.id)}>+</Button>
                      <span className="w-24 text-right">{formatKip(item.price * item.qty)}</span>
                      <Button size="sm" variant="ghost" onClick={() => removeItem(item.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                <span>Subtotal</span>
                <span>{formatKip(cartSubtotal)}</span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2">
                <label className="text-sm">Note</label>
                <textarea className="border rounded p-2 w-full" placeholder="Table 3 / Window seat / Staff: A さん 等" value={cartNote} onChange={(e) => setCartNote(e.target.value)} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-medium">Staff Discount (ADDP -5,000₭)</span>
                <Button
                  variant={cartDiscountName === "ADDP" ? "default" : "outline"}
                  onClick={() => {
                    if (cartDiscountName === "ADDP") {
                      setCartDiscountName("");
                      setCartDiscountAmount(0);
                    } else {
                      setCartDiscountName("ADDP");
                      setCartDiscountAmount(5000);
                    }
                  }}
                >
                  {cartDiscountName === "ADDP" ? "Applied" : "Apply"}
                </Button>
              </div>
              {cartDiscountAmount > 0 && (
                <div className="mt-2 text-sm flex justify-between"><span>Discount</span><span>-{formatKip(cartDiscountAmount)}</span></div>
              )}
              <div className="flex justify-between text-lg font-bold mt-1"><span>Total</span><span>{formatKip(cartTotal)}</span></div>
              <div className="mt-3 flex gap-2">
                <Button onClick={saveOrder}>{editingOrderId ? "Save Changes" : "Save (Pay Later)"}</Button>
                <Button onClick={goCheckoutFromCart}>Checkout</Button>
              </div>
            </div>
          )}
        </>
      )}

      {view === "orders" && (
        <div className="space-y-3">
          {openOrders.length === 0 && <p>No open orders.</p>}
          {openOrders.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <div className="font-semibold">OrderID: {o.id}</div>
                  <div className="text-sm opacity-70">{new Date(o.createdAt).toLocaleTimeString()}</div>
                </div>
                <div className="text-sm truncate">Items: {o.items.map((i) => `${i.name}×${i.qty}`).join(", ")}</div>
                {o.note ? (<div className="text-xs opacity-70 truncate mt-1">Note: {o.note}</div>) : null}
                <div className="mt-1 font-bold">Total: {formatKip(o.total ?? o.subtotal)}</div>
                <div className="mt-2 flex gap-2">
                  <Button onClick={() => openForCheckout(o.id)}>Checkout</Button>
                  <Button variant="outline" onClick={() => editOrder(o.id)}>Edit</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {view === "checkout" && activeOrder && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="font-semibold">Checkout</div>
                <div className="text-sm opacity-70">OrderID: {activeOrder.id}</div>
              </div>
              {activeOrder.note ? (<div className="mt-1 text-xs opacity-70">Note: {activeOrder.note}</div>) : null}
              <div className="mt-2 space-y-1 text-sm">
                {activeOrder.items.map((i) => (
                  <div key={i.id} className="flex justify-between"><span>{i.name} × {i.qty}</span><span>{formatKip(i.price * i.qty)}</span></div>
                ))}
              </div>
              <div className="border-t mt-2 pt-2 flex justify-between"><span>Subtotal</span><span>{formatKip(activeOrder.subtotal)}</span></div>
              {activeOrder.discountAmount ? (
                <div className="flex justify-between text-sm"><span>Discount ({activeOrder.discountName})</span><span>-{formatKip(activeOrder.discountAmount)}</span></div>
              ) : null}
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatKip(activeOrder.total ?? activeOrder.subtotal)}</span></div>
            </CardContent>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button variant={activeOrder.paymentMethod === "Cash" ? "default" : "outline"} onClick={() => setPaymentMethod("Cash")}>Cash</Button>
            <Button variant={activeOrder.paymentMethod === "QR" ? "default" : "outline"} onClick={() => setPaymentMethod("QR")}>QR</Button>
          </div>
          {activeOrder.paymentMethod === "Cash" && (
            <Card><CardContent className="p-4 space-y-2">
              <div>
                <label className="text-sm">Cash Received (Kip)</label>
                <input type="number" inputMode="numeric" className="mt-1 w-full border rounded p-2" placeholder="Enter KIP amount" value={Number.isFinite(activeOrder.cashReceived||undefined) ? Math.max(0, (activeOrder.cashReceived||0) - Math.max(0, fxAmount) * Math.max(0, fxRate)) : (activeOrder.cashReceived ?? "")} onChange={(e) => {
                  const kip = Number(e.target.value || 0);
                  const basis = Math.max(0, activeOrder.total ?? activeOrder.subtotal);
                  recomputeCash(kip, fxAmount, fxRate, basis, fxCurrency);
                }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-end justify-between gap-2">
                    <label className="text-sm">Foreign Amount</label>
                    <div className="flex gap-1">
                      <Button size="sm" variant={fxCurrency === "USD" ? "default" : "outline"} onClick={() => {
                        setFxCurrency("USD");
                        const basis = Math.max(0, activeOrder.total ?? activeOrder.subtotal);
                        const kipCurrent = Math.max(0, (activeOrder.cashReceived||0) - fxAmount*fxRate);
                        recomputeCash(kipCurrent, fxAmount, fxRate, basis, "USD");
                      }}>USD</Button>
                      <Button size="sm" variant={fxCurrency === "THB" ? "default" : "outline"} onClick={() => {
                        setFxCurrency("THB");
                        const basis = Math.max(0, activeOrder.total ?? activeOrder.subtotal);
                        const kipCurrent = Math.max(0, (activeOrder.cashReceived||0) - fxAmount*fxRate);
                        recomputeCash(kipCurrent, fxAmount, fxRate, basis, "THB");
                      }}>THB</Button>
                    </div>
                  </div>
                  <input type="number" inputMode="numeric" className="mt-1 w-full border rounded p-2" placeholder="e.g. 10" value={fxAmount || ""} onChange={(e) => {
                    const amt = Number(e.target.value || 0);
                    setFxAmount(amt);
                    const basis = Math.max(0, activeOrder.total ?? activeOrder.subtotal);
                    const kipCurrent = Math.max(0, (activeOrder.cashReceived||0) - fxAmount*fxRate);
                    recomputeCash(kipCurrent, amt, fxRate, basis, fxCurrency);
                  }} />
                </div>
                <div>
                  <label className="text-sm">Exchange Rate (Kip per 1 unit)</label>
                  <input type="number" inputMode="numeric" className="mt-1 w-full border rounded p-2" placeholder="e.g. 25000" value={fxRate || ""} onChange={(e) => {
                    const rate = Number(e.target.value || 0);
                    setFxRate(rate);
                    const basis = Math.max(0, activeOrder.total ?? activeOrder.subtotal);
                    const kipCurrent = Math.max(0, (activeOrder.cashReceived||0) - fxAmount*fxRate);
                    recomputeCash(kipCurrent, fxAmount, rate, basis, fxCurrency);
                  }} />
                </div>
              </div>
              <div className="flex justify-between text-sm"><span>Cash (Kip換算)</span><span>{formatKip(Math.max(0, (activeOrder.cashReceived||0)))}</span></div>
              <div className="mt-1 text-2xl font-extrabold text-center">Change: {formatKip(Math.max(0, (activeOrder.cashReceived || 0) - (activeOrder.total ?? activeOrder.subtotal)))}</div>
            </CardContent></Card>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={finalizePayment}>Finalize & Receipt</Button>
            <Button variant="outline" onClick={() => setView("orders")}>Back to Orders</Button>
          </div>
        </div>
      )}

      {view === "receipt" && activeOrder && (
        <div id="printable-receipt" className="max-w-sm mx-auto bg-white p-4 border rounded print:w-full">
          <div className="text-center font-bold text-lg">Minnano Café</div>
          <div className="text-sm flex justify-between"><span>Date/Time</span><span>{new Date(activeOrder.createdAt).toLocaleString()}</span></div>
          <div className="text-sm flex justify-between"><span>OrderID</span><span>{activeOrder.id}</span></div>
          <hr className="my-2" />
          <div className="space-y-1 text-sm">
            {activeOrder.items.map((i) => (<div key={i.id} className="flex justify-between"><span>{i.name} × {i.qty}</span><span>{formatKip(i.price * i.qty)}</span></div>))}
          </div>
          <hr className="my-2" />
          <div className="flex justify-between font-semibold"><span>Subtotal</span><span>{formatKip(activeOrder.subtotal)}</span></div>
          {activeOrder.discountAmount ? (<div className="flex justify-between text-sm"><span>Discount ({activeOrder.discountName})</span><span>-{formatKip(activeOrder.discountAmount)}</span></div>) : null}
          <div className="flex justify-between font-semibold"><span>Total</span><span>{formatKip(activeOrder.total ?? activeOrder.subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span>Payment</span><span>{activeOrder.paymentMethod}</span></div>
          {activeOrder.paymentMethod === "Cash" && (<><div className="flex justify-between text-sm"><span>Cash (Kip換算)</span><span>{formatKip(activeOrder.cashReceived || 0)}</span></div><div className="flex justify-between text-sm"><span>Change</span><span>{formatKip(activeOrder.change || 0)}</span></div></>)}
          <hr className="my-2" />
          <div className="text-center text-sm">Thank you / ຂອບໃຈຫຼາຍ</div>
          <div className="mt-3 flex gap-2"><Button className="print:hidden" onClick={() => window.print()}>Print</Button><Button className="print:hidden" variant="outline" onClick={() => { setActiveOrderId(null); setView("home"); }}>Done</Button></div>
        </div>
      )}

      {view === "history" && (
        <div className="space-y-3">
          {orders.filter((o) => o.status !== "Open").length === 0 && <p>No history yet.</p>}
          {orders.filter((o) => o.status !== "Open").map((o) => (
            <Card key={o.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="font-semibold">{o.id} <span className="ml-2 text-xs opacity-60">{o.status}</span></div>
                  <div className="text-sm opacity-70">{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-sm truncate">{o.items.map((i) => `${i.name}×${i.qty}`).join(", ")}</div>
                {o.note ? (<div className="text-xs opacity-70 truncate mt-1">Note: {o.note}</div>) : null}
                <div className="mt-1 font-bold">{formatKip(o.total ?? o.subtotal)}</div>
                <div className="mt-2 flex gap-2">
                  <Button onClick={() => { setActiveOrderId(o.id); setView("receipt"); }}>View Receipt</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {view === "settings" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Menu (Images & Price)</h2>
            <Button onClick={addMenuItem}>Add Menu Item</Button>
          </div>
          <div className="space-y-3">
            {menu.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-4">
                  <div className="flex gap-3 items-start sm:flex-row flex-col">
                    <div className="w-20 aspect-square relative shrink-0">
                      {m.imageUrl ? (
                        <img src={m.imageUrl} alt={m.name} className="absolute inset-0 w-full h-full object-cover rounded" />
                      ) : (
                        <div className="absolute inset-0 bg-gray-100 rounded flex items-center justify-center text-xs opacity-60">No Image</div>
                      )}
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 items-center min-w-0">
                      <label className="text-sm opacity-75">Name</label>
                      <input className="border rounded p-2" value={m.name} onChange={(e) => updateMenuItem(m.id, { name: e.target.value })} />
                      <label className="text-sm opacity-75">Price (₭)</label>
                      <input type="number" className="border rounded p-2" value={m.price} onChange={(e) => updateMenuItem(m.id, { price: Number(e.target.value || 0) })} />
                      <label className="text-sm opacity-75">Category</label>
                      <select className="border rounded p-2" value={m.category} onChange={(e) => updateMenuItem(m.id, { category: e.target.value as any })}>
                        <option value="Drink">Drink</option>
                        <option value="Food">Food</option>
                        <option value="Cookie">Cookie</option>
                        <option value="Other">Other</option>
                      </select>
                      <label className="text-sm opacity-75">Image URL</label>
                      <input className="border rounded p-2" value={m.imageUrl || ""} onChange={(e) => updateMenuItem(m.id, { imageUrl: e.target.value })} placeholder="https://... or data:image/jpeg;base64,..." />
                      <label className="text-sm opacity-75">Upload</label>
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleUpload(m.id, e.target.files?.[0] || null)} className="border rounded p-2" />
                      <div></div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => updateMenuItem(m.id, { imageUrl: "" })}>Remove Image</Button>
                        <Button variant="destructive" onClick={() => deleteMenuItem(m.id)}>Delete Item</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
