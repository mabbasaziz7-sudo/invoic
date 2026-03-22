import { useRef } from 'react';
import Barcode from 'react-barcode';
import { Product } from '../types';
import { getSettings } from '../store';

interface BarcodeModalProps {
  product: Product;
  onClose: () => void;
}

export default function BarcodeModal({ product, onClose }: BarcodeModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const settings = getSettings();

  const printBarcode = (copies: number = 1) => {
    const printWindow = window.open('', '_blank', 'width=500,height=400');
    if (!printWindow) return;
    
    const barcodeValue = product.barcode || product.id.toString();
    
    let labelsHtml = '';
    for (let i = 0; i < copies; i++) {
      labelsHtml += `
        <div class="label">
          <div class="store-name">${settings.storeName}</div>
          <div class="product-name">${product.name}</div>
          <svg id="barcode-${i}"></svg>
          <div class="price">${product.sellPrice.toFixed(2)} ${settings.currency}</div>
        </div>
      `;
    }
    
    printWindow.document.write(`
      <html dir="rtl"><head><title>طباعة الباركود</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      <style>
        body { margin: 0; padding: 10px; font-family: Arial, sans-serif; }
        .labels-container { display: flex; flex-wrap: wrap; gap: 5px; }
        .label {
          border: 1px dashed #ccc;
          padding: 8px;
          text-align: center;
          width: 200px;
          page-break-inside: avoid;
        }
        .store-name { font-size: 8px; color: #666; margin-bottom: 2px; }
        .product-name { font-size: 11px; font-weight: bold; margin-bottom: 4px; }
        .price { font-size: 14px; font-weight: bold; margin-top: 4px; color: #e00; }
        svg { max-width: 180px; height: 50px; }
        @media print {
          .label { border: 1px dashed #ccc; }
        }
      </style></head><body>
      <div class="labels-container">${labelsHtml}</div>
      <script>
        for(let i = 0; i < ${copies}; i++) {
          try {
            JsBarcode("#barcode-" + i, "${barcodeValue}", {
              format: "CODE128",
              width: 1.5,
              height: 40,
              displayValue: true,
              fontSize: 10,
              margin: 2
            });
          } catch(e) {
            document.getElementById("barcode-" + i).innerHTML = '<text>${barcodeValue}</text>';
          }
        }
        setTimeout(() => window.print(), 500);
      </script></body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1e293b] rounded-2xl p-6 w-[450px] shadow-2xl border border-gray-600" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-sky-400 mb-4 text-center">📊 عرض وطباعة الباركود</h3>
        
        <div ref={printRef} className="bg-white rounded-xl p-6 text-center mb-4">
          <p className="text-gray-500 text-xs mb-1">{settings.storeName}</p>
          <p className="text-black font-bold text-lg mb-2">{product.name}</p>
          
          {product.barcode ? (
            <div className="flex justify-center">
              <Barcode 
                value={product.barcode} 
                width={1.8}
                height={60}
                fontSize={12}
                margin={5}
                background="#ffffff"
                lineColor="#000000"
              />
            </div>
          ) : (
            <div className="py-4 text-gray-400">لا يوجد باركود - يرجى توليد واحد</div>
          )}
          
          <p className="text-red-600 font-black text-2xl mt-2">{product.sellPrice.toFixed(2)} {settings.currency}</p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <span className="text-gray-400">الكمية: </span>
              <span className="text-white font-bold">{product.quantity}</span>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <span className="text-gray-400">التصنيف: </span>
              <span className="text-white font-bold">{product.category}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => printBarcode(1)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-sm transition-all">
              🖨️ طباعة ملصق واحد
            </button>
            <button onClick={() => printBarcode(4)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold text-sm transition-all">
              🖨️ طباعة 4 ملصقات
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => printBarcode(10)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl font-bold text-sm transition-all">
              🖨️ طباعة 10 ملصقات
            </button>
            <button onClick={() => {
              const count = parseInt(prompt('أدخل عدد النسخ:') || '0');
              if (count > 0) printBarcode(count);
            }} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-xl font-bold text-sm transition-all">
              🔢 عدد مخصص
            </button>
          </div>
          <button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-xl font-bold text-sm transition-all">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
