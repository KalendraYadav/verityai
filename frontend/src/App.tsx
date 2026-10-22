import { useState, useEffect } from 'react';
import {
  fetchHealth,
  fetchInstitutions,
  fetchCategories,
  fetchCurrentUser,
  type HealthResponse,
  type Institution,
  type ApplicationCategory,
  type UserProfile,
} from './api/client';
import { AppShell, type NavItemKey } from './components/layout/AppShell';
import { LandingPage } from './components/landing/LandingPage';
import { DashboardView } from './components/dashboard/DashboardView';
import { ApplicationList } from './components/ApplicationList';
import { ApplicationDetailWorkspace } from './components/applications/ApplicationDetailWorkspace';
import { ScrutinyQueueView } from './components/scrutiny/ScrutinyQueueView';
import { ValidationComplianceView } from './components/compliance/ValidationComplianceView';
import { EntitiesView } from './components/entities/EntitiesView';
import { AuditTimelineView } from './components/audit/AuditTimelineView';
import { ApplicationCreateModal } from './components/ApplicationCreateModal';
import { DocumentsView } from './components/documents/DocumentsView';
import { DocumentUploadModal } from './components/documents/DocumentUploadModal';
import { AuthModal } from './components/auth/AuthModal';
import { RegistryVerificationView } from './components/registry/RegistryVerificationView';
import { RegulatoryGatewaysView } from './components/gateways/RegulatoryGatewaysView';
import {
  ShieldCheck,
  RefreshCw,
  X,
} from 'lucide-react';

export function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard'>('dashboard');
  const [currentTab, setCurrentTab] = useState<NavItemKey>('overview');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

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

  async function checkUserSession() {
    try {
      const user = await fetchCurrentUser();
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    }
  }

  useEffect(() => {
    checkHealth();
    loadMetadata();
    checkUserSession();
  }, []);

  return (
    <AppShell
      currentTab={currentTab}
      onTabChange={(tab) => {
        setCurrentTab(tab);
        if (tab !== 'applications') {
          // Keep application selection context or let user return to register
        }
      }}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      apiHealthy={health?.status === 'healthy'}
      onProbeClick={() => setShowHealthModal(true)}
      currentUser={currentUser}
      onOpenAuthModal={() => setAuthModalOpen(true)}
    >
      {viewMode === 'landing' ? (
        <LandingPage
          onGetStarted={() => {
            setViewMode('dashboard');
            setCurrentTab('overview');
          }}
          onOpenNewApplication={() => setCreateModalOpen(true)}
        />
      ) : (
        <>
          {currentTab === 'overview' && (
            <DashboardView
              onOpenNewApplication={() => setCreateModalOpen(true)}
              onOpenUploadDocument={() => setUploadModalOpen(true)}
              onSelectApplication={(id) => {
                setSelectedApplicationId(id);
                setCurrentTab('applications');
              }}
            />
          )}

          {currentTab === 'applications' && (
            <>
              {selectedApplicationId ? (
                <ApplicationDetailWorkspace
                  applicationId={selectedApplicationId}
                  onBack={() => setSelectedApplicationId(null)}
                />
              ) : (
                <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-[#171B45]">
                      Application Register
                    </h1>
                    <p className="text-xs sm:text-sm text-[#5F6485] mt-0.5">
                      Institutional approval applications, declared fields, and scrutiny status. Click any application to open the Scrutiny Dossier.
                    </p>
                  </div>
                  <ApplicationList onSelectApplication={(id) => setSelectedApplicationId(id)} />
                </div>
              )}
            </>
          )}

          {currentTab === 'scrutiny' && (
            <ScrutinyQueueView
              onSelectApplication={(id) => {
                setSelectedApplicationId(id);
                setCurrentTab('applications');
              }}
            />
          )}

          {currentTab === 'documents' && <DocumentsView />}

          {currentTab === 'compliance' && <ValidationComplianceView />}

          {currentTab === 'institutions' && <EntitiesView />}

          {currentTab === 'registry' && (
            <RegistryVerificationView
              onNavigateToApplications={() => setCurrentTab('applications')}
              onSelectApplication={(id) => {
                setSelectedApplicationId(id);
                setCurrentTab('applications');
              }}
            />
          )}

          {currentTab === 'gateways' && <RegulatoryGatewaysView />}

          {currentTab === 'audit' && <AuditTimelineView />}
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

      {/* Authentication and Session Management Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
        }}
        onLogoutSuccess={() => {
          setCurrentUser(null);
        }}
      />
    </AppShell>
  );
}

export default App;
