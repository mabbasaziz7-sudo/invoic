import { useState, useEffect, useRef } from 'react';
import { Product, CartItem, Invoice, Client, PaymentMethod, User, Coupon, ProductOffer, Shift } from '../types';
import { getProducts, saveProduct, getClients, saveClient, getInvoices, saveInvoice, getSettings, getCategories, saveCartDisplay, getUserPermissions, getCoupons, getProductOffers, logoutUser, getOpenShift, openShift, closeShift } from '../store';

interface POSProps {
  currentUser?: User | null;
}

export default function POS({ currentUser }: POSProps) {
  const perms = currentUser ? getUserPermissions(currentUser) : null;
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [categories, setCategories] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('عميل نقدي');
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(() => getSettings().defaultTax ?? 17);
  const [paid, setPaid] = useState(0);
  const [invoiceId, setInvoiceId] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [allCoupons, setAllCoupons] = useState<Coupon[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [activeOffers, setActiveOffers] = useState<ProductOffer[]>([]);
  const [allInvoicesState, setAllInvoicesState] = useState<Invoice[]>([]);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashAmount, setCashAmount] = useState(0);
  const [visaAmount, setVisaAmount] = useState(0);
  // Shift management
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [showShiftOpenModal, setShowShiftOpenModal] = useState(false);
  const [showShiftCloseModal, setShowShiftCloseModal] = useState(false);
  const [initialShiftCash, setInitialShiftCash] = useState(0);
  const [actualShiftCash, setActualShiftCash] = useState(0);

  // Cart item editing (Price override)
  const [editingCartItem, setEditingCartItem] = useState<number | null>(null);
  const [showCartItemModal, setShowCartItemModal] = useState(false);
  const [tempItemPrice, setTempItemPrice] = useState(0);

  // Auto print toggle
  const [autoPrint, setAutoPrint] = useState(true);

  // Payment confirmation modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Add Client Modal
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  // Quick Add Product Modal
  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [quickProduct, setQuickProduct] = useState({ name: '', barcode: '', quantity: 1, buyPrice: 0, sellPrice: 0, category: 'عام' });
  const [quickProductImage, setQuickProductImage] = useState('');

  // Held invoices (suspended)
  interface HeldInvoice {
    id: string;
    cart: CartItem[];
    client: string;
    discount: number;
    tax: number;
    paymentMethod: PaymentMethod;
    timestamp: number;
    isDelivery: boolean;
    deliveryAddress: string;
    deliveryDriver: string;
    deliveryPhone: string;
    note: string;
  }
  const [heldInvoices, setHeldInvoices] = useState<HeldInvoice[]>(() => {
    try { return JSON.parse(localStorage.getItem('held_invoices') || '[]'); } catch { return []; }
  });
  const [showHeldInvoices, setShowHeldInvoices] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDriver, setDeliveryDriver] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');

  const barcodeRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const settings = getSettings();

  useEffect(() => {
    const loadData = async () => {
      setProducts(await getProducts());
      setCategories(await getCategories());
      setClients(await getClients());
      setAllCoupons(await getCoupons());
      setActiveOffers(await getProductOffers());
      setAllInvoicesState(await getInvoices());
      
      /* 
      if (currentUser?.id) {
        const openShiftData = await getOpenShift(currentUser.id);
        if (openShiftData) {
          setCurrentShift(openShiftData);
        } else {
          setShowShiftOpenModal(true);
        }
      }
      */
    };
    loadData();
    generateInvoiceId();
    const currentSettings = getSettings();
    setTax(currentSettings.defaultTax ?? 17);
    
    // Fullscreen behavior override: only escape key
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) document.exitFullscreen();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [currentUser, currentShift]);

  const enterFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }
  };

  // Sync cart to customer display
  useEffect(() => {
    const subtotalVal = cart.reduce((sum, item) => sum + item.product.sellPrice * item.quantity, 0);
    const discountAmt = subtotalVal * (discount / 100);
    const taxAmt = (subtotalVal - discountAmt) * (tax / 100);
    const totalVal = subtotalVal - discountAmt + taxAmt;
    saveCartDisplay({
      items: cart.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.sellPrice,
        total: item.product.sellPrice * item.quantity,
      })),
      total: parseFloat(totalVal.toFixed(2)),
      storeName: settings.storeName,
    });
  }, [cart, discount, tax]);

  // When payment method changes, adjust amounts
  useEffect(() => {
    if (paymentMethod === 'cash') {
      setCashAmount(paid);
      setVisaAmount(0);
    } else if (paymentMethod === 'visa') {
      setCashAmount(0);
      setVisaAmount(paid);
    }
  }, [paymentMethod, paid]);

  const generateInvoiceId = () => {
    const now = new Date();
    const id = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    setInvoiceId(id);
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity < product.quantity) {
        setCart(cart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        alert('الكمية المتوفرة غير كافية!');
      }
    } else {
      if (product.quantity > 0) {
        setCart([...cart, { product, quantity: 1 }]);
      } else {
        alert('المنتج غير متوفر في المخزون!');
      }
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.product.quantity) {
          alert('الكمية المتوفرة غير كافية!');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleBarcode = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && barcode.trim()) {
      const product = products.find(p => p.barcode === barcode.trim());
      if (product) {
        addToCart(product);
        setBarcode('');
      } else {
        alert('المنتج غير موجود!');
      }
    }
  };

  const subtotal = cart.reduce((sum, item) => {
    let price = item.product.sellPrice;
    
    // 0. CHECK OVERRIDE FIRST
    if (item.overridePrice !== undefined) {
       price = item.overridePrice;
    }
    // 1. Check for Group Offers (Multi-product offers)
    else {
      const activeOffer = activeOffers.find(off => off.productIds.includes(item.product.id!));
      if (activeOffer) {
         if (activeOffer.discountPercent > 0) price = price * (1 - activeOffer.discountPercent / 100);
         else if (activeOffer.discountAmount > 0) price = Math.max(0, price - activeOffer.discountAmount);
      }
      // 2. Check Bulk Pricing
      else if ((item.product.bulkQuantity || 0) > 0 && item.quantity >= (item.product.bulkQuantity || 0)) {
         price = item.product.bulkPrice || price;
      } 
      // 3. Check Individual Discount
      else if ((item.product.discountPrice || 0) > 0) {
         price = Math.min(price, item.product.discountPrice || price);
      } else if ((item.product.discountPercent || 0) > 0) {
         price = price * (1 - (item.product.discountPercent || 0) / 100);
      }
    }
    
    return sum + price * item.quantity;
  }, 0);

  const updateCartItemOverride = (productId: number, price: number) => {
     setCart(cart.map(i => i.product.id === productId ? { ...i, overridePrice: price } : i));
     setShowCartItemModal(false);
  };

  const applyJumlaPrice = (productId: number) => {
     const item = cart.find(i => i.product.id === productId);
     if (item && item.product.bulkPrice) {
        updateCartItemOverride(productId, item.product.bulkPrice);
     } else {
        alert('هذا المنتج لا يحتوي على سعر جملة محدد!');
     }
  };

  const applyCoupon = () => {
    const coupon = allCoupons.find(c => c.code === couponCode.trim().toUpperCase() && c.active);
    if (!coupon) {
      alert('الكوبون غير صحيح أو منتهي!');
      return;
    }
    if (subtotal < coupon.minOrderValue) {
      alert(`الحد الأدنى لاستخدام هذا الكوبون هو ${coupon.minOrderValue} ${settings.currency}`);
      return;
    }
    setAppliedCoupon(coupon);
    setCouponCode('');
    alert(`تم تطبيق الكوبون: خصم ${coupon.discountPercent > 0 ? `${coupon.discountPercent}%` : `${coupon.discountAmount} ${settings.currency}`}`);
  };

  const getCouponDiscount = () => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountPercent > 0) return subtotal * (appliedCoupon.discountPercent / 100);
    return appliedCoupon.discountAmount;
  };

  const finalDiscountAmount = (subtotal * (discount / 100)) + getCouponDiscount();
  const taxAmount = (subtotal - finalDiscountAmount) * (tax / 100);
  const total = subtotal - finalDiscountAmount + taxAmount;
  const totalPaid = paymentMethod === 'mixed' ? cashAmount + visaAmount : paid;
  const remaining = totalPaid - total;

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return '💵 نقدي (كاش)';
      case 'visa': return '💳 بطاقة (فيزا)';
      case 'mixed': return '💵💳 مختلط';
    }
  };

  const getPaymentMethodShort = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'visa': return 'بطاقة';
      case 'mixed': return 'مختلط';
    }
  };

  const openShiftHandler = async () => {
    if (currentUser?.id) {
       try {
         await openShift(currentUser.id, initialShiftCash);
         const s = await getOpenShift(currentUser.id);
         setCurrentShift(s);
         setShowShiftOpenModal(false);
         enterFullScreen();
       } catch (err: any) { 
         console.error('Shift open error:', err);
         alert(`خطأ في فتح الوردية: ${err.message || 'تأكد من تحديث قاعدة البيانات'}`); 
       }
    }
  };

  const printShiftReport = (s: Shift) => {
    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) return;

    const shiftInvoices = allInvoicesState.filter(inv => inv.shiftId === s.id);
    const totalCashSales = shiftInvoices.filter(i => i.paymentMethod === 'cash').reduce((sum: number, i: any) => sum + i.total, 0);
    const totalVisaSales = shiftInvoices.filter(i => i.paymentMethod === 'visa').reduce((sum: number, i: any) => sum + i.total, 0);

    const content = `
      <html dir="rtl">
        <head>
          <title>Shift Report - ${s.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
            body { font-family: 'Tajawal', sans-serif; text-align: center; padding: 10px; width: 70mm; margin: 0 auto; color: #000; }
            .header { font-size: 16px; font-weight: 900; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            .section { border-bottom: 1px dashed #ccc; padding: 8px 0; text-align: right; }
            .row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
            .total-row { font-weight: 900; font-size: 14px; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
            .footer { font-size: 10px; margin-top: 20px; color: #666; }
            .badge { background: #000; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">تقرير وردية كاشير (X-Report)</div>
          <div style="font-size: 10px; margin-bottom: 15px;">المتجر: ${settings.storeName} | التاريخ: ${new Date().toLocaleDateString('ar-EG')}</div>
          
          <div class="section">
            <div class="row"><span>رقم الوردية:</span> <span>#${s.id}</span></div>
            <div class="row"><span>الكاشير:</span> <span>${currentUser?.fullName}</span></div>
            <div class="row"><span>وقت الفتح:</span> <span>${new Date(s.openedAt).toLocaleTimeString('ar-EG')}</span></div>
          </div>

          <div class="section">
            <div class="row"><span>العهدة الافتتاحية:</span> <span>${s.initialCash.toFixed(2)}</span></div>
            <div class="row"><span>مبيعات نقدي:</span> <span>${totalCashSales.toFixed(2)}</span></div>
            <div class="row"><span>مبيعات بطاقة:</span> <span>${totalVisaSales.toFixed(2)}</span></div>
            <div class="total-row row"><span>إجمالي المبيعات:</span> <span>${s.totalSales.toFixed(2)}</span></div>
          </div>

          <div class="section">
            <div class="total-row row"><span>المتوقع في الصندوق:</span> <span>${(s.expectedCash + s.initialCash).toFixed(2)}</span></div>
            <div class="row"><span>المبلغ الفعلي (عد):</span> <span>${actualShiftCash.toFixed(2)}</span></div>
            <div class="row" style="color: ${actualShiftCash >= (s.expectedCash + s.initialCash) ? 'green' : 'red'};">
              <span>العجز / الزيادة:</span> 
              <span>${(actualShiftCash - (s.expectedCash + s.initialCash)).toFixed(2)}</span>
            </div>
          </div>

          <div class="section">
            <div style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">ملخص العمليات:</div>
            <div class="row"><span>عدد الفواتير:</span> <span>${shiftInvoices.length}</span></div>
          </div>

          <div class="footer">
            <p>نظام Bakhcha Pro POS لإدارة المبيعات</p>
            <p>${new Date().toLocaleString('ar-EG')}</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const closeShiftHandler = async () => {
    if (currentShift?.id) {
       try {
         await closeShift(currentShift.id, actualShiftCash, currentShift.expectedCash, currentShift.totalSales);
         alert('تم تقفيل الوردية بنجاح ✅');
         setCurrentShift(null);
         setShowShiftCloseModal(false);
         setShowShiftOpenModal(true); // Open new shift immediately
       } catch (err: any) { 
         console.error('Shift close error:', err);
         alert(`خطأ في تقفيل الوردية: ${err.message || 'حدث خطأ غير متوقع'}`); 
       }
    }
  };

  // Open payment confirmation modal
  const openPaymentModal = () => {
    /*
    if (!currentShift) {
      alert('يجب فتح وردية أولاً!');
      setShowShiftOpenModal(true);
      return;
    }
    */
    if (cart.length === 0) {
      alert('السلة فارغة!');
      return;
    }
    setShowPaymentModal(true);
  };

  const confirmSale = async () => {
    if (cart.length === 0) {
      alert('السلة فارغة!');
      return;
    }

    const actualPaid = paymentMethod === 'mixed' ? cashAmount + visaAmount : paid;

    const profit = cart.reduce((sum, item) =>
      sum + (item.product.sellPrice - item.product.buyPrice) * item.quantity, 0
    );

    const invoice: Invoice = {
      id: invoiceId,
      date: new Date().toISOString().split('T')[0],
      client: selectedClient,
      items: cart.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.sellPrice,
        total: item.product.sellPrice * item.quantity,
        productId: item.product.id,
        barcode: item.product.barcode,
      })),
      subtotal,
      discount,
      tax,
      total: parseFloat(total.toFixed(2)),
      paid: actualPaid,
      remaining: parseFloat((actualPaid - total).toFixed(2)),
      cashier: currentUser?.fullName || currentUser?.username || 'مدير',
      profit: parseFloat((profit * (1 - discount / 100) * (1 + tax / 100)).toFixed(2)),
      paymentMethod,
      cashAmount: paymentMethod === 'mixed' ? cashAmount : paymentMethod === 'cash' ? actualPaid : 0,
      visaAmount: paymentMethod === 'mixed' ? visaAmount : paymentMethod === 'visa' ? actualPaid : 0,
      shiftId: currentShift?.id,
    };

    try {
      // 1. Save INVOICE to Supabase
      await saveInvoice(invoice);

      // 2. Handle Client Debt in Supabase
      if (actualPaid < total && selectedClient !== 'عميل نقدي') {
        const debt = total - actualPaid;
        const client = clients.find(c => c.name === selectedClient);
        if (client) {
          await saveClient({ ...client, debt: client.debt + debt });
          setClients(await getClients());
        }
      }

      // 3. Update PRODUCT STOCK in Supabase
      for (const item of cart) {
        const p = products.find(prod => prod.id === item.product.id);
        if (p) {
          await saveProduct({ ...p, quantity: p.quantity - item.quantity });
        }
      }
      setProducts(await getProducts());

      // Auto print if enabled
      if (autoPrint) {
        printInvoiceWithQR(invoice);
      }

      setCart([]);
      setDiscount(0);
      setPaid(0);
      setCashAmount(0);
      setVisaAmount(0);
      setPaymentMethod('cash');
      setShowPaymentModal(false);
      generateInvoiceId();
      saveCartDisplay({ items: [], total: 0, storeName: settings.storeName });
      
      // Update shift expected totals
      if (currentShift) {
        const newShiftTotal = currentShift.totalSales + invoice.total;
        const newExpected = currentShift.expectedCash + (invoice.paymentMethod === 'cash' ? (invoice.paid || 0) : (invoice.paymentMethod === 'mixed' ? (invoice.cashAmount || 0) : 0));
        setCurrentShift({ ...currentShift, totalSales: newShiftTotal, expectedCash: newExpected });
      }

      alert('تمت عملية البيع بنجاح! ✅');
      // Re-enter full screen after print
      setTimeout(enterFullScreen, 1000);
    } catch (err) {
      console.error('Sale confirmation failed:', err);
      alert('فشل إتمام العملية: ' + (err as any).message);
    }
  };

  const cancelSale = () => {
    setCart([]);
    setDiscount(0);
    setPaid(0);
    setCashAmount(0);
    setVisaAmount(0);
    setPaymentMethod('cash');
    setSelectedClient('عميل نقدي');
    generateInvoiceId();
    saveCartDisplay({ items: [], total: 0, storeName: settings.storeName });
  };

  // ========== HOLD / DELIVERY SYSTEM ==========
  const saveHeldInvoices = (invoices: HeldInvoice[]) => {
    setHeldInvoices(invoices);
    localStorage.setItem('held_invoices', JSON.stringify(invoices));
  };

  const holdInvoice = async (isDelivery = false) => {
    if (cart.length === 0) { alert('السلة فارغة!'); return; }
    const held: HeldInvoice = {
      id: invoiceId,
      cart: [...cart],
      client: selectedClient,
      discount,
      tax,
      paymentMethod,
      timestamp: Date.now(),
      isDelivery,
      deliveryAddress: isDelivery ? deliveryAddress : '',
      deliveryDriver: isDelivery ? deliveryDriver : '',
      deliveryPhone: isDelivery ? deliveryPhone : '',
      note: isDelivery ? deliveryNote : '',
    };
    const updated = [...heldInvoices, held];
    saveHeldInvoices(updated);

    if (isDelivery) {
      // Deduct stock for delivery
      for (const item of cart) {
        const p = products.find(prod => prod.id === item.product.id);
        if (p) await saveProduct({ ...p, quantity: p.quantity - item.quantity });
      }
      setProducts(await getProducts());
      printDeliveryInvoice(held);
    }

    cancelSale();
    setShowDeliveryModal(false);
    setDeliveryAddress('');
    setDeliveryDriver('');
    setDeliveryPhone('');
    setDeliveryNote('');
    alert(isDelivery ? '✅ تم حفظ فاتورة التوصيل!' : '⏸️ تم تعليق الفاتورة!');
  };

  const resumeHeldInvoice = (held: HeldInvoice) => {
    setCart(held.cart);
    setSelectedClient(held.client);
    setDiscount(held.discount);
    setTax(held.tax);
    setPaymentMethod(held.paymentMethod);
    setInvoiceId(held.id);
    const updated = heldInvoices.filter(h => h.id !== held.id);
    saveHeldInvoices(updated);
    setShowHeldInvoices(false);
  };

  const deleteHeldInvoice = async (id: string) => {
    const held = heldInvoices.find(h => h.id === id);
    if (held && held.isDelivery) {
      // Return stock for delivery cancellation
      for (const item of held.cart) {
        const p = products.find(prod => prod.id === item.product.id);
        if (p) await saveProduct({ ...p, quantity: p.quantity + item.quantity });
      }
      setProducts(await getProducts());
    }
    const updated = heldInvoices.filter(h => h.id !== id);
    saveHeldInvoices(updated);
  };

  const printDeliveryInvoice = (held: HeldInvoice) => {
    const sub = held.cart.reduce((s, i) => s + i.product.sellPrice * i.quantity, 0);
    const discAmt = sub * (held.discount / 100);
    const taxAmt = (sub - discAmt) * (held.tax / 100);
    const tot = sub - discAmt + taxAmt;
    const win = window.open('', '_blank', 'width=400,height=700');
    if (!win) return;
    win.document.write(`<html dir="rtl"><head><title>فاتورة توصيل</title>
    <style>body{font-family:Arial;padding:10px;font-size:13px;max-width:350px;margin:0 auto}
    .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:8px 0}
    table{width:100%;border-collapse:collapse}td{padding:3px 2px;font-size:12px}
    .delivery-box{border:2px solid #000;padding:10px;margin:10px 0;border-radius:8px;background:#f9f9f9}
    @media print{body{margin:0}.no-print{display:none}}</style></head><body>
    <div class="center bold" style="font-size:18px">🚚 فاتورة توصيل</div>
    <div class="center bold" style="font-size:16px">${settings.storeName || 'Bakhcha Pro'}</div>
    ${settings.storePhone ? '<div class="center">📞 ' + settings.storePhone + '</div>' : ''}
    <div class="line"></div>
    <div><strong>رقم الفاتورة:</strong> ${held.id}</div>
    <div><strong>التاريخ:</strong> ${new Date(held.timestamp).toLocaleString('ar')}</div>
    <div><strong>العميل:</strong> ${held.client}</div>
    <div class="delivery-box">
      <div class="bold" style="font-size:14px;margin-bottom:5px">📍 بيانات التوصيل</div>
      <div><strong>العنوان:</strong> ${held.deliveryAddress}</div>
      <div><strong>المندوب:</strong> ${held.deliveryDriver}</div>
      <div><strong>هاتف:</strong> ${held.deliveryPhone}</div>
      ${held.note ? '<div><strong>ملاحظة:</strong> ' + held.note + '</div>' : ''}
    </div>
    <div class="line"></div>
    <table><tr style="border-bottom:1px solid #000"><td class="bold">المنتج</td><td class="bold center">الكمية</td><td class="bold center">السعر</td><td class="bold center">الإجمالي</td></tr>
    ${held.cart.map(i => '<tr><td>' + i.product.name + '</td><td class="center">' + i.quantity + '</td><td class="center">' + i.product.sellPrice + '</td><td class="center">' + (i.product.sellPrice * i.quantity).toFixed(2) + '</td></tr>').join('')}
    </table>
    <div class="line"></div>
    <div style="display:flex;justify-content:space-between"><span>الإجمالي الفرعي:</span><span>${sub.toFixed(2)}</span></div>
    ${held.discount > 0 ? '<div style="display:flex;justify-content:space-between"><span>الخصم (' + held.discount + '%):</span><span>-' + discAmt.toFixed(2) + '</span></div>' : ''}
    <div style="display:flex;justify-content:space-between"><span>الضريبة (${held.tax}%):</span><span>${taxAmt.toFixed(2)}</span></div>
    <div class="line"></div>
    <div style="display:flex;justify-content:space-between;font-size:18px" class="bold"><span>المبلغ المطلوب:</span><span>${tot.toFixed(2)}</span></div>
    <div class="line"></div>
    <div class="center bold" style="font-size:14px;color:red;margin:10px 0">⚠️ الدفع عند التسليم</div>
    <div class="center" style="margin-top:15px">
      <div>توقيع المندوب: ________________</div>
      <div style="margin-top:10px">توقيع العميل: ________________</div>
    </div>
    <div class="no-print center" style="margin-top:20px"><button onclick="window.print()" style="padding:10px 30px;font-size:16px;cursor:pointer;background:#0ea5e9;color:white;border:none;border-radius:8px">🖨️ طباعة</button></div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  // Add new client
  const handleAddClient = async () => {
    if (!newClientName.trim()) {
      alert('أدخل اسم العميل!');
      return;
    }
    if (clients.find(c => c.name === newClientName.trim())) {
      alert('هذا العميل موجود بالفعل!');
      return;
    }
    const newClient: Client = {
      id: clients.length > 0 ? Math.max(...clients.map(c => c.id)) + 1 : 1,
      name: newClientName.trim(),
      phone: newClientPhone.trim(),
      debt: 0,
    };
    await saveClient(newClient);
    setClients(await getClients());
    setSelectedClient(newClient.name);
    setNewClientName('');
    setNewClientPhone('');
    setShowAddClientModal(false);
  };

  // Quick add product
  const handleQuickAddProduct = async () => {
    if (!quickProduct.name.trim()) {
      alert('أدخل اسم المنتج!');
      return;
    }
    if (quickProduct.sellPrice <= 0) {
      alert('أدخل سعر البيع!');
      return;
    }
    const newBarcode = quickProduct.barcode || Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const newProduct: Partial<Product> = { // Changed to Partial
      name: quickProduct.name.trim(),
      barcode: newBarcode,
      quantity: quickProduct.quantity,
      buyPrice: quickProduct.buyPrice,
      sellPrice: quickProduct.sellPrice,
      category: quickProduct.category,
      expiryDate: null,
      minStock: 5,
      image: quickProductImage,
    };
    try {
      await saveProduct(newProduct);
      setProducts(await getProducts());
      setQuickProduct({ name: '', barcode: '', quantity: 1, buyPrice: 0, sellPrice: 0, category: 'عام' });
      setQuickProductImage('');
      setShowQuickAddProduct(false);
      alert('تمت إضافة المنتج بنجاح ✅');
    } catch (err: any) {
      console.error('Quick add failed:', err);
      alert('فشل الإضافة السريعة: ' + (err.message || 'خطأ في الاتصال بقاعدة البيانات'));
    }
  };

  const handleQuickProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) {
      alert('حجم الصورة كبير جداً! الحد الأقصى 500KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setQuickProductImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const buildInvoiceHTML = (inv: Invoice, autoPrintEnabled = false) => {
    const qrData = encodeURIComponent(JSON.stringify({
      id: inv.id, date: inv.date, total: inv.total, store: settings.storeName
    }));
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;
    const barcodeId = inv.id.replace(/[^a-zA-Z0-9]/g, '');
    const payMethodLabel = getPaymentMethodShort(inv.paymentMethod || 'cash');
    const payDetails = inv.paymentMethod === 'mixed'
      ? `<p>💵 نقدي: ${(inv.cashAmount || 0).toFixed(2)} ${settings.currency}</p><p>💳 بطاقة: ${(inv.visaAmount || 0).toFixed(2)} ${settings.currency}</p>`
      : '';

    const showLogo = settings.showLogoOnInvoice !== false && settings.logo;
    const showQR = settings.showQROnInvoice !== false;
    const showBarcode = settings.showBarcodeOnInvoice !== false;
    const invoiceTitle = settings.invoiceTitle || settings.storeName;
    const invoiceFooter = settings.invoiceFooter || 'شكراً لزيارتكم 🙏';
    const invoiceNotes = settings.invoiceNotes || '';
    const taxNum = settings.taxNumber || '';
    const nif = settings.nif || '';

    const isA4 = settings.invoiceSize === 'a4';
    const isHalf = settings.invoiceSize === 'half';
    const maxWidth = isA4 ? '700px' : isHalf ? '450px' : '300px';
    const fontSize = isA4 ? '14px' : isHalf ? '13px' : '12px';
    const logoSize = isA4 ? '80px' : '50px';

    return `<html dir="rtl"><head><title>فاتورة ${inv.id}</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <style>
        @page { margin: ${isA4 ? '15mm' : '3mm'}; size: ${isA4 ? 'A4' : isHalf ? '148mm 210mm' : '80mm auto'}; }
        body { font-family: 'Courier New', monospace; text-align: center; padding: ${isA4 ? '30px' : '12px'}; font-size: ${fontSize}; max-width: ${maxWidth}; margin: 0 auto; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        th, td { padding: ${isA4 ? '6px 8px' : '3px'}; text-align: right; font-size: ${isA4 ? '13px' : '11px'}; }
        th { border-bottom: ${isA4 ? '2px' : '1px'} solid #000; font-weight: bold; background: ${isA4 ? '#f5f5f5' : 'transparent'}; }
        ${isA4 ? 'td { border-bottom: 1px solid #eee; }' : ''}
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        .title { font-size: ${isA4 ? '22px' : '16px'}; font-weight: bold; margin: 5px 0; }
        .logo { width: ${logoSize}; height: ${logoSize}; object-fit: contain; margin: 0 auto 8px; display: block; }
        .qr-section { margin: 10px auto; text-align: center; }
        .qr-section img { width: ${isA4 ? '120px' : '90px'}; height: ${isA4 ? '120px' : '90px'}; }
        .barcode-section { margin: 8px auto; text-align: center; }
        .barcode-section svg { max-width: ${isA4 ? '300px' : '220px'}; height: ${isA4 ? '50px' : '40px'}; }
        .total-row { font-weight: bold; font-size: ${isA4 ? '18px' : '14px'}; }
        .payment-method { background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-weight: bold; display: inline-block; margin: 4px 0; }
        .notes { font-size: ${isA4 ? '11px' : '9px'}; color: #666; font-style: italic; margin: 6px 0; padding: 4px; border: 1px solid #ddd; border-radius: 4px; }
        .tax-info { font-size: ${isA4 ? '11px' : '9px'}; color: #888; }
      </style></head><body>
      ${showLogo ? `<img class="logo" src="${settings.logo}" alt="logo" onerror="this.style.display='none'" />` : ''}
      <p class="title">${invoiceTitle}</p>
      <p style="font-size:11px;">هاتف: ${settings.phone}</p>
      <p style="font-size:11px;">${settings.address}</p>
      ${taxNum ? `<p class="tax-info">السجل التجاري: ${taxNum}</p>` : ''}
      ${nif ? `<p class="tax-info">NIF: ${nif}</p>` : ''}
      <div class="line"></div>
      <p>فاتورة رقم: <strong>${inv.id}</strong></p>
      <p>${inv.date} ${new Date().toLocaleTimeString('ar-DZ')}</p>
      <p>العميل: ${inv.client}</p>
      <p class="payment-method">طريقة الدفع: ${payMethodLabel}</p>
      <div class="line"></div>
      <table>
        <tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr>
        ${inv.items.map(item => `<tr><td>${item.name}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:center">${item.price.toFixed(2)}</td><td style="text-align:center">${item.total.toFixed(2)}</td></tr>`).join('')}
      </table>
      <div class="line"></div>
      <p>الإجمالي الفرعي: <strong>${inv.subtotal.toFixed(2)}</strong></p>
      ${inv.discount > 0 ? `<p>الخصم: ${inv.discount}%</p>` : ''}
      ${inv.tax > 0 ? `<p>الضريبة: ${inv.tax}%</p>` : ''}
      <p class="total-row">💰 المجموع: ${inv.total.toFixed(2)} ${settings.currency}</p>
      <p>المدفوع: ${inv.paid.toFixed(2)} ${settings.currency}</p>
      ${payDetails}
      ${inv.remaining !== 0 ? `<p>الباقي: ${inv.remaining.toFixed(2)} ${settings.currency}</p>` : ''}
      ${invoiceNotes ? `<div class="notes">📌 ${invoiceNotes}</div>` : ''}
      <div class="line"></div>
      ${showBarcode ? `<div class="barcode-section"><svg id="invoice-barcode-${barcodeId}"></svg></div>` : ''}
      ${showQR ? `<div class="qr-section"><img src="${qrUrl}" alt="QR Code" onerror="this.style.display='none'" /><p style="font-size:9px;color:#888;">امسح الكود للتحقق</p></div>` : ''}
      <div class="line"></div>
      <p style="font-size:11px;">الكاشير: ${inv.cashier}</p>
      <p style="font-size:10px;color:#888;">Bakhcha Pro</p>
      <p style="font-size:12px;font-weight:bold;">${invoiceFooter}</p>
      <script>
        try { JsBarcode("#invoice-barcode-${barcodeId}", "${inv.id}", { format:"CODE128", width:1.2, height:${isA4 ? 45 : 35}, displayValue:true, fontSize:9, margin:3 }); } catch(e) {}
        ${autoPrintEnabled ? 'setTimeout(() => window.print(), 600);' : 'setTimeout(() => window.print(), 600);'}
      <\/script>
      </body></html>`;
  };

  const printInvoiceWithQR = (inv: Invoice) => {
    const printWindow = window.open('', '_blank', 'width=420,height=700');
    if (!printWindow) return;
    printWindow.document.write(buildInvoiceHTML(inv, true));
    printWindow.document.close();
  };

  const printLastInvoice = async () => {
    const invoices = await getInvoices();
    if (invoices.length === 0) {
      alert('لا توجد فواتير سابقة!');
      return;
    }
    printInvoiceWithQR(invoices[0]);
  };

  const openCustomerDisplay = () => {
    window.open(window.location.href + '?display=customer', '_blank', 'width=1024,height=768');
  };

  const filteredProducts = products.filter(p => {
    const matchCategory = selectedCategory === 'الكل' || p.category === selectedCategory;
    const matchSearch = !searchProduct || p.name.includes(searchProduct) || p.barcode.includes(searchProduct);
    return matchCategory && matchSearch;
  });

  const today = new Date().toISOString().split('T')[0];

  // Quick amount buttons for payment
  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  return (
    <div className="flex flex-col lg:flex-row h-screen" dir="rtl">
      {/* Left side - Cart & Totals (Moved to Left in RTL by using order-2) */}
      <div className="w-full lg:w-1/2 bg-[#0f1a2e] flex flex-col border-l border-gray-700 order-2 lg:order-2 max-h-[50vh] lg:max-h-none">
        {/* Invoice Header */}
        <div className="p-1 lg:p-1.5 border-b border-gray-700 bg-gray-900/30">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <button onClick={() => setShowAddClientModal(true)} className="bg-green-600 hover:bg-green-700 text-white w-6 h-6 rounded text-xs font-bold">+</button>
              <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="flex-1 bg-gray-800 text-white border border-gray-700 rounded px-2 py-0.5 text-[10px] lg:text-xs">
                {clients.map(c => <option key={c.id} value={c.name}>{c.name}{c.debt > 0 ? ` (${c.debt}دج)` : ''}</option>)}
              </select>
            </div>
            <div className="flex flex-col items-end shrink-0">
               <span className="text-[9px] lg:text-[10px] text-gray-500">{today}</span>
               <span className="text-yellow-400 font-bold text-[10px] lg:text-xs">{invoiceId}</span>
            </div>
          </div>
        </div>

        {/* Cart Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs lg:text-sm">
            <thead className="bg-gray-800 sticky top-0">
              <tr>
                <th className="p-2 text-center">إجراء</th>
                <th className="p-2 text-center">الإجمالي</th>
                <th className="p-2 text-center">الكمية</th>
                <th className="p-2 text-center">السعر</th>
                <th className="p-2 text-right">المنتج</th>
                <th className="p-2 text-center w-8">#</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, idx) => (
                <tr key={item.product.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="p-1.5 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => removeFromCart(item.product.id)} className="bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded text-[10px] font-bold transition-colors">✕</button>
                      <button 
                        onClick={() => { setEditingCartItem(item.product.id); setTempItemPrice(item.overridePrice || item.product.sellPrice); setShowCartItemModal(true); }}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white w-6 h-6 rounded text-[10px] font-bold transition-colors"
                        title="خصم / جملة"
                      >
                        ⚡
                      </button>
                      <button onClick={() => updateQuantity(item.product.id, -1)} className="bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded text-[10px] font-bold transition-colors">-</button>
                      <button onClick={() => updateQuantity(item.product.id, 1)} className="bg-green-500 hover:bg-green-600 text-white w-6 h-6 rounded text-[10px] font-bold transition-colors">+</button>
                    </div>
                  </td>
                  <td className="p-1.5 text-center font-bold text-yellow-300">
                    {((item.overridePrice || item.product.sellPrice) * item.quantity).toFixed(2)}
                  </td>
                  <td className="p-1.5 text-center">
                    <span className="bg-gray-700 px-2 py-0.5 rounded font-bold text-white">{item.quantity}</span>
                  </td>
                  <td className="p-1.5 text-center">
                    {item.overridePrice ? (
                       <span className="text-orange-400 font-bold underline">{item.overridePrice.toFixed(2)}</span>
                    ) : (
                       item.product.sellPrice.toFixed(2)
                    )}
                  </td>
                  <td className="p-1.5 text-right font-medium max-w-[200px] lg:max-w-[300px] truncate">{item.product.name}</td>
                  <td className="p-1.5 text-center text-gray-500">{idx + 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {cart.length === 0 && (
            <div className="text-center text-gray-500 py-8 text-sm">
              🛒 السلة فارغة - أضف منتجات للبدء
            </div>
          )}
        </div>

        {/* Totals & Payment */}
        <div className="p-1 lg:p-1.5 border-t border-gray-700 space-y-1">
          <div className="flex items-center gap-1 lg:gap-2">
            <input type="text" readOnly value={subtotal.toFixed(2)} className="flex-1 bg-gray-800 text-white border border-gray-600 rounded px-2 py-0.5 text-xs text-left" />
            <span className="text-xs font-bold whitespace-nowrap">الإجمالي الفرعي:</span>
          </div>
          <div className="flex items-center gap-1 lg:gap-2">
            <input type="number" value={tax} onChange={(e) => setTax(Number(e.target.value))} className="w-12 lg:w-16 bg-red-600 text-white border border-red-500 rounded px-1 py-0.5 text-xs text-center font-bold" />
            <span className="text-xs">الضريبة:</span>
            <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} disabled={perms ? !perms.giveDiscount : false} className={`w-12 lg:w-16 bg-gray-800 text-white border border-gray-600 rounded px-1 py-0.5 text-xs text-center ${perms && !perms.giveDiscount ? 'opacity-50 cursor-not-allowed' : ''}`} />
            <span className="text-xs">الخصم:</span>
          </div>
          <div className="flex items-center gap-1 lg:gap-2">
            <input type="text" readOnly value={total.toFixed(2)} className="flex-1 bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500 rounded px-2 py-0.5 text-base lg:text-lg font-black text-left" />
            <span className="text-xs font-bold whitespace-nowrap">الإجمالي:</span>
          </div>

          {/* Payment Method Selection */}
          <div className="bg-gray-800/80 rounded-xl p-2 border border-gray-600">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm font-bold text-gray-300 whitespace-nowrap">طريقة الدفع:</span>
              <div className="flex gap-1 flex-1">
                <button 
                  onClick={() => setPaymentMethod('cash')} 
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${paymentMethod === 'cash' ? 'bg-green-600 text-white ring-2 ring-green-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                >
                  💵 نقدي
                </button>
                <button 
                  onClick={() => setPaymentMethod('visa')} 
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${paymentMethod === 'visa' ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                >
                  💳 فيزا
                </button>
                <button 
                  onClick={() => setPaymentMethod('mixed')} 
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${paymentMethod === 'mixed' ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                >
                  💵💳 مختلط
                </button>
              </div>
            </div>

            {paymentMethod === 'mixed' ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input type="number" value={cashAmount} onChange={(e) => setCashAmount(Number(e.target.value))} className="w-28 bg-green-900/50 text-green-400 border border-green-600 rounded px-2 py-1 text-sm text-center font-bold" />
                  <span className="text-sm text-green-400">💵 نقدي:</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={visaAmount} onChange={(e) => setVisaAmount(Number(e.target.value))} className="w-28 bg-blue-900/50 text-blue-400 border border-blue-600 rounded px-2 py-1 text-sm text-center font-bold" />
                  <span className="text-sm text-blue-400">💳 فيزا:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${(cashAmount + visaAmount) >= total ? 'text-green-400' : 'text-red-400'}`}>
                    المجموع: {(cashAmount + visaAmount).toFixed(2)} {settings.currency}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${remaining < 0 ? 'text-red-400' : 'text-green-400'}`}>{remaining.toFixed(2)}</span>
                <span className="text-xs text-gray-400">الباقي:</span>
                <input 
                  type="number" 
                  value={paid} 
                  onChange={(e) => setPaid(Number(e.target.value))} 
                  className="w-28 bg-gray-700 text-white border border-gray-500 rounded px-2 py-1 text-sm text-center font-bold" 
                  placeholder="المبلغ المدفوع"
                />
                <span className="text-sm whitespace-nowrap">المدفوع:</span>
              </div>
            )}
          </div>

          {/* Auto-print toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoPrint} 
              onChange={(e) => setAutoPrint(e.target.checked)} 
              className="w-4 h-4 rounded accent-green-500" 
            />
            <span className="text-xs text-gray-400">🖨️ طباعة الفاتورة تلقائياً عند الدفع</span>
          </label>

          <div className="flex gap-1.5 mb-1.5">
            <button onClick={openPaymentModal} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 lg:py-2 rounded-xl font-bold text-xs lg:text-sm transition-all shadow-lg shadow-green-900/50">
              ✅ تأكيد ودفع
            </button>
            <button onClick={cancelSale} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-1.5 lg:py-2 rounded-xl font-bold text-xs lg:text-sm transition-all text-center">
              ❌ إلغاء
            </button>
          </div>

          <div className="flex gap-1 mb-1">
            <button onClick={() => holdInvoice(false)} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-1 rounded-lg font-bold text-[9px] lg:text-[11px] transition-all" title="تعليق الفاتورة">
              ⏸️ تعليق
            </button>
            <button onClick={() => setShowDeliveryModal(true)} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white py-1 rounded-lg font-bold text-[9px] lg:text-[11px] transition-all" title="توصيل">
              🚚 توصيل
            </button>
            <button onClick={() => setShowHeldInvoices(true)} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-1 rounded-lg font-bold text-[9px] lg:text-[11px] transition-all relative">
              📋 معلقة
              {heldInvoices.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-3 h-3 rounded-full flex items-center justify-center">{heldInvoices.length}</span>
              )}
            </button>
            <button onClick={printLastInvoice} className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-1 rounded-lg font-bold text-[9px] lg:text-[11px] transition-all">
              🖨️ طباعة
            </button>
            <button onClick={openCustomerDisplay} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-1 rounded-lg font-bold text-[9px] lg:text-[11px] transition-all">
              📺 شاشة
            </button>
          </div>
        </div>
      </div>

      {/* Right side - Products (First in RTL to be on Right) */}
      <div className="w-full lg:w-1/2 flex flex-col bg-[#16213e] overflow-hidden order-1 lg:order-1">
        {/* Total Display */}
        <div className="flex items-center gap-2 lg:gap-4 p-2 lg:p-3 bg-[#0d1b2a]">
          <div className="border-2 border-yellow-500 rounded-xl px-3 lg:px-6 py-1 lg:py-2">
            <span className="text-yellow-400 text-2xl lg:text-4xl font-black font-mono">{total.toFixed(2)}</span>
          </div>
          <div className="bg-gray-800 px-2 lg:px-4 py-1 lg:py-2 rounded-xl border border-gray-600">
            <span className="text-white font-bold text-xs lg:text-base">إجمالي البيع:</span>
          </div>
          <div className={`px-2 lg:px-3 py-1 lg:py-2 rounded-xl font-bold text-[10px] lg:text-sm ${
            paymentMethod === 'cash' ? 'bg-green-700/50 text-green-300 border border-green-600' :
            paymentMethod === 'visa' ? 'bg-blue-700/50 text-blue-300 border border-blue-600' :
            'bg-purple-700/50 text-purple-300 border border-purple-600'
          }`}>
            {getPaymentMethodLabel(paymentMethod)}
          </div>
        </div>

        {/* Barcode Input & Category */}
        <div className="flex items-center gap-1 lg:gap-2 p-2 lg:p-3 bg-[#0d1b2a] flex-wrap">
          <button 
            onClick={() => setShowQuickAddProduct(true)}
            className="bg-green-700 hover:bg-green-800 text-white px-2 lg:px-3 py-1.5 lg:py-2 rounded-lg text-[10px] lg:text-xs font-bold transition-all"
          >
            + منتج سريع
          </button>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-yellow-500 text-black font-bold px-2 lg:px-3 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            ref={barcodeRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={handleBarcode}
            placeholder="الباركود + Enter..."
            className="flex-1 min-w-[120px] bg-gray-900 text-white border border-gray-600 rounded-lg px-2 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm"
          />
        </div>

        {/* Search Input */}
        <div className="px-3 pb-2 bg-[#0d1b2a]">
          <input
            type="text"
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
            placeholder="🔍 بحث عن منتج بالاسم..."
            className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 px-3 py-2 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-auto p-2 lg:p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-3 auto-rows-min">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              onClick={() => addToCart(product)}
              className={`bg-gray-800 rounded-xl cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all overflow-hidden group ${product.quantity <= 0 ? 'opacity-40' : ''}`}
            >
              <div className="h-16 lg:h-24 bg-gray-700 flex items-center justify-center overflow-hidden">
                {product.image ? (
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-4xl opacity-50">📦</span>'; }}
                  />
                ) : (
                  <span className="text-4xl opacity-50 group-hover:opacity-80 transition-all">📦</span>
                )}
              </div>
              <div className="p-2">
                <p className="text-white text-xs font-bold text-center truncate">{product.name}</p>
                <div className="flex flex-col items-center mt-1">
                  <div className="flex items-center gap-1">
                    {(product.discountPrice || 0) > 0 || (product.discountPercent || 0) > 0 ? (
                      <>
                        <span className="text-green-400 font-bold text-xs">
                          {product.discountPrice || (product.sellPrice * (1 - (product.discountPercent || 0) / 100)).toFixed(2)}
                        </span>
                        <span className="text-gray-500 text-[10px] line-through">{product.sellPrice}</span>
                      </>
                    ) : (
                      <span className="text-green-400 font-bold text-xs">{product.sellPrice}</span>
                    )}
                  </div>
                  <div className="flex justify-between w-full mt-1">
                    <span className={`text-[10px] ${product.quantity <= product.minStock ? 'text-red-400 font-bold' : 'text-gray-400'}`}>مخزون: {product.quantity}</span>
                    {(product.bulkQuantity || 0) > 0 && (
                      <span className="bg-blue-900/40 text-blue-300 text-[8px] px-1 rounded border border-blue-500/30">عرض جمله</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-4 lg:p-6 w-full max-w-[520px] max-h-[95vh] overflow-auto shadow-2xl border border-gray-600" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-green-400 mb-4 text-center">💰 تأكيد عملية الدفع</h3>
            
            {/* Invoice Summary */}
            <div className="bg-gray-800 rounded-xl p-4 mb-4 border border-gray-700">
              <div className="text-center mb-3">
                <p className="text-gray-400 text-sm">رقم الفاتورة</p>
                <p className="text-yellow-400 font-bold text-lg">{invoiceId}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-center">
                  <p className="text-gray-400">العميل</p>
                  <p className="text-white font-bold">{selectedClient}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400">عدد الأصناف</p>
                  <p className="text-white font-bold">{cart.length} صنف ({cart.reduce((s, i) => s + i.quantity, 0)} وحدة)</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400">الإجمالي الفرعي</p>
                  <p className="text-white font-bold">{subtotal.toFixed(2)} {settings.currency}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400">الضريبة ({tax}%)</p>
                  <p className="text-white font-bold">{taxAmount.toFixed(2)} {settings.currency}</p>
                </div>
              </div>
              <div className="border-t border-gray-600 mt-3 pt-3 text-center">
                <p className="text-gray-400 text-sm">الإجمالي النهائي</p>
                <p className="text-yellow-400 font-black text-3xl">{total.toFixed(2)} {settings.currency}</p>
              </div>
            </div>

            {/* Coupon Section */}
            <div className="bg-sky-900/20 p-3 rounded-xl border border-sky-800/50 mb-4 animate-in fade-in zoom-in-95">
               <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                    placeholder="🎟️ هل لديك كوبون خصم؟"
                    className="flex-1 bg-gray-900 text-white border border-sky-700/50 rounded-lg px-3 py-1.5 text-xs focus:ring-1 ring-sky-500 outline-none"
                  />
                  <button 
                    onClick={applyCoupon}
                    className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                  >تطبيق</button>
               </div>
               {appliedCoupon && (
                  <div className="mt-2 flex justify-between items-center bg-green-900/40 p-2 rounded-lg border border-green-500/30">
                     <span className="text-green-400 text-[10px] font-bold">✅ تم تطبيق كوبون ({appliedCoupon.code})</span>
                     <button onClick={() => setAppliedCoupon(null)} className="text-red-400 text-[10px] hover:underline">إلغاء</button>
                  </div>
               )}
            </div>

            {/* Payment Method Selection */}
            <div className="mb-4">
               <p className="text-sm font-bold text-gray-300 mb-2">اختر طريقة الدفع:</p>
               <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                      paymentMethod === 'cash' 
                        ? 'bg-green-600 text-white border-green-400 ring-2 ring-green-400/50 shadow-lg shadow-green-900/50' 
                        : 'bg-gray-700 text-gray-400 border-gray-600 hover:border-green-500'
                    }`}
                  >
                    <span className="text-2xl block mb-1">💵</span>
                    نقدي (كاش)
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('visa')}
                    className={`py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                      paymentMethod === 'visa' 
                        ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-400/50 shadow-lg shadow-blue-900/50' 
                        : 'bg-gray-700 text-gray-400 border-gray-600 hover:border-blue-500'
                    }`}
                  >
                    <span className="text-2xl block mb-1">💳</span>
                    بطاقة (فيزا)
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('mixed')}
                    className={`py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                      paymentMethod === 'mixed' 
                        ? 'bg-purple-600 text-white border-purple-400 ring-2 ring-purple-400/50 shadow-lg shadow-purple-900/50' 
                        : 'bg-gray-700 text-gray-400 border-gray-600 hover:border-purple-500'
                    }`}
                  >
                    <span className="text-2xl block mb-1">💵💳</span>
                    مختلط
                  </button>
               </div>
            </div>

            {/* Payment Amount */}
            <div className="bg-gray-800 rounded-xl p-4 mb-4 border border-gray-700">
              {paymentMethod === 'mixed' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-green-400 font-bold w-20 text-left">💵 نقدي:</span>
                    <input 
                      type="number" 
                      value={cashAmount} 
                      onChange={(e) => setCashAmount(Number(e.target.value))} 
                      className="flex-1 bg-green-900/30 text-green-400 border border-green-600 rounded-lg px-3 py-2 text-lg text-center font-bold" 
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-blue-400 font-bold w-20 text-left">💳 فيزا:</span>
                    <input 
                      type="number" 
                      value={visaAmount} 
                      onChange={(e) => setVisaAmount(Number(e.target.value))} 
                      className="flex-1 bg-blue-900/30 text-blue-400 border border-blue-600 rounded-lg px-3 py-2 text-lg text-center font-bold" 
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                    <span className={`text-lg font-bold ${(cashAmount + visaAmount) >= total ? 'text-green-400' : 'text-red-400'}`}>
                      المجموع: {(cashAmount + visaAmount).toFixed(2)} {settings.currency}
                    </span>
                    <span className={`text-sm font-bold ${(cashAmount + visaAmount - total) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      الباقي: {(cashAmount + visaAmount - total).toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-300 font-bold whitespace-nowrap">المبلغ المدفوع:</span>
                    <input 
                      type="number" 
                      value={paid} 
                      onChange={(e) => setPaid(Number(e.target.value))} 
                      className="flex-1 bg-gray-700 text-white border border-gray-500 rounded-lg px-3 py-2 text-xl text-center font-bold" 
                      autoFocus
                    />
                  </div>
                  {/* Quick amount buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setPaid(Math.ceil(total))} className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                      المبلغ الكامل
                    </button>
                    {quickAmounts.map(amt => (
                      <button 
                        key={amt}
                        onClick={() => setPaid(amt)} 
                        className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                    <span className={`text-lg font-bold ${remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      الباقي للعميل: {remaining.toFixed(2)} {settings.currency}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Auto print option */}
            <label className="flex items-center gap-2 mb-4 cursor-pointer bg-gray-800/50 p-2 rounded-lg">
              <input 
                type="checkbox" 
                checked={autoPrint} 
                onChange={(e) => setAutoPrint(e.target.checked)} 
                className="w-5 h-5 rounded accent-green-500" 
              />
              <span className="text-sm text-gray-300">🖨️ طباعة الفاتورة تلقائياً بعد التأكيد</span>
            </label>

            <div className="flex gap-3">
              <button 
                onClick={confirmSale} 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-lg transition-all shadow-lg shadow-green-900/50"
              >
                ✅ تأكيد الدفع {paymentMethod === 'visa' ? '💳' : paymentMethod === 'cash' ? '💵' : '💵💳'}
              </button>
              <button 
                onClick={() => setShowPaymentModal(false)} 
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl font-bold text-lg transition-all"
              >
                رجوع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2" onClick={() => setShowAddClientModal(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-4 lg:p-6 w-full max-w-[400px] shadow-2xl border border-gray-600" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-green-400 mb-4 text-center">➕ إضافة عميل جديد</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">اسم العميل *</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="أدخل اسم العميل..."
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">رقم الهاتف</label>
                <input
                  type="text"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="0555-00-00-00"
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none"
                  dir="ltr"
                />
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <p className="text-gray-400 text-xs mb-1">📋 العملاء الحاليون:</p>
                <div className="flex flex-wrap gap-1">
                  {clients.map(c => (
                    <span key={c.id} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{c.name}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleAddClient} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold transition-all">✅ إضافة العميل</button>
              <button onClick={() => setShowAddClientModal(false)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2.5 rounded-xl font-bold transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal */}
      {showQuickAddProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2" onClick={() => setShowQuickAddProduct(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-4 lg:p-6 w-full max-w-[500px] max-h-[90vh] overflow-auto shadow-2xl border border-gray-600" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-sky-400 mb-4 text-center">📦 إضافة منتج سريع</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">اسم المنتج *</label>
                <input type="text" value={quickProduct.name} onChange={(e) => setQuickProduct({ ...quickProduct, name: e.target.value })}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" autoFocus />
              </div>
              
              {/* Product Image Upload */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">صورة المنتج</label>
                <div className="flex gap-3 items-center">
                  <div className="w-20 h-20 bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-500">
                    {quickProductImage ? (
                      <img src={quickProductImage} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl opacity-50">📷</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleQuickProductImageUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                    >
                      📁 اختيار صورة
                    </button>
                    {quickProductImage && (
                      <button
                        onClick={() => setQuickProductImage('')}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs transition-all"
                      >
                        🗑️ حذف الصورة
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-sm text-gray-400 mb-1 block">الباركود (تلقائي إذا فارغ)</label>
                  <input type="text" value={quickProduct.barcode} onChange={(e) => setQuickProduct({ ...quickProduct, barcode: e.target.value })}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">الكمية</label>
                  <input type="number" value={quickProduct.quantity} onChange={(e) => setQuickProduct({ ...quickProduct, quantity: Number(e.target.value) })}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">سعر الشراء</label>
                  <input type="number" value={quickProduct.buyPrice} onChange={(e) => setQuickProduct({ ...quickProduct, buyPrice: Number(e.target.value) })}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">سعر البيع *</label>
                  <input type="number" value={quickProduct.sellPrice} onChange={(e) => setQuickProduct({ ...quickProduct, sellPrice: Number(e.target.value) })}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">التصنيف</label>
                <select value={quickProduct.category} onChange={(e) => setQuickProduct({ ...quickProduct, category: e.target.value })}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2">
                  {categories.filter(c => c !== 'الكل').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleQuickAddProduct} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold transition-all">✅ إضافة وحفظ</button>
              <button onClick={() => setShowQuickAddProduct(false)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2.5 rounded-xl font-bold transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Held Invoices Modal */}
      {showHeldInvoices && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2" onClick={() => setShowHeldInvoices(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-4 lg:p-6 w-full max-w-[600px] max-h-[85vh] overflow-auto shadow-2xl border border-gray-600" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-yellow-400">📋 الفواتير المعلقة ({heldInvoices.length})</h3>
              <button onClick={() => setShowHeldInvoices(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>

            {heldInvoices.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <span className="text-5xl block mb-3">📭</span>
                <p className="text-lg">لا توجد فواتير معلقة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {heldInvoices.map((held) => {
                  const hSub = held.cart.reduce((s: number, i: CartItem) => s + i.product.sellPrice * i.quantity, 0);
                  const hDisc = hSub * (held.discount / 100);
                  const hTax = (hSub - hDisc) * (held.tax / 100);
                  const hTotal = hSub - hDisc + hTax;
                  return (
                    <div key={held.id} className={`rounded-xl p-3 border transition-all ${held.isDelivery ? 'bg-cyan-900/30 border-cyan-600' : 'bg-gray-800/60 border-gray-700'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-sm">{held.id}</span>
                            {held.isDelivery && (
                              <span className="bg-cyan-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">🚚 توصيل</span>
                            )}
                          </div>
                          <div className="text-gray-400 text-xs mt-1">
                            {new Date(held.timestamp).toLocaleString('ar')} • {held.client}
                          </div>
                          {held.isDelivery && (
                            <div className="text-cyan-300 text-xs mt-1">
                              📍 {held.deliveryAddress} • 👤 {held.deliveryDriver}
                            </div>
                          )}
                        </div>
                        <div className="text-yellow-400 font-black text-lg">{hTotal.toFixed(2)}</div>
                      </div>
                      <div className="text-gray-400 text-xs mb-2">
                        {held.cart.map(i => `${i.product.name} x${i.quantity}`).join(' • ')}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => resumeHeldInvoice(held)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded-lg text-xs font-bold transition-all"
                        >
                          {held.isDelivery ? '💰 دفع الفاتورة' : '▶️ استئناف'}
                        </button>
                        {held.isDelivery && (
                          <button
                            onClick={() => printDeliveryInvoice(held)}
                            className="bg-sky-600 hover:bg-sky-700 text-white py-1.5 px-3 rounded-lg text-xs font-bold transition-all"
                          >
                            🖨️ طباعة
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm('هل تريد حذف هذه الفاتورة؟')) deleteHeldInvoice(held.id); }}
                          className="bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 rounded-lg text-xs font-bold transition-all"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delivery Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2" onClick={() => setShowDeliveryModal(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-4 lg:p-6 w-full max-w-[450px] shadow-2xl border border-cyan-600" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-cyan-400 mb-4 text-center">🚚 بيانات التوصيل</h3>
            
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <span className="text-4xl block mb-2">🛒</span>
                <p>أضف منتجات للسلة أولاً</p>
                <button onClick={() => setShowDeliveryModal(false)} className="mt-4 bg-gray-600 hover:bg-gray-700 text-white py-2 px-6 rounded-xl font-bold transition-all">إغلاق</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">📍 عنوان التوصيل *</label>
                  <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm" placeholder="أدخل عنوان التوصيل..." autoFocus />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">👤 اسم المندوب *</label>
                  <input type="text" value={deliveryDriver} onChange={(e) => setDeliveryDriver(e.target.value)}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm" placeholder="اسم مندوب التوصيل..." />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">📱 هاتف المندوب</label>
                  <input type="text" value={deliveryPhone} onChange={(e) => setDeliveryPhone(e.target.value)}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm" placeholder="رقم الهاتف..." />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">📝 ملاحظات</label>
                  <textarea value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm h-16 resize-none" placeholder="ملاحظات إضافية..." />
                </div>

                <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>المنتجات: {cart.length}</span>
                    <span className="text-yellow-400 font-bold">الإجمالي: {total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => {
                      if (!deliveryAddress.trim()) { alert('أدخل عنوان التوصيل!'); return; }
                      if (!deliveryDriver.trim()) { alert('أدخل اسم المندوب!'); return; }
                      holdInvoice(true);
                    }}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white py-2.5 rounded-xl font-bold transition-all"
                  >
                    🚚 حفظ وطباعة فاتورة التوصيل
                  </button>
                  <button onClick={() => setShowDeliveryModal(false)} className="bg-gray-600 hover:bg-gray-700 text-white py-2.5 px-4 rounded-xl font-bold transition-all">إلغاء</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 
      {showShiftOpenModal && (
        ...
      )}
      */}

      {/* Shift Close Modal - Disabled
      {showShiftCloseModal && currentShift && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-[#1e293b] rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-red-500/30 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-red-500 opacity-50"></div>
             <h2 className="text-3xl font-black text-white mb-6">🔒 تقفيل الوردية (X-Report)</h2>
             
             <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-700">
                   <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">المبيعات الإجمالية</p>
                   <p className="text-2xl font-black text-sky-400">{currentShift.totalSales.toFixed(2)}</p>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-700">
                   <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">المتوقع في الدرج</p>
                   <p className="text-2xl font-black text-green-400">{(currentShift.expectedCash + currentShift.initialCash).toFixed(2)}</p>
                </div>
             </div>

             <div className="space-y-6 text-right">
                <div>
                   <label className="text-xs text-red-400 font-bold mb-2 block uppercase">المبلغ الفعلي الموجود الآن (العد اليدوي)</label>
                   <input 
                     type="number" 
                     autoFocus
                     className="w-full bg-gray-900 border-2 border-red-500/20 focus:border-red-500 rounded-2xl px-6 py-4 text-3xl font-black text-center text-white outline-none transition-all"
                     value={actualShiftCash}
                     onChange={e => setActualShiftCash(Number(e.target.value))}
                   />
                </div>

                <div className="bg-red-900/10 p-4 rounded-2xl border border-red-500/20 text-center">
                   <p className="text-xs text-red-300 font-bold">
                    العجز / الزيادة: 
                    <span className="text-xl mx-2">
                       {(actualShiftCash - (currentShift.expectedCash + currentShift.initialCash)).toFixed(2)}
                    </span>
                   </p>
                </div>

                <div className="flex gap-4">
                   <button 
                     onClick={closeShiftHandler}
                     className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl text-xl shadow-lg transition-all"
                   >
                     ✅ تقفيل وتسجيل خروج
                   </button>
                   <button 
                     onClick={() => setShowShiftCloseModal(false)}
                     className="flex-1 bg-gray-800 text-gray-400 font-bold py-4 rounded-2xl"
                   >
                     إلغاء التقفيل
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
      */}

      {/* Cart Item Price Modal */}
      {showCartItemModal && editingCartItem !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[120] p-4" onClick={() => setShowCartItemModal(false)}>
          <div className="bg-[#1e293b] rounded-3xl p-6 w-full max-w-sm border border-yellow-500/30 text-right shadow-2xl" onClick={e => e.stopPropagation()}>
             <h3 className="text-xl font-bold text-white mb-4">🔧 تعديل سعر المنتج في السلة</h3>
             
             <div className="space-y-5">
                <div>
                   <label className="text-xs text-gray-400 mb-2 block">السعر المخصص (سعر البيع لهذه العملية)</label>
                   <input 
                     type="number" 
                     autoFocus
                     className="w-full bg-gray-900 border-2 border-gray-700 focus:border-yellow-500 rounded-xl px-4 py-3 text-2xl text-center text-white outline-none"
                     value={tempItemPrice}
                     onChange={e => setTempItemPrice(Number(e.target.value))}
                   />
                </div>

                <div className="flex gap-2">
                   <button 
                     onClick={() => applyJumlaPrice(editingCartItem)}
                     className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs transition-all"
                   >
                     🚀 تطبيق سعر الجملة
                   </button>
                   <button 
                     onClick={() => updateCartItemOverride(editingCartItem, tempItemPrice)}
                     className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded-xl text-xs transition-all"
                   >
                     ✅ حفظ السعر
                   </button>
                </div>
                
                <button 
                  onClick={() => setShowCartItemModal(false)}
                  className="w-full bg-gray-800 text-gray-400 font-bold py-3 rounded-xl text-xs"
                >
                  إلغاء
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Button to trigger shift close - Removed */}


    </div>
  );
}
