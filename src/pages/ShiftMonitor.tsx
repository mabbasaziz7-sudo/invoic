import { useState, useEffect } from 'react';
import { getActiveShifts, closeShift } from '../store';
import { User } from '../types';

interface ShiftMonitorProps {
  currentUser?: User | null;
}

export default function ShiftMonitor({ currentUser }: ShiftMonitorProps) {
  const [activeShifts, setActiveShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000); // 10s
    return () => clearInterval(interval);
  }, []);

  const load = async () => {
    try {
      const data = await getActiveShifts();
      setActiveShifts(data);
    } catch (err) {
      console.error('Error loading active shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleForceClose = async (shiftId: number) => {
    if (confirm('هل أنت متأكد من رغبتك في إجبار الكاشير على تقفيل الوردية؟')) {
      try {
        const s = activeShifts.find(as => as.id === shiftId);
        await closeShift(shiftId, s.expected_cash + s.initial_cash, s.expected_cash, s.total_sales);
        alert('تم تقفيل الوردية بنجاح ✅');
        load();
      } catch (err) {
        alert('فشل تقفيل الوردية');
      }
    }
  };

  if (currentUser?.role !== 'مدير') {
    return (
      <div className="p-10 text-center text-red-400">
         <span className="text-6xl block mb-4">🚫</span>
         <h1 className="text-2xl font-bold font-arabic">عذراً، هذه الشاشة متاحة للمدراء فقط</h1>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center bg-[#1e293b] p-4 rounded-2xl border border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-sky-400 font-arabic flex items-center gap-3">
            🖥️ مراقبة الكاشيرات
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </h1>
          <p className="text-[10px] text-gray-400 mt-1">تحديث تلقائي كل 10 ثوانٍ | آخر تحديث: {new Date().toLocaleTimeString('ar-EG')}</p>
        </div>
        <button 
          onClick={load}
          className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg text-sm"
        >
          🔄 تحديث فوري
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">جاري التحميل...</div>
      ) : activeShifts.length === 0 ? (
        <div className="bg-gray-800/20 border-2 border-dashed border-gray-700 rounded-3xl py-24 text-center">
            <span className="text-5xl block mb-4">🔇</span>
            <p className="text-gray-400 font-bold">لا توجد أي ورديات مفتوحة حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeShifts.map(shift => (
            <div key={shift.id} className="bg-[#1e293b] rounded-3xl border border-gray-700 overflow-hidden shadow-2xl transition-all hover:scale-[1.02]">
               <div className="bg-gradient-to-r from-sky-600 to-indigo-600 p-4 flex justify-between items-center text-white">
                  <div>
                    <p className="text-[10px] opacity-80 uppercase font-bold">المستخدم الحالي</p>
                    <h3 className="text-lg font-black">{shift.users?.full_name || 'كاشير'}</h3>
                  </div>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold"># {shift.id}</span>
               </div>
               
               <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-gray-900/50 p-3 rounded-2xl border border-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">وقت الفتح</p>
                        <p className="text-xs font-bold text-gray-300">
                          {new Date(shift.opened_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                     </div>
                     <div className="bg-gray-900/50 p-3 rounded-2xl border border-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">العهدة الافتتاحية</p>
                        <p className="text-xs font-bold text-green-400">{shift.initial_cash.toFixed(2)}</p>
                     </div>
                  </div>

                  <div className="bg-gray-900 p-4 rounded-2xl border border-sky-500/20 flex justify-between items-center">
                     <div>
                        <p className="text-xs text-gray-400 font-bold mb-1">المبيعات الإجمالية</p>
                        <p className="text-2xl font-black text-white">{shift.total_sales.toFixed(2)}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold mb-1">المتوقع في الصندوق</p>
                        <p className="text-xl font-black text-sky-400">{(shift.expected_cash + shift.initial_cash).toFixed(2)}</p>
                     </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                     <button 
                       onClick={() => handleForceClose(shift.id)}
                       className="flex-1 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 font-bold py-3 rounded-2xl text-xs transition-all"
                     >
                       🔒 إجبار على التقفيل
                     </button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
