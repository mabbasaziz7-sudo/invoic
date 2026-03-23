import { useState, useEffect } from 'react';
import { Coupon, Product } from '../types';
import { getCoupons, saveCoupon, deleteCouponFromDB, getSettings, getProducts, saveProduct } from '../store';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

export default function Promotions() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [showProductOfferModal, setShowProductOfferModal] = useState(false);
  const [selectedProductForOffer, setSelectedProductForOffer] = useState<Product | null>(null);
  const settings = getSettings();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setCoupons(await getCoupons());
    setProducts(await getProducts());
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCoupon) {
      try {
        await saveCoupon(editingCoupon);
        setShowCouponModal(false);
        setEditingCoupon(null);
        load();
        alert('تم حفظ الكوبون بنجاح ✅');
      } catch (err) {
        alert('فشل حفظ الكوبون: ' + (err as any).message);
      }
    }
  };

  const handleUpdateProductOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductForOffer) {
      try {
        await saveProduct(selectedProductForOffer);
        setShowProductOfferModal(false);
        setSelectedProductForOffer(null);
        load();
        alert('تم تحديث عرض المنتج بنجاح ✅');
      } catch (err) {
        alert('فشل تحديث العرض: ' + (err as any).message);
      }
    }
  };

  return (
    <div className="p-4 space-y-6 overflow-auto h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-sky-400">🎟️ العروض والكوبونات</h1>
        <div className="flex gap-2">
           <button
             onClick={() => { setEditingCoupon({ code: '', discountPercent: 0, discountAmount: 0, minOrderValue: 0, expiryDate: '', active: true }); setShowCouponModal(true); }}
             className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg text-sm"
           >
             ➕ كوبون جديد
           </button>
           <button
             onClick={() => setShowProductOfferModal(true)}
             className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg text-sm"
           >
             📢 عرض على منتج
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
        {/* Coupons List */}
        <div className="bg-[#1e293b] rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
          <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-gray-200">کوبونات الخصم</h3>
            <span className="bg-sky-900/50 text-sky-400 text-xs px-2 py-1 rounded-full">{coupons.length} كوبون</span>
          </div>
          <div className="p-4 overflow-auto max-h-[600px] space-y-4">
            {coupons.map(c => (
              <div key={c.id} className={`p-4 rounded-2xl border ${c.active ? 'border-sky-500/30 bg-sky-900/10' : 'border-gray-700 bg-gray-800/50'} relative overflow-hidden group`}>
                 <div className="absolute top-0 left-0 w-1 h-full bg-sky-500"></div>
                 <div className="flex justify-between">
                   <div>
                     <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Coupon Code</p>
                     <p className="text-2xl font-black text-white tracking-widest">{c.code}</p>
                     <div className="mt-2 flex gap-4 text-xs">
                        <span className="text-sky-400 font-bold">الخصم: {c.discountPercent > 0 ? `${c.discountPercent}%` : `${c.discountAmount} ${settings.currency}`}</span>
                        <span className="text-gray-400">الحد الأدنى: {c.minOrderValue}</span>
                     </div>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                      <div className="bg-white p-1 rounded-lg">
                         <QRCodeSVG value={c.code} size={60} />
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                         {c.active ? 'نشط' : 'متوقف'}
                      </span>
                   </div>
                 </div>
                 
                 <div className="mt-4 flex flex-col items-center bg-white p-2 rounded-xl">
                    <Barcode value={c.code} height={40} width={1.5} fontSize={12} />
                 </div>

                 <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                   <button onClick={() => { setEditingCoupon(c); setShowCouponModal(true); }} className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg border border-gray-600">تعديل</button>
                   <button onClick={async () => { if(confirm('حذف الكوبون؟')) { await deleteCouponFromDB(c.id!); load(); } }} className="text-xs bg-red-900/50 hover:bg-red-900 text-red-300 px-3 py-1.5 rounded-lg">حذف</button>
                   <button onClick={() => window.print()} className="text-xs bg-sky-900/50 text-sky-300 px-3 py-1.5 rounded-lg">🖨️ طباعة</button>
                 </div>
              </div>
            ))}
            {coupons.length === 0 && <p className="text-gray-500 text-center py-12">لا توجد كوبونات حالياً</p>}
          </div>
        </div>

        {/* Product Offers & Bulk Pricing */}
        <div className="bg-[#1e293b] rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
          <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-gray-200">عروض المنتجات والكميات</h3>
            <span className="bg-pink-900/50 text-pink-400 text-xs px-2 py-1 rounded-full">خصومات مباشرة</span>
          </div>
          <div className="p-4 overflow-auto max-h-[600px] space-y-3">
             {products.filter(p => (p.discountPrice || 0) > 0 || (p.discountPercent || 0) > 0 || (p.bulkQuantity || 0) > 0).map(p => (
               <div key={p.id} className="bg-gray-800/50 p-3 rounded-xl border border-gray-700 hover:border-pink-500/30 transition-all">
                  <div className="flex justify-between items-center">
                     <div>
                        <p className="font-bold text-white">{p.name}</p>
                        <p className="text-xs text-gray-400">السعر الأصلي: {p.sellPrice} {settings.currency}</p>
                     </div>
                     <button onClick={() => { setSelectedProductForOffer(p); setShowProductOfferModal(true); }} className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">تعديل العرض</button>
                  </div>
                  <div className="mt-2 flex gap-2 flex-wrap">
                     {(p.discountPrice || 0) > 0 && <span className="bg-green-900/30 text-green-400 px-2 py-0.5 rounded text-[10px] border border-green-500/20">سعر خاص: {p.discountPrice}</span>}
                     {(p.discountPercent || 0) > 0 && <span className="bg-green-900/30 text-green-400 px-2 py-0.5 rounded text-[10px] border border-green-500/20">خصم {p.discountPercent}%</span>}
                     {(p.bulkQuantity || 0) > 0 && <span className="bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded text-[10px] border border-blue-500/20">عرض كمية: {p.bulkQuantity} بسعر {p.bulkPrice}</span>}
                  </div>
               </div>
             ))}
             {products.filter(p => (p.discountPrice || 0) > 0 || (p.discountPercent || 0) > 0 || (p.bulkQuantity || 0) > 0).length === 0 && (
               <div className="text-center py-20">
                  <p className="text-gray-500 italic">لا توجد عروض منتجات حالية</p>
                  <button onClick={() => setShowProductOfferModal(true)} className="mt-3 text-sky-400 text-sm hover:underline">أضف أول عرض الآن</button>
               </div>
             )}
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

      {/* Product Offer Modal */}
      {showProductOfferModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-2xl w-full max-w-xl border border-gray-700 shadow-2xl overflow-hidden">
             <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="font-bold text-pink-400">إضافة/تعديل عرض على منتج</h3>
                <button onClick={() => { setShowProductOfferModal(false); setSelectedProductForOffer(null); }} className="text-gray-400 hover:text-white">✕</button>
             </div>
             <form onSubmit={handleUpdateProductOffer} className="p-6 space-y-6">
                <div>
                   <label className="text-xs text-gray-400 mb-2 block font-bold">1. اختر المنتج</label>
                   <select 
                     className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white"
                     value={selectedProductForOffer?.id || ''}
                     onChange={(e) => {
                       const p = products.find(prod => prod.id === Number(e.target.value));
                       setSelectedProductForOffer(p ? { ...p } : null);
                     }}
                   >
                     <option value="">-- اختر من القائمة --</option>
                     {products.map(p => (
                       <option key={p.id} value={p.id}>{p.name} (السعر: {p.sellPrice})</option>
                     ))}
                   </select>
                </div>

                {selectedProductForOffer && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[10px] text-gray-400 mb-1 block">السعر المخفض (مبلغ)</label>
                           <input 
                             type="number" 
                             className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white" 
                             value={selectedProductForOffer.discountPrice || 0}
                             onChange={e => setSelectedProductForOffer({ ...selectedProductForOffer, discountPrice: Number(e.target.value), discountPercent: 0 })}
                           />
                        </div>
                        <div>
                           <label className="text-[10px] text-gray-400 mb-1 block">أو نسبة خصم (%)</label>
                           <input 
                             type="number" 
                             className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white" 
                             value={selectedProductForOffer.discountPercent || 0}
                             onChange={e => setSelectedProductForOffer({ ...selectedProductForOffer, discountPercent: Number(e.target.value), discountPrice: 0 })}
                           />
                        </div>
                     </div>

                     <div className="bg-blue-900/10 p-4 rounded-2xl border border-blue-500/20">
                        <p className="text-xs font-bold text-blue-400 mb-3">📦 عرض الجملة / الكمية</p>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-[10px] text-gray-400 mb-1 block">عند شراء كمية (مثلاً 5 قطع)</label>
                              <input 
                                type="number" 
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white" 
                                value={selectedProductForOffer.bulkQuantity || 0}
                                onChange={e => setSelectedProductForOffer({ ...selectedProductForOffer, bulkQuantity: Number(e.target.value) })}
                              />
                           </div>
                           <div>
                              <label className="text-[10px] text-gray-400 mb-1 block">يصبح سعر القطعة الواحدة</label>
                              <input 
                                type="number" 
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white" 
                                value={selectedProductForOffer.bulkPrice || 0}
                                onChange={e => setSelectedProductForOffer({ ...selectedProductForOffer, bulkPrice: Number(e.target.value) })}
                              />
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                <div className="flex gap-3">
                   <button type="submit" disabled={!selectedProductForOffer} className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all">حفظ العرض</button>
                   <button type="button" onClick={() => { setShowProductOfferModal(false); setSelectedProductForOffer(null); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl">إلغاء</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
