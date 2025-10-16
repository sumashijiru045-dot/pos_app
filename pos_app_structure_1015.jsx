import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import * as XLSX from "xlsx";

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: "Drink" | "Food";
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
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  change?: number;
  status: OrderStatus;
  note?: string;
}

const formatKip = (v: number) => `${v.toLocaleString()}₭`;
const todayPrefix = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};
let counterSeed = 1;
const nextOrderId = () => `${todayPrefix()}-${String(counterSeed++).padStart(3, "0")}`;

async function fileToResizedDataUrl(file: File, maxSize = 800, quality = 0.7): Promise<string> {
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
  { id: 1, name: "Hot Latte", price: 35000, category: "Drink" },
  { id: 2, name: "Iced Latte", price: 38000, category: "Drink" },
  { id: 3, name: "Americano", price: 28000, category: "Drink" },
  { id: 4, name: "Cappuccino", price: 35000, category: "Drink" },
  { id: 5, name: "Mocha", price: 38000, category: "Drink" },
  { id: 6, name: "Tea", price: 20000, category: "Drink" },
  { id: 7, name: "Omelette Set", price: 45000, category: "Food" },
  { id: 8, name: "Curry", price: 40000, category: "Food" },
  { id: 9, name: "Pasta A", price: 42000, category: "Food" },
  { id: 10, name: "Pasta B", price: 42000, category: "Food" },
];

