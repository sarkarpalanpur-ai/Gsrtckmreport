import { Program } from '../types';
import { num, parseExcelDate } from './storage';
import { matchProgramHeader, ParsedRow, WorkbookAnalysis } from './excelParser';

/**
 * Parses raw text or HTML copied directly from http://idms.gsrtc.in/ portal
 */
export function parseIdmsClipboardData(
  rawText: string,
  programs: Program[]
): {
  rows: ParsedRow[];
  detectedBuses: { no: string; vehicle: string; make: 'TATA' | 'LEYLAND' | 'OTHER' }[];
  detectedPrograms: string[];
  minDate: string;
  maxDate: string;
} {
  const rows: ParsedRow[] = [];
  const busesMap = new Map<string, { no: string; vehicle: string; make: 'TATA' | 'LEYLAND' | 'OTHER' }>();
  const detectedProgramsSet = new Set<string>();

  let minDate = '';
  let maxDate = '';

  // Check if rawText contains HTML table (common when copying from browser)
  if (rawText.includes('<table') || rawText.includes('<tr')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawText, 'text/html');
      const tableRows = doc.querySelectorAll('tr');

      let headers: string[] = [];
      const progHeaderMap: { colIdx: number; progName: string }[] = [];
      let dateCol = -1;
      let kmCol = -1;
      let busCol = -1;
      let vehCol = -1;
      let makeCol = -1;

      tableRows.forEach((tr, rIdx) => {
        const ths = tr.querySelectorAll('th, td');
        const cellTexts = Array.from(ths).map((c) => (c.textContent || '').trim());

        // Check if this is the header row
        if (headers.length === 0) {
          const hasDate = cellTexts.some((t) => /date|તારીખ/i.test(t));
          const hasKm = cellTexts.some((t) => /daily\s*km|km\s*run|કિમી/i.test(t));

          if (hasDate || hasKm) {
            headers = cellTexts;
            cellTexts.forEach((txt, cIdx) => {
              if (/date|તારીખ/i.test(txt)) dateCol = cIdx;
              else if (/daily\s*km|km\s*run|km/i.test(txt)) kmCol = cIdx;
              else if (/bus\s*no|બસ/i.test(txt)) busCol = cIdx;
              else if (/veh\s*no|વાહન/i.test(txt)) vehCol = cIdx;
              else if (/make/i.test(txt)) makeCol = cIdx;

              const matchedProg = matchProgramHeader(txt, programs);
              if (matchedProg) {
                progHeaderMap.push({ colIdx: cIdx, progName: matchedProg });
                detectedProgramsSet.add(matchedProg);
              }
            });
            return;
          }
        }

        // Parse data rows
        if (cellTexts.length >= 2) {
          let dateStr = '';
          let busNo = '';
          let vehNo = '';
          let kmVal = 0;
          let makeVal: 'TATA' | 'LEYLAND' | 'OTHER' = 'TATA';
          const progKms: Record<string, number> = {};

          if (dateCol >= 0 && cellTexts[dateCol]) {
            dateStr = parseExcelDate(cellTexts[dateCol]);
          } else {
            // Find date in any cell
            for (const cell of cellTexts) {
              const d = parseExcelDate(cell);
              if (d) {
                dateStr = d;
                break;
              }
            }
          }

          if (!dateStr) return;

          if (busCol >= 0 && cellTexts[busCol]) {
            busNo = cellTexts[busCol];
          }
          if (vehCol >= 0 && cellTexts[vehCol]) {
            vehNo = cellTexts[vehCol];
          }

          if (kmCol >= 0 && cellTexts[kmCol]) {
            kmVal = num(cellTexts[kmCol]);
          } else {
            // Pick next numeric
            for (const cell of cellTexts) {
              const n = num(cell);
              if (n > 0 && n < 1500) {
                kmVal = n;
                break;
              }
            }
          }

          if (makeCol >= 0 && cellTexts[makeCol]) {
            const m = cellTexts[makeCol].toUpperCase();
            if (m.includes('LEYLAND')) makeVal = 'LEYLAND';
            else if (m.includes('OTHER')) makeVal = 'OTHER';
          }

          // Extract program KMs
          for (const ph of progHeaderMap) {
            if (cellTexts[ph.colIdx]) {
              const pVal = num(cellTexts[ph.colIdx]);
              if (pVal > 0) {
                progKms[ph.progName] = pVal;
              }
            }
          }

          if (!busNo) busNo = vehNo ? `GJ-18-Z-${vehNo}` : 'IDMS-BUS';

          if (!minDate || dateStr < minDate) minDate = dateStr;
          if (!maxDate || dateStr > maxDate) maxDate = dateStr;

          if (!busesMap.has(busNo)) {
            busesMap.set(busNo, { no: busNo, vehicle: vehNo, make: makeVal });
          }

          rows.push({
            sheet: 'IDMS_CLIPBOARD',
            bus: busNo,
            vehicle: vehNo,
            make: makeVal,
            date: dateStr,
            dailyKm: kmVal,
            programKms: progKms,
          });
        }
      });

      if (rows.length > 0) {
        return {
          rows,
          detectedBuses: Array.from(busesMap.values()),
          detectedPrograms: Array.from(detectedProgramsSet),
          minDate: minDate || new Date().toISOString().slice(0, 10),
          maxDate: maxDate || new Date().toISOString().slice(0, 10),
        };
      }
    } catch (e) {
      console.warn('HTML table parsing failed, falling back to tab/newline parser:', e);
    }
  }

  // Fallback: Parse tab-separated or comma-separated lines (clipboard standard)
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let headers: string[] = [];
  const progHeaderMap: { colIdx: number; progName: string }[] = [];
  let dateCol = -1;
  let kmCol = -1;
  let busCol = -1;
  let vehCol = -1;
  let makeCol = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Split by tab or comma
    const cells = line.includes('\t')
      ? line.split('\t').map((c) => c.trim())
      : line.split(/,\s*/).map((c) => c.trim());

    if (headers.length === 0) {
      const hasDate = cells.some((c) => /date|તારીખ/i.test(c));
      const hasKm = cells.some((c) => /daily\s*km|km\s*run|km|કિમી/i.test(c));

      if (hasDate || hasKm) {
        headers = cells;
        cells.forEach((txt, cIdx) => {
          if (/date|તારીખ/i.test(txt)) dateCol = cIdx;
          else if (/daily\s*km|km\s*run|km/i.test(txt)) kmCol = cIdx;
          else if (/bus\s*no|બસ/i.test(txt)) busCol = cIdx;
          else if (/veh\s*no|વાહન/i.test(txt)) vehCol = cIdx;
          else if (/make/i.test(txt)) makeCol = cIdx;

          const matchedProg = matchProgramHeader(txt, programs);
          if (matchedProg) {
            progHeaderMap.push({ colIdx: cIdx, progName: matchedProg });
            detectedProgramsSet.add(matchedProg);
          }
        });
        continue;
      }
    }

    // Try parsing as data row
    let dateStr = '';
    let busNo = '';
    let vehNo = '';
    let kmVal = 0;
    let makeVal: 'TATA' | 'LEYLAND' | 'OTHER' = 'TATA';
    const progKms: Record<string, number> = {};

    if (dateCol >= 0 && cells[dateCol]) {
      dateStr = parseExcelDate(cells[dateCol]);
    } else {
      for (const c of cells) {
        const d = parseExcelDate(c);
        if (d) {
          dateStr = d;
          break;
        }
      }
    }

    if (!dateStr) continue;

    if (busCol >= 0 && cells[busCol]) busNo = cells[busCol];
    if (vehCol >= 0 && cells[vehCol]) vehNo = cells[vehCol];

    if (kmCol >= 0 && cells[kmCol]) {
      kmVal = num(cells[kmCol]);
    } else {
      for (const c of cells) {
        const n = num(c);
        if (n > 0 && n < 1500) {
          kmVal = n;
          break;
        }
      }
    }

    if (makeCol >= 0 && cells[makeCol]) {
      const m = cells[makeCol].toUpperCase();
      if (m.includes('LEYLAND')) makeVal = 'LEYLAND';
      else if (m.includes('OTHER')) makeVal = 'OTHER';
    }

    for (const ph of progHeaderMap) {
      if (cells[ph.colIdx]) {
        const pVal = num(cells[ph.colIdx]);
        if (pVal > 0) {
          progKms[ph.progName] = pVal;
        }
      }
    }

    if (!busNo) busNo = vehNo ? `GJ-18-Z-${vehNo}` : 'IDMS-BUS';

    if (!minDate || dateStr < minDate) minDate = dateStr;
    if (!maxDate || dateStr > maxDate) maxDate = dateStr;

    if (!busesMap.has(busNo)) {
      busesMap.set(busNo, { no: busNo, vehicle: vehNo, make: makeVal });
    }

    rows.push({
      sheet: 'IDMS_CLIPBOARD',
      bus: busNo,
      vehicle: vehNo,
      make: makeVal,
      date: dateStr,
      dailyKm: kmVal,
      programKms: progKms,
    });
  }

  return {
    rows,
    detectedBuses: Array.from(busesMap.values()),
    detectedPrograms: Array.from(detectedProgramsSet),
    minDate: minDate || new Date().toISOString().slice(0, 10),
    maxDate: maxDate || new Date().toISOString().slice(0, 10),
  };
}
