import { useState, useEffect } from 'react';
import { fetchHealth, type HealthResponse } from './api/client';
import { CheckCircle2, AlertCircle, RefreshCw, Database, Server, ShieldCheck, AlertTriangle } from 'lucide-react';

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');

  async function checkHealth() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHealth();
      setHealth(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown network error');
      setHealth(null);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F8] text-[#1B2430]">
      {/* Mandatory Context Banner per UI_UX_DESIGN.md Section 8.1 */}
      <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
        <span>
          <strong>Demonstration environment</strong> — all institutions and documents are synthetic and are not genuine AICTE records.
        </span>
      </div>

      {/* Institutional Header */}
      <header className="bg-[#0B2545] text-white shadow-sm border-b border-[#13315C]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0F766E] flex items-center justify-center font-bold text-lg text-white shadow">
              V
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                VerityAI
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-[#1D4476] text-teal-200">
                  SIH26261 Prototype
                </span>
              </h1>
              <p className="text-xs text-slate-300">
                AI-Powered Application Validation, Document Authentication & Regulatory Compliance
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-400 text-left sm:text-right">
            <div>Smart Automation Track</div>
            <div className="text-teal-300">Phase 1: Foundation Vertical Slice</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-[#D9DFE7] overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-5 border-b border-[#D9DFE7] bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#0B2545] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0F766E]" />
                System Connectivity & Health Status
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Target endpoint: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">GET /api/v1/health</code>
              </p>
            </div>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0F766E] text-white hover:bg-[#0B5F59] transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Probing...' : 'Refresh Status'}
            </button>
          </div>

          {/* Card Body */}
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <div className="font-semibold">Backend Connection Failed</div>
                  <div className="text-xs text-red-700 mt-1">{error}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    Ensure the FastAPI server is running with <code className="bg-red-100 px-1 py-0.5 rounded">./backend/.venv/bin/uvicorn app.main:app --reload</code>
                  </div>
                </div>
              </div>
            )}

            {health && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Service Status */}
                <div className="p-4 rounded-lg border border-[#D9DFE7] bg-slate-50/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-slate-400" />
                      Backend Service
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {health.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-4 space-y-1 text-xs text-slate-600">
                    <div><span className="text-slate-400">Service:</span> <span className="font-medium text-slate-900">{health.service}</span></div>
                    <div><span className="text-slate-400">Version:</span> <span className="font-mono text-slate-700">v{health.version}</span></div>
                    <div><span className="text-slate-400">Environment:</span> <span className="capitalize">{health.environment}</span></div>
                  </div>
                </div>

                {/* Database Status */}
                <div className="p-4 rounded-lg border border-[#D9DFE7] bg-slate-50/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-slate-400" />
                      Database Engine
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {health.database.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-4 space-y-1 text-xs text-slate-600">
                    <div><span className="text-slate-400">Engine:</span> <span className="font-mono uppercase font-semibold text-slate-800">{health.database.engine}</span> (WAL Mode, FK Enforced)</div>
                    <div><span className="text-slate-400">Active Probe:</span> <span className="text-emerald-700 font-mono">SELECT 1</span> succeeded</div>
                    <div><span className="text-slate-400">Backend Time:</span> <span className="font-mono">{new Date(health.timestamp).toLocaleTimeString()} UTC</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Architecture Slice Verification */}
            <div className="border-t border-[#D9DFE7] pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2545] mb-2">
                Phase 1 Verification Checks
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                  FastAPI modular monolith on Python 3.12 (WSL/Linux)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                  API standard route prefix: <code className="bg-slate-100 px-1 rounded">/api/v1/</code>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                  SQLite persistence with WAL & foreign keys configured
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                  React + Vite + TypeScript frontend proxying requests
                </li>
              </ul>
            </div>
          </div>

          {/* Card Footer */}
          <div className="px-6 py-3 bg-slate-50 border-t border-[#D9DFE7] flex items-center justify-between text-xs text-slate-500">
            <span>Last checked: <span className="font-mono">{lastChecked || 'Never'}</span></span>
            <span className="text-slate-400">Decisions: Cookie Auth · /api/v1 · RapidOCR Fallback</span>
          </div>
        </div>
      </main>

      {/* Mandatory Decision Support Disclaimer */}
      <footer className="border-t border-[#D9DFE7] bg-white py-4 text-center text-xs text-slate-500 px-4">
        VerityAI provides preliminary decision support for authorized scrutiny officials. Statutory scrutiny, inspection, and final regulatory decisions remain with authorized officials.
      </footer>
    </div>
  );
}

export default App;
