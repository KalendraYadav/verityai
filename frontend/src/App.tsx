import { useState, useEffect, lazy, Suspense } from 'react';
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
import { VerityAIExcelLogo } from './components/brand/VerityAIExcelLogo';
import { AccessDeniedView } from './components/common/AccessDeniedView';
import { ShieldCheck, RefreshCw, X } from 'lucide-react';

/* ── Code-Split Dynamic Views for High-Performance Initial Bundle ─── */
const LandingPage = lazy(() => import('./components/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./components/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardView = lazy(() => import('./components/dashboard/DashboardView').then((m) => ({ default: m.DashboardView })));
const ApplicationList = lazy(() => import('./components/ApplicationList').then((m) => ({ default: m.ApplicationList })));
const ApplicationDetailWorkspace = lazy(() => import('./components/applications/ApplicationDetailWorkspace').then((m) => ({ default: m.ApplicationDetailWorkspace })));
const ScrutinyQueueView = lazy(() => import('./components/scrutiny/ScrutinyQueueView').then((m) => ({ default: m.ScrutinyQueueView })));
const ValidationComplianceView = lazy(() => import('./components/compliance/ValidationComplianceView').then((m) => ({ default: m.ValidationComplianceView })));
const EntitiesView = lazy(() => import('./components/entities/EntitiesView').then((m) => ({ default: m.EntitiesView })));
const AuditTimelineView = lazy(() => import('./components/audit/AuditTimelineView').then((m) => ({ default: m.AuditTimelineView })));
const ApplicationCreateModal = lazy(() => import('./components/ApplicationCreateModal').then((m) => ({ default: m.ApplicationCreateModal })));
const DocumentsView = lazy(() => import('./components/documents/DocumentsView').then((m) => ({ default: m.DocumentsView })));
const DocumentUploadModal = lazy(() => import('./components/documents/DocumentUploadModal').then((m) => ({ default: m.DocumentUploadModal })));
const AuthModal = lazy(() => import('./components/auth/AuthModal').then((m) => ({ default: m.AuthModal })));
const RegistryVerificationView = lazy(() => import('./components/registry/RegistryVerificationView').then((m) => ({ default: m.RegistryVerificationView })));
const RegulatoryGatewaysView = lazy(() => import('./components/gateways/RegulatoryGatewaysView').then((m) => ({ default: m.RegulatoryGatewaysView })));
const UsersView = lazy(() => import('./components/admin/UsersView').then((m) => ({ default: m.UsersView })));
const AdminDashboardView = lazy(() => import('./components/admin/AdminDashboardView').then((m) => ({ default: m.AdminDashboardView })));
const ApplicantDashboardView = lazy(() => import('./components/applicant/ApplicantDashboardView').then((m) => ({ default: m.ApplicantDashboardView })));
const ApplicantIntakeWizard = lazy(() => import('./components/applicant/ApplicantIntakeWizard').then((m) => ({ default: m.ApplicantIntakeWizard })));
const ApplicantStatusView = lazy(() => import('./components/applicant/ApplicantStatusView').then((m) => ({ default: m.ApplicantStatusView })));
const VerityAIPlatformWorkspace = lazy(() => import('./components/platform/VerityAIPlatformWorkspace').then((m) => ({ default: m.VerityAIPlatformWorkspace })));

function ViewFallback() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[360px] p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="size-7 rounded-full border-2 border-[#1B1411]/20 border-t-[#33CC7A] animate-spin" />
        <span className="text-xs font-mono font-medium text-[#66574F]">Loading workspace module...</span>
      </div>
    </div>
  );
}