export default function App() {
  const [view, setView] = useState<"home" | "orders" | "checkout" | "receipt" | "settings" | "history">("home");
  const [tab, setTab] = useState<"All" | "Drink" | "Food">("All");
  const [menu, setMenu] = useState<MenuItem[]>(DEFAULT_MENU);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const activeOrder = useMemo(() => orders.find((o) => o.id === activeOrderId) || null, [orders, activeOrderId]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const filteredMenu = tab === "All" ? menu : menu.filter((m) => m.category === tab);

  const addItem = (item: MenuItem) => {
    setSelectedItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };
  const inc = (id: number) => setSelectedItems((p) => p.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));
  const dec = (id: number) => setSelectedItems((p) => p.map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0));
  const removeItem = (id: number) => setSelectedItems((p) => p.filter((i) => i.id !== id));
  const cartSubtotal = selectedItems.reduce((acc, i) => acc + i.price * i.qty, 0);

  const saveOrder = () => {
    if (selectedItems.length === 0) return;
    if (editingOrderId) {
      setOrders((prev) => prev.map((o) => (o.id === editingOrderId ? { ...o, items: selectedItems, subtotal: cartSubtotal } : o)));
      setSelectedItems([]);
      setEditingOrderId(null);
      return;
    }
    const id = nextOrderId();
    const now = new Date().toISOString();
    const newOrder: Order = { id, createdAt: now, items: selectedItems, subtotal: cartSubtotal, paymentMethod: "", status: "Open" };
    setOrders((prev) => [newOrder, ...prev]);
    setSelectedItems([]);
  };

  const goCheckoutFromCart = () => {
    if (selectedItems.length === 0) return;
    if (editingOrderId) {
      setOrders((prev) => prev.map((o) => (o.id === editingOrderId ? { ...o, items: selectedItems, subtotal: cartSubtotal } : o)));
      setActiveOrderId(editingOrderId);
      setSelectedItems([]);
      setEditingOrderId(null);
      setView("checkout");
      return;
    }
    const id = nextOrderId();
    const now = new Date().toISOString();
    const newOrder: Order = { id, createdAt: now, items: selectedItems, subtotal: cartSubtotal, paymentMethod: "", status: "Open" };
    setOrders((prev) => [newOrder, ...prev]);
    setSelectedItems([]);
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
    setEditingOrderId(id);
    setTab("All");
    setView("home");
  };

  const setPaymentMethod = (pm: PaymentMethod) => {
    if (!activeOrder) return;
    setOrders((prev) => prev.map((o) => (o.id === activeOrder.id ? { ...o, paymentMethod: pm } : o)));
  };
  const setCashReceived = (value: number) => {
    if (!activeOrder) return;
    const change = Math.max(0, value - activeOrder.subtotal);
    setOrders((prev) => prev.map((o) => (o.id === activeOrder.id ? { ...o, cashReceived: value, change } : o)));
  };
  const finalizePayment = () => {
    if (!activeOrder) return;
    if (activeOrder.paymentMethod === "") {
      alert("Select payment method (Cash / QR)");
      return;
    }
    if (activeOrder.paymentMethod === "Cash" && (!activeOrder.cashReceived || activeOrder.cashReceived < activeOrder.subtotal)) {
      alert("Cash received is less than subtotal.");
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === activeOrder.id ? { ...o, status: "Closed" } : o)));
    setView("receipt");
  };

  const exportExcel = async () => {
    const closed = orders.filter((o) => o.status === "Closed");
    const byDate: Record<string, { Sales: number; Cash: number; QR: number; Total: number }> = {};
    closed.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!byDate[key]) byDate[key] = { Sales: 0, Cash: 0, QR: 0, Total: 0 };
      byDate[key].Sales += o.subtotal;
      if (o.paymentMethod === "Cash") byDate[key].Cash += o.subtotal;
      if (o.paymentMethod === "QR") byDate[key].QR += o.subtotal;
      byDate[key].Total += o.subtotal;
    });
    const dailyRows = Object.entries(byDate).map(([Date, v]) => ({ Date, Sales: v.Sales, Cash: v.Cash, QR: v.QR, Total: v.Total }));
    const ordersRows = closed.map((o) => ({
      OrderID: o.id,
      OrderDatetime: new Date(o.createdAt).toLocaleString(),
      Items: o.items.map((i) => `${i.name} x${i.qty} (${i.price})`).join(", "),
      PaymentMethod: o.paymentMethod,
      Subtotal: o.subtotal,
      CashReceived: o.cashReceived ?? "",
      Change: o.change ?? "",
      Status: o.status,
      Note: o.note ?? "",
    }));
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(dailyRows.length ? dailyRows : [{ Date: "", Sales: 0, Cash: 0, QR: 0, Total: 0 }]);
    XLSX.utils.book_append_sheet(wb, ws1, "DailySummary");
    const ws2 = XLSX.utils.json_to_sheet(ordersRows.length ? ordersRows : [{ OrderID: "", OrderDatetime: "", Items: "", PaymentMethod: "", Subtotal: 0, CashReceived: "", Change: "", Status: "", Note: "" }]);
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

  const updateMenuItem = (id: number, patch: Partial<MenuItem>) => {
    setMenu((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };
  const handleUpload = async (id: number, file: File | null) => {
    if (!file) return;
    try {
      const resized = await fileToResizedDataUrl(file, 800, 0.7);
      updateMenuItem(id, { imageUrl: resized });
    } catch (e) {
      alert("Failed to load image");
      console.error(e);
    }
  };
  const addMenuItem = () => {
    const nextId = (menu.reduce((max, m) => Math.max(max, m.id), 0) || 0) + 1;
    const newItem: MenuItem = { id: nextId, name: "New Item", price: 0, category: "Drink", imageUrl: "" };
    setMenu((prev) => [...prev, newItem]);
  };
  const deleteMenuItem = (id: number) => {
    if (!confirm("Delete this menu item?")) return;
    setMenu((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="p-4 max-w-screen-md mx-auto">
      <header className="text-2xl font-bold flex justify-between items-center mb-4">
        <span>Minnano Café</span>
        <div className="flex gap-2 flex-wrap">
          <Button variant={view === "home" ? "default" : "outline"} onClick={() => setView("home")}>Home</Button>
          <Button variant={view === "orders" ? "default" : "outline"} onClick={() => setView("orders")}>Orders</Button>
          <Button variant={view === "history" ? "default" : "outline"} onClick={() => setView("history")}>History</Button>
          <Button variant={view === "settings" ? "default" : "outline"} onClick={() => setView("settings")}>Settings</Button>
          <Button variant="outline" onClick={exportExcel}>Export Excel</Button>
        </div>
      </header>

      {view === "home" && (
        <>
          <div className="flex gap-2 mb-3">
            {["All", "Drink", "Food"].map((t) => (
              <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => setTab(t as any)}>{t}</Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filteredMenu.map((item) => (
              <Card key={item.id} className="cursor-pointer text-center p-0 overflow-hidden" onClick={() => addItem(item)}>
                <div className="relative w-full" style={{ paddingTop: "100%" }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">No Image</div>
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
            <div className="mt-5 p-3 bg-gray-50 rounded-xl">
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
                <span>Subtotal:</span>
                <span>{formatKip(selectedItems.reduce((a, i) => a + i.price * i.qty, 0))}</span>
              </div>
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
                <div className="mt-1 font-bold">Subtotal: {formatKip(o.subtotal)}</div>
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
              <div className="mt-2 space-y-1 text-sm">
                {activeOrder.items.map((i) => (
                  <div key={i.id} className="flex justify-between"><span>{i.name} × {i.qty}</span><span>{formatKip(i.price * i.qty)}</span></div>
                ))}
              </div>
              <div className="border-t mt-2 pt-2 flex justify-between text-lg font-bold"><span>Subtotal</span><span>{formatKip(activeOrder.subtotal)}</span></div>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button variant={activeOrder.paymentMethod === "Cash" ? "default" : "outline"} onClick={() => setPaymentMethod("Cash")}>Cash</Button>
            <Button variant={activeOrder.paymentMethod === "QR" ? "default" : "outline"} onClick={() => setPaymentMethod("QR")}>QR</Button>
          </div>
          {activeOrder.paymentMethod === "Cash" && (
            <Card><CardContent className="p-4">
              <label className="text-sm">Cash Received</label>
              <input type="number" inputMode="numeric" className="mt-1 w-full border rounded p-2" placeholder="Enter amount" value={activeOrder.cashReceived ?? ""} onChange={(e) => setCashReceived(Number(e.target.value || 0))} />
              <div className="mt-2 text-2xl font-extrabold text-center">Change: {formatKip(Math.max(0, (activeOrder.cashReceived || 0) - activeOrder.subtotal))}</div>
            </CardContent></Card>
          )}
          <div className="flex gap-2">
            <Button onClick={finalizePayment}>Finalize & Receipt</Button>
            <Button variant="outline" onClick={() => setView("orders")}>Back to Orders</Button>
          </div>
        </div>
      )}

      {view === "receipt" && activeOrder && (
        <div className="max-w-sm mx-auto bg-white p-4 border rounded print:w-full">
          <div className="text-center font-bold text-lg">Minnano Café</div>
          <div className="text-sm flex justify-between"><span>Date/Time</span><span>{new Date(activeOrder.createdAt).toLocaleString()}</span></div>
          <div className="text-sm flex justify-between"><span>OrderID</span><span>{activeOrder.id}</span></div>
          <hr className="my-2" />
          <div className="space-y-1 text-sm">
            {activeOrder.items.map((i) => (<div key={i.id} className="flex justify-between"><span>{i.name} × {i.qty}</span><span>{formatKip(i.price * i.qty)}</span></div>))}
          </div>
          <hr className="my-2" />
          <div className="flex justify-between font-semibold"><span>Subtotal</span><span>{formatKip(activeOrder.subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span>Payment</span><span>{activeOrder.paymentMethod}</span></div>
          {activeOrder.paymentMethod === "Cash" && (<><div className="flex justify-between text-sm"><span>Cash</span><span>{formatKip(activeOrder.cashReceived || 0)}</span></div><div className="flex justify-between text-sm"><span>Change</span><span>{formatKip(activeOrder.change || 0)}</span></div></>)}
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
                <div className="mt-1 font-bold">{formatKip(o.subtotal)}</div>
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
          <div className="flex justify_between items-center">
            <h2 className="text-xl font-bold">Menu (Images & Price)</h2>
            <Button onClick={addMenuItem}>Add Menu Item</Button>
          </div>
          <div className="space-y-3">
            {menu.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-4">
                  <div className="flex gap-3 items-start">
                    <div className="w-20 aspect-square relative shrink-0">
                      {m.imageUrl ? (
                        <img src={m.imageUrl} alt={m.name} className="absolute inset-0 w-full h-full object-cover rounded" />
                      ) : (
                        <div className="absolute inset-0 bg-gray-100 rounded flex items-center justify-center text-xs opacity-60">No Image</div>
                      )}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2 items-center">
                      <label className="text-sm opacity-75">Name</label>
                      <input className="border rounded p-2" value={m.name} onChange={(e) => updateMenuItem(m.id, { name: e.target.value })} />
                      <label className="text-sm opacity-75">Price (₭)</label>
                      <input type="number" className="border rounded p-2" value={m.price} onChange={(e) => updateMenuItem(m.id, { price: Number(e.target.value || 0) })} />
                      <label className="text-sm opacity-75">Category</label>
                      <select className="border rounded p-2" value={m.category} onChange={(e) => updateMenuItem(m.id, { category: e.target.value as any })}>
                        <option value="Drink">Drink</option>
                        <option value="Food">Food</option>
                      </select>
                      <label className="text-sm opacity-75">Image URL</label>
                      <input className="border rounded p-2" value={m.imageUrl || ""} onChange={(e) => updateMenuItem(m.id, { imageUrl: e.target.value })} placeholder="https://... or data:image/jpeg;base64,..." />
                      <label className="text-sm opacity-75">Upload</label>
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleUpload(m.id, e.target.files?.[0] || null)} className="border rounded p-2" />
                      <div></div>
                      <div className="flex gap-2">
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
