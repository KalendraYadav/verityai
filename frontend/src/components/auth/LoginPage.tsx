import React, { useState } from 'react';
import { VerityAIExcelLogo } from '../brand/VerityAIExcelLogo';
import {
  Lock,
  Mail,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  UserCheck,
  ShieldAlert,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { loginUser, type UserProfile } from '../../api/client';
import { Input } from '@/components/ui/input';

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
    <div className="min-h-screen bg-[#FAF5F0] flex flex-col justify-between text-[#1B1411]">
      {/* Top Bar: Return Link */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#66574F] hover:text-[#1B1411] bg-[#EEE5DC]/70 hover:bg-[#EEE5DC] px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-3.5" />
          <span>Return to Home</span>
        </button>

        <span className="text-[11px] font-medium text-[#66574F] bg-[#EEE5DC]/50 px-3 py-1 rounded-full border border-[#E5DACF]">
          Regulatory Scrutiny Access
        </span>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full space-y-6">
          {/* Logo & Header */}
          <div className="text-center space-y-2.5">
            <div className="flex justify-center mb-1">
              <VerityAIExcelLogo size="lg" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1B1411]">
              {portalMode === 'applicant'
                ? 'Institutional Applicant Portal'
                : 'Scrutiny Officer & Admin Sign In'}
            </h1>
            <p className="text-xs text-[#66574F] max-w-sm mx-auto leading-relaxed">
              {portalMode === 'applicant'
                ? 'Prepare, document, and submit statutory AICTE approval applications, upload mandatory certificates, and track scrutiny status.'
                : 'Institutional application scrutiny & regulatory assessment platform. Sign in with authorized scrutiny credentials.'}
            </p>
          </div>

          {/* Portal Switcher Tabs */}
          <div className="flex rounded-full bg-[#EEE5DC] p-1 border border-[#E5DACF]">
            <button
              type="button"
              onClick={() => {
                setPortalMode('applicant');
                setError(null);
                if (email === 'reviewer@verityai.gov.in' || email === 'admin@verityai.gov.in') {
                  setEmail('');
                  setPassword('');
                }
              }}
              className={`flex-1 h-9 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                portalMode === 'applicant'
                  ? 'bg-[#1B1411] text-[#FAF5F0] shadow-sm'
                  : 'text-[#66574F] hover:text-[#1B1411]'
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
              className={`flex-1 h-9 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                portalMode === 'officer'
                  ? 'bg-[#1B1411] text-[#FAF5F0] shadow-sm'
                  : 'text-[#66574F] hover:text-[#1B1411]'
              }`}
            >
              <ShieldAlert className="size-3.5" />
              <span>Officer &amp; Admin</span>
            </button>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-[#E5DACF] shadow-[0_4px_24px_-4px_rgba(27,20,17,0.06)] p-6 sm:p-7 space-y-4">
            {/* Return Notice */}
            {returnUrl && (
              <div className="bg-[#FAF5F0] border border-[#E5DACF] rounded-xl text-xs p-3 text-[#1F3954] flex items-center gap-2">
                <Shield className="size-4 text-[#1F3954] shrink-0" />
                <span className="text-xs">
                  Please sign in to access the requested protected resource.
                </span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-3 flex items-start gap-2.5">
                <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Authentication Failed</div>
                  <div className="text-xs text-rose-700">{error}</div>
                </div>
              </div>
            )}

            {/* Success Banner */}
            {success && (
              <div className="bg-[#EBF7F0] border border-[#33CC7A]/30 text-[#1B1411] rounded-xl p-3 flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-[#33CC7A] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#1B1411]">Authentication Verified</div>
                  <div className="text-xs text-[#66574F]">
                    {portalMode === 'applicant'
                      ? 'Session initialized. Redirecting to Applicant Dashboard...'
                      : 'Session initialized. Redirecting to Scrutiny Workspace...'}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-xs font-semibold text-[#1B1411]">
                  {portalMode === 'applicant'
                    ? 'Institutional Email Address'
                    : 'Officer / Admin Email Address'}
                </label>
                <div className="relative">
                  <Mail className="size-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#66574F] pointer-events-none" />
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      portalMode === 'applicant'
                        ? 'operator@verityai.gov.in'
                        : 'officer@verityai.gov.in'
                    }
                    disabled={loading || success}
                    required
                    className="h-10 text-xs pl-9 pr-3 rounded-xl border-[#E5DACF] bg-[#FAF5F0]/60 focus:bg-white focus:border-[#1B1411]"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="login-password" className="block text-xs font-semibold text-[#1B1411]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="size-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#66574F] pointer-events-none" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={loading || success}
                    required
                    className="h-10 text-xs pl-9 pr-9 rounded-xl border-[#E5DACF] bg-[#FAF5F0]/60 focus:bg-white focus:border-[#1B1411]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={0}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#66574F] hover:text-[#1B1411] cursor-pointer p-0.5 rounded"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || success}
                className="w-full h-10 text-xs font-bold rounded-full bg-[#33CC7A] hover:bg-[#2EB86E] text-[#1B1411] transition-all shadow-[0_2px_12px_rgba(51,204,122,0.25)] hover:shadow-[0_4px_16px_rgba(51,204,122,0.35)] flex items-center justify-center cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin mr-1.5" />
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

            {/* Demo Credentials Section */}
            <div className="pt-4 border-t border-[#E5DACF] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#66574F] uppercase tracking-wider">
                  Demonstration Personas
                </span>
                <span className="text-[10px] text-[#66574F]">One-click fill</span>
              </div>

              {portalMode === 'applicant' ? (
                <div className="space-y-2">
                  <div className="text-[11px] text-[#66574F]">
                    Select an institution to verify multi-tenant isolation:
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
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
                        onClick={() => handleQuickDemoLogin(inst.email, 'OperatorPass123!')}
                        disabled={loading || success}
                        className="w-full p-2.5 rounded-xl border border-[#E5DACF] bg-[#FAF5F0]/50 hover:bg-[#FAF5F0] hover:border-[#1B1411]/40 text-left transition-all cursor-pointer group disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1B1411] group-hover:text-[#1F3954] transition-colors flex items-center gap-1.5 truncate">
                            <Building2 className="size-3 text-[#1F3954] shrink-0" />
                            <span className="truncate">{inst.name}</span>
                          </span>
                          <span className="font-mono text-[9px] font-semibold bg-[#EEE5DC] text-[#1B1411] border border-[#E5DACF] rounded-full shrink-0 ml-1.5 px-2 py-0.5">
                            {inst.code}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#66574F] pt-1">
                          <span className="font-mono truncate">{inst.email}</span>
                          <span className="text-[#1F3954] font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            Enter <ArrowRight className="size-2.5" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {/* Reviewer */}
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('reviewer@verityai.gov.in', 'ReviewerPass123!')}
                    disabled={loading || success}
                    className="w-full p-3 rounded-xl border border-[#E5DACF] bg-[#FAF5F0]/50 hover:bg-[#FAF5F0] hover:border-[#1B1411]/40 text-left transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-[#1B1411] group-hover:text-[#1F3954] transition-colors flex items-center gap-1.5">
                        <UserCheck className="size-3.5 text-[#33CC7A]" />
                        Scrutiny Officer (Reviewer)
                      </span>
                      <span className="bg-[#EBF7F0] text-[#1B1411] border border-[#33CC7A]/30 text-[9px] font-bold px-2 py-0.5 rounded-full">
                        REVIEWER
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-[#66574F]">
                      reviewer@verityai.gov.in
                    </div>
                  </button>

                  {/* Admin */}
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('admin@verityai.gov.in', 'AdminSecurePass123!')}
                    disabled={loading || success}
                    className="w-full p-3 rounded-xl border border-[#E5DACF] bg-[#FAF5F0]/50 hover:bg-[#FAF5F0] hover:border-[#1B1411]/40 text-left transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-[#1B1411] group-hover:text-[#1F3954] transition-colors flex items-center gap-1.5">
                        <ShieldAlert className="size-3.5 text-[#1F3954]" />
                        Regulatory Administrator
                      </span>
                      <span className="bg-[#BACDE0]/30 text-[#1F3954] border border-[#BACDE0] text-[9px] font-bold px-2 py-0.5 rounded-full">
                        ADMIN
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-[#66574F]">
                      admin@verityai.gov.in
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Institutional Security Notice */}
          <div className="text-center">
            <p className="text-[11px] text-[#66574F] leading-relaxed">
              {portalMode === 'applicant'
                ? 'Official Institutional Approval Portal under AICTE Approval Process Handbook (APH 2024-27). All uploaded dossiers are cryptographically verified and recorded in the audit trail.'
                : 'This workspace is restricted to authorized regulatory scrutiny personnel. All actions are cryptographically chained in the append-only audit log.'}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#E5DACF] bg-[#EEE5DC]/40 py-3.5 px-4 text-center text-[11px] text-[#66574F]">
        <span>VerityAI · Institutional Regulatory Scrutiny Platform · Decision Support Architecture</span>
      </div>
    </div>
  );
};

