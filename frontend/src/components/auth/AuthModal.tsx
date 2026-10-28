import React, { useState } from 'react';
import { X, Lock, Mail, Shield, KeyRound, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { type UserProfile, loginUser, logoutUser, changeUserPassword } from '../../api/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onAuthSuccess: (user: UserProfile) => void;
  onLogoutSuccess: () => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onLogoutSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'changePassword'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const user = await loginUser(email, password);
      onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    setEmail(demoEmail);
    setPassword(demoPass);

    try {
      const user = await loginUser(demoEmail, demoPass);
      onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Demo authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const updated = await changeUserPassword(currentPassword, newPassword);
      setSuccessMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onAuthSuccess(updated);
    } catch (err: any) {
      setError(err?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      onLogoutSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to log out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E5DDD5] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#FAF5F0] to-[#EEE5DC] border-b border-[#E5DDD5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1F3954] text-white flex items-center justify-center border border-[#37C2CC]/30">
              <Shield className="w-4 h-4 text-[#37C2CC]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#202936]">
                {currentUser ? 'User Session & Access' : 'VerityAI Scrutiny Access'}
              </h3>
              <p className="text-[11px] text-[#536174]">
                Role-Based Authentication &amp; Session Security
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#536174] hover:text-[#202936] hover:bg-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Session Bar if logged in */}
        {currentUser && (
          <div className="p-4 bg-[#FAF5F0] border-b border-[#E5DDD5] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#202936]">{currentUser.display_name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#37C2CC]/15 text-[#1F3954] border border-[#37C2CC]/30">
                  {currentUser.role}
                </span>
              </div>
              <div className="text-[11px] text-[#536174]">{currentUser.email}</div>
            </div>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#E5DDD5] text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Tab switch for logged in users */}
        {currentUser && (
          <div className="flex border-b border-[#E5DDD5] text-xs font-semibold bg-[#FAF5F0]">
            <button
              onClick={() => { setActiveTab('login'); setError(null); }}
              className={`flex-1 py-2.5 text-center transition-colors cursor-pointer ${
                activeTab === 'login'
                  ? 'border-b-2 border-[#1F3954] text-[#1F3954] bg-white font-bold'
                  : 'text-[#536174] hover:text-[#202936]'
              }`}
            >
              Switch Account
            </button>
            <button
              onClick={() => { setActiveTab('changePassword'); setError(null); }}
              className={`flex-1 py-2.5 text-center transition-colors cursor-pointer ${
                activeTab === 'changePassword'
                  ? 'border-b-2 border-[#1F3954] text-[#1F3954] bg-white font-bold'
                  : 'text-[#536174] hover:text-[#202936]'
              }`}
            >
              Change Password
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-[#EBF7F0] border border-[#33CC7A]/30 text-[#202936] text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#33CC7A]" />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === 'login' ? (
            <>
              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#202936] mb-1">Official Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#536174]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="reviewer@verityai.gov.in"
                      className="w-full text-xs rounded-xl border border-[#E5DDD5] bg-[#FAF5F0]/60 pl-9 pr-3 py-2 text-[#202936] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#37C2CC] focus:border-[#37C2CC]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#202936] mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#536174]" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full text-xs rounded-xl border border-[#E5DDD5] bg-[#FAF5F0]/60 pl-9 pr-3 py-2 text-[#202936] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#37C2CC] focus:border-[#37C2CC]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="main-btn btn-hover w-full !py-2.5 text-xs font-bold gap-2 cursor-pointer shadow-sm disabled:opacity-50 mt-1"
                >
                  {loading ? (
                    <>
                      <div className="concentric-spinner !w-3.5 !h-3.5 !border-2 mr-1" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In with Secure Session</span>
                  )}
                </button>
              </form>

              {/* Role Switcher */}
              <div className="pt-3 border-t border-[#E5DDD5] space-y-2">
                <div className="text-[11px] font-bold text-[#536174] uppercase tracking-wider">
                  Preset Role Credentials
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin@verityai.gov.in', 'AdminSecurePass123!')}
                    disabled={loading}
                    className="p-2.5 rounded-xl border border-[#E5DDD5] bg-[#FAF5F0]/60 hover:bg-[#FAF5F0] hover:border-[#1F3954] text-left transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-[#202936] group-hover:text-[#1F3954]">Admin</div>
                    <div className="text-[10px] text-[#536174]">Full configuration &amp; user RBAC</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('reviewer@verityai.gov.in', 'ReviewerPass123!')}
                    disabled={loading}
                    className="p-2.5 rounded-xl border border-[#E5DDD5] bg-[#FAF5F0]/60 hover:bg-[#FAF5F0] hover:border-[#1F3954] text-left transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-[#202936] group-hover:text-[#1F3954]">Reviewer</div>
                    <div className="text-[10px] text-[#536174]">Scrutiny queue &amp; findings</div>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Change Password Form */
            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#202936] mb-1">Current Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#536174]" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full text-xs rounded-xl border border-[#E5DDD5] bg-[#FAF5F0]/60 pl-9 pr-3 py-2 text-[#202936] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#37C2CC] focus:border-[#37C2CC]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202936] mb-1">New Password (min 8 chars)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#536174]" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full text-xs rounded-xl border border-[#E5DDD5] bg-[#FAF5F0]/60 pl-9 pr-3 py-2 text-[#202936] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#37C2CC] focus:border-[#37C2CC]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202936] mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#536174]" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full text-xs rounded-xl border border-[#E5DDD5] bg-[#FAF5F0]/60 pl-9 pr-3 py-2 text-[#202936] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#37C2CC] focus:border-[#37C2CC]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="main-btn btn-hover w-full !py-2.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Updating Password...' : 'Update Password with Argon2id'}
              </button>
            </form>
          )}

          <div className="p-3 rounded-xl bg-[#FAF5F0] border border-[#E5DDD5] text-[11px] text-[#536174] space-y-1">
            <div className="font-semibold text-[#202936] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#37C2CC]" />
              <span>Session Safeguards</span>
            </div>
            <p>
              Session tokens are maintained in an <strong>HttpOnly, SameSite=Lax</strong> cookie with CSRF <code>X-Requested-With: VerityAI</code> protection. Tokens are never exposed to browser storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
