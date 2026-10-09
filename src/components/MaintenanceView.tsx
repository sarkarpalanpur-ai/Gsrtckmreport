import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle,
  Clock,
  RotateCcw,
  Save,
  Trash2,
  Wrench,
} from 'lucide-react';
import { AppDatabase, ServiceRecord } from '../types';
import {
  computeProgramKm,
  fmt,
  num,
  warningFor,
} from '../utils/storage';
import { Language, translations } from '../utils/i18n';

interface MaintenanceViewProps {
  db: AppDatabase;
  onUpdateDb: (updater: (prev: AppDatabase) => AppDatabase) => void;
  lang: Language;
  preselectedBus?: string;
  preselectedProgram?: string;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  db,
  onUpdateDb,
  lang,
  preselectedBus,
  preselectedProgram,
}) => {
  const t = translations[lang];
  const today = new Date().toISOString().slice(0, 10);

  const [bus, setBus] = useState<string>(
    preselectedBus || db.buses[0]?.no || ''
  );
  const [progName, setProgName] = useState<string>(
    preselectedProgram || db.programs[0]?.name || ''
  );

  const [serviceDate, setServiceDate] = useState(today);
  const [serviceKm, setServiceKm] = useState('');
  const [serviceRemark, setServiceRemark] = useState('');
  const [warningInput, setWarningInput] = useState('');
  const [notification, setNotification] = useState('');

  const currentProgram = db.programs.find((p) => p.name === progName);
  const currKm = bus && progName ? computeProgramKm(bus, progName, db) : 0;
  const currWarn =
    bus && currentProgram ? warningFor(bus, currentProgram, db.buses) : 40000;

  // Sync warningInput when program changes
  React.useEffect(() => {
    if (currWarn) {
      setWarningInput(String(currWarn));
    }
  }, [bus, progName, currWarn]);

  // Handle Save Warning Limit
  const handleSaveWarningLimit = () => {
    if (!bus || !currentProgram) {
      alert(lang === 'gu' ? 'બસ અને પ્રોગ્રામ પસંદ કરો.' : 'Select bus and program.');
      return;
    }
    const wVal = num(warningInput);
    if (wVal <= 0) {
      alert(lang === 'gu' ? 'સાચી Warning KM લખો.' : 'Enter valid warning KM.');
      return;
    }

    const currentBusObj = db.buses.find((b) => b.no === bus);

    onUpdateDb((prev) => {
      const updatedPrograms = prev.programs.map((p) => {
        if (p.name === progName) {
          if (p.makeWarnings && currentBusObj) {
            return {
              ...p,
              makeWarnings: {
                ...p.makeWarnings,
                [currentBusObj.make]: wVal,
              },
            };
          }
          return {
            ...p,
            warning: wVal,
          };
        }
        return p;
      });
      return { ...prev, programs: updatedPrograms };
    });

    setNotification(lang === 'gu' ? 'Warning KM સેવ થઈ.' : 'Warning KM updated.');
    setTimeout(() => setNotification(''), 3000);
  };

  // Handle Service Done & Reset KM
  const handleServiceDone = () => {
    if (!bus || !progName || !serviceDate) {
      alert(
        lang === 'gu'
          ? 'કૃપા કરીને બસ, પ્રોગ્રામ અને સર્વિસ તારીખ પસંદ કરો.'
          : 'Please select Bus, Program, and Service Date.'
      );
      return;
    }

    const confirmMsg =
      lang === 'gu'
        ? `શું તમે ${bus} માટે '${progName}' ની સર્વિસ પૂર્ણ કરી KM શૂન્ય (0) થી Reset કરવા માંગો છો?`
        : `Confirm service completion and reset current KM to 0 for ${bus} - ${progName}?`;

    if (!window.confirm(confirmMsg)) return;

    const newRecord: ServiceRecord = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      bus,
      program: progName,
      date: serviceDate,
      serviceKm: serviceKm ? num(serviceKm) : undefined,
      remark: serviceRemark.trim(),
    };

    onUpdateDb((prev) => ({
      ...prev,
      services: [newRecord, ...prev.services],
    }));

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {}

    setServiceKm('');
    setServiceRemark('');
    setNotification(
      lang === 'gu'
        ? `સર્વિસ રેકોર્ડ સેવ થયો! '${progName}' નું KM રીસેટ થયું.`
        : `Service saved! KM reset to 0 for '${progName}'.`
    );
    setTimeout(() => setNotification(''), 4000);
  };

  // Delete service history entry
  const handleDeleteService = (id: string) => {
    const confirmMsg =
      lang === 'gu'
        ? 'આ સર્વિસ રેકોર્ડ કાઢી નાખવો છે?'
        : 'Delete this service record?';
    if (window.confirm(confirmMsg)) {
      onUpdateDb((prev) => ({
        ...prev,
        services: prev.services.filter((s) => s.id !== id),
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl md:text-2xl font-black text-slate-900">
          {t.maintTitle}
        </h2>
        <p className="text-xs md:text-sm text-slate-600 mt-1">
          {t.maintHelper}
        </p>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3.5 rounded-2xl flex items-center gap-2.5 shadow-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-bold">{notification}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Bus */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {t.busNo} *
            </label>
            <select
              value={bus}
              onChange={(e) => setBus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              {db.buses.map((b) => (
                <option key={b.no} value={b.no}>
                  {b.no} {b.vehicle ? `(#${b.vehicle})` : ''} - {b.make}
                </option>
              ))}
            </select>
          </div>

          {/* Program */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Program *
            </label>
            <select
              value={progName}
              onChange={(e) => setProgName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              {db.programs.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Current Program KM (Readonly) */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {t.currentProgramKm}
            </label>
            <div className="w-full bg-blue-50/70 border border-blue-200 rounded-xl px-3.5 py-2.5 text-base font-black text-blue-950 flex items-center justify-between">
              <span>{fmt(currKm)} KM</span>
              <span className="text-[10px] bg-blue-200 text-blue-900 font-black px-2 py-0.5 rounded">
                Live ODO
              </span>
            </div>
          </div>

          {/* Warning KM */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {t.warningKm}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={warningInput}
                onChange={(e) => setWarningInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleSaveWarningLimit}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 whitespace-nowrap active:scale-95"
              >
                Save
              </button>
            </div>
          </div>

          {/* Service Date */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {t.serviceDate} *
            </label>
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Service KM (Optional) */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {t.serviceKmOdo}
            </label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 142500"
              value={serviceKm}
              onChange={(e) => setServiceKm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Remark */}
        <div>
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
            {t.serviceRemark}
          </label>
          <input
            type="text"
            placeholder={
              lang === 'gu'
                ? 'દા.ત. Castrol 15W40 Engine Oil Changed & Oil Filter Replaced'
                : 'e.g. Engine Oil 15W40 & filter replaced'
            }
            value={serviceRemark}
            onChange={(e) => setServiceRemark(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-semibold">
            {t.resetNote}
          </p>
          <button
            type="button"
            onClick={handleServiceDone}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl text-sm shadow-md transition active:scale-95 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{t.saveServiceBtn}</span>
          </button>
        </div>
      </div>

      {/* Service History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-900" />
          <h3 className="text-base font-black text-slate-900">
            {t.serviceHistory}
          </h3>
          <span className="text-xs bg-slate-100 text-slate-700 font-black px-2 py-0.5 rounded-full">
            {db.services.length}
          </span>
        </div>

        {db.services.length === 0 ? (
          <div className="text-center py-8 text-slate-400 font-semibold text-sm">
            {lang === 'gu'
              ? 'હજુ સુધી કોઈ Service Record દાખલ થયો નથી.'
              : 'No maintenance records logged yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">{t.date}</th>
                  <th className="py-2.5 px-3">{t.busNo}</th>
                  <th className="py-2.5 px-3">Program</th>
                  <th className="py-2.5 px-3">Service ODO</th>
                  <th className="py-2.5 px-3">{t.remark}</th>
                  <th className="py-2.5 px-3 text-right">{t.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 font-semibold">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-900 font-bold">
                      {s.date}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-black text-blue-900">
                      {s.bus}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-black text-slate-800">
                      {s.program}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                      {s.serviceKm ? `${fmt(s.serviceKm)} KM` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-[200px] truncate">
                      {s.remark || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteService(s.id)}
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
