import * as XLSX from 'xlsx';
import { Bus, KmEntry, Program } from '../types';
import { num, parseExcelDate } from './storage';

export interface ParsedRow {
  sheet: string;
  bus: string;
  vehicle: string;
  make: 'TATA' | 'LEYLAND' | 'OTHER';
  date: string;
  dailyKm: number;
  programKms: Record<string, number>; // programName -> KM value in this row
  remark?: string;
}

export interface ProgramColumnMatch {
  columnIndex: number;
  headerName: string;
  matchedProgramName: string;
}

export interface WorkbookAnalysis {
  workbook: XLSX.WorkBook;
  sheetNames: string[];
  detectedBuses: { no: string; vehicle: string; make: 'TATA' | 'LEYLAND' | 'OTHER' }[];
  minDate: string;
  maxDate: string;
  totalRowsFound: number;
  detectedPrograms: string[];
  rows: ParsedRow[];
}

/**
 * Normalizes text for matching program names
 */
function cleanStr(s: any): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Fuzzy matches an Excel column header to a registered Program name
 */
export function matchProgramHeader(header: string, programs: Program[]): string | null {
  const c = cleanStr(header);
  if (!c || c === 'date' || c === 'dailykm' || c === 'km' || c === 'busno' || c === 'vehicleno' || c === 'remark') {
    return null;
  }

  // Exact or contains match in registered programs
  for (const p of programs) {
    const pc = cleanStr(p.name);
    if (c === pc || c.includes(pc) || pc.includes(c)) {
      return p.name;
    }
  }

  // Specific domain synonyms for GSRTC & IDMS
  if (c.includes('docking') || c.includes('dock') || c.includes('docking1') || c.includes('docking40000')) return 'DOCKING KM';
  if (c.includes('engineoil') || (c.includes('engine') && c.includes('oil')) || c.includes('engoil')) {
    return 'ENGINE OIL CHANGE KM';
  }
  if (c.includes('vehprog') || c.includes('vehicleprog')) return 'VEH. PROG. KM';
  if (c.includes('breather')) return 'BREATHER CARTRIDGE KM';
  if (c.includes('fuelfilter') || c.includes('watersep') || c.includes('dieselfilter')) {
    return 'FUEL FILTER CUM WATER SEP KM';
  }
  if (c.includes('urea') || c.includes('deffilter')) return 'UREA FILTER';
  if (c.includes('priair') || c.includes('primaryair') || (c.includes('airfilter') && !c.includes('sec') && !c.includes('second'))) {
    return 'PRI. AIR FILTER';
  }
  if (c.includes('secair') || c.includes('secondaryair') || c.includes('secondory')) return 'SEC. AIR FILTER';
  if (c.includes('gearoil') || c.includes('gear')) return 'GEAR OIL CHANGE';
  if (c.includes('diffoil') || c.includes('differencial') || c.includes('differential')) return 'DIFF. OIL CHANGE';
  if (c.includes('powersteering') || c.includes('steeringoil') || c.includes('steering')) {
    return 'POWER STEERING OIL KM';
  }
  if (c.includes('radiator') || c.includes('coolant')) return 'RADIATOR COOLANT';
  if (c.includes('dosing') || c.includes('servicekit') || c.includes('inletscreen') || c.includes('deftank')) return 'SERVICE KIT DOSING KM';
  if (c.includes('10day') || c.includes('tenday')) return '10 DAYS ACTIVITY';

  return null;
}

/**
 * Analyzes an Excel workbook and extracts date-wise rows, buses, and program KM columns
 */
