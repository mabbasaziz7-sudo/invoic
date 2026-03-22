import { useState, useEffect } from 'react';
import { Invoice, PaymentMethod } from '../types';
import { getInvoices, getSettings } from '../store';

export default function InvoiceLog() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentMethod>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const settings = getSettings();

  useEffect(() => {
    setInvoices(getInvoices());
  }, []);

  const filtered = invoices.filter(inv => {
    const matchSearch = !search || inv.id.includes(search) || inv.client.includes(search);
    const matchDate = !dateFilter || inv.date === dateFilter;
    const matchPayment = paymentFilter === 'all' || (inv.paymentMethod || 'cash') === paymentFilter;
    return matchSearch && matchDate && matchPayment;
  });

  const totalSales = filtered.reduce((s, i) => s + i.total, 0);
  const totalProfits = filtered.reduce((s, i) => s + i.profit, 0);
  const totalCash = filtered.reduce((s, i) => s + (i.cashAmount || ((!i.paymentMethod || i.paymentMethod === 'cash') ? i.paid : 0)), 0);
  const totalVisa = filtered.reduce((s, i) => s + (i.visaAmount || (i.paymentMethod === 'visa' ? i.paid : 0)), 0);

  const getPaymentMethodLabel = (method?: PaymentMethod) => {
    switch (method) {
      case 'cash': return '💵 نقدي';
      case 'visa': return '💳 فيزا';
      case 'mixed': return '💵💳 مختلط';
      default: return '💵 نقدي';
    }
  };

  const getPaymentMethodColor = (method?: PaymentMethod) => {
    switch (method) {
      case 'visa': return 'bg-blue-600/30 text-blue-400 border-blue-600';
      case 'mixed': return 'bg-purple-600/30 text-purple-400 border-purple-600';
      default: return 'bg-green-600/30 text-green-400 border-green-600';
    }
  };

  const printInvoiceWithQR = (inv: Invoice) => {
    const printWindow = window.open('', '_blank', 'width=420,height=700');
    if (!printWindow) return;

    const qrData = encodeURIComponent(JSON.stringify({
      id: inv.id, date: inv.date, total: inv.total, store: settings.storeName, client: inv.client
    }));
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;
    const barcodeId = inv.id.replace(/[^a-zA-Z0-9]/g, '');
    const payMethod = inv.paymentMethod || 'cash';
    const payLabel = payMethod === 'cash' ? 'نقدي' : payMethod === 'visa' ? 'بطاقة' : 'مختلط';
    const payDetails = payMethod === 'mixed'
      ? `<p>💵 نقدي: ${(inv.cashAmount || 0).toFixed(2)} ${settings.currency}</p><p>💳 بطاقة: ${(inv.visaAmount || 0).toFixed(2)} ${settings.currency}</p>`
      : '';

    const showLogo = settings.showLogoOnInvoice !== false && settings.logo;
    const showQR = settings.showQROnInvoice !== false;
    const showBC = settings.showBarcodeOnInvoice !== false;
    const invTitle = settings.invoiceTitle || settings.storeName;
    const invFooter = settings.invoiceFooter || 'شكراً لزيارتكم 🙏';
    const invNotes = settings.invoiceNotes || '';
    const isA4 = settings.invoiceSize === 'a4';
    const isHalf = settings.invoiceSize === 'half';
    const maxW = isA4 ? '700px' : isHalf ? '450px' : '300px';

    printWindow.document.write(`
      <html dir="rtl"><head><title>فاتورة ${inv.id}</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <style>
        @page { margin: ${isA4 ? '15mm' : '3mm'}; size: ${isA4 ? 'A4' : isHalf ? '148mm 210mm' : '80mm auto'}; }
        body { font-family: 'Courier New', monospace; text-align: center; padding: ${isA4 ? '30px' : '12px'}; font-size: ${isA4 ? '14px' : '12px'}; max-width: ${maxW}; margin: 0 auto; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        th, td { padding: ${isA4 ? '6px' : '3px'}; text-align: right; font-size: ${isA4 ? '13px' : '11px'}; }
        th { border-bottom: ${isA4 ? '2px' : '1px'} solid #000; ${isA4 ? 'background:#f5f5f5;' : ''} }
        ${isA4 ? 'td { border-bottom: 1px solid #eee; }' : ''}
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        .title { font-size: ${isA4 ? '22px' : '16px'}; font-weight: bold; }
        .logo { width: ${isA4 ? '80px' : '50px'}; height: ${isA4 ? '80px' : '50px'}; object-fit: contain; margin: 0 auto 8px; display: block; }
        .qr-section { margin: 10px auto; text-align: center; }
        .qr-section img { width: ${isA4 ? '120px' : '90px'}; height: ${isA4 ? '120px' : '90px'}; }
        .barcode-section { margin: 8px auto; text-align: center; }
        .barcode-section svg { max-width: ${isA4 ? '300px' : '220px'}; height: ${isA4 ? '50px' : '40px'}; }
        .total-row { font-weight: bold; font-size: ${isA4 ? '18px' : '14px'}; }
        .payment-badge { background: #eee; padding: 3px 10px; border-radius: 4px; font-weight: bold; display: inline-block; margin: 4px 0; }
        .notes { font-size: ${isA4 ? '11px' : '9px'}; color: #666; font-style: italic; margin: 6px 0; padding: 4px; border: 1px solid #ddd; border-radius: 4px; }
        .tax-info { font-size: 9px; color: #888; }
      </style></head><body>
      ${showLogo ? `<img class="logo" src="${settings.logo}" alt="logo" onerror="this.style.display='none'" />` : ''}
      <p class="title">${invTitle}</p>
      <p style="font-size:11px;">هاتف: ${settings.phone}</p>
      <p style="font-size:11px;">${settings.address}</p>
      ${settings.taxNumber ? `<p class="tax-info">السجل التجاري: ${settings.taxNumber}</p>` : ''}
      ${settings.nif ? `<p class="tax-info">NIF: ${settings.nif}</p>` : ''}
      <div class="line"></div>
      <p>فاتورة رقم: <strong>${inv.id}</strong></p>
      <p>${inv.date} ${new Date().toLocaleTimeString('ar-DZ')}</p>
      <p>العميل: ${inv.client}</p>
      <p class="payment-badge">طريقة الدفع: ${payLabel}</p>
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
      ${invNotes ? `<div class="notes">📌 ${invNotes}</div>` : ''}
      <div class="line"></div>
      ${showBC ? `<div class="barcode-section"><svg id="inv-bc-${barcodeId}"></svg></div>` : ''}
      ${showQR ? `<div class="qr-section"><img src="${qrUrl}" alt="QR Code" onerror="this.style.display='none'" /><p style="font-size:9px;color:#888;">امسح الكود للتحقق</p></div>` : ''}
      <div class="line"></div>
      <p style="font-size:11px;">الكاشير: ${inv.cashier}</p>
      <p style="font-size:10px;">Bakhcha Pro</p>
      <p style="font-size:12px;font-weight:bold;">${invFooter}</p>
      <script>
        try { JsBarcode("#inv-bc-${barcodeId}", "${inv.id}", { format:"CODE128", width:1.2, height:${isA4 ? 45 : 35}, displayValue:true, fontSize:9, margin:3 }); } catch(e){}
        setTimeout(() => window.print(), 800);
      <\/script></body></html>
    `);
    printWindow.document.close();
  };

  const printInvoices = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const showLogo = settings.showLogoOnInvoice !== false && settings.logo;
    printWindow.document.write(`
      <html dir="rtl"><head><title>سجل المبيعات والفواتير</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;}
      table{width:100%;border-collapse:collapse;margin:20px 0;}
      th,td{border:1px solid #ddd;padding:8px;text-align:center;}
      th{background:#333;color:white;}
      .footer{text-align:center;margin-top:20px;font-weight:bold;}
      .badge{padding:2px 8px;border-radius:4px;font-size:11px;}
      .cash{background:#d4edda;color:#155724;}
      .visa{background:#cce5ff;color:#004085;}
      .mixed{background:#e2d5f1;color:#4a148c;}
      .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
      .logo{width:80px;height:80px;object-fit:contain;}
      </style></head><body>
      <div class="header">
        <div>
          <h2 style="margin:0;">${settings.storeName}</h2>
          <p style="margin:4px 0;">هاتف: ${settings.phone}</p>
          <p style="margin:4px 0;">${settings.address}</p>
          ${settings.taxNumber ? `<p style="margin:2px 0;font-size:11px;color:#666;">السجل التجاري: ${settings.taxNumber}</p>` : ''}
        </div>
        ${showLogo ? `<img class="logo" src="${settings.logo}" alt="logo" onerror="this.style.display='none'" />` : ''}
      </div>
      <h3 style="text-align:center;">سجل المبيعات والفواتير</h3>
      <table>
      <tr><th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th>الإجمالي</th><th>الربح</th><th>طريقة الدفع</th><th>الكاشير</th></tr>
      ${filtered.map(i => {
        const pm = i.paymentMethod || 'cash';
        const pmLabel = pm === 'cash' ? 'نقدي' : pm === 'visa' ? 'بطاقة' : 'مختلط';
        const pmClass = pm === 'cash' ? 'cash' : pm === 'visa' ? 'visa' : 'mixed';
        return `<tr><td>${i.id}</td><td>${i.date}</td><td>${i.client}</td><td>${i.total.toFixed(2)}</td><td>${i.profit.toFixed(2)}</td><td><span class="badge ${pmClass}">${pmLabel}</span></td><td>${i.cashier}</td></tr>`;
      }).join('')}
      </table>
      <p class="footer">المجموع العام للمبيعات: ${totalSales.toFixed(2)} ${settings.currency} | إجمالي الأرباح: ${totalProfits.toFixed(2)} ${settings.currency}</p>
      <p class="footer">💵 إجمالي النقدي: ${totalCash.toFixed(2)} ${settings.currency} | 💳 إجمالي البطاقات: ${totalVisa.toFixed(2)} ${settings.currency}</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-4 h-screen overflow-auto">
      <h1 className="text-2xl font-bold text-center text-sky-400 mb-4">🧾 سجل الفواتير والمبيعات</h1>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالرقم أو العميل..."
          className="flex-1 bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 min-w-[200px]" />
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2" />
        <select 
          value={paymentFilter} 
          onChange={(e) => setPaymentFilter(e.target.value as 'all' | PaymentMethod)}
          className="bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2"
        >
          <option value="all">جميع طرق الدفع</option>
          <option value="cash">💵 نقدي فقط</option>
          <option value="visa">💳 فيزا فقط</option>
          <option value="mixed">💵💳 مختلط فقط</option>
        </select>
        <button onClick={printInvoices} className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl font-bold">طباعة السجل 🖨️</button>
      </div>

      {/* Summary */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="bg-green-800/50 rounded-xl px-4 py-2 border border-green-600">
          <span className="text-green-300 text-sm">مجموع المبيعات: </span>
          <span className="text-white font-bold">{totalSales.toFixed(2)} {settings.currency}</span>
        </div>
        <div className="bg-blue-800/50 rounded-xl px-4 py-2 border border-blue-600">
          <span className="text-blue-300 text-sm">مجموع الأرباح: </span>
          <span className="text-white font-bold">{totalProfits.toFixed(2)} {settings.currency}</span>
        </div>
        <div className="bg-purple-800/50 rounded-xl px-4 py-2 border border-purple-600">
          <span className="text-purple-300 text-sm">عدد الفواتير: </span>
          <span className="text-white font-bold">{filtered.length}</span>
        </div>
        <div className="bg-emerald-800/50 rounded-xl px-4 py-2 border border-emerald-600">
          <span className="text-emerald-300 text-sm">💵 نقدي: </span>
          <span className="text-white font-bold">{totalCash.toFixed(2)}</span>
        </div>
        <div className="bg-sky-800/50 rounded-xl px-4 py-2 border border-sky-600">
          <span className="text-sky-300 text-sm">💳 بطاقات: </span>
          <span className="text-white font-bold">{totalVisa.toFixed(2)}</span>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-2">إجراء</th>
              <th className="p-2">الكاشير</th>
              <th className="p-2">طريقة الدفع</th>
              <th className="p-2">الربح</th>
              <th className="p-2">الإجمالي</th>
              <th className="p-2">العميل</th>
              <th className="p-2">التاريخ</th>
              <th className="p-2">الفاتورة</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id} className="border-b border-gray-800 hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => setSelectedInvoice(selectedInvoice?.id === inv.id ? null : inv)}>
                <td className="p-2 text-center">
                  <div className="flex gap-1 justify-center">
                    <button onClick={(e) => { e.stopPropagation(); printInvoiceWithQR(inv); }} className="bg-sky-600 text-white px-2 py-1 rounded text-xs" title="طباعة مع QR">🖨️</button>
                  </div>
                </td>
                <td className="p-2 text-center">{inv.cashier}</td>
                <td className="p-2 text-center">
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${getPaymentMethodColor(inv.paymentMethod)}`}>
                    {getPaymentMethodLabel(inv.paymentMethod)}
                  </span>
                </td>
                <td className="p-2 text-center text-green-400 font-bold">{inv.profit.toFixed(2)}</td>
                <td className="p-2 text-center font-bold">{inv.total.toFixed(2)}</td>
                <td className="p-2 text-center">{inv.client}</td>
                <td className="p-2 text-center">{inv.date}</td>
                <td className="p-2 text-center text-yellow-400">{inv.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invoice Detail Expandable */}
      {selectedInvoice && (
        <div className="mt-4 bg-[#1e293b] rounded-2xl p-4 border border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-yellow-400">📋 تفاصيل الفاتورة: {selectedInvoice.id}</h3>
            <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
            <div className="bg-gray-800 rounded-lg p-2 text-center text-sm">
              <p className="text-gray-400">التاريخ</p>
              <p className="text-white font-bold">{selectedInvoice.date}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center text-sm">
              <p className="text-gray-400">العميل</p>
              <p className="text-white font-bold">{selectedInvoice.client}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center text-sm">
              <p className="text-gray-400">الإجمالي</p>
              <p className="text-yellow-400 font-bold">{selectedInvoice.total.toFixed(2)} {settings.currency}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center text-sm">
              <p className="text-gray-400">الربح</p>
              <p className="text-green-400 font-bold">{selectedInvoice.profit.toFixed(2)} {settings.currency}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center text-sm">
              <p className="text-gray-400">طريقة الدفع</p>
              <p className={`font-bold ${
                selectedInvoice.paymentMethod === 'visa' ? 'text-blue-400' :
                selectedInvoice.paymentMethod === 'mixed' ? 'text-purple-400' : 'text-green-400'
              }`}>
                {getPaymentMethodLabel(selectedInvoice.paymentMethod)}
              </p>
            </div>
          </div>

          {/* Payment details for mixed */}
          {selectedInvoice.paymentMethod === 'mixed' && (
            <div className="flex gap-3 mb-3">
              <div className="bg-green-900/30 rounded-lg p-2 border border-green-700 flex-1 text-center">
                <p className="text-green-400 text-xs">💵 نقدي</p>
                <p className="text-white font-bold">{(selectedInvoice.cashAmount || 0).toFixed(2)} {settings.currency}</p>
              </div>
              <div className="bg-blue-900/30 rounded-lg p-2 border border-blue-700 flex-1 text-center">
                <p className="text-blue-400 text-xs">💳 بطاقة</p>
                <p className="text-white font-bold">{(selectedInvoice.visaAmount || 0).toFixed(2)} {settings.currency}</p>
              </div>
            </div>
          )}

          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-2">المجموع</th>
                <th className="p-2">الكمية</th>
                <th className="p-2">السعر</th>
                <th className="p-2">المنتج</th>
                <th className="p-2">#</th>
              </tr>
            </thead>
            <tbody>
              {selectedInvoice.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-800">
                  <td className="p-2 text-center font-bold">{item.total.toFixed(2)}</td>
                  <td className="p-2 text-center">{item.quantity}</td>
                  <td className="p-2 text-center">{item.price.toFixed(2)}</td>
                  <td className="p-2 text-right">{item.name}</td>
                  <td className="p-2 text-center">{idx + 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 mt-3">
            <button onClick={() => printInvoiceWithQR(selectedInvoice)} className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl font-bold text-sm">
              🖨️ طباعة مع باركود + QR
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-gray-500 text-center py-12 text-lg">لا توجد فواتير بعد</p>
      )}
    </div>
  );
}
