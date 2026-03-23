import { useState, useEffect } from 'react';
import { Coupon, Product, ProductOffer } from '../types';
import { getCoupons, saveCoupon, deleteCouponFromDB, getSettings, getProducts, saveProductOffer, getProductOffers, deleteProductOffer } from '../store';

export default function Promotions() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [groupOffers, setGroupOffers] = useState<ProductOffer[]>([]);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  
  const [showGroupOfferModal, setShowGroupOfferModal] = useState(false);
  const [editingGroupOffer, setEditingGroupOffer] = useState<Partial<ProductOffer> | null>(null);

  const settings = getSettings();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [c, p, g] = await Promise.all([getCoupons(), getProducts(), getProductOffers()]);
      setCoupons(c);
      setProducts(p);
      setGroupOffers(g);
    } catch (err) {
      console.error('Error loading promotions:', err);
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCoupon) {
      try {
        await saveCoupon(editingCoupon);
        setShowCouponModal(false);
        setEditingCoupon(null);
        await load();
        alert('تم حفظ الكوبون بنجاح ✅');
      } catch (err: any) {
        alert('فشل حفظ الكوبون: ' + (err.message || 'خطأ غير معروف'));
      }
    }
  };

  const handleSaveGroupOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGroupOffer) {
      try {
        await saveProductOffer(editingGroupOffer);
        setShowGroupOfferModal(false);
        setEditingGroupOffer(null);
        await load();
        alert('تم حفظ عرض المجموعة بنجاح ✅');
      } catch (err: any) {
        alert('فشل حفظ العرض: ' + (err.message || 'خطأ غير معروف'));
      }
    }
  };

  const printSingleCoupon = (c: Coupon) => {
    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) return;

    const qrData = encodeURIComponent(`COUPON:${c.code}|DISC:${c.discountPercent || c.discountAmount}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`;

    const content = `
      <html dir="rtl">
        <head>
          <title>Coupon - ${c.code}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
            body { 
              font-family: 'Tajawal', sans-serif; 
              text-align: center; 
              padding: 20px; 
              width: 70mm; 
              margin: 0 auto; 
              color: #1e293b;
              background: #fff;
            }
            .coupon-card {
              border: 2px solid #38bdf8;
              border-radius: 15px;
              padding: 15px;
              position: relative;
              overflow: hidden;
            }
            .header { 
              font-size: 16px; 
              font-weight: 900; 
              color: #0369a1;
              margin-bottom: 15px;
              text-transform: uppercase;
              border-bottom: 2px dashed #e2e8f0;
              padding-bottom: 10px;
            }
            .name { font-size: 13px; color: #64748b; margin-bottom: 5px; font-weight: bold; }
            .discount {
              font-size: 32px;
              font-weight: 900;
              color: #0ea5e9;
              margin: 10px 0;
            }
            .code-box {
              background: #f0f9ff;
              border: 2px solid #bae6fd;
              padding: 10px;
              border-radius: 10px;
              margin: 15px 0;
            }
            .code { 
              font-size: 24px; 
              font-weight: 900; 
              letter-spacing: 3px;
              color: #0369a1;
            }
            .qr-section { margin: 15px 0; }
            .qr-section img { width: 100px; height: 100px; border: 1px solid #e2e8f0; padding: 5px; border-radius: 8px; }
            .barcode-section { margin: 10px 0; }
            .barcode-section svg { width: 100%; height: 50px; }
            .footer { 
              font-size: 10px; 
              color: #94a3b8;
              margin-top: 15px;
              border-top: 1px solid #f1f5f9;
              padding-top: 8px;
            }
            .expiry { color: #ef4444; font-weight: bold; font-size: 11px; margin-top: 5px; }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 800);">
          <div class="coupon-card">
            <div class="header">${settings.storeName}</div>
            <div class="name">${c.name || 'كوبون خصم مميز'}</div>
            
            <div class="discount">
              ${c.discountPercent > 0 ? `${c.discountPercent}% OFF` : `-${c.discountAmount} ${settings.currency}`}
            </div>

            <div class="code-box">
              <div class="code">${c.code}</div>
            </div>

            <div class="barcode-section">
              <svg id="barcode"></svg>
            </div>

            <div class="qr-section">
              <img src="${qrUrl}" alt="QR" />
            </div>

            ${c.minOrderValue > 0 ? `<div style="font-size:10px;color:#64748b">الحد الأدنى للطلب: ${c.minOrderValue} ${settings.currency}</div>` : ''}
            
            <div class="expiry">ينتهي في: ${c.expiryDate || 'صلاحية مفتوحة'}</div>

            <div class="footer">
              <p>شكراً لثقتكم بنا</p>
              <p style="font-weight:bold">Powered by Bakhcha Pro POS</p>
            </div>
          </div>

          <script>
            try {
              JsBarcode("#barcode", "${c.code}", {
                format: "CODE128",
                width: 2,
                height: 40,
                displayValue: false,
                margin: 0
              });
            } catch(e) { console.error(e); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <div className="p-4 space-y-6 overflow-auto h-screen pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-sky-400 font-arabic">🎟️ العروض والكوبونات</h1>
        <div className="flex gap-2">
           <button
             onClick={() => { setEditingCoupon({ code: '', name: '', discountPercent: 0, discountAmount: 0, minOrderValue: 0, expiryDate: '', active: true }); setShowCouponModal(true); }}
             className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg text-sm"
           >
             ➕ كوبون جديد
           </button>
           <button
             onClick={() => { setEditingGroupOffer({ name: '', discountPercent: 0, discountAmount: 0, productIds: [], active: true, expiryDate: '' }); setShowGroupOfferModal(true); }}
             className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg text-sm"
           >
             📦 عرض مجموعة
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coupons List */}
        <div className="bg-[#1e293b] rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
          <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-gray-200">کوبونات الخصم</h3>
          </div>
          <div className="p-4 overflow-auto max-h-[500px] space-y-4">
            {coupons.map(c => (
              <div key={c.id} className={`p-4 rounded-2xl border ${c.active ? 'border-sky-500/30 bg-sky-900/10' : 'border-gray-700 bg-gray-800/50'} relative overflow-hidden group`}>
                 <div className="flex justify-between items-start">
                   <div>
                     <p className="font-bold text-sky-400 text-sm mb-1">{c.name}</p>
                     <p className="text-xl font-black text-white tracking-widest">{c.code}</p>
                     <p className="text-[10px] text-gray-500 mt-1">ينتهي في: {c.expiryDate || 'لا يوجد تاريخ'}</p>
                   </div>
                   <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                         {c.active ? 'نشط' : 'متوقف'}
                      </span>
                      <p className="text-xs text-white font-bold">{c.discountPercent > 0 ? `${c.discountPercent}%` : `${c.discountAmount} ${settings.currency}`}</p>
                   </div>
                 </div>
                 <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end border-t border-gray-700/50 pt-3">
                   <button onClick={() => { setEditingCoupon(c); setShowCouponModal(true); }} className="text-[10px] bg-gray-700 hover:bg-gray-600 px-2.5 py-1 rounded-lg">تعديل</button>
                   <button onClick={async () => { if(confirm('حذف؟')) { await deleteCouponFromDB(c.id!); load(); } }} className="text-[10px] bg-red-900/50 text-red-300 px-2.5 py-1 rounded-lg">حذف</button>
                   <button onClick={() => printSingleCoupon(c)} className="text-[10px] bg-sky-600 text-white px-2.5 py-1 rounded-lg font-bold">🖨️ طباعة</button>
                 </div>
              </div>
            ))}
          </div>
        </div>

        {/* Group Offers */}
        <div className="bg-[#1e293b] rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
          <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-gray-200">عروض ومجموعات شاملة</h3>
          </div>
          <div className="p-4 overflow-auto max-h-[500px] space-y-3">
             {groupOffers.map(offer => (
               <div key={offer.id} className="bg-gray-800/50 p-4 rounded-xl border border-purple-500/20 group relative hover:bg-gray-800 transition-all">
                  <div className="flex justify-between items-start">
                     <div>
                        <p className="font-bold text-white text-lg">{offer.name}</p>
                        <p className="text-xs text-purple-400 font-bold">خصم {offer.discountPercent > 0 ? `${offer.discountPercent}%` : `${offer.discountAmount} ${settings.currency}`}</p>
                        <p className="text-[10px] text-gray-500 mt-1">صلاحية العرض: {offer.expiryDate || 'دائم'}</p>
                     </div>
                     <button onClick={async () => { if(confirm('حذف؟')) { await deleteProductOffer(offer.id!); load(); } }} className="text-xs text-red-400 opacity-0 group-hover:opacity-100">✕</button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                     {offer.productIds.map(pid => {
                       const p = products.find(prod => prod.id === pid);
                       return <span key={pid} className="bg-gray-900 text-gray-500 px-2 py-0.5 rounded text-[10px]">{p?.name || 'منتج'}</span>
                     })}
                  </div>
                  <div className="mt-3 opacity-0 group-hover:opacity-100 transition-all border-t border-gray-700 pt-2 text-right">
                     <button onClick={() => { setEditingGroupOffer(offer); setShowGroupOfferModal(true); }} className="text-[10px] text-sky-400 hover:underline">تعديل الإعدادات</button>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Coupon Modal */}
      {showCouponModal && editingCoupon && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCouponModal(false)}>
          <div className="bg-[#1e293b] rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-sky-400">{editingCoupon.id ? 'تعديل الكوبون' : 'إضافة كوبون جديد'}</h3>
              <button onClick={() => setShowCouponModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveCoupon} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">اسم الكوبون ووصفه</label>
                <input type="text" required value={editingCoupon.name} onChange={e => setEditingCoupon({ ...editingCoupon, name: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs text-gray-400 mb-1 block">رمز الكوبون (Code)</label>
                   <input type="text" required value={editingCoupon.code} onChange={e => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                     className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white font-bold" />
                </div>
                <div>
                   <label className="text-xs text-gray-400 mb-1 block">تاريخ الانتهاء</label>
                   <input type="date" value={editingCoupon.expiryDate} onChange={e => setEditingCoupon({ ...editingCoupon, expiryDate: e.target.value })}
                     className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">نسبة الخصم (%)</label>
                  <input type="number" value={editingCoupon.discountPercent} onChange={e => setEditingCoupon({ ...editingCoupon, discountPercent: Number(e.target.value), discountAmount: 0 })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">أو مبلغ ثابت</label>
                  <input type="number" value={editingCoupon.discountAmount} onChange={e => setEditingCoupon({ ...editingCoupon, discountAmount: Number(e.target.value), discountPercent: 0 })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl shadow-lg">حفظ الكوبون</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Offer Modal */}
      {showGroupOfferModal && editingGroupOffer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowGroupOfferModal(false)}>
          <div className="bg-[#1e293b] rounded-2xl w-full max-w-xl border border-gray-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-purple-400">إعداد عرض مجموعة (Group Offer)</h3>
              <button onClick={() => setShowGroupOfferModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveGroupOffer} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="text-xs text-gray-400 mb-1 block">اسم العرض</label>
                  <input type="text" required value={editingGroupOffer.name} onChange={e => setEditingGroupOffer({ ...editingGroupOffer, name: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white" />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-gray-400 mb-1 block">صلاحية العرض لغاية</label>
                  <input type="date" value={editingGroupOffer.expiryDate} onChange={e => setEditingGroupOffer({ ...editingGroupOffer, expiryDate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs text-gray-400 mb-1 block">نسبة الخصم (%)</label>
                   <input type="number" value={editingGroupOffer.discountPercent} onChange={e => setEditingGroupOffer({ ...editingGroupOffer, discountPercent: Number(e.target.value), discountAmount: 0 })}
                     className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white font-bold" />
                </div>
                <div>
                   <label className="text-xs text-gray-400 mb-1 block">أو خصم بمبلغ</label>
                   <input type="number" value={editingGroupOffer.discountAmount} onChange={e => setEditingGroupOffer({ ...editingGroupOffer, discountAmount: Number(e.target.value), discountPercent: 0 })}
                     className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block font-bold">المنتجات المختارة: ({editingGroupOffer.productIds?.length || 0})</label>
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 max-h-[200px] overflow-auto grid grid-cols-2 gap-1 custom-scrollbar">
                   {products.map(p => (
                     <label key={p.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${editingGroupOffer.productIds?.includes(p.id!) ? 'bg-purple-900/40 border border-purple-500/50' : 'hover:bg-gray-800 border border-transparent'}`}>
                        <input type="checkbox" checked={editingGroupOffer.productIds?.includes(p.id!)}
                          onChange={(e) => {
                            const cur = editingGroupOffer.productIds || [];
                            const upd = e.target.checked ? [...cur, p.id!] : cur.filter(id => id !== p.id);
                            setEditingGroupOffer({ ...editingGroupOffer, productIds: upd });
                          }} className="w-4 h-4 accent-purple-500" />
                        <span className="text-[10px] text-gray-200 truncate">{p.name}</span>
                     </label>
                   ))}
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={!editingGroupOffer.name || (editingGroupOffer.productIds?.length === 0)}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all">حفظ العرض المركب</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
