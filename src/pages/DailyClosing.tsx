import { useState, useEffect } from 'react';
import { DailyClosing as DailyClosingType, Invoice, ReturnRecord, User } from '../types';
import { getInvoices, getExpenses, getReturns, getSettings, getCurrentUser, supabase, getUserPermissions } from '../store';

export default function DailyClosing() {
  const [closing, setClosing] = useState<Partial<DailyClosingType> | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const settings = getSettings();
  const currentUser = getCurrentUser();
  const perms = currentUser ? getUserPermissions(currentUser) : null;
  const showProfit = perms?.viewProfit !== false;

  useEffect(() => {
    calculateSummary();
  }, []);

  const calculateSummary = async () => {
    const today = new Date().toISOString().split('T')[0];
    const allInvoices = await getInvoices();
    const allExpenses = await getExpenses();
    const allReturns = await getReturns();

    const todayInvoices = allInvoices.filter(inv => inv.date.startsWith(today));
    const todayExpenses = allExpenses.filter(exp => exp.date.startsWith(today));
    const todayReturns = allReturns.filter(ret => ret.date.startsWith(today));

    const totalSales = todayInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const cashTotal = todayInvoices.filter(inv => inv.paymentMethod === 'cash').reduce((sum, inv) => sum + Number(inv.total), 0) +
                      todayInvoices.filter(inv => inv.paymentMethod === 'mixed').reduce((sum, inv) => sum + Number(inv.cashAmount || 0), 0);
    const visaTotal = todayInvoices.filter(inv => inv.paymentMethod === 'visa').reduce((sum, inv) => sum + Number(inv.total), 0) +
                      todayInvoices.filter(inv => inv.paymentMethod === 'mixed').reduce((sum, inv) => sum + Number(inv.visaAmount || 0), 0);
    
    const expensesTotal = todayExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    
    // Net profit (Estimate based on current day's invoices)
    const totalProfit = todayInvoices.reduce((sum, inv) => sum + Number(inv.profit || 0), 0) - expensesTotal;

    setInvoices(todayInvoices);
    setReturns(todayReturns);
    setClosing({
      date: today,
      totalSales,
      cashTotal,
      visaTotal,
      expensesTotal,
      netProfit: totalProfit,
      closedBy: currentUser?.fullName || currentUser?.username || 'مدير'
    });
  };

  const handleCloseDay = async () => {
    if (!confirm('هل أنت متأكد من تقفيل اليوم؟ سيتم حفظ نسخة مرجعية من إيرادات اليوم.')) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('daily_closings').upsert({
        date: closing?.date,
        total_sales: closing?.totalSales,
        cash_total: closing?.cashTotal,
        visa_total: closing?.visaTotal,
        expenses_total: closing?.expensesTotal,
        net_profit: closing?.netProfit,
        closed_by: closing?.closedBy,
        status: 'closed'
      }, { onConflict: 'date' });
      if (error) throw error;
      alert('تم تقفيل اليوم بنجاح ✅');
      printZReport();
    } catch (err) {
      alert('خطأ في التقفيل: ' + (err as any).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const printZReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>تقرير تقفيل اليوم - Z Report</title>
          <style>
            body { font-family: 'Arial', sans-serif; direction: rtl; text-align: center; padding: 20px; color: #333; }
            .header { border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .total { font-size: 18px; font-weight: bold; border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h2>${settings.storeName}</h2>
            <p>تقرير تقفيل اليوم (Z-Report)</p>
            <p>التاريخ: ${closing?.date}</p>
          </div>
          <div class="row"><span>إجمالي المبيعات:</span> <span>${closing?.totalSales?.toFixed(2)} ${settings.currency}</span></div>
          <div class="row"><span>مقبوضات كاش:</span> <span>${closing?.cashTotal?.toFixed(2)} ${settings.currency}</span></div>
          <div class="row"><span>مقبوضات فيزا:</span> <span>${closing?.visaTotal?.toFixed(2)} ${settings.currency}</span></div>
          <div class="row"><span>إجمالي المصروفات:</span> <span>${closing?.expensesTotal?.toFixed(2)} ${settings.currency}</span></div>
          <div class="row"><span>عدد الفواتير:</span> <span>${invoices.length}</span></div>
          <div class="row"><span>عدد المرتجعات:</span> <span>${returns.length}</span></div>
          ${showProfit ? `<div class="total"><span>صافي الربح التقديري:</span> <span>${closing?.netProfit?.toFixed(2)} ${settings.currency}</span></div>` : ''}
          <div class="footer">
            <p>تم التقفيل بواسطة: ${closing?.closedBy}</p>
            <p>تم الطباعة في: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <div className="p-4 space-y-6 overflow-auto h-screen pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-200">🏁 تقفيل اليوم (Z-Report)</h1>
        <button 
          onClick={calculateSummary}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl text-sm"
        >🔄 تحديث الأرقام</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-gray-700 shadow-xl">
           <p className="text-gray-400 text-xs mb-1">إجمالي المبيعات</p>
           <p className="text-2xl font-black text-green-400">{closing?.totalSales?.toFixed(2)} {settings.currency}</p>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-gray-700 shadow-xl">
           <p className="text-gray-400 text-xs mb-1">النقدية (كاش)</p>
           <p className="text-2xl font-black text-yellow-400">{closing?.cashTotal?.toFixed(2)} {settings.currency}</p>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-gray-700 shadow-xl">
           <p className="text-gray-400 text-xs mb-1">الفيزا</p>
           <p className="text-2xl font-black text-blue-400">{closing?.visaTotal?.toFixed(2)} {settings.currency}</p>
        </div>
        {showProfit && (
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-gray-700 shadow-xl">
            <p className="text-gray-400 text-xs mb-1">صافي الربح</p>
            <p className="text-2xl font-black text-purple-400">{closing?.netProfit?.toFixed(2)} {settings.currency}</p>
          </div>
        )}
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
        <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
           <h3 className="font-bold text-gray-200">تفاصيل فواتير اليوم</h3>
           <span className="text-xs text-gray-400">{invoices.length} فاتورة</span>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-right text-sm">
             <thead className="bg-gray-900/50 text-gray-400">
               <tr>
                 <th className="p-3">رقم الفاتورة</th>
                 <th className="p-3">الوقت</th>
                 <th className="p-3">العميل</th>
                 <th className="p-3">طريقة الدفع</th>
                 <th className="p-3">الإجمالي</th>
               </tr>
             </thead>
             <tbody>
               {invoices.map(inv => (
                 <tr key={inv.id} className="border-t border-gray-700/50 text-gray-300">
                   <td className="p-3 font-mono">{inv.id}</td>
                   <td className="p-3">{new Date(inv.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</td>
                   <td className="p-3">{inv.client}</td>
                   <td className="p-3 text-xs">{inv.paymentMethod}</td>
                   <td className="p-3 font-bold text-white">{inv.total.toFixed(2)}</td>
                 </tr>
               ))}
               {invoices.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-500 italic">لا توجد مبيعات مسجلة لهذا اليوم حتى الآن</td></tr>}
             </tbody>
           </table>
        </div>
      </div>

      <div className="flex gap-4">
         <button 
           onClick={handleCloseDay} 
           disabled={isProcessing || invoices.length === 0}
           className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all text-xl"
         >
           ✅ اعتماد تقفيل اليوم وإصدار التقرير (Z)
         </button>
         <button 
           onClick={printZReport}
           className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-2xl shadow-lg transition-all"
         >
           🖨️ طباعة مسودة التقرير
         </button>
      </div>
    </div>
  );
}
