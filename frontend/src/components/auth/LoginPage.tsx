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
} from 'lucide-react';
import { loginUser, type UserProfile } from '../../api/client';

interface Props {
  onSuccess: (user: UserProfile) => void;
  onBackToLanding: () => void;
  returnUrl?: string;
}

export const LoginPage: React.FC<Props> = ({
  onSuccess,
  onBackToLanding,
  returnUrl,
}) => {
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
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col justify-between text-[#111827]">
      {/* Top Bar: Return Link */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-5 flex items-center justify-between">
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#667085] hover:text-[#111827] transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Public Portal</span>
        </button>

        <span className="text-[11px] font-medium text-[#9CA3AF]">
          Smart India Hackathon 2026 · Smart Automation Track
        </span>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full space-y-6">
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <VerityAIExcelLogo size="lg" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#111827] tracking-tight">
              Reviewer &amp; Admin Sign In
            </h1>
            <p className="text-xs text-[#667085] max-w-sm mx-auto">
              Institutional application scrutiny &amp; regulatory assessment platform.
              Sign in with your authorized credentials.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-[#E4E7EC] shadow-sm p-6 sm:p-8 space-y-5">
            {/* Informational Return Notice */}
            {returnUrl && (
              <div className="p-3 rounded-lg bg-[#F5F0FF] border border-[#DDD6FE] text-xs text-[#6941C6] flex items-center gap-2">
                <Shield className="w-4 h-4 shrink-0" />
                <span>
                  Please sign in to access the protected scrutiny workspace.
                </span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-[#FFF0EF] border border-[#FECDCA] text-xs text-[#B42318] flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {/* Success Banner */}
            {success && (
              <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#15803D] flex items-center gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-medium">
                  Authentication verified. Entering workspace...
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-xs font-semibold text-[#374151]">
                  Institutional Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" aria-hidden="true" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@verityai.gov.in"
                    disabled={loading || success}
                    required
                    aria-required="true"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-[#D0D5DD] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6941C6]/20 focus:border-[#6941C6] transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="login-password" className="block text-xs font-semibold text-[#374151]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={loading || success}
                    required
                    aria-required="true"
                    className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-[#D0D5DD] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6941C6]/20 focus:border-[#6941C6] transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={0}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151] cursor-pointer p-0.5 rounded"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || success}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#6941C6] text-white hover:bg-[#5631A8] focus:ring-2 focus:ring-[#6941C6]/40 transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Session...</span>
                  </>
                ) : (
                  <span>Sign In to Workspace</span>
                )}
              </button>
            </form>

            {/* Demo Accounts Panel */}
            <div className="pt-4 border-t border-[#E4E7EC] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">
                  Demonstration Credentials
                </span>
                <span className="text-[10px] text-[#9CA3AF]">One-click fill</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
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
                  className="w-full p-3 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] hover:bg-[#F5F0FF] hover:border-[#DDD6FE] text-left transition-all cursor-pointer group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#111827] group-hover:text-[#6941C6] transition-colors flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#15803D]" />
                      Scrutiny Officer (Reviewer)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                      REVIEWER
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-[#667085]">
                    reviewer@verityai.gov.in
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
                  className="w-full p-3 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] hover:bg-[#F5F0FF] hover:border-[#DDD6FE] text-left transition-all cursor-pointer group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#111827] group-hover:text-[#6941C6] transition-colors flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#6941C6]" />
                      Regulatory Administrator
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F5F0FF] text-[#6941C6] border border-[#DDD6FE]">
                      ADMIN
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-[#667085]">
                    admin@verityai.gov.in
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Institutional Security Notice */}
          <div className="text-center">
            <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
              This system is restricted to authorized regulatory scrutiny personnel.
              All sessions are monitored and recorded in the append-only audit log.
            </p>
          </div>
        </div>
      </div>

      {/* Minimal Footer */}
      <div className="border-t border-[#E4E7EC] bg-white py-3 px-4 text-center text-[11px] text-[#9CA3AF]">
        <span>VerityAI Excel · Smart India Hackathon 2026 Prototype · Synthetic Data Only</span>
      </div>
    </div>
  );
};
