import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  Layers,
  Printer,
} from 'lucide-react';
import { AppDatabase } from '../types';
import {
  computeProgramKm,
  downloadFile,
  fmt,
  generateCsv,
  num,
} from '../utils/storage';
import { Language, translations } from '../utils/i18n';

interface SummaryViewProps {
  db: AppDatabase;
  lang: Language;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ db, lang }) => {
  const t = translations[lang];
  const today = new Date().toISOString().slice(0, 10);
  const firstDayOfMonth = today.slice(0, 8) + '01';

  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(today);
  const [selectedBus, setSelectedBus] = useState('__ALL__');

  // Filter entries
  const periodEntries = db.entries
    .filter(
      (e) =>
        e.date >= fromDate &&
        e.date <= toDate &&
        (selectedBus === '__ALL__' || e.bus === selectedBus)
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  // Period total daily KM
  const periodTotalKm = periodEntries.reduce((s, e) => s + num(e.km), 0);

  // Progressive KM (all entries up to toDate)
  const progressiveKm = db.entries
    .filter(
      (e) =>
        e.date <= toDate &&
        (selectedBus === '__ALL__' || e.bus === selectedBus)
    )
    .reduce((s, e) => s + num(e.km), 0);

  // Download CSV
  const handleDownloadCsv = () => {
    const rows: (string | number)[][] = [
      ['Date', 'Bus No', 'Vehicle No', 'Daily KM', 'Make', 'Remark'],
      ...periodEntries.map((e) => [
        e.date,
        e.bus,
        e.vehicle || '',
        e.km,
        e.make || '',
        e.remark || '',
      ]),
    ];
    const csvContent = '\uFEFF' + generateCsv(rows);
    downloadFile(
      `GSRTC_Summary_${fromDate}_to_${toDate}.csv`,
      csvContent,
      'text/csv;charset=utf-8'
    );
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  const busesToCalculate =
    selectedBus === '__ALL__'
      ? db.buses.map((b) => b.no)
      : [selectedBus];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl md:text-2xl font-black text-slate-900">
          {t.summaryTitle}
        </h2>
        <p className="text-xs md:text-sm text-slate-600 mt-1">
          {lang === 'gu'
            ? 'તારીખથી તારીખ સુધીના KM, દૈનિક લોગ્સ અને પ્રોગ્રામ સ્ટેટસની વિગત.'
            : 'Date range odometer audit, progressive distances, and program statuses.'}
        </p>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {t.fromDate}
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {t.toDate}
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {t.busNo}
            </label>
            <select
              value={selectedBus}
              onChange={(e) => setSelectedBus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="__ALL__">
                {lang === 'gu' ? 'બધી બસો (All Buses)' : 'All Buses'}
              </option>
              {db.buses.map((b) => (
                <option key={b.no} value={b.no}>
                  {b.no} {b.vehicle ? `(#${b.vehicle})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-4">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white font-black px-4 py-2 rounded-xl text-xs shadow-md transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.downloadCsv}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs border border-slate-300 transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.print}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t.periodTotalKm}
          </span>
          <div className="text-2xl md:text-3xl font-black text-blue-950 mt-1">
            {fmt(periodTotalKm)}{' '}
            <span className="text-xs font-bold text-slate-500">KM</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-1">
            {fromDate} ~ {toDate}
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t.monthlyKm}
          </span>
          <div className="text-2xl md:text-3xl font-black text-indigo-900 mt-1">
            {fmt(periodTotalKm)}{' '}
            <span className="text-xs font-bold text-slate-500">KM</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-1">
            {periodEntries.length} entries recorded
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t.progressiveKm}
          </span>
          <div className="text-2xl md:text-3xl font-black text-emerald-800 mt-1">
            {fmt(progressiveKm)}{' '}
            <span className="text-xs font-bold text-slate-500">KM</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-1">
            Total lifetime distance up to {toDate}
          </div>
        </div>
      </div>

      {/* Program-wise status cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-900" />
          <span>{t.programWiseKm}</span>
          <span className="text-xs text-slate-500 font-bold">
            ({selectedBus === '__ALL__' ? 'All Fleet Buses' : selectedBus})
          </span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {db.programs.map((p) => {
            const totKm = busesToCalculate.reduce(
              (sum, b) => sum + computeProgramKm(b, p.name, db),
              0
            );
            return (
              <div
                key={p.name}
                className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80"
              >
                <div className="text-xs font-black text-slate-800 truncate" title={p.name}>
                  {p.name}
                </div>
                <div className="text-lg font-black text-blue-900 mt-1">
                  {fmt(totKm)}{' '}
                  <span className="text-[10px] font-bold text-slate-500">KM</span>
                </div>
                <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  Threshold: {fmt(p.warning)} KM
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-base font-black text-slate-900 mb-3">
          {lang === 'gu' ? 'તારીખવાર રેકોર્ડ્સ (Date-wise Records)' : 'Filtered Date Records'}
        </h3>

        {periodEntries.length === 0 ? (
          <div className="text-center py-8 text-slate-400 font-semibold text-sm">
            {lang === 'gu'
              ? 'પસંદ કરેલ ગાળામાં કોઈ રેકોર્ડ નથી.'
              : 'No records found for this range.'}
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
                {periodEntries.map((e) => (
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
