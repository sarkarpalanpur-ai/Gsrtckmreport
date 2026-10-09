import React, { useState } from 'react';
import {
  Camera,
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  Layers,
  Loader2,
  Maximize2,
  RefreshCw,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { GeneratedImageRecord } from '../types';

interface AiStudioViewProps {
  lang: Language;
}

export const AiStudioView: React.FC<AiStudioViewProps> = ({ lang }) => {
  const t = translations[lang];

  // Tab: 'high-quality' (gemini-3-pro-image-preview) vs 'nano-banana' (gemini-nano-banana-2.1)
  const [activeTab, setActiveTab] = useState<'high-quality' | 'nano-banana'>('high-quality');

  // Feature 2: High-Quality Generator state
  const [hqPrompt, setHqPrompt] = useState(
    'A high-detail Gujarat State Road Transport Corporation (GSRTC) red and cream Express bus undergoing routine maintenance in a bright depot service bay.'
  );
  const [hqImageSize, setHqImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [hqAspectRatio, setHqAspectRatio] = useState('1:1');
  const [hqLoading, setHqLoading] = useState(false);
  const [hqResult, setHqResult] = useState<GeneratedImageRecord | null>(null);
  const [hqError, setHqError] = useState<string | null>(null);

  // Feature 1: Create & Edit Images state (gemini-nano-banana-2.1)
  const [nanoMode, setNanoMode] = useState<'create' | 'edit'>('create');
  const [nanoPrompt, setNanoPrompt] = useState(
    'Add an official GSRTC depot logo decal and clean reflective safety stripes to the bus side profile.'
  );
  const [nanoSourceImage, setNanoSourceImage] = useState<string | null>(null);
  const [nanoAspectRatio, setNanoAspectRatio] = useState('1:1');
  const [nanoLoading, setNanoLoading] = useState(false);
  const [nanoResult, setNanoResult] = useState<GeneratedImageRecord | null>(null);
  const [nanoError, setNanoError] = useState<string | null>(null);

  // Gallery of generated images
  const [gallery, setGallery] = useState<GeneratedImageRecord[]>([]);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Quick preset prompts
  const presets = [
    {
      label: 'Depot Inspection Bay',
      prompt:
        'A clean GSRTC bus workshop bay with mechanics inspecting diesel engine oil filters and docking equipment, realistic lighting.',
    },
    {
      label: 'GSRTC Express on Highway',
      prompt:
        'A GSRTC Express bus driving smoothly on Gujarat state highway at golden hour sunrise with clear blue sky.',
    },
    {
      label: 'Bus Tire & Brakes Inspection',
      prompt:
        'Close-up detailed maintenance inspection of bus wheel tire treads and brake drum system in a transport maintenance garage.',
    },
    {
      label: 'Palanpur Bus Station Bay',
      prompt:
        'Gujarat State Transport GSRTC modern bus parked at Palanpur bus terminal platform with passengers and clean depot signage.',
    },
  ];

  // Feature 2: Generate High Quality Image
  const handleGenerateHighQuality = async () => {
    if (!hqPrompt.trim()) return;
    setHqLoading(true);
    setHqError(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: hqPrompt,
          imageSize: hqImageSize,
          aspectRatio: hqAspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      const newRecord: GeneratedImageRecord = {
        id: `hq-${Date.now()}`,
        url: data.imageUrl,
        prompt: hqPrompt,
        model: 'gemini-3-pro-image-preview',
        size: hqImageSize,
        aspectRatio: hqAspectRatio,
        createdAt: new Date().toLocaleTimeString(),
      };

      setHqResult(newRecord);
      setGallery((prev) => [newRecord, ...prev]);
    } catch (err: any) {
      setHqError(err?.message || 'Error communicating with Gemini image generator');
    } finally {
      setHqLoading(false);
    }
  };

  // Feature 1: Create or Edit Image using gemini-nano-banana-2.1
  const handleNanoSubmit = async () => {
    if (!nanoPrompt.trim()) return;
    setNanoLoading(true);
    setNanoError(null);

    try {
      const res = await fetch('/api/nano-banana/create-or-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: nanoPrompt,
          sourceImage: nanoMode === 'edit' ? nanoSourceImage : null,
          aspectRatio: nanoAspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create or edit image');
      }

      const newRecord: GeneratedImageRecord = {
        id: `nano-${Date.now()}`,
        url: data.imageUrl,
        prompt: nanoPrompt,
        model: 'gemini-nano-banana-2.1',
        aspectRatio: nanoAspectRatio,
        isEdit: Boolean(nanoSourceImage && nanoMode === 'edit'),
        createdAt: new Date().toLocaleTimeString(),
      };

      setNanoResult(newRecord);
      setGallery((prev) => [newRecord, ...prev]);
    } catch (err: any) {
      setNanoError(err?.message || 'Error running gemini-nano-banana-2.1');
    } finally {
      setNanoLoading(false);
    }
  };

  // Handle local file upload for editing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setNanoSourceImage(reader.result as string);
      setNanoMode('edit');
      setActiveTab('nano-banana');
    };
    reader.readAsDataURL(file);
  };

  // Transfer HQ result directly to Banana 2.1 for editing
  const handleTransferToEdit = (imgUrl: string) => {
    setNanoSourceImage(imgUrl);
    setNanoMode('edit');
    setActiveTab('nano-banana');
    setNanoPrompt('Add GSRTC depot inspection marks and clean livery enhancements.');
  };

  // Download image helper
  const handleDownloadImage = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Copy Image
  const handleCopyImage = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: copy link/base64
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 md:p-6 shadow-xl border border-blue-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gemini Vision &amp; Generative AI Studio</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">
              {t.aiStudioTitle}
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {t.aiStudioSub}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload / Camera</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Feature Tabs */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/10">
          <button
            onClick={() => setActiveTab('high-quality')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'high-quality'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>High-Quality (gemini-3-pro-image-preview)</span>
          </button>

          <button
            onClick={() => setActiveTab('nano-banana')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'nano-banana'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>Create &amp; Edit (gemini-nano-banana-2.1)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: High-Quality Generation (gemini-3-pro-image-preview with 1K, 2K, 4K affordance) */}
      {activeTab === 'high-quality' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Model: gemini-3-pro-image-preview</span>
              </h3>
              <span className="text-[11px] font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full">
                High Quality
              </span>
            </div>

            {/* Prompt Input */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                {t.promptLabel}
              </label>
              <textarea
                rows={3}
                value={hqPrompt}
                onChange={(e) => setHqPrompt(e.target.value)}
                placeholder="Describe the bus, depot environment, or fleet visual..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* Presets */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                {t.presetPrompts}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setHqPrompt(p.prompt)}
                    className="text-xs bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-900 px-2.5 py-1 rounded-lg border border-slate-200 transition font-bold"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mandatory Affordance: Image Size / Resolution (1K, 2K, 4K) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                ⚡ {t.resolutionAffordance} *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['1K', '2K', '4K'] as const).map((sz) => {
                  const isSel = hqImageSize === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setHqImageSize(sz)}
                      className={`py-2.5 px-3 rounded-xl border text-center transition cursor-pointer ${
                        isSel
                          ? 'bg-blue-900 border-blue-900 text-white shadow-md'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-sm font-black">{sz}</div>
                      <div
                        className={`text-[10px] font-bold ${
                          isSel ? 'text-blue-200' : 'text-slate-400'
                        }`}
                      >
                        {sz === '1K'
                          ? 'Standard (1024)'
                          : sz === '2K'
                          ? 'Ultra HD (2048)'
                          : 'Max Ultra (4096)'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                {t.aspectRatio}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['1:1', '16:9', '4:3', '9:16', '3:4'].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setHqAspectRatio(ratio)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      hqAspectRatio === ratio
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {hqError && (
              <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl text-xs font-bold">
                {hqError}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerateHighQuality}
              disabled={hqLoading || !hqPrompt.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white font-black py-3 rounded-xl text-sm shadow-md transition active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {hqLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Generating High-Quality Image ({hqImageSize})...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>
                    Generate Image ({hqImageSize} • {hqAspectRatio})
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Result Preview Panel */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-900" />
                  <span>Generated Inspection Preview</span>
                </h4>
                {hqResult && (
                  <span className="text-[11px] font-bold text-slate-500">
                    {hqResult.size} • {hqResult.aspectRatio}
                  </span>
                )}
              </div>

              {hqLoading ? (
                <div className="aspect-square w-full rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-900 animate-bounce mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="font-black text-slate-800 text-sm">
                    Synthesizing {hqImageSize} Visual...
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Calling gemini-3-pro-image-preview with custom resolution
                  </p>
                </div>
              ) : hqResult ? (
                <div className="space-y-3">
                  <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
                    <img
                      src={hqResult.url}
                      alt={hqResult.prompt}
                      className="w-full h-auto object-contain max-h-[380px] mx-auto"
                    />
                    <button
                      onClick={() => setZoomImage(hqResult.url)}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-xl backdrop-blur-sm transition"
                      title="Fullscreen"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 font-semibold leading-relaxed">
                    "{hqResult.prompt}"
                  </p>
                </div>
              ) : (
                <div className="aspect-square w-full rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <ImageIcon className="w-10 h-10 mb-2 text-slate-300" />
                  <span className="text-xs font-bold">
                    Select prompt and image size (1K/2K/4K) to generate
                  </span>
                </div>
              )}
            </div>

            {/* Action Bar */}
            {hqResult && (
              <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => handleDownloadImage(hqResult.url, `GSRTC_${hqResult.size}`)}
                  className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-xs transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.downloadImage}</span>
                </button>

                <button
                  onClick={() => handleCopyImage(hqResult.url)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 transition active:scale-95"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={() => handleTransferToEdit(hqResult.url)}
                  className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-black px-3 py-2 rounded-xl border border-amber-300 transition active:scale-95 ml-auto"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>{t.editThisImage}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Create & Edit Images (gemini-nano-banana-2.1) */}
      {activeTab === 'nano-banana' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-amber-600" />
                <span>Model: gemini-nano-banana-2.1</span>
              </h3>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setNanoMode('create')}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg transition ${
                    nanoMode === 'create'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Create
                </button>
                <button
                  onClick={() => setNanoMode('edit')}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg transition ${
                    nanoMode === 'edit'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Edit Existing
                </button>
              </div>
            </div>

            {/* Source Image for Edit Mode */}
            {nanoMode === 'edit' && (
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
                    Source Image for Editing
                  </span>
                  <label className="text-xs text-blue-700 font-bold hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Upload New</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {nanoSourceImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-amber-300 max-h-48 bg-slate-900">
                    <img
                      src={nanoSourceImage}
                      alt="Source for editing"
                      className="w-full h-36 object-contain"
                    />
                    <button
                      onClick={() => setNanoSourceImage(null)}
                      className="absolute top-1.5 right-1.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-amber-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-100/50 transition">
                    <Upload className="w-6 h-6 text-amber-600 mb-1" />
                    <span className="text-xs font-bold text-amber-900">
                      Click to choose an inspection photo to edit
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}

            {/* Prompt Input */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                {nanoMode === 'edit'
                  ? 'Instruction / Edit Prompt (Text)'
                  : t.promptLabel}
              </label>
              <textarea
                rows={3}
                value={nanoPrompt}
                onChange={(e) => setNanoPrompt(e.target.value)}
                placeholder={
                  nanoMode === 'edit'
                    ? 'e.g. Add GSRTC logo decal, highlight front tire tread wear with red circle...'
                    : 'Describe new bus or depot image to create with nano-banana-2.1...'
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {t.editPromptHelp}
              </p>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                {t.aspectRatio}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['1:1', '16:9', '4:3', '9:16', '3:4'].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setNanoAspectRatio(ratio)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      nanoAspectRatio === ratio
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {nanoError && (
              <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl text-xs font-bold">
                {nanoError}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleNanoSubmit}
              disabled={nanoLoading || !nanoPrompt.trim() || (nanoMode === 'edit' && !nanoSourceImage)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black py-3 rounded-xl text-sm shadow-md transition active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {nanoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>
                    {nanoMode === 'edit' ? 'Editing Image with gemini-nano-banana-2.1...' : 'Creating Image...'}
                  </span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>
                    {nanoMode === 'edit'
                      ? 'Apply Edits (gemini-nano-banana-2.1)'
                      : 'Create Image (gemini-nano-banana-2.1)'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Result Preview Panel */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                  <Wand2 className="w-4 h-4 text-amber-600" />
                  <span>Nano Banana 2.1 Output</span>
                </h4>
                {nanoResult && (
                  <span className="text-[11px] font-bold text-slate-500">
                    {nanoResult.isEdit ? 'Edited Image' : 'New Image'}
                  </span>
                )}
              </div>

              {nanoLoading ? (
                <div className="aspect-square w-full rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800 animate-spin mb-3">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div className="font-black text-slate-800 text-sm">
                    Processing in gemini-nano-banana-2.1...
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Executing precision multi-modal image synthesis
                  </p>
                </div>
              ) : nanoResult ? (
                <div className="space-y-3">
                  <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
                    <img
                      src={nanoResult.url}
                      alt={nanoResult.prompt}
                      className="w-full h-auto object-contain max-h-[380px] mx-auto"
                    />
                    <button
                      onClick={() => setZoomImage(nanoResult.url)}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-xl backdrop-blur-sm transition"
                      title="Fullscreen"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 font-semibold leading-relaxed">
                    "{nanoResult.prompt}"
                  </p>
                </div>
              ) : (
                <div className="aspect-square w-full rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <Wand2 className="w-10 h-10 mb-2 text-slate-300" />
                  <span className="text-xs font-bold">
                    Provide instructions and prompt to create or edit with gemini-nano-banana-2.1
                  </span>
                </div>
              )}
            </div>

            {/* Action Bar */}
            {nanoResult && (
              <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => handleDownloadImage(nanoResult.url, 'GSRTC_Nano_Banana')}
                  className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-xs transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.downloadImage}</span>
                </button>

                <button
                  onClick={() => handleCopyImage(nanoResult.url)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 transition active:scale-95"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={() => handleTransferToEdit(nanoResult.url)}
                  className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-black px-3 py-2 rounded-xl border border-amber-300 transition active:scale-95 ml-auto"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Iterate / Edit Again</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fleet Image Gallery */}
      {gallery.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-900" />
              <span>Inspection Session Gallery</span>
            </h3>
            <span className="text-xs text-slate-500 font-bold">
              {gallery.length} visual assets
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {gallery.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-square cursor-pointer"
                onClick={() => setZoomImage(item.url)}
              >
                <img
                  src={item.url}
                  alt={item.prompt}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-2.5 flex flex-col justify-end text-white">
                  <div className="text-[10px] font-bold text-amber-300 uppercase">
                    {item.model}
                  </div>
                  <div className="text-xs font-bold line-clamp-2">
                    {item.prompt}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Zoom Modal */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={zoomImage}
              alt="Inspection Fullscreen"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain mx-auto"
            />
            <div className="text-center text-white/70 text-xs mt-2 font-bold">
              Click anywhere to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
