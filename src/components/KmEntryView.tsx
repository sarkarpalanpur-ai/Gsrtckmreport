import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { AppDatabase, KmEntry } from '../types';
import { fmt, num } from '../utils/storage';
import { Language, translations } from '../utils/i18n';

interface KmEntryViewProps {
  db: AppDatabase;
  onUpdateDb: (updater: (prev: AppDatabase) => AppDatabase) => void;
  lang: Language;
  onNavigateToExcel?: () => void;
}

export const KmEntryView: React.FC<KmEntryViewProps> = ({
  db,
  onUpdateDb,
  lang,
  onNavigateToExcel,
}) => {
  const t = translations[lang];
  const today = new Date().toISOString().slice(0, 10);

  // Form states
  const [date, setDate] = useState(today);
  const [selectedBus, setSelectedBus] = useState(db.buses[0]?.no || '');
  const [vehicleNo, setVehicleNo] = useState(db.buses[0]?.vehicle || '');
  const [dailyKm, setDailyKm] = useState<string>('');
  const [make, setMake] = useState<string>(db.buses[0]?.make || 'TATA');
  const [remark, setRemark] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Filter states
  const [filterBus, setFilterBus] = useState('__ALL__');
  const [filterDate, setFilterDate] = useState('');

  // Handle bus selection change
  const handleBusChange = (busNo: string) => {
    setSelectedBus(busNo);
    const bus = db.buses.find((b) => b.no === busNo);
    if (bus) {
      setVehicleNo(bus.vehicle || '');
      setMake(bus.make || 'TATA');
    }
  };

  // Quick chip add
  const handleChipKm = (val: number) => {
    setDailyKm(String(val));
  };

  // Save Entry
  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const kmVal = num(dailyKm);

    if (!date || !selectedBus || kmVal <= 0) {
      alert(lang === 'gu' ? 'કૃપા કરીને તારીખ, બસ અને સાચા Daily KM ભરો.' : 'Please enter valid Date, Bus and Daily KM.');
      return;
    }

    const busObj = db.buses.find((b) => b.no === selectedBus);
    const newEntry: KmEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date,
      bus: selectedBus,
      vehicle: vehicleNo.trim() || busObj?.vehicle || '',
      km: kmVal,
      make: make || busObj?.make || 'TATA',
      remark: remark.trim(),
    };

    onUpdateDb((prev) => ({
      ...prev,
      entries: [newEntry, ...prev.entries],
    }));

    setDailyKm('');
    setRemark('');
    setSuccessToast(
      lang === 'gu'
        ? `KM Entry સાચવી! ${selectedBus} માં ${fmt(kmVal)} KM ઉમેરાયા.`
        : `KM Entry Saved! Added ${fmt(kmVal)} KM to ${selectedBus}.`
    );

    setTimeout(() => {
      setSuccessToast('');
    }, 4000);
  };

  // Clear Form
  const handleClear = () => {
    setDailyKm('');
    setRemark('');
  };

  // Delete Entry
  const handleDeleteEntry = (id: string) => {
    const confirmMsg =
      lang === 'gu'
        ? 'શું તમે આ KM Entry ખરેખર Delete કરવા માંગો છો?'
        : 'Are you sure you want to delete this KM Entry?';
    if (window.confirm(confirmMsg)) {
      onUpdateDb((prev) => ({
        ...prev,
        entries: prev.entries.filter((e) => e.id !== id),
      }));
    }
  };

  // Filtered entries
  const filteredEntries = db.entries
    .filter((e) => {
      if (filterBus !== '__ALL__' && e.bus !== filterBus) return false;
      if (filterDate && e.date !== filterDate) return false;
      return true;
    })
    .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));

  return (
    <div className="space-y-6">
      {/* Page Title & Excel Import Quick Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            {t.dateWiseEntryTitle}
          </h2>
          <p className="text-xs md:text-sm text-slate-600 mt-1">
            {t.entryHelper}
          </p>
        </div>

        {onNavigateToExcel && (
          <button
            type="button"
            onClick={onNavigateToExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer shrink-0 border border-emerald-400"
          >
            <span>📁 Excel Import (Date to Date & Programs)</span>
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3.5 rounded-2xl flex items-center gap-2.5 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-bold">{successToast}</span>
        </div>
      )}

      {/* Main Entry Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <form onSubmit={handleSaveEntry} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                {t.date} *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Bus No */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                {t.busNo} *
              </label>
              <select
                value={selectedBus}
                onChange={(e) => handleBusChange(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {db.buses.length === 0 && (
                  <option value="">{lang === 'gu' ? 'પહેલા બસ ઉમેરો' : 'Add bus first'}</option>
                )}
                {db.buses.map((b) => (
                  <option key={b.no} value={b.no}>
                    {b.no} {b.vehicle ? `(#${b.vehicle})` : ''} - {b.make}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle No */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                {t.vehicleNo}
              </label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                placeholder="દા.ત. 3868"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* Daily KM */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                {t.dailyKm} *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={dailyKm}
                onChange={(e) => setDailyKm(e.target.value)}
                placeholder="320.5"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-emerald-800 text-lg"
              />
              {/* Quick Chips for fast mobile entry */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[150, 250, 300, 350, 400, 480].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleChipKm(k)}
                    className="text-[11px] font-bold bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 px-2 py-0.5 rounded-lg border border-slate-200 transition active:scale-95 cursor-pointer"
                  >
                    +{k}
                  </button>
                ))}
              </div>
            </div>

            {/* Make */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                {t.make}
              </label>
              <select
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="TATA">TATA</option>
                <option value="LEYLAND">LEYLAND</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            {/* Remark */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                {t.remark}
              </label>
              <input
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder={lang === 'gu' ? 'રૂટ નોંધ અથવા વિગત' : 'Route or notes'}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-black px-6 py-2.5 rounded-xl text-sm shadow-md transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.saveKmEntry}</span>
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm border border-slate-200 transition active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.clear}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter and Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-900" />
            <h3 className="text-base font-black text-slate-900">
              {lang === 'gu' ? 'દૈનિક KM એન્ટ્રીઓની યાદી' : 'KM Entry Records Log'}
            </h3>
            <span className="text-xs bg-slate-100 text-slate-700 font-black px-2 py-0.5 rounded-full">
              {filteredEntries.length}
            </span>
          </div>

          {/* Filter Inputs */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterBus}
              onChange={(e) => setFilterBus(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-xs font-bold rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-1 focus:ring-blue-500"
            >
              <option value="__ALL__">{lang === 'gu' ? 'બધી બસો (All Buses)' : 'All Buses'}</option>
              {db.buses.map((b) => (
                <option key={b.no} value={b.no}>
                  {b.no}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-xs font-bold rounded-lg px-2 py-1 text-slate-800 focus:ring-1 focus:ring-blue-500"
            />

            {(filterBus !== '__ALL__' || filterDate) && (
              <button
                onClick={() => {
                  setFilterBus('__ALL__');
                  setFilterDate('');
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-semibold text-sm">
            {lang === 'gu'
              ? 'પસંદ કરેલા ફિલ્ટર મુજબ કોઈ એન્ટ્રી નથી.'
              : 'No entries found matching filters.'}
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
                  <th className="py-2.5 px-3 text-right">{t.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 font-semibold">
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
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteEntry(e.id)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 transition"
                        title={t.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