export function analyzeWorkbook(wb: XLSX.WorkBook, existingPrograms: Program[]): WorkbookAnalysis {
  const allRows: ParsedRow[] = [];
  const detectedBusesMap: Map<string, { no: string; vehicle: string; make: 'TATA' | 'LEYLAND' | 'OTHER' }> = new Map();
  const detectedProgramsSet: Set<string> = new Set();

  let minDate = '';
  let maxDate = '';

  for (const sn of wb.SheetNames) {
    const ws = wb.Sheets[sn];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: true,
      defval: '',
    });

    if (!data.length) continue;

    let defaultBus = sn.trim();
    let defaultVehicle = '';
    let defaultMake: 'TATA' | 'LEYLAND' | 'OTHER' = 'TATA';

    // Check first 5 rows for vehicle number and make metadata
    for (let r = 0; r < Math.min(5, data.length); r++) {
      for (let c = 0; c < Math.min(10, (data[r] || []).length); c++) {
        const val = String(data[r][c] ?? '').trim();
        if (/VEH\.?\s*NO/i.test(val)) {
          const nextVal = String(data[r][c + 1] ?? '').trim();
          if (nextVal) defaultVehicle = nextVal;
        }
        if (/BUS\.?\s*NO/i.test(val)) {
          const nextVal = String(data[r][c + 1] ?? '').trim();
          if (nextVal) defaultBus = nextVal;
        }
        if (/LEYLAND/i.test(val)) defaultMake = 'LEYLAND';
        if (/TATA/i.test(val)) defaultMake = 'TATA';
      }
    }

    // Identify header row and map columns
    let headerRowIdx = -1;
    let dateCol = -1;
    let dailyKmCol = -1;
    let busCol = -1;
    let vehCol = -1;
    let makeCol = -1;
    let remarkCol = -1;
    const programColMatches: ProgramColumnMatch[] = [];

    for (let r = 0; r < Math.min(data.length, 18); r++) {
      const row = data[r] || [];
      let foundDate = -1;
      let foundKm = -1;

      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] ?? '').trim();
        const cleaned = cleanStr(val);

        if (cleaned === 'date' || cleaned.includes('date') || val.includes('તારીખ')) {
          foundDate = c;
        } else if (
          cleaned === 'dailykm' ||
          cleaned === 'km' ||
          cleaned === 'dailykms' ||
          cleaned === 'kmrun' ||
          val.includes('Daily KM') ||
          val.includes('આજના KM')
        ) {
          foundKm = c;
        } else if (cleaned === 'busno' || cleaned.includes('busno') || val.includes('બસ નંબર')) {
          busCol = c;
        } else if (cleaned === 'vehicleno' || cleaned.includes('vehicleno') || val.includes('વાહન નંબર')) {
          vehCol = c;
        } else if (cleaned === 'make' || cleaned === 'busmake') {
          makeCol = c;
        } else if (cleaned === 'remark' || cleaned === 'note' || val.includes('નોંધ')) {
          remarkCol = c;
        }
      }

      if (foundDate >= 0) {
        headerRowIdx = r;
        dateCol = foundDate;
        dailyKmCol = foundKm;

        // Check remaining columns in header row for Program names!
        for (let c = 0; c < row.length; c++) {
          if (c === dateCol || c === dailyKmCol || c === busCol || c === vehCol || c === makeCol || c === remarkCol) {
            continue;
          }
          const headerText = String(row[c] ?? '').trim();
          const matchedProg = matchProgramHeader(headerText, existingPrograms);
          if (matchedProg) {
            programColMatches.push({
              columnIndex: c,
              headerName: headerText,
              matchedProgramName: matchedProg,
            });
            detectedProgramsSet.add(matchedProg);
          }
        }
        break;
      }
    }

    // Parse data rows
    if (headerRowIdx >= 0 && dateCol >= 0) {
      for (let r = headerRowIdx + 1; r < data.length; r++) {
        const row = data[r] || [];
        const rawDate = row[dateCol];
        const dateStr = parseExcelDate(rawDate);
        if (!dateStr) continue;

        let kmVal = dailyKmCol >= 0 ? num(row[dailyKmCol]) : 0;

        const rowBus = busCol >= 0 && row[busCol] ? String(row[busCol]).trim() : defaultBus;
        const rowVeh = vehCol >= 0 && row[vehCol] ? String(row[vehCol]).trim() : defaultVehicle;
        const rowMakeVal = makeCol >= 0 && row[makeCol] ? String(row[makeCol]).trim().toUpperCase() : defaultMake;
        const rowMake: 'TATA' | 'LEYLAND' | 'OTHER' =
          rowMakeVal === 'LEYLAND' ? 'LEYLAND' : rowMakeVal === 'OTHER' ? 'OTHER' : 'TATA';
        const rowRemark = remarkCol >= 0 && row[remarkCol] ? String(row[remarkCol]).trim() : '';

        // Extract program KMs from matched program columns
        const rowProgramKms: Record<string, number> = {};
        for (const match of programColMatches) {
          const rawProgKm = row[match.columnIndex];
          if (rawProgKm !== '' && rawProgKm !== null && rawProgKm !== undefined) {
            const parsedKm = num(rawProgKm);
            if (Number.isFinite(parsedKm) && parsedKm > 0) {
              rowProgramKms[match.matchedProgramName] = parsedKm;
            }
          }
        }

        // If daily KM column was not explicitly found, but date exists, try next numeric column
        if (dailyKmCol < 0) {
          for (let c = dateCol + 1; c < Math.min(row.length, dateCol + 5); c++) {
            if (programColMatches.some((m) => m.columnIndex === c)) continue;
            const testVal = row[c];
            if (testVal !== '' && Number.isFinite(Number(testVal))) {
              kmVal = num(testVal);
              break;
            }
          }
        }

        // Record min/max date
        if (!minDate || dateStr < minDate) minDate = dateStr;
        if (!maxDate || dateStr > maxDate) maxDate = dateStr;

        if (rowBus) {
          if (!detectedBusesMap.has(rowBus)) {
            detectedBusesMap.set(rowBus, {
              no: rowBus,
              vehicle: rowVeh,
              make: rowMake,
            });
          }
        }

        allRows.push({
          sheet: sn,
          bus: rowBus,
          vehicle: rowVeh,
          make: rowMake,
          date: dateStr,
          dailyKm: kmVal,
          programKms: rowProgramKms,
          remark: rowRemark,
        });
      }
    } else {
      // Legacy scan without explicit header row
      for (let r = 0; r < data.length; r++) {
        const row = data[r] || [];
        if (!row.length) continue;

        let foundDateCol = -1;
        let dateStr = '';
        for (let c = 0; c < Math.min(row.length, 8); c++) {
          const d = parseExcelDate(row[c]);
          if (d) {
            dateStr = d;
            foundDateCol = c;
            break;
          }
        }
        if (!dateStr || foundDateCol < 0) continue;

        let kmVal = 0;
        for (let c = foundDateCol + 1; c < Math.min(row.length, foundDateCol + 5); c++) {
          const v = row[c];
          if (v !== '' && Number.isFinite(Number(v))) {
            const n = num(v);
            if (n >= 0 && n < 1500) {
              kmVal = n;
              break;
            }
          }
        }

        if (!minDate || dateStr < minDate) minDate = dateStr;
        if (!maxDate || dateStr > maxDate) maxDate = dateStr;

        if (defaultBus) {
          if (!detectedBusesMap.has(defaultBus)) {
            detectedBusesMap.set(defaultBus, {
              no: defaultBus,
              vehicle: defaultVehicle,
              make: defaultMake,
            });
          }
        }

        allRows.push({
          sheet: sn,
          bus: defaultBus,
          vehicle: defaultVehicle,
          make: defaultMake,
          date: dateStr,
          dailyKm: kmVal,
          programKms: {},
        });
      }
    }
  }

  return {
    workbook: wb,
    sheetNames: wb.SheetNames,
    detectedBuses: Array.from(detectedBusesMap.values()),
    minDate: minDate || new Date().toISOString().slice(0, 10),
    maxDate: maxDate || new Date().toISOString().slice(0, 10),
    totalRowsFound: allRows.length,
    detectedPrograms: Array.from(detectedProgramsSet),
    rows: allRows,
  };
}

