import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bus,
  CheckCircle,
  Edit3,
  Layers,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { AppDatabase, Program } from '../types';
import { fmt, getProgramStatus, num, warningFor } from '../utils/storage';
import { Language, translations } from '../utils/i18n';

interface ProgramsViewProps {
  db: AppDatabase;
  onUpdateDb: (updater: (prev: AppDatabase) => AppDatabase) => void;
  lang: Language;
  initialBus?: string;
}

export const ProgramsView: React.FC<ProgramsViewProps> = ({
  db,
  onUpdateDb,
  lang,
  initialBus,
}) => {
  const t = translations[lang];

  const [selectedBus, setSelectedBus] = useState<string>(
    initialBus || db.buses[0]?.no || ''
  );
  const [search, setSearch] = useState('');

  // Add new program state
  const [newProgName, setNewProgName] = useState('');
  const [newProgWarning, setNewProgWarning] = useState('40000');

  // Edit warning modal state
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [editWarningVal, setEditWarningVal] = useState<string>('');

  const currentBusObj = db.buses.find((b) => b.no === selectedBus);

  // Filter programs by search
  const filteredPrograms = db.programs.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Add Program
  const handleAddProgram = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProgName.trim().toUpperCase();
    if (!name) return;

    if (db.programs.some((p) => p.name === name)) {
      alert(lang === 'gu' ? 'આ Program પહેલેથી છે.' : 'This program already exists.');
      return;
    }

    const warningKm = num(newProgWarning) || 40000;
    const newProg: Program = {
      name,
      warning: warningKm,
    };

    onUpdateDb((prev) => ({
      ...prev,
      programs: [...prev.programs, newProg],
    }));

    setNewProgName('');
    setNewProgWarning('40000');
  };

  // Remove Program
  const handleRemoveProgram = (progName: string) => {
    const confirmMsg =
      lang === 'gu'
        ? `${progName} પ્રોગ્રામ કાઢી નાખવો છે?`
        : `Are you sure you want to remove ${progName}?`;
    if (window.confirm(confirmMsg)) {
      onUpdateDb((prev) => ({
        ...prev,
        programs: prev.programs.filter((p) => p.name !== progName),
      }));
    }
  };

  // Open edit warning
  const openEditWarning = (p: Program) => {
    setEditingProgram(p);
    const currWarn = warningFor(selectedBus, p, db.buses);
    setEditWarningVal(String(currWarn));
  };

  // Save warning
  const handleSaveWarning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;

    const newW = num(editWarningVal);
    if (newW <= 0) {
      alert(lang === 'gu' ? 'કૃપા કરીને માન્ય Warning KM લખો.' : 'Please enter a valid warning KM.');
      return;
    }

    onUpdateDb((prev) => {
      const updatedPrograms = prev.programs.map((p) => {
        if (p.name === editingProgram.name) {
          if (p.makeWarnings && currentBusObj) {
            return {
              ...p,
              makeWarnings: {
                ...p.makeWarnings,
                [currentBusObj.make]: newW,
              },
            };
          }
          return {
            ...p,
            warning: newW,
          };
        }
        return p;
      });
      return {
        ...prev,
        programs: updatedPrograms,
      };
    });

    setEditingProgram(null);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl md:text-2xl font-black text-slate-900">
          {t.allProgramsTitle}
        </h2>
        <p className="text-xs md:text-sm text-slate-600 mt-1">
          {t.programHelper}
        </p>
      </div>

      {/* Selector & Search Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {t.selectBus}
            </label>
            <div className="flex items-center gap-2">
              <Bus className="w-5 h-5 text-blue-900 shrink-0" />
              <select
                value={selectedBus}
                onChange={(e) => setSelectedBus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {db.buses.map((b) => (
                  <option key={b.no} value={b.no}>
                    {b.no} {b.vehicle ? `(#${b.vehicle})` : ''} - {b.make}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {t.searchProgram}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="દા.ત. ENGINE OIL, FILTER..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Program Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredPrograms.map((p) => {
          const st = selectedBus
            ? getProgramStatus(selectedBus, p, db)
            : { km: 0, warningKm: p.warning, isNear: false, isDue: false, percentage: 0 };

          return (
            <div
              key={p.name}
              className={`bg-white rounded-2xl border p-4.5 flex flex-col justify-between shadow-xs transition ${
                st.isDue
                  ? 'border-rose-400 bg-rose-50/30'
                  : st.isNear
                  ? 'border-amber-400 bg-amber-50/20'
                  : 'border-slate-200 hover:border-blue-400'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-black text-sm md:text-base text-slate-900 leading-snug">
                    {p.name}
                  </h3>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${
                      st.isDue
                        ? 'bg-rose-600 text-white animate-pulse'
                        : st.isNear
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {st.isDue ? t.serviceDue : st.isNear ? t.warningNear : t.statusOk}
                  </span>
                </div>

                <div className="text-[11px] font-bold text-slate-500 mt-1">
                  Bus: <span className="text-blue-900 font-black">{selectedBus || '—'}</span>
                  {currentBusObj?.make && ` (${currentBusObj.make})`}
                </div>

                {/* KM Odo Number */}
                <div className="mt-3">
                  <div
                    className={`text-2xl md:text-3xl font-black ${
                      st.isDue
                        ? 'text-rose-700'
                        : st.isNear
                        ? 'text-amber-700'
                        : 'text-blue-950'
                    }`}
                  >
                    {fmt(st.km)}{' '}
                    <span className="text-xs font-bold text-slate-500">KM</span>
                  </div>

                  <div className="text-xs font-bold text-slate-500 mt-0.5">
                    Warning Threshold:{' '}
                    <span className="text-slate-800 font-black">
                      {fmt(st.warningKm)} KM
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3 overflow-hidden border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      st.isDue
                        ? 'bg-rose-600'
                        : st.isNear
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(st.percentage, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-right font-black text-slate-500 mt-1">
                  {st.percentage.toFixed(0)}% utilized
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100">
                <button
                  onClick={() => openEditWarning(p)}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-800 hover:text-blue-950 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition active:scale-95"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t.editWarning}</span>
                </button>
                <button
                  onClick={() => handleRemoveProgram(p.name)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                  title={t.remove}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Program Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-900" />
          <span>{t.addNewProgram}</span>
        </h3>
        <form
          onSubmit={handleAddProgram}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {t.programName} *
            </label>
            <input
              type="text"
              value={newProgName}
              onChange={(e) => setNewProgName(e.target.value)}
              placeholder="દા.ત. CLUTCH PLATE CHANGE"
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {t.defaultWarningKm} *
            </label>
            <input
              type="number"
              min="0"
              value={newProgWarning}
              onChange={(e) => setNewProgWarning(e.target.value)}
              placeholder="40000"
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-black px-5 py-2.5 rounded-xl text-sm shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addProgramBtn}</span>
          </button>
        </form>
      </div>

      {/* Edit Warning Modal */}
      {editingProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl text-slate-900">
            <h3 className="font-black text-base text-blue-950">
              {lang === 'gu' ? 'Warning KM બદલો' : 'Edit Warning Threshold'}
            </h3>
            <p className="text-xs font-bold text-slate-600 mt-1">
              Program: <span className="text-blue-900">{editingProgram.name}</span>
            </p>
            <p className="text-xs font-bold text-slate-600">
              Bus: <span className="text-blue-900">{selectedBus}</span>
            </p>

            <form onSubmit={handleSaveWarning} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  New Warning KM
                </label>
                <input
                  type="number"
                  min="1"
                  value={editWarningVal}
                  onChange={(e) => setEditWarningVal(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProgram(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white shadow-md active:scale-95"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
