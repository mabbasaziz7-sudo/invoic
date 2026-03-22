import { useState, useEffect } from 'react';
import { Invoice, ReturnRecord, ReturnItem, Product } from '../types';
import { getInvoices, getProducts, saveProduct, supabase, getSettings } from '../store';

export default function Returns() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [invs, prods, rets] = await Promise.all([
      getInvoices(),
      getProducts(),
      supabase.from('returns').select('*').order('date', { ascending: false })
    ]);
    setInvoices(invs);
    setProducts(prods);
    setReturns(rets.data || []);
    setIsLoading(false);
  };

  const handleReturn = async (invId: string) => {
     alert('تم تسجيل طلب المرتجع في السحاب (تجريبي)');
  };

  if (isLoading) return <div className="p-10 text-center text-sky-400">جاري تحميل المرتجعات...</div>;

  return (
    <div className="p-4 h-screen overflow-auto bg-[#1a1c2e] text-white" dir="rtl">
      <h1 className="text-2xl font-bold text-center text-sky-400 mb-6">🔄 المرتجعات السحابية</h1>
      
      <div className="flex gap-4 mb-6">
         <input type="text" placeholder="رقم الفاتورة..." value={searchInvoice} onChange={e => setSearchInvoice(e.target.value)} className="flex-1 bg-gray-800 border-gray-700 rounded-lg px-4 py-2" />
         <button onClick={() => handleReturn(searchInvoice)} className="bg-orange-600 px-6 py-2 rounded-xl font-bold">بحث وإرجاع</button>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
         <table className="w-full text-sm text-right">
            <thead className="bg-gray-900 text-gray-400 border-b border-gray-700">
               <tr>
                  <th className="p-4">رقم المرتجع</th>
                  <th className="p-4 text-center">التاريخ</th>
                  <th className="p-4 text-center">المبلغ</th>
                  <th className="p-4">العميل</th>
               </tr>
            </thead>
            <tbody>
               {returns.map(r => (
                  <tr key={r.id} className="border-b border-gray-700/50">
                     <td className="p-4 font-mono text-orange-400">{r.id}</td>
                     <td className="p-4 text-center text-xs">{new Date(r.date).toLocaleString('ar-DZ')}</td>
                     <td className="p-4 text-center font-bold text-red-300">{r.total}</td>
                     <td className="p-4">{r.client}</td>
                  </tr>
               ))}
               {returns.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-gray-500 italic">لا توجد مرتجعات مسجلة</td></tr>}
            </tbody>
         </table>
      </div>
    </div>
  );
}
