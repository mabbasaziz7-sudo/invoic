import { useState, useEffect, useRef } from 'react';
import Barcode from 'react-barcode';
import { Product, User } from '../types';
import { getProducts, saveProduct, deleteProduct, getCategories, getUserPermissions } from '../store';
import BarcodeModal from '../components/BarcodeModal';

interface ProductsProps {
  currentUser?: User | null;
}

export default function Products({ currentUser }: ProductsProps) {
  const perms = currentUser ? getUserPermissions(currentUser) : null;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('الكل');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [newCat, setNewCat] = useState('');
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [showBarcodePreview, setShowBarcodePreview] = useState(false);

  const [form, setForm] = useState({
    name: '', barcode: '', quantity: 0, buyPrice: 0, sellPrice: 0,
    category: 'عام', expiryDate: '', minStock: 5,
    discountPrice: 0, discountPercent: 0, bulkQuantity: 0, bulkPrice: 0
  });
  const [formImage, setFormImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      setProducts(await getProducts());
      setCategories(await getCategories());
    };
    load();
  }, []);

  const today = new Date();

  const getExpiryStatus = (p: Product) => {
    if (!p.expiryDate) return 'ok';
    const exp = new Date(p.expiryDate);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'expired';
    if (diff <= 30) return 'soon';
    return 'ok';
  };

  const getDaysLeft = (p: Product) => {
    if (!p.expiryDate) return '-';
    const exp = new Date(p.expiryDate);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return `${diff} يوم`;
  };

  const getRowColor = (p: Product) => {
    const status = getExpiryStatus(p);
    if (status === 'expired') return 'bg-red-900/50';
    if (status === 'soon') return 'bg-orange-900/50';
    if (p.quantity <= p.minStock) return 'bg-yellow-900/30';
    return '';
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = !search || p.name.includes(search) || p.barcode.includes(search);
    const matchCategory = filterCategory === 'الكل' || p.category === filterCategory;
    let matchStatus = true;
    if (filterStatus === 'low') matchStatus = p.quantity <= p.minStock;
    if (filterStatus === 'expired') matchStatus = getExpiryStatus(p) === 'expired';
    if (filterStatus === 'soon') matchStatus = getExpiryStatus(p) === 'soon';
    return matchSearch && matchCategory && matchStatus;
  });

  const stats = {
    total: products.length,
    ok: products.filter(p => getExpiryStatus(p) === 'ok' && p.quantity > p.minStock).length,
    soon: products.filter(p => getExpiryStatus(p) === 'soon').length,
    expired: products.filter(p => getExpiryStatus(p) === 'expired').length,
    lowStock: products.filter(p => p.quantity <= p.minStock).length,
  };

  const openAdd = () => {
    setForm({ 
      name: '', barcode: '', quantity: 0, buyPrice: 0, sellPrice: 0, category: 'عام', expiryDate: '', minStock: 5,
      discountPrice: 0, discountPercent: 0, bulkQuantity: 0, bulkPrice: 0
    });
    setFormImage('');
    setEditProduct(null);
    setShowAddModal(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name, barcode: p.barcode, quantity: p.quantity, buyPrice: p.buyPrice,
      sellPrice: p.sellPrice, category: p.category, expiryDate: p.expiryDate || '', minStock: p.minStock,
      discountPrice: p.discountPrice || 0,
      discountPercent: p.discountPercent || 0,
      bulkQuantity: p.bulkQuantity || 0,
      bulkPrice: p.bulkPrice || 0
    });
    setFormImage(p.image || '');
    setEditProduct(p);
    setShowAddModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800000) {
      alert('حجم الصورة كبير جداً! الحد الأقصى 800KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const saveProductData = async () => {
    if (!form.name) { alert('أدخل اسم المنتج'); return; }
    
    const pData: Partial<Product> = {
      ...form,
      expiryDate: form.expiryDate || null,
      image: formImage,
    };

    if (editProduct) {
      await saveProduct({ ...pData, id: editProduct.id });
    } else {
      await saveProduct(pData);
    }
    
    setProducts(await getProducts());
    setShowAddModal(false);
  };

  const deleteSelected = async () => {
    if (selectedProducts.length === 0) { alert('اختر منتجات للحذف'); return; }
    if (!confirm(`هل أنت متأكد من حذف ${selectedProducts.length} منتج؟`)) return;
    
    for (const id of selectedProducts) {
      await deleteProduct(id);
    }
    
    setProducts(await getProducts());
    setSelectedProducts([]);
  };

  const addCategory = () => {
    if (newCat && !categories.includes(newCat)) {
      const updated = [...categories, newCat];
      setCategories(updated);
      setNewCat('');
    }
  };

  const generateBarcode = () => {
    const code = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setForm({ ...form, barcode: code });
  };

  const printAllBarcodes = () => {
    const selected = selectedProducts.length > 0
      ? products.filter(p => selectedProducts.includes(p.id))
      : filteredProducts;

    if (selected.length === 0) { alert('لا توجد منتجات للطباعة'); return; }

    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl"><head><title>طباعة الباركودات</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <style>
        body { margin: 0; padding: 10px; font-family: Arial, sans-serif; }
        .labels { display: flex; flex-wrap: wrap; gap: 5px; }
        .label { border: 1px dashed #ccc; padding: 6px; text-align: center; width: 190px; page-break-inside: avoid; }
        .pname { font-size: 10px; font-weight: bold; margin-bottom: 3px; }
        .price { font-size: 12px; font-weight: bold; color: #c00; margin-top: 3px; }
        svg { max-width: 170px; height: 45px; }
      </style></head><body>
      <div class="labels">
        ${selected.map((p, i) => `
          <div class="label">
            <div class="pname">${p.name}</div>
            <svg id="bc-${i}"></svg>
            <div class="price">${p.sellPrice.toFixed(2)} دج</div>
          </div>
        `).join('')}
      </div>
      <script>
        ${selected.map((p, i) => `
          try { JsBarcode("#bc-${i}", "${p.barcode || p.id}", { format:"CODE128", width:1.3, height:35, displayValue:true, fontSize:9, margin:2 }); } catch(e){}
        `).join('')}
        setTimeout(() => window.print(), 600);
      <\/script></body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-4 h-screen overflow-auto">
      <h1 className="text-2xl font-bold text-center text-sky-400 mb-4">إدارة المنتجات لوحة التحكم</h1>

      {/* Search & Add */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {(!perms || perms.addProduct) && (
        <button onClick={openAdd} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-bold text-sm transition-all">
          + إضافة منتج جديد
        </button>
        )}
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm">
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث في المنتجات (الاسم أو الباركود)..."
          className="flex-1 bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm min-w-[200px]" />
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <button onClick={() => setFilterStatus('all')} className={`px-4 py-1.5 rounded-lg font-bold text-sm ${filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>جميع المنتجات</button>
        <button onClick={() => setFilterStatus('low')} className={`px-4 py-1.5 rounded-lg font-bold text-sm ${filterStatus === 'low' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'}`}>⚠️ مخزون منخفض</button>
        <button onClick={() => setFilterStatus('soon')} className={`px-4 py-1.5 rounded-lg font-bold text-sm ${filterStatus === 'soon' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'}`}>⏳ قريب الانتهاء</button>
        <button onClick={() => setFilterStatus('expired')} className={`px-4 py-1.5 rounded-lg font-bold text-sm ${filterStatus === 'expired' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>❌ منتهي الصلاحية</button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {(!perms || perms.editProduct) && (
        <button onClick={() => { if(selectedProducts.length === 1) { const p = products.find(pr => pr.id === selectedProducts[0]); if(p) openEdit(p); } else alert('اختر منتج واحد للتعديل') }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-bold text-sm">✏️ تعديل المنتج</button>
        )}
        {(!perms || perms.deleteProduct) && (
        <button onClick={deleteSelected} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg font-bold text-sm">🗑️ حذف</button>
        )}
        <button onClick={printAllBarcodes} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg font-bold text-sm">
          🖨️ طباعة باركودات {selectedProducts.length > 0 ? `(${selectedProducts.length} مختار)` : '(الكل)'}
        </button>
        <button onClick={() => setShowBarcodePreview(!showBarcodePreview)} className={`px-4 py-1.5 rounded-lg font-bold text-sm ${showBarcodePreview ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
          📊 {showBarcodePreview ? 'إخفاء' : 'عرض'} الباركودات
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-3 flex-wrap">
        <span className="bg-green-800 text-green-300 px-3 py-1 rounded-lg text-sm">✅ آمنة: {stats.ok}</span>
        <span className="bg-orange-800 text-orange-300 px-3 py-1 rounded-lg text-sm">⚠️ قريبة: {stats.soon}</span>
        <span className="bg-red-800 text-red-300 px-3 py-1 rounded-lg text-sm">❌ منتهية: {stats.expired}</span>
        <span className="text-sky-400 font-bold text-sm">الإجمالي: {stats.total}</span>
      </div>

      {/* Barcode Preview Grid */}
      {showBarcodePreview && (
        <div className="mb-4 bg-white rounded-2xl p-4 overflow-auto max-h-[300px]">
          <h3 className="text-black font-bold text-center mb-3">📊 معاينة الباركودات</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredProducts.filter(p => p.barcode).map(p => (
              <div 
                key={p.id} 
                className="border border-gray-300 rounded-lg p-2 text-center cursor-pointer hover:bg-gray-100 transition-all"
                onClick={() => setBarcodeProduct(p)}
              >
                <p className="text-black text-xs font-bold mb-1 truncate">{p.name}</p>
                <div className="flex justify-center transform scale-75 origin-center">
                  <Barcode value={p.barcode} width={1} height={30} fontSize={8} margin={2} background="#fff" lineColor="#000" />
                </div>
                <p className="text-red-600 font-bold text-xs">{p.sellPrice} دج</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Table */}
      <div className="overflow-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-2">باركود</th>
              <th className="p-2">صورة</th>
              <th className="p-2">الأيام</th>
              <th className="p-2">تاريخ الانتهاء</th>
              <th className="p-2">سعر البيع</th>
              <th className="p-2">الكمية</th>
              <th className="p-2">الباركود</th>
              <th className="p-2">الاسم</th>
              <th className="p-2">ID</th>
              <th className="p-2">
                <input type="checkbox" onChange={(e) => {
                  if (e.target.checked) setSelectedProducts(products.map(p => p.id));
                  else setSelectedProducts([]);
                }} />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
              <tr key={p.id} className={`border-b border-gray-800 hover:bg-gray-700/50 cursor-pointer ${getRowColor(p)}`}
                onDoubleClick={() => openEdit(p)}>
                <td className="p-2 text-center">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setBarcodeProduct(p); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded text-xs"
                    title="عرض الباركود"
                  >
                    📊
                  </button>
                </td>
                <td className="p-1 text-center">
                  <div className="w-10 h-10 rounded overflow-hidden mx-auto bg-gray-700 flex items-center justify-center">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                    ) : (
                      <span className="text-lg opacity-50">📦</span>
                    )}
                  </div>
                </td>
                <td className="p-2 text-center text-xs">{getDaysLeft(p)}</td>
                <td className="p-2 text-center text-xs">{p.expiryDate || '-'}</td>
                <td className="p-2 text-center">{p.sellPrice}</td>
                <td className="p-2 text-center">{p.quantity}</td>
                <td className="p-2 text-center text-xs">{p.barcode ? (p.barcode.length > 10 ? '...' + p.barcode.slice(-7) : p.barcode) : ''}</td>
                <td className="p-2 text-right font-bold">{p.name}</td>
                <td className="p-2 text-center">{p.id}</td>
                <td className="p-2 text-center">
                  <input type="checkbox" checked={selectedProducts.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedProducts([...selectedProducts, p.id]);
                      else setSelectedProducts(selectedProducts.filter(id => id !== p.id));
                    }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Barcode Modal */}
      {barcodeProduct && (
        <BarcodeModal product={barcodeProduct} onClose={() => setBarcodeProduct(null)} />
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-6 w-[560px] max-h-[90vh] overflow-auto shadow-2xl border border-gray-600" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-sky-400 mb-4 text-center">{editProduct ? '✏️ تعديل المنتج' : '➕ إضافة منتج جديد'}</h3>
            <div className="space-y-3">
              {/* Product Image */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">صورة المنتج</label>
                <div className="flex gap-4 items-start">
                  <div className="w-28 h-28 bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-500 flex-shrink-0">
                    {formImage ? (
                      <img src={formImage} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <span className="text-4xl block">📷</span>
                        <span className="text-[10px] text-gray-500">لا توجد صورة</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-bold transition-all"
                    >
                      📁 اختيار صورة من الجهاز
                    </button>
                    <button
                      onClick={() => {
                        const url = prompt('أدخل رابط الصورة (URL):');
                        if (url) setFormImage(url);
                      }}
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                    >
                      🔗 إدخال رابط صورة
                    </button>
                    {formImage && (
                      <button
                        onClick={() => setFormImage('')}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs transition-all"
                      >
                        🗑️ حذف الصورة
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">اسم المنتج *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-sm text-gray-400 mb-1 block">الباركود</label>
                  <input type="text" value={form.barcode} onChange={(e) => setForm({...form, barcode: e.target.value})}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
                </div>
                <button onClick={generateBarcode} className="bg-green-600 text-white px-3 py-2 rounded-lg self-end text-sm font-bold">توليد 🔧</button>
              </div>
              
              {/* Barcode Preview in Form */}
              {form.barcode && (
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-gray-500 text-xs mb-1">معاينة الباركود</p>
                  <div className="flex justify-center">
                    <Barcode value={form.barcode} width={1.5} height={45} fontSize={10} margin={3} background="#fff" lineColor="#000" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">الكمية</label>
                  <input type="number" value={form.quantity} onChange={(e) => setForm({...form, quantity: Number(e.target.value)})}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">الحد الأدنى للمخزون</label>
                  <input type="number" value={form.minStock} onChange={(e) => setForm({...form, minStock: Number(e.target.value)})}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">سعر الشراء</label>
                  <input type="number" value={form.buyPrice} onChange={(e) => setForm({...form, buyPrice: Number(e.target.value)})}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">سعر البيع</label>
                  <input type="number" value={form.sellPrice} onChange={(e) => setForm({...form, sellPrice: Number(e.target.value)})}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">التصنيف</label>
                  <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2">
                    {categories.filter(c => c !== 'الكل').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">تاريخ الانتهاء</label>
                  <input type="date" value={form.expiryDate} onChange={(e) => setForm({...form, expiryDate: e.target.value})}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="bg-blue-900/10 p-4 rounded-2xl border border-blue-500/20 space-y-4">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">💰 عروض الجملة والخصومات</h4>
                <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="text-[10px] text-gray-400 mb-1 block">الكمية للجملة</label>
                     <input type="number" value={form.bulkQuantity} onChange={(e) => setForm({...form, bulkQuantity: Number(e.target.value)})}
                       className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm" placeholder="مثلاً: 12" />
                   </div>
                   <div>
                     <label className="text-[10px] text-gray-400 mb-1 block">سعر القطعة بالجملة</label>
                     <input type="number" value={form.bulkPrice} onChange={(e) => setForm({...form, bulkPrice: Number(e.target.value)})}
                       className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="text-[10px] text-gray-400 mb-1 block">سعر خصم خاص</label>
                     <input type="number" value={form.discountPrice} onChange={(e) => setForm({...form, discountPrice: Number(e.target.value)})}
                       className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                   </div>
                   <div>
                     <label className="text-[10px] text-gray-400 mb-1 block">نسبة خصم (%)</label>
                     <input type="number" value={form.discountPercent} onChange={(e) => setForm({...form, discountPercent: Number(e.target.value)})}
                       className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                   </div>
                </div>
              </div>

              <div className="flex gap-2">
                <input type="text" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="تصنيف جديد..."
                  className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm" />
                <button onClick={addCategory} className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-bold">إضافة تصنيف</button>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={saveProductData} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl font-bold">✅ حفظ</button>
              <button onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-xl font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
