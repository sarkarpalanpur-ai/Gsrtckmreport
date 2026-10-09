import * as XLSX from 'xlsx';
import { AppDatabase, Bus, KmEntry, Program, ProgramStatus, ServiceRecord } from '../types';

export const STORAGE_KEY = 'GSRTC_PROPAR_KM_REGISTER_V2';

export const DEFAULT_PROGRAMS: Program[] = [
  { name: 'DOCKING KM', warning: 40000 },
  {
    name: 'ENGINE OIL CHANGE KM',
    warning: 40000,
    makeWarnings: { TATA: 40000, LEYLAND: 80000 },
  },
  { name: 'VEH. PROG. KM', warning: 40000 },
  { name: 'BREATHER CARTRIDGE KM', warning: 40000 },
  { name: 'FUEL FILTER CUM WATER SEP KM', warning: 40000 },
  { name: 'UREA FILTER', warning: 40000 },
  { name: 'PRI. AIR FILTER', warning: 40000 },
  { name: 'SEC. AIR FILTER', warning: 40000 },
  { name: 'GEAR OIL CHANGE', warning: 40000 },
  { name: 'DIFF. OIL CHANGE', warning: 40000 },
  { name: 'POWER STEERING OIL KM', warning: 40000 },
  { name: 'RADIATOR COOLANT', warning: 40000 },
  { name: 'SERVICE KIT DOSING KM', warning: 40000 },
];

export const INITIAL_BUSES: Bus[] = [
  { no: 'GJ-18-Z-3868', vehicle: '3868', make: 'TATA' },
  { no: 'GJ-18-Z-4120', vehicle: '4120', make: 'LEYLAND' },
  { no: 'GJ-18-Z-5092', vehicle: '5092', make: 'TATA' },
  { no: 'GJ-18-Z-6215', vehicle: '6215', make: 'LEYLAND' },
];

export function getDefaultDatabase(): AppDatabase {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  return {
    buses: [...INITIAL_BUSES],
    programs: DEFAULT_PROGRAMS.map((p) => ({ ...p })),
    entries: [
      {
        id: 'init-1',
        date: yesterday,
        bus: 'GJ-18-Z-3868',
        vehicle: '3868',
        km: 320.5,
        make: 'TATA',
        remark: 'Palanpur - Ahmedabad Route',
      },
      {
        id: 'init-2',
        date: yesterday,
        bus: 'GJ-18-Z-4120',
        vehicle: '4120',
        km: 410.0,
        make: 'LEYLAND',
        remark: 'Surat Express',
      },
      {
        id: 'init-3',
        date: today,
        bus: 'GJ-18-Z-3868',
        vehicle: '3868',
        km: 295.0,
        make: 'TATA',
        remark: 'Morning Shift',
      },
    ],
    services: [],
    bases: {
      'GJ-18-Z-3868||ENGINE OIL CHANGE KM': 36500,
      'GJ-18-Z-3868||PRI. AIR FILTER': 39100,
      'GJ-18-Z-4120||ENGINE OIL CHANGE KM': 74000,
    },
  };
}

export function loadDatabase(): AppDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.buses)) {
        return {
          buses: parsed.buses || [],
          programs: parsed.programs?.length ? parsed.programs : DEFAULT_PROGRAMS.map((p) => ({ ...p })),
          entries: parsed.entries || [],
          services: parsed.services || [],
          bases: parsed.bases || {},
        };
      }
    }
  } catch (err) {
    console.error('Failed to load database from localStorage:', err);
  }
  return getDefaultDatabase();
}

export function saveDatabase(db: AppDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

export function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function fmt(n: number): string {
  return num(n).toLocaleString('en-IN', { maximumFractionDigits: 1 });
}

export function pKey(busNo: string, programName: string): string {
  return `${busNo}||${programName}`;
}

export function warningFor(busNo: string, p: Program, buses: Bus[]): number {
  const b = buses.find((x) => x.no === busNo);
  if (p.makeWarnings && b && p.makeWarnings[b.make] != null) {
    return num(p.makeWarnings[b.make]);
  }
  return num(p.warning);
}

export function computeProgramKm(busNo: string, programName: string, db: AppDatabase): number {
  const key = pKey(busNo, programName);
  const busServices = db.services
    .filter((s) => s.bus === busNo && s.program === programName)
    .sort((a, b) => b.date.localeCompare(a.date));

  const lastService = busServices[0];
  const base = lastService ? 0 : num(db.bases[key]);

  const addedKm = db.entries
    .filter((e) => e.bus === busNo && (!lastService || e.date > lastService.date))
    .reduce((sum, e) => sum + num(e.km), 0);

  return base + addedKm;
}

export function getProgramStatus(busNo: string, p: Program, db: AppDatabase): ProgramStatus {
  const km = computeProgramKm(busNo, p.name, db);
  const w = warningFor(busNo, p, db.buses);
  const pct = w > 0 ? (km / w) * 100 : 0;
  return {
    km,
    warningKm: w,
    isNear: w > 0 && km >= w * 0.9,
    isDue: w > 0 && km >= w,
    percentage: Math.min(pct, 100),
  };
}

export function parseExcelDate(v: any): string {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === 'number' && (XLSX as any).SSF) {
    const d = (XLSX as any).SSF.parse_date_code(v);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
  }
  const s = String(v ?? '').trim();
  if (!s) return '';
  // DD/MM/YYYY or DD-MM-YYYY
  const m1 = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (m1) {
    let y = +m1[3];
    if (y < 100) y += 2000;
    return `${y}-${String(+m1[2]).padStart(2, '0')}-${String(+m1[1]).padStart(2, '0')}`;
  }
  // YYYY-MM-DD
  const m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m2) {
    return `${m2[1]}-${String(+m2[2]).padStart(2, '0')}-${String(+m2[3]).padStart(2, '0')}`;
  }
  return '';
}

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

export function generateCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const val = String(cell ?? '');
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\r\n');
}
