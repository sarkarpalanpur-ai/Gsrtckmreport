import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Globe,
  Layers,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { AppDatabase, Bus, KmEntry, Program } from '../types';
import {
  downloadFile,
  fmt,
  generateCsv,
  getDefaultDatabase,
  num,
  pKey,
} from '../utils/storage';
import { Language, translations } from '../utils/i18n';
import {
  analyzeWorkbook,
  executeFilteredImport,
  WorkbookAnalysis,
} from '../utils/excelParser';
import { parseIdmsClipboardData } from '../utils/idmsParser';

interface ExcelBackupViewProps {
  db: AppDatabase;
  onUpdateDb: (updater: (prev: AppDatabase) => AppDatabase) => void;
  lang: Language;
}

export const ExcelBackupView: React.FC<ExcelBackupViewProps> = ({
  db,
  onUpdateDb,
  lang,
}) => {
  const t = translations[lang];

  // Wizard state
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'excel' | 'idms'>('excel');
  const [idmsClipboardText, setIdmsClipboardText] = useState('');
  const [idmsError, setIdmsError] = useState('');
  const [analysis, setAnalysis] = useState<WorkbookAnalysis | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Date to Date filter states
  const [wizardFromDate, setWizardFromDate] = useState<string>('');
  const [wizardToDate, setWizardToDate] = useState<string>('');
  const [wizardSelectedBus, setWizardSelectedBus] = useState<string>('__ALL__');
  const [wizardImportDaily, setWizardImportDaily] = useState<boolean>(true);
  const [wizardImportPrograms, setWizardImportPrograms] = useState<boolean>(true);

  // Success result banner
  const [importSummary, setImportSummary] = useState<{
    entriesAdded: number;
    entriesSkipped: number;
    programsUpdated: number;
    busesAdded: number;
    dateRange: string;
    programNames: string[];
  } | null>(null);

  const [jsonError, setJsonError] = useState<string | null>(null);

  // 1. When an Excel file is selected, parse and launch the Date-to-Date Wizard
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const buffer = ev.target?.result;
        const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
        const result = analyzeWorkbook(wb, db.programs);

        setAnalysis(result);
        setWizardFromDate(result.minDate);
        setWizardToDate(result.maxDate);
        setWizardSelectedBus('__ALL__');
        setWizardImportDaily(true);
        setWizardImportPrograms(true);
        setImportSummary(null);
      } catch (err: any) {
        alert(
          lang === 'gu'
            ? 'Excel ફાઇલ વાંચવામાં ક્ષતિ આવી. કૃપા કરીને સાચી .xlsx, .xls કે .csv ફાઇલ પસંદ કરો.'
            : 'Error reading Excel workbook. Please verify the file.'
        );
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // 1b. Parse raw copied text/table from IDMS portal (http://idms.gsrtc.in/)
  const handleParseIdms = () => {
    if (!idmsClipboardText.trim()) {
      setIdmsError(
        lang === 'gu'
          ? 'કૃપા કરીને IDMS પોર્ટલમાંથી કોપી કરેલો ડેટા પેસ્ટ કરો.'
          : 'Please paste the table copied from http://idms.gsrtc.in/'
      );
      return;
    }
    setIdmsError('');
    const res = parseIdmsClipboardData(idmsClipboardText, db.programs);
    if (res.rows.length === 0) {
      setIdmsError(
        lang === 'gu'
          ? 'કોઈ માન્ય KM કે તારીખ રેકોર્ડ મળ્યો નથી. કૃપા કરીને IDMS સ્ક્રીન પરથી આખું ટેબલ (Ctrl+A / Ctrl+C) કોપી કરો.'
          : 'No valid Date or KM records found. Please copy the complete table from IDMS.'
      );
      return;
    }

    setFileName('IDMS_GSRTC_Portal_Direct_Paste');
    setAnalysis({
      workbook: {} as any,
      sheetNames: ['IDMS_PORTAL_GSRTC'],
      detectedBuses: res.detectedBuses,
      minDate: res.minDate,
      maxDate: res.maxDate,
      totalRowsFound: res.rows.length,
      detectedPrograms: res.detectedPrograms,
      rows: res.rows,
    });
    setWizardFromDate(res.minDate);
    setWizardToDate(res.maxDate);
    setWizardSelectedBus('__ALL__');
    setWizardImportDaily(true);
    setWizardImportPrograms(true);
  };

  // 2. Execute the filtered Date-to-Date & Program KM import
  const handleConfirmWizardImport = () => {
    if (!analysis) return;

    const busesToFilter =
      wizardSelectedBus === '__ALL__' ? ['__ALL__'] : [wizardSelectedBus];

    const { addedEntries, programUpdates, busesAdded } = executeFilteredImport(
      analysis,
      wizardFromDate,
      wizardToDate,
      busesToFilter,
      wizardImportDaily,
      wizardImportPrograms
    );

    let skippedEntriesCount = 0;
    const finalNewEntries: KmEntry[] = [];

    // Filter duplicates
    for (const entry of addedEntries) {
      const isDup = db.entries.some(
        (e) =>
          e.bus === entry.bus &&
          e.date === entry.date &&
          num(e.km) === num(entry.km)
      );
      if (isDup) {
        skippedEntriesCount++;
      } else {
        finalNewEntries.push(entry);
      }
    }

    // Apply updates to database
    onUpdateDb((prev) => {
      // 1. Add any new buses discovered in Excel
      const existingBusNos = new Set(prev.buses.map((b) => b.no.toUpperCase()));
      const mergedBuses = [...prev.buses];
      for (const nb of busesAdded) {
        if (!existingBusNos.has(nb.no.toUpperCase())) {
          mergedBuses.push(nb);
          existingBusNos.add(nb.no.toUpperCase());
        }
      }

      // 2. Add daily entries
      const mergedEntries = [...finalNewEntries, ...prev.entries];

      // 3. Update program KMs ("Program je hoy amaj KM import thava joiye")
      const updatedBases = { ...prev.bases };
      const updatedProgramsList = [...prev.programs];

      if (wizardImportPrograms) {
        for (const pu of programUpdates) {
          const key = pKey(pu.bus, pu.program);
          updatedBases[key] = pu.km;

          // Ensure program exists in programs list
          if (!updatedProgramsList.some((p) => p.name === pu.program)) {
            updatedProgramsList.push({
              name: pu.program,
              warning: 40000,
            });
          }
        }
      }

      return {
        ...prev,
        buses: mergedBuses,
        entries: mergedEntries,
        bases: updatedBases,
        programs: updatedProgramsList,
      };
    });

    // Confetti celebration
    try {
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    const affectedProgNames = Array.from(
      new Set(programUpdates.map((pu) => pu.program))
    );

    setImportSummary({
      entriesAdded: finalNewEntries.length,
      entriesSkipped: skippedEntriesCount,
      programsUpdated: programUpdates.length,
      busesAdded: busesAdded.length,
      dateRange: `${wizardFromDate} ~ ${wizardToDate}`,
      programNames: affectedProgNames,
    });

    // Close wizard modal
    setAnalysis(null);
  };

  // Quick Date helpers for wizard
  const handleQuickDates = (type: 'all' | 'month' | 'last30') => {
    if (!analysis) return;
    if (type === 'all') {
      setWizardFromDate(analysis.minDate);
      setWizardToDate(analysis.maxDate);
    } else if (type === 'month') {
      const today = new Date().toISOString().slice(0, 10);
      setWizardFromDate(today.slice(0, 8) + '01');
      setWizardToDate(today);
    } else if (type === 'last30') {
      const now = Date.now();
      setWizardToDate(new Date(now).toISOString().slice(0, 10));
      setWizardFromDate(
        new Date(now - 30 * 86400000).toISOString().slice(0, 10)
      );
    }
  };

  // Preview rows calculation for wizard
  const previewRows = analysis
    ? analysis.rows
        .filter((r) => {
          if (r.date < wizardFromDate || r.date > wizardToDate) return false;
          if (
            wizardSelectedBus !== '__ALL__' &&
            r.bus !== wizardSelectedBus
          )
            return false;
          return true;
        })
        .slice(0, 6)
    : [];

  const totalFilteredCount = analysis
    ? analysis.rows.filter((r) => {
        if (r.date < wizardFromDate || r.date > wizardToDate) return false;
        if (wizardSelectedBus !== '__ALL__' && r.bus !== wizardSelectedBus)
          return false;
        return true;
      }).length
    : 0;

  // Download Sample GSRTC Excel Template
  const handleDownloadSampleTemplate = () => {
    const headers = [
      'Date',
      'Bus No',
      'Vehicle No',
      'Daily KM',
      'Make',
      'DOCKING KM',
      'ENGINE OIL CHANGE KM',
      'PRI. AIR FILTER',
      'FUEL FILTER CUM WATER SEP KM',
      'GEAR OIL CHANGE',
      'DIFF. OIL CHANGE',
      'RADIATOR COOLANT',
      'Remark',
    ];

    const todayStr = new Date().toISOString().slice(0, 10);
    const sampleRows = [
      headers,
      [
        todayStr,
        'GJ-18-Z-3868',
        '3868',
        340.5,
        'TATA',
        38200,
        36400,
        39100,
        32000,
        34500,
        34500,
        35000,
        'Palanpur Route Normal Run',
      ],
      [
        todayStr,
        'GJ-18-Z-4120',
        '4120',
        420.0,
        'LEYLAND',
        39100,
        74200,
        38800,
        36000,
        38000,
        38000,
        37500,
        'Express Schedule Completed',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GSRTC_KM_ENTRY');
    XLSX.writeFile(wb, 'GSRTC_Propar_KM_Sample_Template.xlsx');
  };

  // Export Entries CSV
  const handleExportEntriesCsv = () => {
    const rows: (string | number)[][] = [
      ['Date', 'Bus No', 'Vehicle No', 'Daily KM', 'Make', 'Remark'],
      ...db.entries.map((e) => [
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
      'GSRTC_KM_Entries_All.csv',
      csvContent,
      'text/csv;charset=utf-8'
    );
  };

  // Export JSON Backup
  const handleExportJson = () => {
    const content = JSON.stringify(db, null, 2);
    downloadFile(
      `GSRTC_Propar_KM_Backup_${new Date().toISOString().slice(0, 10)}.json`,
      content,
      'application/json'
    );
  };

  // Restore JSON Backup
  const handleRestoreJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (
          !parsed ||
          !Array.isArray(parsed.buses) ||
          !Array.isArray(parsed.entries)
        ) {
          throw new Error('Invalid JSON database format.');
        }

        const confirmMsg =
          lang === 'gu'
            ? 'શું તમે હાલનો ડેટા Replace કરીને આ JSON Backup restore કરવા માંગો છો?'
            : 'Restore this JSON backup and replace current device data?';

        if (window.confirm(confirmMsg)) {
          onUpdateDb(() => ({
            buses: parsed.buses || [],
            programs: parsed.programs || [],
            entries: parsed.entries || [],
            services: parsed.services || [],
            bases: parsed.bases || {},
          }));
          alert(
            lang === 'gu'
              ? 'Backup Restore સફળ રહ્યો!'
              : 'Backup restored successfully!'
          );
        }
      } catch (err: any) {
        setJsonError(err?.message || 'Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset to sample data
  const handleResetToSample = () => {
    const confirmMsg =
      lang === 'gu'
        ? 'બધા ડેટા સાફ કરી ફરીથી ડિફોલ્ટ GSRTC સેમ્પલ ડેટા લોડ કરવો છે?'
        : 'Reset everything and reload default GSRTC sample data?';
    if (window.confirm(confirmMsg)) {
      onUpdateDb(() => getDefaultDatabase());
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl md:text-2xl font-black text-slate-900">
          {t.excelTitle}
        </h2>
        <p className="text-xs md:text-sm text-slate-600 mt-1">
          {lang === 'gu'
            ? 'Date-to-Date Filter અને Program-wise KM Import સાથે એક્સેલ ફાઇલ ડેટા અપલોડ કરો.'
            : 'Import Excel files with Date-to-Date range selection and program-specific KM matching.'}
        </p>
      </div>

      {/* Success Notification Banner */}
      {importSummary && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-5 rounded-2xl shadow-md space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-emerald-100" />
              <h3 className="text-base font-black">
                {lang === 'gu'
                  ? '✓ Excel ડેટા સફળતાપૂર્વક Import થયો!'
                  : '✓ Excel Data Successfully Imported!'}
              </h3>
            </div>
            <button
              onClick={() => setImportSummary(null)}
              className="text-white/80 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-bold">
            <div className="bg-white/15 px-3 py-2 rounded-xl">
              <span className="text-emerald-100 block text-[10px] uppercase">
                Date Range
              </span>
              <span className="text-sm font-black">{importSummary.dateRange}</span>
            </div>
            <div className="bg-white/15 px-3 py-2 rounded-xl">
              <span className="text-emerald-100 block text-[10px] uppercase">
                Daily KM Entries
              </span>
              <span className="text-sm font-black">
                +{importSummary.entriesAdded}{' '}
                <span className="text-[10px] font-normal">
                  ({importSummary.entriesSkipped} dup skipped)
                </span>
              </span>
            </div>
            <div className="bg-white/15 px-3 py-2 rounded-xl">
              <span className="text-emerald-100 block text-[10px] uppercase">
                Programs Updated
              </span>
              <span className="text-sm font-black">
                {importSummary.programsUpdated} items
              </span>
            </div>
            <div className="bg-white/15 px-3 py-2 rounded-xl">
              <span className="text-emerald-100 block text-[10px] uppercase">
                Fleet Buses
              </span>
              <span className="text-sm font-black">
                {importSummary.busesAdded} verified
              </span>
            </div>
          </div>

          {importSummary.programNames.length > 0 && (
            <div className="pt-2 text-xs text-emerald-100 flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white">Updated Programs:</span>
              {importSummary.programNames.map((p) => (
                <span
                  key={p}
                  className="bg-white/20 text-white px-2 py-0.5 rounded text-[11px] font-black"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Import Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {lang === 'gu'
                  ? 'Date-to-Date Excel & Program KM Import'
                  : 'Date-to-Date Excel & Program KM Import'}
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                {lang === 'gu'
                  ? 'ફાઇલ પસંદ કરો → તારીખ ગાળો નક્કી કરો → જે તે પ્રોગ્રામમાં KM સેવ કરો'
                  : 'Select file → Choose date range → Map directly to matching programs'}
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadSampleTemplate}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {lang === 'gu' ? 'નમૂના Excel ટેમ્પલેટ (.xlsx)' : 'Download Sample .xlsx'}
            </span>
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl max-w-md">
          <button
            type="button"
            onClick={() => setImportMode('excel')}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              importMode === 'excel'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>📁 Excel File Import</span>
          </button>

          <button
            type="button"
            onClick={() => setImportMode('idms')}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              importMode === 'idms'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4 text-amber-400" />
            <span>🌐 IDMS GSRTC (Direct Paste)</span>
          </button>
        </div>

        {/* Tab 1: Excel File Upload */}
        {importMode === 'excel' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx,.xlsm,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black py-4 px-6 rounded-2xl text-base sm:text-lg shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-3 transition active:scale-98 cursor-pointer border-2 border-emerald-400"
            >
              <FileSpreadsheet className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300" />
              <span>
                {lang === 'gu'
                  ? '📁 Excel File પસંદ કરો (Date-to-Date & Programs Import)'
                  : '📁 Select Excel File (Date-to-Date & Programs Import)'}
              </span>
            </button>

            <label
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer bg-slate-50/80 hover:bg-emerald-50/20 transition text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-sm font-black text-slate-800">
                {lang === 'gu'
                  ? 'અથવા ફાઇલ અહીં Drag & Drop કરો (.xlsx, .xls, .csv)'
                  : 'Or Drag & Drop your fleet Excel workbook here'}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                {lang === 'gu'
                  ? 'સિંગલ બસ શીટ, મલ્ટી-બસ વર્કબુક અથવા IDMS માંથી ડાઉનલોડ કરેલ શીટ સપોર્ટેડ છે.'
                  : 'Supports single bus sheets, multi-bus tabs, and IDMS downloaded workbooks.'}
              </span>
            </label>
          </div>
        )}

        {/* Tab 2: IDMS Portal Direct Paste & Instructions */}
        {importMode === 'idms' && (
          <div className="space-y-4 bg-slate-50 border border-blue-200/80 p-4 sm:p-5 rounded-2xl">
            {/* IDMS Portal Info & Quick Link */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-black text-xs">
                  IDMS
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">
                    GSRTC IDMS Portal: <span className="text-blue-700">http://idms.gsrtc.in/</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold">
                    Depot ID: <b className="text-slate-800">dsrp</b> • Integrated Depot Management System
                  </div>
                </div>
              </div>

              <a
                href="http://idms.gsrtc.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-black px-4 py-2 rounded-xl transition active:scale-95 shrink-0 shadow-sm"
              >
                <span>🌐 Open idms.gsrtc.in</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Step-by-step instructions */}
            <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl text-xs space-y-1.5">
              <span className="font-black text-amber-950 block">
                📋 IDMS માંથી સીધો ડેટા લાવવાની રીત (Fast Copy-Paste):
              </span>
              <ol className="list-decimal list-inside text-amber-900 space-y-1 font-semibold text-[11px]">
                <li><b>http://idms.gsrtc.in/</b> ખોલી તમારા લોગિન ID (dsrp) અને પાસવર્ડથી લોગિન કરો.</li>
                <li>ત્યાંથી <b>Daily KM Statement</b> અથવા <b>Vehicle KM Logsheet</b> ખોલો.</li>
                <li>સ્ક્રીન પર દેખાતું ટેબલ સિલેક્ટ કરીને <b>Copy (Ctrl+C)</b> કરો.</li>
                <li>નીચે આપેલા બોક્સમાં <b>Paste (Ctrl+V)</b> કરીને <b>"Process IDMS Data"</b> બટન દબાવો!</li>
              </ol>
            </div>

            {/* Paste Textarea */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                {lang === 'gu'
                  ? 'IDMS પોર્ટલ પરથી કોપી કરેલો ડેટા અહીં Paste કરો (Ctrl+V):'
                  : 'Paste Table Copied from http://idms.gsrtc.in/ (Ctrl+V):'}
              </label>
              <textarea
                rows={5}
                value={idmsClipboardText}
                onChange={(e) => setIdmsClipboardText(e.target.value)}
                placeholder="અહીં IDMS ટેબલ પેસ્ટ કરો (Ctrl+V)... જેમ કે Date, Bus No, Daily KM, Engine Oil KM..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {idmsError && (
              <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl text-xs font-bold">
                {idmsError}
              </div>
            )}

            {/* Parse IDMS Button */}
            <button
              type="button"
              onClick={handleParseIdms}
              className="w-full flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-black py-3.5 px-6 rounded-xl text-sm shadow-md transition active:scale-98 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>
                {lang === 'gu'
                  ? '✓ Process IDMS Data & Open Date-to-Date Wizard'
                  : '✓ Process IDMS Data & Open Date-to-Date Wizard'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* DATE-TO-DATE & PROGRAM KM IMPORT MODAL / WIZARD */}
      {analysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto space-y-5">
            {/* Wizard Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black">
                  <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {t.excelWizardTitle}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold truncate max-w-sm">
                    {fileName} ({analysis.totalRowsFound} rows found)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAnalysis(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STEP 1: Date to Date Import Controls */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-800" />
                  <span>1. {t.dateToDateImport}</span>
                </span>
                <span className="text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                  File Dates: {analysis.minDate} ~ {analysis.maxDate}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    {lang === 'gu' ? 'આ તારીખથી (From Date)' : 'From Date'} *
                  </label>
                  <input
                    type="date"
                    value={wizardFromDate}
                    onChange={(e) => setWizardFromDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    {lang === 'gu' ? 'આ તારીખ સુધી (To Date)' : 'To Date'} *
                  </label>
                  <input
                    type="date"
                    value={wizardToDate}
                    onChange={(e) => setWizardToDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quick Date Range Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-slate-500">
                  Quick select:
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickDates('all')}
                  className="text-xs bg-white hover:bg-blue-100 text-blue-950 px-2.5 py-1 rounded-lg border border-blue-200 font-bold transition"
                >
                  All Found Dates
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDates('month')}
                  className="text-xs bg-white hover:bg-blue-100 text-blue-950 px-2.5 py-1 rounded-lg border border-blue-200 font-bold transition"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDates('last30')}
                  className="text-xs bg-white hover:bg-blue-100 text-blue-950 px-2.5 py-1 rounded-lg border border-blue-200 font-bold transition"
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            {/* STEP 2: Program-Specific KM Import ("Program je hoy amaj KM import thava joiye") */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-800" />
                  <span>2. {t.programOnlyKmImport}</span>
                </span>
                <span className="text-[11px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                  {analysis.detectedPrograms.length} Programs Detected
                </span>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="importProgCheck"
                  checked={wizardImportPrograms}
                  onChange={(e) => setWizardImportPrograms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-blue-900 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="importProgCheck"
                  className="text-xs text-slate-800 font-bold cursor-pointer leading-relaxed"
                >
                  <span className="font-black text-slate-900 block">
                    {lang === 'gu'
                      ? 'જે પ્રોગ્રામ હોય એમાં જ KM અપડેટ કરો (Update Matching Programs Only)'
                      : 'Map and update KM exclusively for detected programs'}
                  </span>
                  <span className="text-slate-600 font-semibold block mt-0.5">
                    {lang === 'gu'
                      ? 'Excel શીટમાં ઉપલબ્ધ પ્રોગ્રામ કોલમ્સ (જેમ કે Engine Oil, Docking, Filters, Gear Oil વગેરે) ના KM રીડિંગ્સ તે જ પ્રોગ્રામમાં સીધા સેટ થશે.'
                      : 'Program columns in Excel will directly update current KM balances for those exact programs for each bus.'}
                  </span>
                </label>
              </div>

              {/* Badges of Detected Programs in the file */}
              {analysis.detectedPrograms.length > 0 ? (
                <div className="pt-2 border-t border-amber-200/80">
                  <span className="text-[11px] font-bold text-amber-900 block mb-1.5">
                    Excel શીટમાંથી ઓળખાયેલા પ્રોગ્રામ્સ:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.detectedPrograms.map((pn) => (
                      <span
                        key={pn}
                        className="bg-white border border-amber-300 text-amber-900 text-[11px] font-black px-2.5 py-1 rounded-lg shadow-2xs"
                      >
                        ✓ {pn}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-800 font-semibold bg-white/70 p-2.5 rounded-xl border border-amber-200">
                  ℹ️ {lang === 'gu'
                    ? 'આ શીટમાં અલગ પ્રોગ્રામ કોલમ્સ મળ્યા નથી; માત્ર Daily KM ઓળખાયા છે.'
                    : 'No separate program columns detected; only Daily KM found.'}
                </div>
              )}
            </div>

            {/* STEP 3: Bus Selection & Daily KM option */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  3. Bus Selection &amp; Daily KM Option
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Filter Bus:</span>
                  <select
                    value={wizardSelectedBus}
                    onChange={(e) => setWizardSelectedBus(e.target.value)}
                    className="bg-white border border-slate-300 text-xs font-bold rounded-lg px-2.5 py-1 text-slate-900"
                  >
                    <option value="__ALL__">
                      All Detected Buses ({analysis.detectedBuses.length})
                    </option>
                    {analysis.detectedBuses.map((b) => (
                      <option key={b.no} value={b.no}>
                        {b.no} {b.vehicle ? `(#${b.vehicle})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="importDailyCheck"
                  checked={wizardImportDaily}
                  onChange={(e) => setWizardImportDaily(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-900 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="importDailyCheck"
                  className="text-xs text-slate-800 font-bold cursor-pointer"
                >
                  {lang === 'gu'
                    ? 'Date-wise Daily KM એન્ટ્રીઓ રજિસ્ટરમાં ઉમેરો (Create Daily Logs)'
                    : 'Add date-wise daily KM logs into the register'}
                </label>
              </div>
            </div>

            {/* STEP 4: Live Data Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-blue-900" />
                  <span>Preview ({totalFilteredCount} matching rows in selected dates)</span>
                </span>
                <span className="text-slate-500 font-bold">
                  Showing first {previewRows.length} rows
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Date</th>
                      <th className="py-2 px-2.5">Bus No</th>
                      <th className="py-2 px-2.5">Daily KM</th>
                      <th className="py-2 px-2.5">Detected Program KMs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 font-semibold">
                        <td className="py-2 px-2.5 text-slate-900 font-bold whitespace-nowrap">
                          {r.date}
                        </td>
                        <td className="py-2 px-2.5 text-blue-900 font-black whitespace-nowrap">
                          {r.bus}
                        </td>
                        <td className="py-2 px-2.5 text-emerald-700 font-black whitespace-nowrap">
                          {fmt(r.dailyKm)} KM
                        </td>
                        <td className="py-2 px-2.5">
                          {Object.keys(r.programKms).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(r.programKms).map(([prog, km]) => (
                                <span
                                  key={prog}
                                  className="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded"
                                >
                                  {prog}: <b>{fmt(km)}</b>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Wizard Action Footer */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAnalysis(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmWizardImport}
                disabled={totalFilteredCount === 0}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm px-6 py-2.5 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {lang === 'gu'
                    ? `✓ ${totalFilteredCount} રેકોર્ડ્સ Import કરો (${wizardFromDate} ~ ${wizardToDate})`
                    : `✓ Import ${totalFilteredCount} Records (${wizardFromDate} ~ ${wizardToDate})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export & Backup Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Export CSV */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="font-black text-slate-900 text-sm">
              {lang === 'gu' ? 'CSV એક્સપોર્ટ' : 'Export KM Entries'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              {lang === 'gu'
                ? 'બધી તારીખવાર એન્ટ્રીઓ CSV સ્પ્રેડશીટ ફાઇલમાં ડાઉનલોડ કરો.'
                : 'Download all date-wise entries in universal CSV format.'}
            </p>
          </div>
          <button
            onClick={handleExportEntriesCsv}
            className="mt-4 flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportEntriesBtn}</span>
          </button>
        </div>

        {/* JSON Full Backup */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="font-black text-slate-900 text-sm">
              {lang === 'gu' ? 'સંપૂર્ણ JSON બેકઅપ' : 'Full JSON Backup'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              {lang === 'gu'
                ? 'બસો, પ્રોગ્રામ્સ, KM એન્ટ્રીઓ અને સર્વિસ હિસ્ટ્રીનો કમ્પ્લીટ બેકઅપ.'
                : 'Export complete fleet database, programs, and service history.'}
            </p>
          </div>
          <button
            onClick={handleExportJson}
            className="mt-4 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportJsonBtn}</span>
          </button>
        </div>

        {/* Restore Backup */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="font-black text-slate-900 text-sm">
              {lang === 'gu' ? 'બેકઅપ રીસ્ટોર' : 'Restore JSON Backup'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              {lang === 'gu'
                ? 'અગાઉ ડાઉનલોડ કરેલ .json બેકઅપ ફાઇલ અપલોડ કરીને ડેટા રીકવર કરો.'
                : 'Upload and restore an existing JSON backup to this device.'}
            </p>
          </div>
          <label className="mt-4 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition active:scale-95 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>{t.restoreJsonBtn}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreJson}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {jsonError && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3.5 rounded-xl text-xs font-bold">
          {jsonError}
        </div>
      )}

      {/* Danger Reset Zone */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400">
          GSRTC Propar KM Register • Local Storage Engine V2
        </span>
        <button
          onClick={handleResetToSample}
          className="text-xs text-slate-500 hover:text-rose-700 font-bold flex items-center gap-1 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reload Sample Depot Data</span>
        </button>
      </div>
    </div>
  );
};
