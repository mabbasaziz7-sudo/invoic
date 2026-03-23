import { useState, useEffect } from 'react';
import { Coupon } from '../types';
import { getCoupons, saveCoupon, deleteCouponFromDB, getSettings } from '../store';

export default function Promotions() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const settings = getSettings();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setCoupons(await getCoupons());
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCoupon) {
      await saveCoupon(editingCoupon);
      setShowCouponModal(false);
      setEditingCoupon(null);
      load();
    }
  };

  return (
    <div className="p-4 space-y-6 overflow-auto h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-sky-400">🎟️ العروض والكوبونات</h1>
        <button
          onClick={() => { setEditingCoupon({ code: '', discountPercent: 0, discountAmount: 0, minOrderValue: 0, expiryDate: '', active: true }); setShowCouponModal(true); }}
          className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg"
        >
          ➕ إنشاء كوبون جديد
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coupons List */}
        <div className="bg-[#1e293b] rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
          <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-gray-200">کوبونات الخصم النشطة</h3>
            <span className="bg-sky-900/50 text-sky-400 text-xs px-2 py-1 rounded-full">{coupons.length} كوبون</span>
          </div>
          <div className="p-4 overflow-auto max-h-[500px]">
            <div className="grid gap-4">
              {coupons.map(c => (
                <div key={c.id} className={`p-4 rounded-xl border ${c.active ? 'border-sky-500/30 bg-sky-900/10' : 'border-gray-700 bg-gray-800/50'} relative overflow-hidden group`}>
                   <div className="absolute top-0 left-0 w-1 h-full bg-sky-500"></div>
                   <div className="flex justify-between items-start">
                     <div>
                       <p className="text-xs text-gray-400 mb-1">رمز الكوبون</p>
                       <p className="text-xl font-black text-white tracking-widest">{c.code}</p>
                     </div>
                     <div className="text-left">
                       <span className={`px-2 py-1 rounded text-[10px] font-bold ${c.active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                         {c.active ? 'نشط' : 'متوقف'}
                       </span>
                     </div>
                   </div>
                   <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                     <div className="bg-gray-900/50 p-2 rounded-lg">
                       <p className="text-gray-400 text-[10px]">قيمة الخصم</p>
                       <p className="font-bold text-sky-400">{c.discountPercent > 0 ? `${c.discountPercent}%` : `${c.discountAmount} ${settings.currency}`}</p>
                     </div>
                     <div className="bg-gray-900/50 p-2 rounded-lg">
                       <p className="text-gray-400 text-[10px]">الحد الأدنى للطلب</p>
                       <p className="font-bold text-white">{c.minOrderValue} {settings.currency}</p>
                     </div>
                   </div>
                   {c.expiryDate && (
                     <p className="mt-3 text-[10px] text-gray-500">ينتهي في: {c.expiryDate}</p>
                   )}
                   <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => { setEditingCoupon(c); setShowCouponModal(true); }} className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">تعديل</button>
                     <button onClick={async () => { if(confirm('حذف الكوبون؟')) { await deleteCouponFromDB(c.id!); load(); } }} className="text-xs bg-red-900/50 hover:bg-red-900 text-red-300 px-3 py-1 rounded">حذف</button>
                   </div>
                </div>
              ))}
              {coupons.length === 0 && <p className="text-gray-500 text-center py-8">لا توجد كوبونات حالياً</p>}
            </div>
          </div>
        </div>

        {/* Product Offers */}
        <div className="bg-[#1e293b] rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
          <div className="bg-gray-800 p-4 border-b border-gray-700">
            <h3 className="font-bold text-gray-200">عروض المنتجات (قريباً)</h3>
          </div>
          <div className="p-12 text-center space-y-4">
             <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto text-4xl">📢</div>
             <p className="text-gray-400">يمكنك هنا تخصيص خصومات لمنتجات معينة أو مجموعات منتجات.</p>
             <div className="bg-sky-900/20 text-sky-300 p-4 rounded-xl border border-sky-800 text-sm">
               نصيحة: يمكنك استخدام ميزة "كوبون الخصم" المتاحة بجانبك لتطبيق خصم شامل على الفاتورة.
             </div>
          </div>
        </div>
      </div>

      {/* Coupon Modal */}
      {showCouponModal && editingCoupon && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl overflow-hidden">
            <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-sky-400">{editingCoupon.id ? 'تعديل الكوبون' : 'إضافة كوبون جديد'}</h3>
              <button onClick={() => setShowCouponModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveCoupon} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">رمز الكوبون (مثلاً: SAVE20)</label>
                <input
                  type="text"
                  required
                  value={editingCoupon.code}
                  onChange={e => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white font-bold tracking-widest"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">نسبة الخصم (%)</label>
                  <input
                    type="number"
                    value={editingCoupon.discountPercent}
                    onChange={e => setEditingCoupon({ ...editingCoupon, discountPercent: Number(e.target.value), discountAmount: 0 })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">أو خصم ثابت ({settings.currency})</label>
                  <input
                    type="number"
                    value={editingCoupon.discountAmount}
                    onChange={e => setEditingCoupon({ ...editingCoupon, discountAmount: Number(e.target.value), discountPercent: 0 })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">الحد الأدنى لإجمالي الفاتورة</label>
                <input
                  type="number"
                  value={editingCoupon.minOrderValue}
                  onChange={e => setEditingCoupon({ ...editingCoupon, minOrderValue: Number(e.target.value) })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">تاريخ الانتهاء (اختياري)</label>
                <input
                  type="date"
                  value={editingCoupon.expiryDate || ''}
                  onChange={e => setEditingCoupon({ ...editingCoupon, expiryDate: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingCoupon.active}
                  onChange={e => setEditingCoupon({ ...editingCoupon, active: e.target.checked })}
                  className="w-5 h-5 accent-sky-500"
                />
                <span className="text-sm text-gray-200">الكوبون نشط حالياً</span>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg">حفظ الكوبون</button>
                <button type="button" onClick={() => setShowCouponModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-all">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