export function App() {
  const { pathname, search, route, navigate, navigateToTab } = useAppRouter();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(
    route.type === 'workspace' && route.applicationId ? route.applicationId : null
  );

  const [showApplicantWizard, setShowApplicantWizard] = useState(false);
  const [applicantWizardAppId, setApplicantWizardAppId] = useState<string | null>(null);

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
      document.title = 'VerityAI — Institutional Application Scrutiny Platform';
    } else if (route.type === 'login') {
      document.title = 'Sign In — VerityAI Scrutiny Portal';
    } else if (route.type === 'workspace') {
      const tabTitles: Record<NavItemKey, string> = {
        overview: currentUser?.role === 'ADMIN'
          ? 'Executive Platform Overview — VerityAI'
          : 'Scrutiny Workspace Overview — VerityAI',
        users: 'User & Role Administration — VerityAI',
        applications: route.applicationId
          ? `Application ${route.applicationId} — VerityAI`
          : 'Application Register — VerityAI',
        scrutiny: 'Scrutiny Queue — VerityAI',
        documents: 'Document Repository — VerityAI',
        compliance: 'Validation Rules & Compliance — VerityAI',
        institutions: 'Institutional Register — VerityAI',
        registry: 'Registry Verification — VerityAI',
        gateways: 'Regulatory Gateways — VerityAI',
        audit: 'Audit Trail & Compliance Log — VerityAI',
        platform: 'VerityAI Scrutiny Platform & APIs — VerityAI',
      };
      document.title = tabTitles[route.tab] || 'Workspace — VerityAI';
    }
  }, [route, currentUser?.role]);

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
      <Suspense fallback={<ViewFallback />}>
        <LoginPage
          onSuccess={(user) => {
            setCurrentUser(user);
            navigate(route.returnUrl || '/app/overview');
          }}
          onBackToLanding={() => navigate('/')}
          returnUrl={route.returnUrl}
          portal={route.portal}
        />
      </Suspense>
    );
  }

  /* ── 4. Public Landing Page (/) ─────────────────────────────── */
  if (route.type === 'landing') {
    return (
      <Suspense fallback={<ViewFallback />}>
        <LandingPage
          onGetStarted={() => {
            if (currentUser) {
              navigate('/app/overview');
            } else {
              navigate('/login?portal=applicant');
            }
          }}
          onOpenApplicantPortal={() => {
            if (currentUser) {
              navigate('/app/overview');
            } else {
              navigate('/login?portal=applicant');
            }
          }}
          onSignIn={() => navigate('/login')}
          onOfficerSignIn={() => navigate('/login?portal=officer')}
          onEnterWorkspace={() => navigate('/app/overview')}
          currentUser={currentUser}
        />
      </Suspense>
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
      <Suspense fallback={<ViewFallback />}>
        {/* Route Guard for Administrative Tabs */}
      {(['users', 'gateways', 'audit', 'institutions'] as NavItemKey[]).includes(activeTab) &&
        currentUser?.role !== 'ADMIN' && (
          <AccessDeniedView
            onReturn={() => navigateToTab('overview')}
            attemptedResource={
              activeTab === 'users'
                ? 'User & Role Administration'
                : activeTab === 'gateways'
                ? 'Regulatory Gateways'
                : activeTab === 'audit'
                ? 'Global Audit Trail'
                : 'Institutional Profiles'
            }
          />
        )}

      {/* Route Guard for Reviewer/Admin Scrutiny Tabs from Applicant */}
      {(['scrutiny', 'compliance', 'registry'] as NavItemKey[]).includes(activeTab) &&
        currentUser?.role === 'INSTITUTION_USER' && (
          <AccessDeniedView
            onReturn={() => navigateToTab('overview')}
            attemptedResource={
              activeTab === 'scrutiny'
                ? 'Regulatory Scrutiny Queue'
                : activeTab === 'compliance'
                ? 'Validation Norms & Rules'
                : 'Statutory Registry Verification'
            }
          />
        )}

      {/* Overview / Dashboard (Role-Tailored) */}
      {activeTab === 'overview' && (
        currentUser?.role === 'ADMIN' ? (
          <AdminDashboardView
            onNavigateToTab={(tab) => navigateToTab(tab as NavItemKey)}
            onSelectApplication={(id) => {
              setSelectedApplicationId(id);
              navigateToTab('applications', id);
            }}
          />
        ) : currentUser?.role === 'INSTITUTION_USER' ? (
          <ApplicantDashboardView
            currentUser={currentUser}
            onOpenNewApplication={() => {
              setApplicantWizardAppId(null);
              setShowApplicantWizard(true);
            }}
            onResumeDraft={(id) => {
              setApplicantWizardAppId(id);
              setShowApplicantWizard(true);
            }}
            onSelectApplication={(id) => {
              setSelectedApplicationId(id);
              navigateToTab('applications', id);
            }}
          />
        ) : (
          <DashboardView
            onOpenNewApplication={() => setCreateModalOpen(true)}
            onOpenUploadDocument={() => setUploadModalOpen(true)}
            onSelectApplication={(id) => {
              setSelectedApplicationId(id);
              navigateToTab('applications', id);
            }}
            onNavigateToTab={(tab) => navigateToTab(tab as NavItemKey)}
            userRole={currentUser?.role}
          />
        )
      )}

      {/* User & Role Administration (Admin Only) */}
      {activeTab === 'users' && currentUser?.role === 'ADMIN' && <UsersView />}

      {/* Applications Register & Detail Workspace */}
      {activeTab === 'applications' && (
        currentUser?.role === 'INSTITUTION_USER' ? (
          selectedApplicationId ? (
            <ApplicantStatusView
              applicationId={selectedApplicationId}
              onBack={() => {
                setSelectedApplicationId(null);
                navigateToTab('applications');
              }}
              currentUser={currentUser}
              onResumeDraft={(id) => {
                setApplicantWizardAppId(id);
                setShowApplicantWizard(true);
              }}
            />
          ) : (
            <ApplicantDashboardView
              currentUser={currentUser}
              onOpenNewApplication={() => {
                setApplicantWizardAppId(null);
                setShowApplicantWizard(true);
              }}
              onResumeDraft={(id) => {
                setApplicantWizardAppId(id);
                setShowApplicantWizard(true);
              }}
              onSelectApplication={(id) => {
                setSelectedApplicationId(id);
                navigateToTab('applications', id);
              }}
            />
          )
        ) : (
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
              <ApplicationList
                onSelectApplication={(id) => {
                  setSelectedApplicationId(id);
                  navigateToTab('applications', id);
                }}
                userRole={currentUser?.role}
              />
            )}
          </>
        )
      )}

      {/* Scrutiny Queue (Reviewer & Admin only) */}
      {activeTab === 'scrutiny' && currentUser?.role !== 'INSTITUTION_USER' && (
        <ScrutinyQueueView
          onSelectApplication={(id) => {
            setSelectedApplicationId(id);
            navigateToTab('applications', id);
          }}
        />
      )}

      {/* Documents */}
      {activeTab === 'documents' && (
        <DocumentsView
          userRole={currentUser?.role}
          onOpenDossier={(id) => {
            setSelectedApplicationId(id);
            navigateToTab('applications', id);
          }}
        />
      )}

      {/* Validation Rules */}
      {activeTab === 'compliance' && <ValidationComplianceView />}

      {/* Institutions (Admin Only) */}
      {activeTab === 'institutions' && currentUser?.role === 'ADMIN' && <EntitiesView />}

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

      {/* Regulatory Gateways (Admin Only) */}
      {activeTab === 'gateways' && currentUser?.role === 'ADMIN' && <RegulatoryGatewaysView />}

      {/* Audit Trail (Admin Only) */}
      {activeTab === 'audit' && currentUser?.role === 'ADMIN' && <AuditTimelineView />}

      {/* Independent VerityAI Scrutiny Platform & API Gateway */}
      {activeTab === 'platform' && <VerityAIPlatformWorkspace />}

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

      {/* Applicant Intake Wizard Modal */}
      {showApplicantWizard && (
        <ApplicantIntakeWizard
          applicationId={applicantWizardAppId}
          onClose={() => {
            setShowApplicantWizard(false);
            setApplicantWizardAppId(null);
          }}
          onComplete={(submitted) => {
            loadMetadata();
            setSelectedApplicationId(submitted.id);
            navigateToTab('applications', submitted.id);
          }}
          currentUser={currentUser}
          categories={categories}
          institutions={institutions}
        />
      )}

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
      </Suspense>
    </AppShell>
  );
}

export default App;
