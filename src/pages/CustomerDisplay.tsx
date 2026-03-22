import { useState, useEffect } from 'react';
import { getCartDisplay, getSettings } from '../store';

interface DisplayData {
  items: { name: string; quantity: number; price: number; total: number }[];
  total: number;
  storeName: string;
}

export default function CustomerDisplay() {
  const [displayData, setDisplayData] = useState<DisplayData>({ items: [], total: 0, storeName: '' });
  const [settings, setSettingsData] = useState(getSettings());
  const [time, setTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [adPosition, setAdPosition] = useState(0);

  useEffect(() => {
    const updateDisplay = () => {
      const data = getCartDisplay();
      setDisplayData(data);
      setSettingsData(getSettings());
    };
    updateDisplay();
    const interval = setInterval(updateDisplay, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Scrolling ad text
  useEffect(() => {
    if (settings.customerAd) {
      const timer = setInterval(() => {
        setAdPosition(p => p - 1);
      }, 30);
      return () => clearInterval(timer);
    }
  }, [settings.customerAd]);

  const theme = (settings.displayTheme || 'dark') as string;
  const themeMap: Record<string, string> = {
    dark: 'from-[#0a0e27] via-[#0d1b3e] to-[#0a0e27]',
    blue: 'from-[#0a1628] via-[#102040] to-[#0a1628]',
    green: 'from-[#0a1a0e] via-[#0d2e18] to-[#0a1a0e]',
  };
  const themeClasses = themeMap[theme] || themeMap['dark'];

  const showLogo = settings.showLogoOnDisplay !== false && settings.logo;

  return (
    <div className={`h-screen flex flex-col bg-gradient-to-b ${themeClasses} overflow-hidden`}>
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-900/80 to-purple-900/80 backdrop-blur-sm p-4 border-b border-blue-500/30">
        <div className="flex justify-between items-center">
          <div className="text-right">
            <p className="text-blue-300 text-sm">{currentDate}</p>
            <p className="text-yellow-400 text-3xl font-mono font-bold">{time}</p>
          </div>
          <div className="text-center flex-1">
            {showLogo && (
              <img src={settings.logo} alt="logo" className="w-16 h-16 object-contain mx-auto mb-1 drop-shadow-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-l from-yellow-400 via-orange-400 to-yellow-300">
              {settings.storeName || 'Bakhcha Pro'}
            </h1>
            <p className="text-blue-300 text-sm mt-1">
              {settings.customerWelcome || 'مرحباً بكم - أهلاً وسهلاً'}
            </p>
          </div>
          <div className="text-left">
            {showLogo ? (
              <img src={settings.logo} alt="logo" className="w-14 h-14 object-contain opacity-60" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-l from-yellow-400 to-orange-500">
                Bakhcha Pro
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {displayData.items.length > 0 ? (
          <>
            {/* Items Table */}
            <div className="flex-1 overflow-auto mb-4 rounded-2xl border border-blue-500/20 shadow-2xl shadow-blue-500/5">
              <table className="w-full text-lg">
                <thead className="bg-gradient-to-l from-blue-800/80 to-blue-900/80 sticky top-0 backdrop-blur-sm">
                  <tr>
                    <th className="p-4 text-center text-blue-200 font-bold text-xl">الإجمالي</th>
                    <th className="p-4 text-center text-blue-200 font-bold text-xl">الكمية</th>
                    <th className="p-4 text-center text-blue-200 font-bold text-xl">السعر</th>
                    <th className="p-4 text-right text-blue-200 font-bold text-xl">المنتج</th>
                    <th className="p-4 text-center text-blue-200 font-bold w-16">#</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.items.map((item, idx) => (
                    <tr 
                      key={idx} 
                      className={`border-b border-blue-900/30 transition-all duration-500 ${
                        idx === displayData.items.length - 1 
                          ? 'bg-green-900/40 scale-[1.01]' 
                          : idx % 2 === 0 ? 'bg-blue-950/20' : 'bg-transparent'
                      }`}
                    >
                      <td className="p-4 text-center font-bold text-yellow-400 text-2xl">{item.total.toFixed(2)}</td>
                      <td className="p-4 text-center text-white text-2xl font-bold">{item.quantity}</td>
                      <td className="p-4 text-center text-green-400 text-lg">{item.price.toFixed(2)}</td>
                      <td className="p-4 text-right text-white font-bold text-2xl">{item.name}</td>
                      <td className="p-4 text-center text-blue-300 font-mono text-lg">{idx + 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="bg-gradient-to-l from-green-900/60 to-emerald-900/60 rounded-2xl p-6 border-2 border-green-500/40 backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <span className="text-gray-400 text-sm">عدد المنتجات</span>
                  <p className="text-white text-3xl font-black">{displayData.items.length}</p>
                </div>
                <div className="text-center flex-1">
                  <span className="text-green-300 text-lg font-bold">الإجمالي المطلوب</span>
                  <div className="flex items-center gap-3 justify-center">
                    <span className="text-green-300 text-2xl">{settings.currency}</span>
                    <span className="text-green-400 text-7xl font-black font-mono tracking-wider animate-pulse">
                      {displayData.total.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-gray-400 text-sm">إجمالي الكميات</span>
                  <p className="text-white text-3xl font-black">{displayData.items.reduce((s, i) => s + i.quantity, 0)}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-6">
              {showLogo ? (
                <img src={settings.logo} alt="logo" className="w-32 h-32 object-contain mx-auto drop-shadow-2xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="text-8xl mb-4">🛒</div>
              )}
              <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-l from-yellow-400 via-orange-400 to-yellow-300">
                {settings.customerWelcome || 'مرحباً بكم'}
              </h2>
              <p className="text-blue-300 text-3xl font-bold">
                {settings.storeName}
              </p>
              {settings.phone && (
                <p className="text-blue-400/60 text-lg">📞 {settings.phone}</p>
              )}
              <div className="flex justify-center gap-6 mt-8">
                <div className="bg-blue-900/30 rounded-2xl p-6 border border-blue-500/20 text-center hover:scale-105 transition-transform">
                  <span className="text-5xl">🏷️</span>
                  <p className="text-blue-300 mt-2 text-lg">أسعار منافسة</p>
                </div>
                <div className="bg-blue-900/30 rounded-2xl p-6 border border-blue-500/20 text-center hover:scale-105 transition-transform">
                  <span className="text-5xl">⭐</span>
                  <p className="text-blue-300 mt-2 text-lg">جودة عالية</p>
                </div>
                <div className="bg-blue-900/30 rounded-2xl p-6 border border-blue-500/20 text-center hover:scale-105 transition-transform">
                  <span className="text-5xl">🎁</span>
                  <p className="text-blue-300 mt-2 text-lg">عروض مميزة</p>
                </div>
              </div>
              <p className="text-gray-500 text-xl mt-6 animate-pulse">
                في انتظار عملية بيع جديدة...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer with scrolling ad */}
      <div className="bg-gradient-to-l from-blue-900/50 to-purple-900/50 border-t border-blue-500/20">
        {settings.customerAd && (
          <div className="bg-gradient-to-r from-yellow-600/20 via-orange-600/20 to-yellow-600/20 py-2 overflow-hidden border-b border-yellow-500/20">
            <div 
              className="whitespace-nowrap text-yellow-400 font-bold text-lg"
              style={{ transform: `translateX(${adPosition}px)`, display: 'inline-block', minWidth: '200%' }}
            >
              <span className="mx-8">🔥 {settings.customerAd}</span>
              <span className="mx-8">⭐ {settings.customerAd}</span>
              <span className="mx-8">🎉 {settings.customerAd}</span>
              <span className="mx-8">💎 {settings.customerAd}</span>
            </div>
          </div>
        )}
        <div className="p-3 text-center">
          <div className="flex justify-between items-center px-4">
            <p className="text-blue-400 text-sm">📞 {settings.phone}</p>
            <div className="flex items-center gap-2">
              {showLogo && (
                <img src={settings.logo} alt="" className="w-6 h-6 object-contain opacity-50" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <p className="text-gray-500 text-sm">نظام Bakhcha Pro</p>
            </div>
            <p className="text-blue-400 text-sm">📍 {settings.address}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
