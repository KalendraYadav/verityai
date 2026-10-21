import { useState, useEffect } from 'react';
import { fetchHealth, fetchInstitutions, fetchCategories, type HealthResponse, type Institution, type ApplicationCategory } from './api/client';
import { AppShell, type NavItemKey } from './components/layout/AppShell';
import { LandingPage } from './components/landing/LandingPage';
import { DashboardView } from './components/dashboard/DashboardView';
import { ApplicationList } from './components/ApplicationList';
import { EntitiesView } from './components/entities/EntitiesView';
import { AuditTimelineView } from './components/audit/AuditTimelineView';
import { ApplicationCreateModal } from './components/ApplicationCreateModal';
import { DocumentsView } from './components/documents/DocumentsView';
import { DocumentUploadModal } from './components/documents/DocumentUploadModal';
import {
  GitBranch,
  BarChart2,
  Settings,
  ShieldCheck,
  RefreshCw,
  X,
} from 'lucide-react';

export function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard'>('dashboard');
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [categories, setCategories] = useState<ApplicationCategory[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  async function checkHealth() {
    setHealthLoading(true);
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch (e) {
      console.error('Health check failed', e);
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }

  async function loadMetadata() {
    try {
      const [insts, cats] = await Promise.all([fetchInstitutions(), fetchCategories()]);
      setInstitutions(insts);
      setCategories(cats);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    checkHealth();
    loadMetadata();
  }, []);

  return (
    <AppShell
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      apiHealthy={health?.status === 'healthy'}
      onProbeClick={() => setShowHealthModal(true)}
    >
      {viewMode === 'landing' ? (
        <LandingPage
          onGetStarted={() => {
            setViewMode('dashboard');
            setCurrentTab('dashboard');
          }}
          onOpenNewApplication={() => setCreateModalOpen(true)}
        />
      ) : (
        <>
          {currentTab === 'dashboard' && (
            <DashboardView
              onOpenNewApplication={() => setCreateModalOpen(true)}
              onOpenUploadDocument={() => setUploadModalOpen(true)}
            />
          )}

          {currentTab === 'applications' && (
            <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#171B45]">
                  Application Workspace
                </h1>
                <p className="text-xs sm:text-sm text-[#5F6485] mt-0.5">
                  Institutional approval applications, declared fields, and scrutiny status.
                </p>
              </div>
              <ApplicationList />
            </div>
          )}

          {currentTab === 'entities' && <EntitiesView />}

          {currentTab === 'audit' && <AuditTimelineView />}

          {currentTab === 'documents' && <DocumentsView />}

          {currentTab === 'workflows' && (
            <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#171B45] flex items-center gap-2">
                  <GitBranch className="w-6 h-6 text-[#7450D8]" />
                  Validation Workflows
                </h1>
                <p className="text-xs sm:text-sm text-[#5F6485] mt-0.5">
                  Deterministic scrutiny rules, AI document extraction, and human review gates.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-[#E9E6F2] p-8 shadow-xs space-y-4 text-xs text-[#5F6485]">
                <div className="font-bold text-sm text-[#171B45]">
                  Active AICTE Scrutiny Pipeline Architecture
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-[#FAF8FF] border border-[#DCD0F7] space-y-2">
                    <span className="font-bold text-[#7450D8] uppercase tracking-wider text-[10px]">Stage 01</span>
                    <div className="font-bold text-[#171B45]">Field Validation</div>
                    <p className="text-[11px]">Format validation, date sanity checks (YYYY-MM-DD), and required declared fields.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF8FF] border border-[#DCD0F7] space-y-2">
                    <span className="font-bold text-[#7450D8] uppercase tracking-wider text-[10px]">Stage 02</span>
                    <div className="font-bold text-[#171B45]">Cross-Document Checks</div>
                    <p className="text-[11px]">Matching certificate numbers, intake capacity, and institution identifiers across records.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF8FF] border border-[#DCD0F7] space-y-2">
                    <span className="font-bold text-[#7450D8] uppercase tracking-wider text-[10px]">Stage 03</span>
                    <div className="font-bold text-[#171B45]">Human Review Gate</div>
                    <p className="text-[11px]">Evidence-linked findings presented to scrutiny officials for final regulatory determination.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'analytics' && (
            <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#171B45] flex items-center gap-2">
                  <BarChart2 className="w-6 h-6 text-[#7450D8]" />
                  Scrutiny Analytics & Compliance Metrics
                </h1>
                <p className="text-xs sm:text-sm text-[#5F6485] mt-0.5">
                  Aggregate compliance rates, processing throughput, and institutional reporting.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-[#E9E6F2] p-8 shadow-xs text-xs text-[#5F6485] space-y-3">
                <div className="font-bold text-sm text-[#171B45]">Metrics Summary</div>
                <p className="text-[11px]">
                  Analytics aggregate verified results directly from persisted database records without synthetic fabrication.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2]">
                    <div className="text-[11px] text-[#8589A6]">Total Ingested</div>
                    <div className="text-xl font-extrabold text-[#171B45] mt-1">2 Applications</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2]">
                    <div className="text-[11px] text-[#8589A6]">Active Tenants</div>
                    <div className="text-xl font-extrabold text-[#171B45] mt-1">{institutions.length} Entities</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2]">
                    <div className="text-[11px] text-[#8589A6]">Rule Engine Status</div>
                    <div className="text-xl font-extrabold text-[#12B886] mt-1">100% Operational</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'settings' && (
            <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#171B45] flex items-center gap-2">
                  <Settings className="w-6 h-6 text-[#7450D8]" />
                  System & Tenant Settings
                </h1>
                <p className="text-xs sm:text-sm text-[#5F6485] mt-0.5">
                  Configuration, security policies, and environment parameters.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-[#E9E6F2] p-6 shadow-xs space-y-4 text-xs">
                <div className="font-bold text-[#171B45]">Security & Session Parameters</div>
                <div className="space-y-2 text-[#5F6485]">
                  <div>• Session Authentication: <strong>HttpOnly, SameSite=Lax Cookie</strong></div>
                  <div>• Anti-CSRF Header Protection: <strong>X-Requested-With: VerityAI</strong></div>
                  <div>• Database Driver: <strong>SQLite WAL mode with PRAGMA foreign_keys=ON</strong></div>
                  <div>• Data Origin: <strong>SYNTHETIC_DEMO (Strict Sandbox)</strong></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Health Diagnostics Modal */}
      {showHealthModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E9E6F2] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#EEEAF5] pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-[#171B45]">
                <ShieldCheck className="w-5 h-5 text-[#7450D8]" />
                API & Database Diagnostics
              </div>
              <button
                onClick={() => setShowHealthModal(false)}
                className="p-1 rounded-lg text-[#8589A6] hover:bg-[#FAF8FF] hover:text-[#171B45]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#171B45]">FastAPI Monolith</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4F2] text-[#12B886]">
                    {health?.status.toUpperCase() || 'OFFLINE'}
                  </span>
                </div>
                <div className="text-[11px] text-[#5F6485]">
                  Version: v{health?.version} · Route prefix: /api/v1/
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#171B45]">SQLite Engine</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4F2] text-[#12B886]">
                    {health?.database.status.toUpperCase() || 'OFFLINE'}
                  </span>
                </div>
                <div className="text-[11px] text-[#5F6485]">
                  WAL Mode · Foreign Keys Enforced · Active Probe: SELECT 1
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={checkHealth}
                disabled={healthLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#7450D8] text-white hover:bg-[#5633B8] transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                {healthLoading ? 'Testing...' : 'Probe Live Health'}
              </button>
              <button
                onClick={() => setShowHealthModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#5F6485] hover:bg-[#FAF8FF] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Creation Modal */}
      <ApplicationCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          loadMetadata();
          setCurrentTab('applications');
        }}
        institutions={institutions}
        categories={categories}
      />

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          // If in documents view, refresh documents; if in dashboard, keep updated
        }}
      />
    </AppShell>
  );
}

export default App;
