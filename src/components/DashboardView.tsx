import React from 'react';
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gauge,
  PlusCircle,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { AppDatabase, Program } from '../types';
import { fmt, getProgramStatus, num } from '../utils/storage';
import { Language, translations } from '../utils/i18n';
import { TabType } from './Navigation';

interface DashboardViewProps {
  db: AppDatabase;
  lang: Language;
  onNavigate: (tab: TabType, busNo?: string, programName?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  db,
  lang,
  onNavigate,
}) => {
  const t = translations[lang];
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Calculate current month total KM
  const currentMonthKm = db.entries
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + num(e.km), 0);

  // Scan all warnings across all buses & programs
  const warnings: {
    bus: string;
    program: Program;
    km: number;
    w: number;
    near: boolean;
    due: boolean;
    ratio: number;
  }[] = [];

  db.buses.forEach((b) => {
    db.programs.forEach((p) => {
      const st = getProgramStatus(b.no, p, db);
      if (st.isNear) {
        warnings.push({
          bus: b.no,
          program: p,
          km: st.km,
          w: st.warningKm,
          near: st.isNear,
          due: st.isDue,
          ratio: st.warningKm > 0 ? st.km / st.warningKm : 0,
        });
      }
    });
  });

  // Sort by highest urgency ratio
  warnings.sort((a, b) => b.ratio - a.ratio);

  // Recent entries
  const recentEntries = [...db.entries]
    .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 rounded-3xl p-5 md:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_center,white,transparent)] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 border border-amber-300/30 px-3 py-1 rounded-full text-xs font-bold mb-2">
              <Bus className="w-3.5 h-3.5" />
              <span>GSRTC Palanpur / Depot Fleet Portal</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">
              {lang === 'gu'
                ? 'મુખ્ય ડેશબોર્ડ & દૈનિક KM મોનિટર'
                : 'Fleet Health & Daily KM Monitor'}
            </h2>
            <p className="text-xs md:text-sm text-blue-200 mt-1 max-w-xl">
              {lang === 'gu'
                ? 'દરેક બસના દૈનિક કિલોમીટર અને 13+ પ્રોગ્રામ સર્વિસ શિડ્યુલને રીયલ-ટાઇમમાં ટ્રેક કરો.'
                : 'Track daily fleet distance, service thresholds, and AI visual inspections in real time.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('entry')}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-blue-950 font-black px-4 py-2.5 rounded-xl text-sm shadow-md transition active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.saveKmEntry}</span>
            </button>
            <button
              onClick={() => onNavigate('excel')}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-black px-4 py-2.5 rounded-xl text-sm shadow-md transition active:scale-95 cursor-pointer border-2 border-emerald-200"
            >
              <Bus className="w-4 h-4 text-slate-950" />
              <span>📁 Excel / IDMS Import</span>
            </button>
            <button
              onClick={() => onNavigate('aiStudio')}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold px-3.5 py-2.5 rounded-xl text-sm transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>AI Studio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Excel & IDMS Import Callout Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-300 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <span className="text-2xl">📥</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">
                {lang === 'gu'
                  ? 'Excel Import & IDMS સીધો ઓટોમેટીક ડેટા સિંક'
                  : 'Excel Import & IDMS Direct Live Sync'}
              </h3>
              <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                IDMS GSRTC
              </span>
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-0.5">
              {lang === 'gu'
                ? 'બધી બસો IDMS માં અલગ-અલગ ખોલવાની જરૂર નથી! તારીખ-વાર Excel અથવા IDMS (dsrp) માંથી સીધો જ KM અને પ્રોગ્રામ ડેટા 1-ક્લિકમાં લાવો.'
                : 'No need to open every bus individually in IDMS! Direct batch import with Date-to-Date filter and program mapping.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('excel')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
          >
            <span>📁 Excel ફાઇલ Import</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('excel')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer border border-blue-700"
          >
            <span>⚡ IDMS Live Sync (dsrp)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Buses */}
        <div
          onClick={() => onNavigate('buses')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.totalBuses}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center group-hover:scale-110 transition">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mt-2">
            {db.buses.length}
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
            <span>Active in depot master</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
          </div>
        </div>

        {/* Total Entries */}
        <div
          onClick={() => onNavigate('entry')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.totalEntries}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mt-2">
            {db.entries.length}
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
            <span>Date-wise logs</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
          </div>
        </div>

        {/* Selected / Current Month KM */}
        <div
          onClick={() => onNavigate('summary')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.currentMonthKm}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mt-2 truncate">
            {fmt(currentMonthKm)} <span className="text-xs font-bold text-slate-500">KM</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
            <span>{currentMonth}</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
          </div>
        </div>

        {/* Service Warnings Count */}
        <div
          onClick={() => onNavigate('maintenance')}
          className={`p-4 rounded-2xl border transition cursor-pointer group ${
            warnings.length > 0
              ? 'bg-rose-50/70 border-rose-200 hover:border-rose-400'
              : 'bg-white border-slate-200/80 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.serviceWarnings}
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition ${
                warnings.length > 0
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {warnings.length > 0 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl md:text-3xl font-black mt-2 ${
              warnings.length > 0 ? 'text-rose-700' : 'text-slate-900'
            }`}
          >
            {warnings.length}
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
            <span>{warnings.length > 0 ? 'Requires attention' : 'All clear'}</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
          </div>
        </div>
      </div>

      {/* Service Warning Alerts Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-slate-900">
              {lang === 'gu'
                ? '⚠️ સર્વિસ ચેતવણીઓ (Service Warnings)'
                : '⚠️ Fleet Service Warnings'}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {warnings.length} {lang === 'gu' ? 'ચેતવણી સક્રિય' : 'active'}
          </span>
        </div>

        {warnings.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-bold">{t.noWarnings}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {warnings.map((w, idx) => {
              const bus = db.buses.find((b) => b.no === w.bus);
              return (
                <div
                  key={`${w.bus}-${w.program.name}-${idx}`}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
                    w.due
                      ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-xs'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">{w.bus}</span>
                        {bus?.vehicle && (
                          <span className="bg-white/80 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700">
                            #{bus.vehicle}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                            w.due
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-slate-950'
                          }`}
                        >
                          {w.due ? t.serviceDue : t.warningNear}
                        </span>
                      </div>
                      <div className="font-black text-sm mt-1 text-slate-900">
                        {w.program.name}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs font-bold">
                    <div>
                      <span className="text-slate-600">Current: </span>
                      <span className="text-rose-700 font-black">{fmt(w.km)} KM</span>
                      <span className="text-slate-400"> / {fmt(w.w)} KM</span>
                    </div>
                    <button
                      onClick={() => onNavigate('maintenance', w.bus, w.program.name)}
                      className="flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs transition active:scale-95"
                    >
                      <Wrench className="w-3 h-3 text-blue-700" />
                      <span>{lang === 'gu' ? 'સર્વિસ કરો' : 'Service'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Entries Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-slate-900">
              {t.recentEntries}
            </h3>
          </div>
          <button
            onClick={() => onNavigate('entry')}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
          >
            <span>{lang === 'gu' ? 'બધી એન્ટ્રીઓ જુઓ' : 'View All'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentEntries.length === 0 ? (
          <div className="text-center py-8 text-slate-400 font-semibold text-sm">
            {t.noEntries}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">{t.date}</th>
                  <th className="py-2.5 px-3">{t.busNo}</th>
                  <th className="py-2.5 px-3">{t.vehicleNo}</th>
                  <th className="py-2.5 px-3">{t.dailyKm}</th>
                  <th className="py-2.5 px-3">{t.make}</th>
                  <th className="py-2.5 px-3">{t.remark}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 font-semibold">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-900 font-bold">
                      {e.date}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-black text-blue-900">
                      {e.bus}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                      {e.vehicle || '—'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-black text-emerald-700">
                      {fmt(e.km)} KM
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                      <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded">
                        {e.make || 'TATA'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-[200px] truncate">
                      {e.remark || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
