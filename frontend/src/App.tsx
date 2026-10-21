import { useState, useEffect } from 'react';
import { fetchHealth, type HealthResponse } from './api/client';
import { ApplicationList } from './components/ApplicationList';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Database,
  Server,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');
  const [showHealthCard, setShowHealthCard] = useState<boolean>(false);

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
          <strong>Demonstration environment</strong> — all institutions, applications, and documents are synthetic and are not genuine AICTE records.
        </span>
      </div>

      {/* Institutional Header */}
      <header className="bg-[#0B2545] text-white shadow-sm border-b border-[#13315C]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0F766E] flex items-center justify-center font-bold text-lg text-white shadow-sm">
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
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              onClick={() => setShowHealthCard((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-[#13315C] text-teal-200 hover:bg-[#1D4476] transition-colors cursor-pointer border border-teal-800/50"
            >
              <span className={`w-2 h-2 rounded-full ${health ? 'bg-emerald-400' : 'bg-red-400'}`} />
              API: {health ? 'Connected' : 'Offline'}
              {showHealthCard ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <div className="text-xs text-slate-400 text-left sm:text-right hidden sm:block">
              <div>Smart Automation Track</div>
              <div className="text-teal-300">Phase 2: Core Records & Ingestion</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Collapsible Health & Connectivity Card */}
        {showHealthCard && (
          <div className="bg-white rounded-xl shadow-xs border border-[#D9DFE7] overflow-hidden animate-in fade-in duration-150">
            <div className="px-6 py-4 border-b border-[#D9DFE7] bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#0B2545] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
                  System Connectivity & Health Diagnostics
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live probe targeting: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">GET /api/v1/health</code>
                </p>
              </div>
              <button
                onClick={checkHealth}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#0F766E] text-white hover:bg-[#0B5F59] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Checking...' : 'Probe API'}
              </button>
            </div>

            <div className="p-5">
              {error && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-900 flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold">Backend Unreachable: </span>
                    {error}
                  </div>
                </div>
              )}

              {health && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-lg border border-[#D9DFE7] bg-slate-50/50 flex flex-col justify-between text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-slate-400" />
                        Backend FastApi
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {health.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-0.5 text-slate-600">
                      <div><span className="text-slate-400">Version:</span> <span className="font-mono text-slate-800">v{health.version}</span></div>
                      <div><span className="text-slate-400">Environment:</span> <span className="capitalize">{health.environment}</span></div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-[#D9DFE7] bg-slate-50/50 flex flex-col justify-between text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-slate-400" />
                        SQLite Engine
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {health.database.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-0.5 text-slate-600">
                      <div><span className="text-slate-400">Mode:</span> <span className="font-mono font-medium text-slate-800">WAL Mode + Foreign Keys ON</span></div>
                      <div><span className="text-slate-400">Probe:</span> <span className="text-emerald-700 font-mono">SELECT 1</span> succeeded</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-2 bg-slate-50 border-t border-[#D9DFE7] flex items-center justify-between text-[11px] text-slate-500">
              <span>Last checked: {lastChecked || 'Never'}</span>
              <span>Alembic Migrations Applied</span>
            </div>
          </div>
        )}

        {/* Phase 2: Application List and Ingestion Management */}
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-bold text-[#0B2545]">Institutional Applications</h2>
            <p className="text-xs text-slate-500">
              Scrutiny queue and application lifecycle management for Extension of Approval (EoA) and institutional records.
            </p>
          </div>
          <ApplicationList />
        </section>
      </main>

      {/* Mandatory Decision Support Disclaimer */}
      <footer className="border-t border-[#D9DFE7] bg-white py-4 text-center text-xs text-slate-500 px-4 mt-auto">
        VerityAI provides preliminary decision support for authorized scrutiny officials. Statutory scrutiny, inspection, and final regulatory decisions remain with authorized officials.
      </footer>
    </div>
  );
}

export default App;
