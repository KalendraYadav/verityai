import { useState, useEffect } from 'react';
import {
  fetchHealth,
  fetchInstitutions,
  fetchCategories,
  fetchCurrentUser,
  logoutUser,
  type HealthResponse,
  type Institution,
  type ApplicationCategory,
  type UserProfile,
} from './api/client';
import { useAppRouter } from './router/useAppRouter';
import { AppShell, type NavItemKey } from './components/layout/AppShell';
import { LandingPage } from './components/landing/LandingPage';
import { LoginPage } from './components/auth/LoginPage';
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
import { VerityAIExcelLogo } from './components/brand/VerityAIExcelLogo';
import { ShieldCheck, RefreshCw, X } from 'lucide-react';

export function App() {
  const { pathname, search, route, navigate, navigateToTab } = useAppRouter();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(
    route.type === 'workspace' && route.applicationId ? route.applicationId : null
  );

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [categories, setCategories] = useState<ApplicationCategory[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Synchronize route applicationId with local state
  useEffect(() => {
    if (route.type === 'workspace') {
      if (route.applicationId) {
        setSelectedApplicationId(route.applicationId);
      } else if (route.tab !== 'applications') {
        setSelectedApplicationId(null);
      }
    }
  }, [route]);

  // Synchronize descriptive document title per route (WCAG 2.4.2 Page Titled / GIGW 3.0)
  useEffect(() => {
    if (route.type === 'landing') {
      document.title = 'VerityAI Excel — Institutional Application Scrutiny Platform';
    } else if (route.type === 'login') {
      document.title = 'Sign In — VerityAI Excel Scrutiny Portal';
    } else if (route.type === 'workspace') {
      const tabTitles: Record<NavItemKey, string> = {
        overview: 'Workspace Overview — VerityAI Excel',
        applications: route.applicationId
          ? `Application ${route.applicationId} — VerityAI Excel`
          : 'Application Register — VerityAI Excel',
        scrutiny: 'Scrutiny Queue — VerityAI Excel',
        documents: 'Document Repository — VerityAI Excel',
        compliance: 'Validation Rules & Compliance — VerityAI Excel',
        institutions: 'Institutional Register — VerityAI Excel',
        registry: 'Registry Verification — VerityAI Excel',
        gateways: 'Regulatory Gateways — VerityAI Excel',
        audit: 'Audit Trail & Compliance Log — VerityAI Excel',
      };
      document.title = tabTitles[route.tab] || 'Workspace — VerityAI Excel';
    }
  }, [route]);

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
      console.error('Failed to load metadata', e);
    }
  }

  // Verify session on mount without flashing or mis-routing
  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      try {
        const user = await fetchCurrentUser();
        if (isMounted) {
          setCurrentUser(user);
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setAuthChecking(false);
        }
      }
    }

    checkSession();
    checkHealth();
    loadMetadata();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setCurrentUser(null);
      navigate('/');
    }
  };

  /* ── 1. Loading splash for protected workspace routes ───────── */
  if (route.type === 'workspace' && authChecking) {
    return (
      <div className="min-h-screen bg-[#F7F8FC] flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <VerityAIExcelLogo size="lg" />
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#667085]">
            <RefreshCw className="w-4 h-4 animate-spin text-[#6941C6]" />
            <span>Verifying Scrutiny Session &amp; Credentials...</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── 2. Protected route enforcement: redirect unauthenticated users ── */
  if (route.type === 'workspace' && !currentUser) {
    const returnPath = pathname + search;
    navigate(`/login?returnUrl=${encodeURIComponent(returnPath)}`, {
      replace: true,
      scrollToTop: false,
    });
    return null;
  }

  /* ── 3. Login Route (/login) ─────────────────────────────────── */
  if (route.type === 'login') {
    // If user is already authenticated, redirect to returnUrl or workspace
    if (currentUser && !authChecking) {
      navigate(route.returnUrl || '/app/overview', { replace: true });
      return null;
    }

    return (
      <LoginPage
        onSuccess={(user) => {
          setCurrentUser(user);
          navigate(route.returnUrl || '/app/overview');
        }}
        onBackToLanding={() => navigate('/')}
        returnUrl={route.returnUrl}
      />
    );
  }

  /* ── 4. Public Landing Page (/) ─────────────────────────────── */
  if (route.type === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => {
          if (currentUser) {
            navigate('/app/overview');
          } else {
            navigate('/login');
          }
        }}
        onSignIn={() => navigate('/login')}
        onEnterWorkspace={() => navigate('/app/overview')}
        currentUser={currentUser}
      />
    );
  }

  /* ── 5. Authenticated Operational Workspace (/app/*) ────────── */
  const activeTab: NavItemKey = route.tab;

  return (
    <AppShell
      currentTab={activeTab}
      onTabChange={(tab) => {
        if (tab === 'applications' && selectedApplicationId) {
          navigateToTab('applications', selectedApplicationId);
        } else {
          navigateToTab(tab);
        }
      }}
      apiHealthy={health?.status === 'healthy'}
      onProbeClick={() => setShowHealthModal(true)}
      currentUser={currentUser}
      onOpenAuthModal={() => setAuthModalOpen(true)}
      onNavigateToLanding={() => navigate('/')}
      onLogout={handleLogout}
    >
      {/* Overview / Dashboard */}
      {activeTab === 'overview' && (
        <DashboardView
          onOpenNewApplication={() => setCreateModalOpen(true)}
          onOpenUploadDocument={() => setUploadModalOpen(true)}
          onSelectApplication={(id) => {
            setSelectedApplicationId(id);
            navigateToTab('applications', id);
          }}
          onNavigateToTab={(tab) => navigateToTab(tab as NavItemKey)}
        />
      )}

      {/* Applications Register & Detail Workspace */}
      {activeTab === 'applications' && (
        <>
          {selectedApplicationId ? (
            <ApplicationDetailWorkspace
              applicationId={selectedApplicationId}
              onBack={() => {
                setSelectedApplicationId(null);
                navigateToTab('applications');
              }}
            />
          ) : (
            <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">
                  Application Register
                </h1>
                <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
                  Institutional approval applications, declared fields, and scrutiny status.
                  Click any application to open the Scrutiny Dossier.
                </p>
              </div>
              <ApplicationList
                onSelectApplication={(id) => {
                  setSelectedApplicationId(id);
                  navigateToTab('applications', id);
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Scrutiny Queue */}
      {activeTab === 'scrutiny' && (
        <ScrutinyQueueView
          onSelectApplication={(id) => {
            setSelectedApplicationId(id);
            navigateToTab('applications', id);
          }}
        />
      )}

      {/* Documents */}
      {activeTab === 'documents' && <DocumentsView />}

      {/* Validation Rules */}
      {activeTab === 'compliance' && <ValidationComplianceView />}

      {/* Institutions */}
      {activeTab === 'institutions' && <EntitiesView />}

      {/* Registry Verification */}
      {activeTab === 'registry' && (
        <RegistryVerificationView
          onNavigateToApplications={() => navigateToTab('applications')}
          onSelectApplication={(id) => {
            setSelectedApplicationId(id);
            navigateToTab('applications', id);
          }}
        />
      )}

      {/* Regulatory Gateways */}
      {activeTab === 'gateways' && <RegulatoryGatewaysView />}

      {/* Audit Trail */}
      {activeTab === 'audit' && <AuditTimelineView />}

      {/* Diagnostics Modal */}
      {showHealthModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E4E7EC] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4E7EC] pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-[#111827]">
                <ShieldCheck className="w-5 h-5 text-[#6941C6]" />
                API &amp; Database Diagnostics
              </div>
              <button
                onClick={() => setShowHealthModal(false)}
                className="p-1 rounded-lg text-[#9CA3AF] hover:bg-[#F9FAFB] hover:text-[#111827] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#F9FAFB] border border-[#E4E7EC] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#111827]">FastAPI Backend</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      health?.status === 'healthy'
                        ? 'bg-[#DCFCE7] text-[#15803D]'
                        : 'bg-[#FEE2E2] text-[#B42318]'
                    }`}
                  >
                    {health?.status?.toUpperCase() || 'OFFLINE'}
                  </span>
                </div>
                <div className="text-[11px] text-[#667085]">
                  Version: v{health?.version} · Route prefix: /api/v1/
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F9FAFB] border border-[#E4E7EC] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#111827]">SQLite Database</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      health?.database?.status === 'connected'
                        ? 'bg-[#DCFCE7] text-[#15803D]'
                        : 'bg-[#FEE2E2] text-[#B42318]'
                    }`}
                  >
                    {health?.database?.status?.toUpperCase() || 'OFFLINE'}
                  </span>
                </div>
                <div className="text-[11px] text-[#667085]">
                  Engine: {health?.database?.engine || 'sqlite'} · Active probe: SELECT 1
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={checkHealth}
                disabled={healthLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#6941C6] text-white hover:bg-[#5631A8] transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                {healthLoading ? 'Testing...' : 'Probe Health'}
              </button>
              <button
                onClick={() => setShowHealthModal(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
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
          navigateToTab('applications');
        }}
        institutions={institutions}
        categories={categories}
      />

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Auth Modal (within workspace for password changes and account details) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
        }}
        onLogoutSuccess={() => {
          setCurrentUser(null);
          navigate('/');
        }}
      />
    </AppShell>
  );
}

export default App;
