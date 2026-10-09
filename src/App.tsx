import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { KmEntryView } from './components/KmEntryView';
import { ProgramsView } from './components/ProgramsView';
import { MaintenanceView } from './components/MaintenanceView';
import { SummaryView } from './components/SummaryView';
import { BusMasterView } from './components/BusMasterView';
import { AiStudioView } from './components/AiStudioView';
import { ExcelBackupView } from './components/ExcelBackupView';
import { AppDatabase } from './types';
import { getProgramStatus, loadDatabase, saveDatabase } from './utils/storage';
import { Language } from './utils/i18n';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [lang, setLang] = useState<Language>('gu');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Jump navigation helpers
  const [navTargetBus, setNavTargetBus] = useState<string | undefined>();
  const [navTargetProgram, setNavTargetProgram] = useState<string | undefined>();

  // Sync database with localStorage
  const handleUpdateDb = (updater: (prev: AppDatabase) => AppDatabase) => {
    setDb((prev) => {
      const next = updater(prev);
      saveDatabase(next);
      return next;
    });
  };

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calculate warning count for badge
  const warningCount = React.useMemo(() => {
    let count = 0;
    db.buses.forEach((b) => {
      db.programs.forEach((p) => {
        const st = getProgramStatus(b.no, p, db);
        if (st.isNear) count++;
      });
    });
    return count;
  }, [db]);

  // Jump navigation handler
  const handleNavigate = (tab: TabType, busNo?: string, programName?: string) => {
    setNavTargetBus(busNo);
    setNavTargetProgram(programName);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-20 md:pb-8">
      {/* Top Header */}
      <Header
        lang={lang}
        onToggleLang={() => setLang((l) => (l === 'gu' ? 'en' : 'gu'))}
        isOnline={isOnline}
        onOpenExcel={() => {
          setActiveTab('excel');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Navigation (Top bar on desktop + Bottom bar on Android/mobile) */}
      <Navigation
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setNavTargetBus(undefined);
          setNavTargetProgram(undefined);
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        lang={lang}
        warningCount={warningCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-4 md:py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            db={db}
            lang={lang}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'entry' && (
          <KmEntryView
            db={db}
            onUpdateDb={handleUpdateDb}
            lang={lang}
            onNavigateToExcel={() => {
              setActiveTab('excel');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'programs' && (
          <ProgramsView
            db={db}
            onUpdateDb={handleUpdateDb}
            lang={lang}
            initialBus={navTargetBus}
          />
        )}

        {activeTab === 'maintenance' && (
          <MaintenanceView
            db={db}
            onUpdateDb={handleUpdateDb}
            lang={lang}
            preselectedBus={navTargetBus}
            preselectedProgram={navTargetProgram}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryView db={db} lang={lang} />
        )}

        {activeTab === 'buses' && (
          <BusMasterView
            db={db}
            onUpdateDb={handleUpdateDb}
            lang={lang}
          />
        )}

        {activeTab === 'aiStudio' && (
          <AiStudioView lang={lang} />
        )}

        {activeTab === 'excel' && (
          <ExcelBackupView
            db={db}
            onUpdateDb={handleUpdateDb}
            lang={lang}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 font-semibold px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            GSRTC Propar KM Register • Gujarat State Road Transport Corporation
          </span>
          <span className="text-[11px] text-slate-400">
            Local Android Storage • AI Studio Powered
          </span>
        </div>
      </footer>
    </div>
  );
}
