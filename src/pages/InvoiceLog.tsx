import { useState, useEffect } from 'react';
import { Invoice, PaymentMethod } from '../types';
import { getInvoices, getSettings } from '../store';

export default function InvoiceLog() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentMethod>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [invs, sett] = await Promise.all([
      getInvoices(),
      getSettings()
    ]);
    setInvoices(invs);
    setSettings(sett);
    setIsLoading(false);
  };

  const filtered = invoices.filter(inv => {
    const matchSearch = !search || inv.id.includes(search) || (inv.client && inv.client.includes(search));
    const matchDate = !dateFilter || (inv.date && inv.date.includes(dateFilter));
    const matchPayment = paymentFilter === 'all' || (inv.paymentMethod || 'cash') === paymentFilter;
    return matchSearch && matchDate && matchPayment;
  });

  const totalSales = filtered.reduce((s, i) => s + i.total, 0);

  if (isLoading) return <div className="p-10 text-center text-sky-400">جاري تحميل السجل من Supabase...</div>;

  return (
    <div className="p-4 h-screen overflow-auto bg-[#1a1c2e] text-white" dir="rtl">
      <h1 className="text-2xl font-bold text-center text-sky-400 mb-6">🧾 سجل الفواتير السحابي</h1>

      <div className="flex gap-4 mb-6 flex-wrap">
        <input type="text" placeholder="بحث بالرقم أو العميل..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-gray-800 border-gray-700 rounded-lg px-4 py-2" />
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-gray-800 border-gray-700 rounded-lg px-4 py-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
         <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <p className="text-xs text-gray-400">إجمالي المبيعات</p>
            <p className="text-xl font-bold text-green-400">{totalSales.toFixed(2)} دج</p>
         </div>
         <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <p className="text-xs text-gray-400">عدد العمليات</p>
            <p className="text-xl font-bold text-sky-400">{filtered.length}</p>
         </div>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-900 text-gray-400 border-b border-gray-700">
            <tr>
              <th className="p-4">رقم الفاتورة</th>
              <th className="p-4 text-center">التاريخ</th>
              <th className="p-4">العميل</th>
              <th className="p-4 text-center">المبلع</th>
              <th className="p-4 text-center">طريقة الدفع</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                 <td className="p-4 font-mono text-yellow-400">{inv.id}</td>
                 <td className="p-4 text-center text-xs">{new Date(inv.date).toLocaleString('ar-DZ')}</td>
                 <td className="p-4">{inv.client}</td>
                 <td className="p-4 text-center font-bold text-green-400">{inv.total.toFixed(2)}</td>
                 <td className="p-4 text-center">
                    <span className="bg-gray-700 px-2 py-1 rounded text-xs">{inv.paymentMethod === 'visa' ? '💳 بطاقة' : '💵 نقدي'}</span>
                 </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-10 text-center text-gray-500 italic">لا توجد فواتير مطابقة</div>}
      </div>
    </div>
  );
}