/**
 * Filter and prepare import payload based on user's Date-to-Date selection
 * and whether program KM should be updated.
 */
export function executeFilteredImport(
  analysis: WorkbookAnalysis,
  fromDate: string,
  toDate: string,
  selectedBuses: string[], // '__ALL__' or specific bus numbers
  importDailyKm: boolean,
  importProgramKm: boolean
): {
  addedEntries: KmEntry[];
  programUpdates: { bus: string; program: string; km: number }[];
  busesAdded: Bus[];
} {
  const addedEntries: KmEntry[] = [];
  const programUpdatesMap: Map<string, { bus: string; program: string; km: number }> = new Map();
  const busesToAdd: Bus[] = [];

  // Filter rows within selected Date to Date range
  const validRows = analysis.rows.filter((r) => {
    if (r.date < fromDate || r.date > toDate) return false;
    if (selectedBuses.length > 0 && !selectedBuses.includes('__ALL__') && !selectedBuses.includes(r.bus)) {
      return false;
    }
    return true;
  });

  // Track unique buses
  for (const b of analysis.detectedBuses) {
    if (selectedBuses.includes('__ALL__') || selectedBuses.includes(b.no)) {
      busesToAdd.push({
        no: b.no,
        vehicle: b.vehicle,
        make: b.make,
      });
    }
  }

  // Process rows in date order
  const sortedRows = [...validRows].sort((a, b) => a.date.localeCompare(b.date));

  for (const row of sortedRows) {
    // 1. Add Daily KM entry if requested
    if (importDailyKm && row.dailyKm > 0) {
      addedEntries.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        bus: row.bus,
        date: row.date,
        km: row.dailyKm,
        vehicle: row.vehicle,
        make: row.make,
        remark: row.remark || '',
      });
    }

    // 2. Add/update program KMs if requested ("Program je hoy amaj KM import thava joiye")
    if (importProgramKm && row.programKms) {
      for (const [progName, val] of Object.entries(row.programKms)) {
        if (val > 0) {
          const key = `${row.bus}||${progName}`;
          // Keep the latest/highest reading in the date-to-date range
          programUpdatesMap.set(key, {
            bus: row.bus,
            program: progName,
            km: val,
          });
        }
      }
    }
  }

  return {
    addedEntries,
    programUpdates: Array.from(programUpdatesMap.values()),
    busesAdded: busesToAdd,
  };
}
