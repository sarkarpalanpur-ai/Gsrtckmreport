import React, { useState } from 'react';
import { BusFront, Download, Globe, Wifi, WifiOff } from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  isOnline: boolean;
  onOpenExcel: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  isOnline,
  onOpenExcel,
}) => {
  const t = translations[lang];
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  return (
    <>
      <header className="bg-gradient-to-r from-[#102747] via-[#12396b] to-[#1769aa] text-white shadow-lg sticky top-0 z-40 border-b border-blue-900/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner shrink-0">
              <BusFront className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg md:text-xl font-black tracking-wide leading-tight truncate">
                  {t.appTitle}
                </h1>
                <span className="hidden lg:inline-block bg-amber-400 text-blue-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Android APK / PWA
                </span>
              </div>
              <p className="text-[11px] text-blue-200 font-medium hidden md:block">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Primary Excel & IDMS Import Button in Header */}
            <button
              onClick={onOpenExcel}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-black px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-950/30 transition active:scale-95 cursor-pointer border border-emerald-200 animate-pulse"
              title="Excel & IDMS Direct Import (Date to Date & Programs)"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 rotate-180" />
              <span>📁 Excel / IDMS</span>
            </button>

            {/* Online / Offline status */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border ${
                isOnline
                  ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
              }`}
              title={isOnline ? 'Online mode' : 'Offline local database'}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Wifi className="w-3.5 h-3.5 hidden xs:inline" />
                  <span className="text-[11px]">Online</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Offline DB</span>
                </>
              )}
            </div>

            {/* Language Switcher */}
            <button
              onClick={onToggleLang}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 border border-white/20 px-2 py-1.5 rounded-lg text-xs font-bold transition active:scale-95"
              title="Toggle Gujarati / English"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">{lang === 'gu' ? 'EN' : 'ગુજરાતી'}</span>
            </button>

            {/* PWA Install Button */}
            {!isInstalled && isInstallable && (
              <button
                onClick={install}
                className="hidden xs:flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-blue-950 font-black px-2.5 py-1.5 rounded-lg text-xs shadow-md transition active:scale-95 animate-pulse"
                title="Install as Android App"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            )}

            {!isInstalled && isIOS && (
              <button
                onClick={() => setShowIOSModal(true)}
                className="hidden xs:flex items-center gap-1 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold px-2 py-1.5 rounded-lg text-xs transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>iOS</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* iOS Install Instruction Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-slate-800">
            <h3 className="text-lg font-black text-blue-950 flex items-center gap-2">
              <BusFront className="w-5 h-5 text-blue-700" />
              Install on Home Screen
            </h3>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              1. Tap the <strong>Share button</strong> (square with arrow) in Safari.<br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
              3. GSRTC Propar KM will launch as a standalone app!
            </p>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-xl bg-blue-700 hover:bg-blue-800 py-2.5 text-sm font-bold text-white transition active:scale-98"
            >
              OK, Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
