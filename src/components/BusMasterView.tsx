import React, { useState } from 'react';
import { Bus, Plus, Trash2 } from 'lucide-react';
import { AppDatabase, Bus as BusType } from '../types';
import { Language, translations } from '../utils/i18n';

interface BusMasterViewProps {
  db: AppDatabase;
  onUpdateDb: (updater: (prev: AppDatabase) => AppDatabase) => void;
  lang: Language;
}

export const BusMasterView: React.FC<BusMasterViewProps> = ({
  db,
  onUpdateDb,
  lang,
}) => {
  const t = translations[lang];

  const [newNo, setNewNo] = useState('');
  const [newVehicle, setNewVehicle] = useState('');
  const [newMake, setNewMake] = useState<'TATA' | 'LEYLAND' | 'OTHER'>('TATA');
  const [toast, setToast] = useState('');

  const handleAddBus = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNo = newNo.trim().toUpperCase();
    if (!cleanNo) return;

    if (db.buses.some((b) => b.no.toUpperCase() === cleanNo)) {
      alert(lang === 'gu' ? 'આ બસ નંબર પહેલેથી છે.' : 'This bus number already exists.');
      return;
    }

    const newBusObj: BusType = {
      no: cleanNo,
      vehicle: newVehicle.trim(),
      make: newMake,
    };

    onUpdateDb((prev) => ({
      ...prev,
      buses: [...prev.buses, newBusObj],
    }));

    setNewNo('');
    setNewVehicle('');
    setToast(
      lang === 'gu'
        ? `બસ ${cleanNo} ઉમેરાઈ ગઈ.`
        : `Bus ${cleanNo} added successfully.`
    );
    setTimeout(() => setToast(''), 3000);
  };

  const handleRemoveBus = (busNo: string) => {
    const confirmMsg =
      lang === 'gu'
        ? `શું તમે ${busNo} બસ અને તેની બધી Entries/Service History કાઢી નાખવા માંગો છો?`
        : `Delete ${busNo} and all its associated entries/service history?`;

    if (!window.confirm(confirmMsg)) return;

    onUpdateDb((prev) => ({
      ...prev,
      buses: prev.buses.filter((b) => b.no !== busNo),
      entries: prev.entries.filter((e) => e.bus !== busNo),
      services: prev.services.filter((s) => s.bus !== busNo),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl md:text-2xl font-black text-slate-900">
          {t.busMasterTitle}
        </h2>
        <p className="text-xs md:text-sm text-slate-600 mt-1">
          {lang === 'gu'
            ? 'ડેપોમાં નવી બસ ઉમેરો, વાહન નંબર લિંક કરો અથવા જૂની બસ મેનેજ કરો.'
            : 'Add, update, or remove fleet buses and their chassis/vehicle IDs.'}
        </p>
      </div>

      {toast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3.5 rounded-2xl text-sm font-bold shadow-sm">
          {toast}
        </div>
      )}

      {/* Add Bus Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-900" />
          <span>{t.addBusTitle}</span>
        </h3>

        <form
          onSubmit={handleAddBus}
          className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {t.busNo} *
            </label>
            <input
              type="text"
              placeholder={t.busNoPlaceholder}
              value={newNo}
              onChange={(e) => setNewNo(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {t.vehicleNo}
            </label>
            <input
              type="text"
              placeholder={t.vehicleNoPlaceholder}
              value={newVehicle}
              onChange={(e) => setNewVehicle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {t.make}
            </label>
            <select
              value={newMake}
              onChange={(e) => setNewMake(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="TATA">TATA</option>
              <option value="LEYLAND">LEYLAND</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-black px-5 py-2.5 rounded-xl text-sm shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addBusBtn}</span>
          </button>
        </form>
      </div>

      {/* Bus Fleet Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
          <Bus className="w-5 h-5 text-blue-900" />
          <span>{lang === 'gu' ? 'ડેપો બસ યાદી' : 'Depot Bus Fleet Master'}</span>
          <span className="text-xs bg-slate-100 text-slate-700 font-black px-2 py-0.5 rounded-full">
            {db.buses.length}
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {db.buses.map((b) => {
            const entryCount = db.entries.filter((e) => e.bus === b.no).length;
            const serviceCount = db.services.filter((s) => s.bus === b.no).length;

            return (
              <div
                key={b.no}
                className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-blue-400 transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-blue-950">
                      {b.no}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        b.make === 'TATA'
                          ? 'bg-blue-100 text-blue-900'
                          : b.make === 'LEYLAND'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {b.make}
                    </span>
                  </div>

                  {b.vehicle && (
                    <div className="text-xs font-bold text-slate-600 mt-1">
                      Vehicle #{b.vehicle}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3 text-xs font-semibold text-slate-500">
                    <div>
                      Logs:{' '}
                      <span className="text-slate-800 font-black">
                        {entryCount}
                      </span>
                    </div>
                    <div>
                      Services:{' '}
                      <span className="text-slate-800 font-black">
                        {serviceCount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200/80 flex justify-end">
                  <button
                    onClick={() => handleRemoveBus(b.no)}
                    className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.remove}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
