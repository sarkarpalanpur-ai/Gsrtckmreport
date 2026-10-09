import React from 'react';
import {
  LayoutDashboard,
  CalendarPlus,
  Layers,
  Wrench,
  BarChart3,
  Sparkles,
  Bus,
  FileSpreadsheet,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';

export type TabType =
  | 'dashboard'
  | 'entry'
  | 'programs'
  | 'maintenance'
  | 'summary'
  | 'aiStudio'
  | 'buses'
  | 'excel';

interface NavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  lang: Language;
  warningCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab,
  lang,
  warningCount,
}) => {
  const t = translations[lang];

  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: t.dashboard,
      icon: <LayoutDashboard className="w-5 h-5" />,
      badge: warningCount > 0 ? warningCount : undefined,
    },
    {
      id: 'entry',
      label: t.kmEntry,
      icon: <CalendarPlus className="w-5 h-5" />,
    },
    {
      id: 'programs',
      label: t.programs,
      icon: <Layers className="w-5 h-5" />,
    },
    {
      id: 'maintenance',
      label: t.maintenance,
      icon: <Wrench className="w-5 h-5" />,
    },
    {
      id: 'aiStudio',
      label: t.aiStudio,
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
    },
    {
      id: 'summary',
      label: t.summary,
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'buses',
      label: t.buses,
      icon: <Bus className="w-5 h-5" />,
    },
    {
      id: 'excel',
      label: t.backup,
      icon: <FileSpreadsheet className="w-5 h-5" />,
    },
  ];

  return (
    <>
      {/* Desktop / Tablet Top Nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-[60px] z-30 shadow-xs hidden md:block">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto py-2 no-scrollbar">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onChangeTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-150 relative cursor-pointer ${
                    isActive
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {Boolean(tab.badge) && (
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-rose-500 text-white'
                          : 'bg-rose-100 text-rose-700 border border-rose-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Android Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 px-1.5 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-6 gap-0.5 items-center justify-around max-w-lg mx-auto">
          {/* Dashboard */}
          <button
            onClick={() => onChangeTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
              activeTab === 'dashboard'
                ? 'text-blue-900 font-black'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <div className="relative">
              <LayoutDashboard className="w-5 h-5" />
              {warningCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {warningCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">{t.dashboard}</span>
          </button>

          {/* Daily KM Entry */}
          <button
            onClick={() => onChangeTab('entry')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
              activeTab === 'entry'
                ? 'text-blue-900 font-black'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <CalendarPlus className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 leading-tight">{t.kmEntry}</span>
          </button>

          {/* Excel Import (Direct Bottom Tab) */}
          <button
            onClick={() => onChangeTab('excel')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
              activeTab === 'excel'
                ? 'text-emerald-700 font-black'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <div className="relative">
              <FileSpreadsheet className={`w-5 h-5 ${activeTab === 'excel' ? 'text-emerald-600' : 'text-slate-600'}`} />
            </div>
            <span className={`text-[10px] mt-0.5 leading-tight ${activeTab === 'excel' ? 'text-emerald-800 font-black' : ''}`}>
              Excel
            </span>
          </button>

          {/* Programs */}
          <button
            onClick={() => onChangeTab('programs')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
              activeTab === 'programs'
                ? 'text-blue-900 font-black'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 leading-tight">{t.programs}</span>
          </button>

          {/* Maintenance */}
          <button
            onClick={() => onChangeTab('maintenance')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
              activeTab === 'maintenance'
                ? 'text-blue-900 font-black'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <Wrench className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 leading-tight">{t.maintenance}</span>
          </button>

          {/* Summary / AI Studio */}
          <button
            onClick={() => {
              if (activeTab === 'summary') {
                onChangeTab('aiStudio');
              } else {
                onChangeTab('summary');
              }
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
              activeTab === 'summary' || activeTab === 'aiStudio'
                ? 'text-blue-900 font-black'
                : 'text-slate-500 font-semibold'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 leading-tight">{t.summary}</span>
          </button>
        </div>
      </div>
    </>
  );
};
