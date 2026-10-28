import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
  Building2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { loginUser, type UserProfile } from '../../api/client';
import { Input } from '@/components/ui/input';
import authCampusBg from '@/assets/auth-campus.png';

interface Props {
  onSuccess: (user: UserProfile) => void;
  onBackToLanding: () => void;
  returnUrl?: string;
  portal?: 'applicant' | 'officer';
}

export const LoginPage: React.FC<Props> = ({
  onSuccess,
  onBackToLanding,
  returnUrl,
  portal,
}) => {
  const [portalMode, setPortalMode] = useState<'applicant' | 'officer'>(
    portal === 'officer' ? 'officer' : 'applicant'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your institutional email address.');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setError('Please enter a valid email format.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const user = await loginUser(trimmedEmail, password);
      setSuccess(true);
      setTimeout(() => {
        onSuccess(user);
      }, 350);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string, demoPass: string) => {
    setError(null);
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);

    try {
      const user = await loginUser(demoEmail, demoPass);
      setSuccess(true);
      setTimeout(() => {
        onSuccess(user);
      }, 350);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Demo authentication failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] text-[#102D50] flex flex-col justify-between relative overflow-x-hidden font-sans selection:bg-[#20B9C4]/20 selection:text-[#102D50]">
      {/* ── Left Architectural Neoclassical Campus Accent ── */}
      <div
        className="hidden lg:block absolute left-0 bottom-0 top-0 w-[380px] xl:w-[430px] pointer-events-none z-0 bg-no-repeat bg-left-bottom bg-contain opacity-85 select-none"
        style={{ backgroundImage: `url(${authCampusBg})` }}
        aria-hidden="true"
      />

      {/* ── Ambient Pale Sweep Gradient Accent (Matching Mockup Right Arc) ── */}
      <div
        className="absolute right-0 top-0 w-[55vw] h-[100vh] pointer-events-none z-0 select-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="w-[720px] h-[720px] rounded-full bg-[#E5EEF5]/70 blur-3xl absolute -top-32 -right-32" />
      </div>

      {/* ── Top Bar: Return Link & Access Badge ── */}
      <header className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-5 flex items-center justify-between relative z-10">
        <button
          type="button"
          onClick={onBackToLanding}
          className="verity-return-btn"
          aria-label="Return to Home"
        >
          <svg
            className="verity-return-arrow"
            viewBox="0 0 24 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <polygon
              className="verity-arr-poly-1"
              points="5,8 10,3 11.2,4.2 7.4,8 11.2,11.8 10,13"
              fill="currentColor"
            />
            <polygon
              className="verity-arr-poly-2"
              points="10,8 15,3 16.2,4.2 12.4,8 16.2,11.8 15,13"
              fill="currentColor"
            />
            <polygon
              className="verity-arr-poly-3"
              points="15,8 20,3 21.2,4.2 17.4,8 21.2,11.8 20,13"
              fill="currentColor"
            />
          </svg>
          <span className="verity-return-text">Return to Home</span>
        </button>

        <div className="flex items-center gap-2 text-[11.5px] font-semibold text-[#5A6E82] bg-white/80 border border-[#DCE3E8] px-3.5 py-1.5 rounded-full shadow-2xs font-sans">
          <span className="size-1.5 rounded-full bg-[#20B9C4] shrink-0" />
          <span>Regulatory Scrutiny Access</span>
        </div>
      </header>

      {/* ── Main Container: Brand, Headings, Segmented Control, and Card ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative z-10">
        <div className="max-w-md w-full space-y-6">
          {/* Logo & Header */}
          <div className="text-center space-y-3">
            {/* Circular Shield Brand Mark */}
            <div className="flex justify-center">
              <div className="size-11 rounded-full bg-[#102D50] border border-[#20B9C4]/40 flex items-center justify-center text-[#20B9C4] shadow-xs shrink-0">
                <ShieldCheck className="size-6 text-[#20B9C4]" />
              </div>
            </div>

            {/* VerityAI Excel Brand Name */}
            <div className="flex items-center justify-center gap-2 select-none">
              <span className="font-manrope font-extrabold text-[22px] tracking-tight text-[#102D50]">
                VerityAI
              </span>
              <span className="font-manrope font-bold text-xs bg-[#20B9C4] text-[#0A1F38] px-2.5 py-0.5 rounded-md">
                Excel
              </span>
            </div>
            <div className="text-[11.5px] font-medium text-[#5A6E82] -mt-1 tracking-normal font-sans">
              Institutional Application Scrutiny
            </div>

            {/* Main Portal Title */}
            <h1 className="text-2xl sm:text-[30px] font-manrope font-bold tracking-tight text-[#102D50] leading-tight pt-1">
              {portalMode === 'applicant'
                ? 'Institutional Applicant Portal'
                : 'Scrutiny Officer & Admin Sign In'}
            </h1>

            {/* Subtitle Description */}
            <p className="text-[13px] sm:text-[13.5px] text-[#5A6E82] max-w-sm mx-auto leading-relaxed font-sans">
              {portalMode === 'applicant'
                ? 'Prepare, document, and submit statutory AICTE approval applications, upload mandatory certificates, and track scrutiny status.'
                : 'Institutional application scrutiny & regulatory assessment platform. Sign in with authorized scrutiny credentials.'}
            </p>
          </div>

          {/* Segmented Role Selector Tabs */}
          <div className="flex rounded-full bg-[#E5ECF2] p-1 border border-[#D6E0EA] shadow-2xs max-w-md mx-auto">
            <button
              type="button"
              onClick={() => {
                setPortalMode('applicant');
                setError(null);
                if (
                  email === 'reviewer@verityai.gov.in' ||
                  email === 'admin@verityai.gov.in'
                ) {
                  setEmail('');
                  setPassword('');
                }
              }}
              className={`flex-1 h-9 rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer font-sans ${
                portalMode === 'applicant'
                  ? 'bg-[#102D50] text-white shadow-xs'
                  : 'text-[#5A6E82] hover:text-[#102D50]'
              }`}
            >
              <Building2 className="size-3.5" />
              <span>Institutional Applicant</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPortalMode('officer');
                setError(null);
                if (email.startsWith('operator')) {
                  setEmail('');
                  setPassword('');
                }
              }}
              className={`flex-1 h-9 rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer font-sans ${
                portalMode === 'officer'
                  ? 'bg-[#102D50] text-white shadow-xs'
                  : 'text-[#5A6E82] hover:text-[#102D50]'
              }`}
            >
              <ShieldCheck className="size-3.5" />
              <span>Officer &amp; Admin</span>
            </button>
          </div>

          {/* ── Main Authentication Panel / Card ── */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-[0_20px_50px_-12px_rgba(16,45,80,0.08)] p-6 sm:p-8 space-y-4">
            {/* Protected Resource / Return Notice */}
            {returnUrl && (
              <div className="bg-[#F0F6FC] border border-[#D0E2F5] text-[#1B4368] rounded-xl text-xs p-3.5 flex items-center gap-2.5 font-sans font-medium">
                <ShieldCheck className="size-4 text-[#1B4368] shrink-0" />
                <span>
                  Please sign in to access the requested protected resource.
                </span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-3.5 flex items-start gap-2.5 font-sans">
                <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Authentication Failed</div>
                  <div className="text-xs text-rose-700 mt-0.5">{error}</div>
                </div>
              </div>
            )}

            {/* Success Banner */}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl p-3.5 flex items-start gap-2.5 font-sans">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-emerald-950">
                    Authentication Verified
                  </div>
                  <div className="text-xs text-emerald-700 mt-0.5">
                    {portalMode === 'applicant'
                      ? 'Session initialized. Redirecting to Applicant Dashboard...'
                      : 'Session initialized. Redirecting to Scrutiny Workspace...'}
                  </div>
                </div>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-[13px] font-semibold text-[#102D50] font-sans"
                >
                  {portalMode === 'applicant'
                    ? 'Institutional Email Address'
                    : 'Officer / Admin Email Address'}
                </label>
                <div className="relative">
                  <Mail className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      portalMode === 'applicant'
                        ? 'operator@verityai.gov.in'
                        : 'reviewer@verityai.gov.in'
                    }
                    disabled={loading || success}
                    required
                    className="h-11 text-xs sm:text-[13px] pl-10 pr-3.5 rounded-xl border border-[#DCE3E8] bg-[#F8FAFC] text-[#102D50] placeholder:text-[#94A3B8] focus:bg-white focus:border-[#20B9C4] focus:ring-2 focus:ring-[#20B9C4]/20 font-sans transition-all w-full"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-[13px] font-semibold text-[#102D50] font-sans"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={loading || success}
                    required
                    className="h-11 text-xs sm:text-[13px] pl-10 pr-10 rounded-xl border border-[#DCE3E8] bg-[#F8FAFC] text-[#102D50] placeholder:text-[#94A3B8] focus:bg-white focus:border-[#20B9C4] focus:ring-2 focus:ring-[#20B9C4]/20 font-sans transition-all w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={0}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#102D50] cursor-pointer p-1 rounded-md transition-colors"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={loading || success}
                className="w-full h-11 sm:h-12 rounded-xl bg-[#20B9C4] hover:bg-[#1CA4AE] text-white text-[14px] font-semibold tracking-wide shadow-sm hover:shadow-md hover:shadow-[#20B9C4]/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer font-sans disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <div className="concentric-spinner !w-4 !h-4 !border-2 mr-1" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>
                    {portalMode === 'applicant'
                      ? 'Sign In to Applicant Dashboard'
                      : 'Sign In to Scrutiny Workspace'}
                  </span>
                )}
              </button>
            </form>

            {/* ── Demonstration Personas Section ── */}
            <div className="pt-4 border-t border-[#E8EFF5] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#102D50] font-sans">
                  Demonstration Personas
                </span>
                <span className="text-xs font-semibold text-[#087E8B] font-sans">
                  One-click fill
                </span>
              </div>

              {portalMode === 'applicant' ? (
                <div className="space-y-2">
                  <div className="text-xs text-[#64748B] font-sans">
                    Select an institution to verify multi-tenant isolation:
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {[
                      {
                        name: 'Meridian Institute of Technology',
                        code: 'VAI-I-001',
                        email: 'operator@verityai.gov.in',
                      },
                      {
                        name: 'Northbridge College of Engineering',
                        code: 'VAI-I-002',
                        email: 'operator.northbridge@verityai.gov.in',
                      },
                      {
                        name: 'Aravalli School of Technical Studies',
                        code: 'VAI-I-003',
                        email: 'operator.aravalli@verityai.gov.in',
                      },
                      {
                        name: 'Eastfield Institute of Applied Sciences',
                        code: 'VAI-I-004',
                        email: 'operator.eastfield@verityai.gov.in',
                      },
                      {
                        name: 'Riverstone College of Engineering',
                        code: 'VAI-I-005',
                        email: 'operator.riverstone@verityai.gov.in',
                      },
                      {
                        name: 'Summit Institute of Management & Tech',
                        code: 'VAI-I-006',
                        email: 'operator.summit@verityai.gov.in',
                      },
                    ].map((inst) => (
                      <button
                        key={inst.code}
                        type="button"
                        onClick={() =>
                          handleQuickDemoLogin(
                            inst.email,
                            'OperatorPass123!'
                          )
                        }
                        disabled={loading || success}
                        className="w-full p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#20B9C4]/50 text-left transition-all cursor-pointer group disabled:opacity-50 shadow-2xs hover:shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="size-9 rounded-lg bg-white border border-[#DCE3E8] flex items-center justify-center text-[#102D50] shrink-0 shadow-2xs group-hover:border-[#20B9C4]/40">
                          <Building2 className="size-4 text-[#102D50]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-[#102D50] group-hover:text-[#087E8B] transition-colors truncate font-sans">
                            {inst.name}
                          </div>
                          <div className="text-[11.5px] text-[#64748B] truncate font-sans">
                            {inst.email}
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 gap-1">
                          <span className="font-mono text-[11px] font-medium bg-[#E9EEF3] text-[#475569] border border-[#DCE3E8] rounded-md px-2 py-0.5">
                            {inst.code}
                          </span>
                          <span className="text-[#087E8B] font-semibold text-xs group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            Enter <ArrowRight className="size-3" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-[#64748B] font-sans">
                    Select an authorized scrutiny persona:
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {/* Reviewer */}
                    <button
                      type="button"
                      onClick={() =>
                        handleQuickDemoLogin(
                          'reviewer@verityai.gov.in',
                          'ReviewerPass123!'
                        )
                      }
                      disabled={loading || success}
                      className="w-full p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#20B9C4]/50 text-left transition-all cursor-pointer group disabled:opacity-50 shadow-2xs hover:shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="size-9 rounded-lg bg-white border border-[#DCE3E8] flex items-center justify-center text-[#0D7A48] shrink-0 shadow-2xs group-hover:border-[#20B9C4]/40">
                        <UserCheck className="size-4 text-[#0D7A48]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-[#102D50] group-hover:text-[#087E8B] transition-colors truncate font-sans">
                          Scrutiny Officer (Reviewer)
                        </div>
                        <div className="text-[11.5px] text-[#64748B] truncate font-sans">
                          reviewer@verityai.gov.in
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1">
                        <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md px-2 py-0.5 font-sans">
                          Reviewer
                        </span>
                        <span className="text-[#087E8B] font-semibold text-xs group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          Enter <ArrowRight className="size-3" />
                        </span>
                      </div>
                    </button>

                    {/* Admin */}
                    <button
                      type="button"
                      onClick={() =>
                        handleQuickDemoLogin(
                          'admin@verityai.gov.in',
                          'AdminSecurePass123!'
                        )
                      }
                      disabled={loading || success}
                      className="w-full p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#20B9C4]/50 text-left transition-all cursor-pointer group disabled:opacity-50 shadow-2xs hover:shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="size-9 rounded-lg bg-white border border-[#DCE3E8] flex items-center justify-center text-[#102D50] shrink-0 shadow-2xs group-hover:border-[#20B9C4]/40">
                        <ShieldAlert className="size-4 text-[#102D50]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-[#102D50] group-hover:text-[#087E8B] transition-colors truncate font-sans">
                          Regulatory Administrator
                        </div>
                        <div className="text-[11.5px] text-[#64748B] truncate font-sans">
                          admin@verityai.gov.in
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1">
                        <span className="text-[11px] font-semibold bg-[#E9EEF3] text-[#102D50] border border-[#DCE3E8] rounded-md px-2 py-0.5 font-sans">
                          Admin
                        </span>
                        <span className="text-[#087E8B] font-semibold text-xs group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          Enter <ArrowRight className="size-3" />
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Institutional Statutory Security Notice */}
          <div className="text-center pt-1">
            <p className="text-xs text-[#5A6E82] leading-relaxed max-w-sm mx-auto font-sans">
              {portalMode === 'applicant'
                ? 'Official Institutional Approval Portal under AICTE Approval Process Handbook (APH 2024-27). All uploaded dossiers are cryptographically verified and recorded in the audit trail.'
                : 'This workspace is restricted to authorized regulatory scrutiny personnel. All actions are cryptographically chained in the append-only audit log.'}
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E2E8F0] bg-white/70 py-3.5 px-4 text-center text-xs text-[#5A6E82] relative z-10 font-sans">
        <span>
          VerityAI · Institutional Regulatory Scrutiny Platform · Decision Support
          Architecture
        </span>
      </footer>
    </div>
  );
};
