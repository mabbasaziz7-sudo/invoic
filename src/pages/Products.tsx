import { useState, useEffect, useRef } from 'react';
import Barcode from 'react-barcode';
import { Product, User } from '../types';
import { getProducts, saveProduct, deleteProducts, getUserPermissions } from '../store';
import BarcodeModal from '../components/BarcodeModal';

interface ProductsProps {
  currentUser?: User | null;
}

export default function Products({ currentUser }: ProductsProps) {
  const perms = currentUser ? getUserPermissions(currentUser) : null;
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('الكل');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [showBarcodePreview, setShowBarcodePreview] = useState(false);

  const [form, setForm] = useState({
    name: '', barcode: '', quantity: 0, buyPrice: 0, sellPrice: 0,
    category: 'عام', expiryDate: '', minStock: 5,
  });
  const [formImage, setFormImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['الكل', ...new Set(products.map(p => p.category))];

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    const data = await getProducts();
    setProducts(data);
    setIsLoading(false);
  };

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
    setForm({ name: '', barcode: '', quantity: 0, buyPrice: 0, sellPrice: 0, category: 'عام', expiryDate: '', minStock: 5 });
    setFormImage('');
    setEditProduct(null);
    setShowAddModal(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name, barcode: p.barcode, quantity: p.quantity, buyPrice: p.buyPrice,
      sellPrice: p.sellPrice, category: p.category, expiryDate: p.expiryDate || '', minStock: p.minStock,
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

  const onSave = async () => {
    if (!form.name) { alert('أدخل اسم المنتج'); return; }
    const productData = {
      ...form,
      expiryDate: form.expiryDate || null,
      image: formImage,
      id: editProduct?.id
    };
    
    const { error } = await saveProduct(productData);
    if (error) {
       alert('خطأ في الحفظ: ' + error.message);
    } else {
       await loadProducts();
       setShowAddModal(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedProducts.length === 0) { alert('اختر منتجات للحذف'); return; }
    if (!confirm(`هل أنت متأكد من حذف ${selectedProducts.length} منتج؟`)) return;
    
    const { error } = await deleteProducts(selectedProducts);
    if (error) {
       alert('خطأ في الحذف: ' + error.message);
    } else {
       await loadProducts();
       setSelectedProducts([]);
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
        \${selected.map((p, i) => \`
          <div class="label">
            <div class="pname">\${p.name}</div>
            <svg id="bc-\${i}"></svg>
            <div class="price">\${p.sellPrice.toFixed(2)} دج</div>
          </div>
        \`).join('')}
      </div>
      <script>
        \${selected.map((p, i) => \`
          try { JsBarcode("#bc-\${i}", "\${p.barcode || p.id}", { format:"CODE128", width:1.3, height:35, displayValue:true, fontSize:9, margin:2 }); } catch(e){}
        \`).join('')}
        setTimeout(() => window.print(), 600);
      <\/script></body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-4 h-screen overflow-auto">
      <h1 className="text-2xl font-bold text-center text-sky-400 mb-4">إدارة المنتجات (Supabase)</h1>

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
        <button onClick={loadProducts} className="bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-bold">🔄 تحديث</button>
      </div>

      {isLoading ? (
         <div className="flex justify-center py-10"><div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <>
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
              🖨️ طباعة باركودات {selectedProducts.length > 0 ? `(\${selectedProducts.length} مختار)` : '(الكل)'}
            </button>
          </div>

          <div className="overflow-auto rounded-xl border border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-2">باركود</th>
                  <th className="p-2">صورة</th>
                  <th className="p-2">سعر البيع</th>
                  <th className="p-2">الكمية</th>
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
                  <tr key={p.id} className={`border-b border-gray-800 hover:bg-gray-700/50 cursor-pointer \${getRowColor(p)}`}
                    onDoubleClick={() => openEdit(p)}>
                    <td className="p-2 text-center">
                      <button onClick={(e) => { e.stopPropagation(); setBarcodeProduct(p); }} className="bg-indigo-600 text-white px-2 py-0.5 rounded text-xs">📊</button>
                    </td>
                    <td className="p-1 text-center">
                      <div className="w-10 h-10 rounded overflow-hidden mx-auto bg-gray-700 flex items-center justify-center">
                        {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <span className="text-lg opacity-50">📦</span>}
                      </div>
                    </td>
                    <td className="p-2 text-center text-sky-400 font-bold">{p.sellPrice}</td>
                    <td className="p-2 text-center">{p.quantity}</td>
                    <td className="p-2 text-right font-bold">{p.name}</td>
                    <td className="p-2 text-center underline font-mono text-[10px] text-gray-500">{p.id}</td>
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
        </>
      )}

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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">الكمية</label>
                  <input type="number" value={form.quantity} onChange={(e) => setForm({...form, quantity: Number(e.target.value)})}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
                </div>
                <div>
                   <label className="text-sm text-gray-400 mb-1 block">سعر البيع</label>
                   <input type="number" value={form.sellPrice} onChange={(e) => setForm({...form, sellPrice: Number(e.target.value)})}
                     className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                 <label className="text-sm text-gray-400 mb-1 block">التصنيف</label>
                 <input type="text" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" placeholder="أدخل التصنيف..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={onSave} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl font-bold shadow-lg shadow-green-900/20 transition-all">✅ حفظ المنتج</button>
              <button onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-xl font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
