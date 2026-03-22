import { useState, useEffect, useRef } from 'react';
import { getSettings, saveSettings, getCategories, saveCategories } from '../store';

export default function Settings() {
  const [settings, setSettingsState] = useState(getSettings());
  const [categories, setCategoriesState] = useState<string[]>([]);
  const [newCat, setNewCat] = useState('');
  const [saved, setSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCategoriesState(getCategories());
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addCategory = () => {
    if (newCat && !categories.includes(newCat)) {
      const updated = [...categories, newCat];
      saveCategories(updated);
      setCategoriesState(updated);
      setNewCat('');
    }
  };

  const removeCategory = (cat: string) => {
    if (cat === 'الكل') return;
    const updated = categories.filter(c => c !== cat);
    saveCategories(updated);
    setCategoriesState(updated);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1000000) {
      alert('حجم الصورة كبير جداً! الحد الأقصى 1MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSettingsState({ ...settings, logo: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const resetData = () => {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع!')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="p-4 h-screen overflow-auto">
      <h1 className="text-2xl font-bold text-center text-sky-400 mb-6">⚙️ إعدادات النظام</h1>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Store Logo */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">🏪 شعار المتجر</h3>
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <div className="w-40 h-40 bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center border-4 border-dashed border-gray-600 hover:border-sky-500 transition-all cursor-pointer group"
              onClick={() => logoInputRef.current?.click()}>
              {settings.logo ? (
                <img src={settings.logo} alt="شعار المتجر" className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform" />
              ) : (
                <div className="text-center">
                  <span className="text-5xl block mb-2">🏪</span>
                  <span className="text-gray-500 text-xs">اضغط لرفع الشعار</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <p className="text-gray-400 text-sm">رفع شعار المتجر ليظهر في الفواتير وشاشة العميل والتقارير المطبوعة</p>
              <p className="text-gray-500 text-xs">الحجم الأقصى: 1MB | الأبعاد المثالية: 200×200 بكسل | PNG أو JPG</p>
              <div className="flex gap-2">
                <button onClick={() => logoInputRef.current?.click()}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all">
                  📁 اختيار صورة
                </button>
                {settings.logo && (
                  <button onClick={() => setSettingsState({ ...settings, logo: '' })}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all">
                    🗑️ حذف الشعار
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Store Info */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">📋 معلومات المتجر</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">اسم المتجر</label>
              <input type="text" value={settings.storeName} onChange={(e) => setSettingsState({...settings, storeName: e.target.value})}
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">الهاتف</label>
              <input type="text" value={settings.phone} onChange={(e) => setSettingsState({...settings, phone: e.target.value})}
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">العنوان</label>
              <input type="text" value={settings.address} onChange={(e) => setSettingsState({...settings, address: e.target.value})}
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">الضريبة الافتراضية (%)</label>
                <input type="number" value={settings.defaultTax} onChange={(e) => setSettingsState({...settings, defaultTax: Number(e.target.value)})}
                  className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">العملة</label>
                <input type="text" value={settings.currency} onChange={(e) => setSettingsState({...settings, currency: e.target.value})}
                  className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2" />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Customization */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">🧾 تخصيص الفواتير</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">عنوان الفاتورة (يظهر أعلى الفاتورة)</label>
              <input type="text" value={settings.invoiceTitle || ''} onChange={(e) => setSettingsState({...settings, invoiceTitle: e.target.value})}
                placeholder="مثال: فاتورة بيع - Bakhcha Pro"
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">نص ترحيبي (أسفل الفاتورة)</label>
              <input type="text" value={settings.invoiceFooter || ''} onChange={(e) => setSettingsState({...settings, invoiceFooter: e.target.value})}
                placeholder="مثال: شكراً لزيارتكم - نتمنى لكم يوماً سعيداً"
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">ملاحظات الفاتورة</label>
              <textarea value={settings.invoiceNotes || ''} onChange={(e) => setSettingsState({...settings, invoiceNotes: e.target.value})}
                placeholder="مثال: البضاعة المباعة لا ترد ولا تستبدل بعد 7 أيام"
                rows={2}
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">الرقم الجبائي / السجل التجاري</label>
                <input type="text" value={settings.taxNumber || ''} onChange={(e) => setSettingsState({...settings, taxNumber: e.target.value})}
                  placeholder="رقم السجل التجاري"
                  className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">رقم التعريف الجبائي NIF</label>
                <input type="text" value={settings.nif || ''} onChange={(e) => setSettingsState({...settings, nif: e.target.value})}
                  placeholder="NIF"
                  className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">عرض الشعار في الفاتورة</label>
                <select value={settings.showLogoOnInvoice !== false ? 'yes' : 'no'} onChange={(e) => setSettingsState({...settings, showLogoOnInvoice: e.target.value === 'yes'})}
                  className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2">
                  <option value="yes">✅ نعم - عرض الشعار</option>
                  <option value="no">❌ لا - إخفاء الشعار</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">عرض QR كود في الفاتورة</label>
                <select value={settings.showQROnInvoice !== false ? 'yes' : 'no'} onChange={(e) => setSettingsState({...settings, showQROnInvoice: e.target.value === 'yes'})}
                  className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2">
                  <option value="yes">✅ نعم - عرض QR</option>
                  <option value="no">❌ لا - إخفاء QR</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">حجم الفاتورة</label>
                <select value={settings.invoiceSize || 'receipt'} onChange={(e) => setSettingsState({...settings, invoiceSize: e.target.value})}
                  className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2">
                  <option value="receipt">🧾 إيصال صغير (80mm)</option>
                  <option value="a4">📄 A4 كامل</option>
                  <option value="half">📋 نصف صفحة</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">عرض الباركود في الفاتورة</label>
                <select value={settings.showBarcodeOnInvoice !== false ? 'yes' : 'no'} onChange={(e) => setSettingsState({...settings, showBarcodeOnInvoice: e.target.value === 'yes'})}
                  className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2">
                  <option value="yes">✅ نعم</option>
                  <option value="no">❌ لا</option>
                </select>
              </div>
            </div>
          </div>

          {/* Invoice Preview */}
          <div className="mt-4 bg-white rounded-xl p-4 text-black text-center" dir="rtl">
            <p className="text-xs text-gray-500 mb-2">معاينة الفاتورة</p>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 max-w-[300px] mx-auto">
              {settings.logo && settings.showLogoOnInvoice !== false && (
                <img src={settings.logo} alt="logo" className="w-16 h-16 object-contain mx-auto mb-2" />
              )}
              <p className="font-bold text-sm">{settings.invoiceTitle || settings.storeName}</p>
              <p className="text-[10px] text-gray-500">هاتف: {settings.phone}</p>
              <p className="text-[10px] text-gray-500">{settings.address}</p>
              {settings.taxNumber && <p className="text-[10px] text-gray-500">السجل التجاري: {settings.taxNumber}</p>}
              {settings.nif && <p className="text-[10px] text-gray-500">NIF: {settings.nif}</p>}
              <div className="border-t border-dashed border-gray-300 my-2"></div>
              <p className="text-[10px]">فاتورة رقم: INV-XXXXX</p>
              <p className="text-[10px]">التاريخ: {new Date().toLocaleDateString('ar-DZ')}</p>
              <div className="border-t border-dashed border-gray-300 my-2"></div>
              <div className="text-[9px] space-y-0.5 text-right">
                <div className="flex justify-between"><span>المنتج 1</span><span>100.00</span></div>
                <div className="flex justify-between"><span>المنتج 2</span><span>200.00</span></div>
              </div>
              <div className="border-t border-dashed border-gray-300 my-2"></div>
              <p className="font-bold text-sm">المجموع: 300.00 {settings.currency}</p>
              <div className="border-t border-dashed border-gray-300 my-2"></div>
              {settings.invoiceNotes && <p className="text-[9px] text-gray-500 italic">{settings.invoiceNotes}</p>}
              {settings.showBarcodeOnInvoice !== false && (
                <div className="my-1"><div className="h-6 bg-gray-200 rounded mx-auto w-3/4 flex items-center justify-center text-[8px] text-gray-400">باركود</div></div>
              )}
              {settings.showQROnInvoice !== false && (
                <div className="my-1"><div className="w-12 h-12 bg-gray-200 rounded mx-auto flex items-center justify-center text-[8px] text-gray-400">QR</div></div>
              )}
              <p className="text-[10px] mt-2 font-bold">{settings.invoiceFooter || 'شكراً لزيارتكم 🙏'}</p>
            </div>
          </div>
        </div>

        {/* Customer Display Settings */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">📺 إعدادات شاشة العميل</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">رسالة ترحيبية على شاشة العميل</label>
              <input type="text" value={settings.customerWelcome || ''} onChange={(e) => setSettingsState({...settings, customerWelcome: e.target.value})}
                placeholder="مرحباً بكم في متجرنا"
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">نص إعلاني (يظهر أسفل الشاشة)</label>
              <input type="text" value={settings.customerAd || ''} onChange={(e) => setSettingsState({...settings, customerAd: e.target.value})}
                placeholder="عروض خاصة - خصومات على جميع المنتجات"
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">عرض الشعار في شاشة العميل</label>
                <select value={settings.showLogoOnDisplay !== false ? 'yes' : 'no'} onChange={(e) => setSettingsState({...settings, showLogoOnDisplay: e.target.value === 'yes'})}
                  className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2">
                  <option value="yes">✅ نعم</option>
                  <option value="no">❌ لا</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">لون خلفية شاشة العميل</label>
                <select value={settings.displayTheme || 'dark'} onChange={(e) => setSettingsState({...settings, displayTheme: e.target.value})}
                  className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2">
                  <option value="dark">🌙 داكن</option>
                  <option value="blue">🔵 أزرق</option>
                  <option value="green">🟢 أخضر</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSave}
          className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${saved ? 'bg-green-600 text-white scale-105' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}>
          {saved ? '✅ تم الحفظ بنجاح!' : '💾 حفظ جميع الإعدادات'}
        </button>

        {/* Categories */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">📁 إدارة التصنيفات</h3>
          <div className="flex gap-2 mb-4">
            <input type="text" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="تصنيف جديد..."
              className="flex-1 bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2" />
            <button onClick={addCategory} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold">+ إضافة</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <div key={cat} className="flex items-center gap-1 bg-gray-700 rounded-lg px-3 py-1.5">
                <span className="text-white text-sm">{cat}</span>
                {cat !== 'الكل' && (
                  <button onClick={() => removeCategory(cat)} className="text-red-400 hover:text-red-300 text-xs mr-1">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-900/30 rounded-xl p-6 border border-red-700">
          <h3 className="text-lg font-bold text-red-400 mb-4">⚠️ منطقة الخطر</h3>
          <p className="text-gray-400 text-sm mb-4">سيتم مسح جميع البيانات بما في ذلك المنتجات والفواتير والعملاء. هذا الإجراء لا يمكن التراجع عنه.</p>
          <button onClick={resetData} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-bold">
            🗑️ مسح جميع البيانات وإعادة التعيين
          </button>
        </div>
      </div>
    </div>
  );
}
