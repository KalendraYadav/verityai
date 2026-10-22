import React, { useState } from 'react';
import { VerityAIExcelLogo } from '../brand/VerityAIExcelLogo';
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  FolderOpen,
  ShieldCheck,
  Building2,
  History,
  Database,
  Network,
  Search,
  Bell,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Globe,
} from 'lucide-react';

import type { UserProfile } from '../../api/client';

export type NavItemKey =
  | 'overview'
  | 'applications'
  | 'scrutiny'
  | 'documents'
  | 'compliance'
  | 'institutions'
  | 'registry'
  | 'gateways'
  | 'audit';

interface Props {
  currentTab: NavItemKey;
  onTabChange: (tab: NavItemKey) => void;
  apiHealthy: boolean;
  onProbeClick: () => void;
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
  onNavigateToLanding?: () => void;
  onLogout?: () => void;
  children: React.ReactNode;
}

/* ── Navigation groups ──────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    label: 'WORKSPACE',
    items: [
      { key: 'overview' as NavItemKey, label: 'Overview', icon: LayoutDashboard },
      { key: 'applications' as NavItemKey, label: 'Applications', icon: FileText },
      { key: 'scrutiny' as NavItemKey, label: 'Scrutiny Queue', icon: ClipboardCheck },
    ],
  },
  {
    label: 'VERIFICATION',
    items: [
      { key: 'documents' as NavItemKey, label: 'Documents', icon: FolderOpen },
      { key: 'compliance' as NavItemKey, label: 'Validation Rules', icon: ShieldCheck },
      { key: 'registry' as NavItemKey, label: 'Registry Verification', icon: Database },
    ],
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { key: 'institutions' as NavItemKey, label: 'Institutions', icon: Building2 },
      { key: 'gateways' as NavItemKey, label: 'Regulatory Gateways', icon: Network },
      { key: 'audit' as NavItemKey, label: 'Audit Trail', icon: History },
    ],
  },
] as const;

/* ── Sidebar nav item ───────────────────────────────────────────── */
function SidebarNavItem({
  item,
  isActive,
  onClick,
}: {
  item: { key: NavItemKey; label: string; icon: React.ElementType };
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all relative cursor-pointer ${
        isActive
          ? 'bg-[#F5F0FF] text-[#6941C6] font-semibold'
          : 'text-[#667085] hover:text-[#111827] hover:bg-[#F9FAFB]'
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#6941C6] rounded-r" />
      )}
      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#6941C6]' : 'text-[#9CA3AF]'}`} />
      <span>{item.label}</span>
      {isActive && <ChevronRight className="w-3 h-3 ml-auto text-[#6941C6]" />}
    </button>
  );
}

/* ── Sidebar content ────────────────────────────────────────────── */
function SidebarContent({
  currentTab,
  onTabChange,
  currentUser,
  onOpenAuthModal,
  onNavigateToLanding,
  onLogout,
  onClose,
}: {
  currentTab: NavItemKey;
  onTabChange: (tab: NavItemKey) => void;
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
  onNavigateToLanding?: () => void;
  onLogout?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-[#E4E7EC] flex items-center justify-between">
        <button
          onClick={() => {
            if (onNavigateToLanding) {
              onNavigateToLanding();
            } else {
              onTabChange('overview');
            }
            onClose?.();
          }}
          className="text-left cursor-pointer hover:opacity-90 transition-opacity"
          title="Return to Public Landing Page"
        >
          <VerityAIExcelLogo size="sm" showSubtitle={false} />
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F9FAFB] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-1.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarNavItem
                  key={item.key}
                  item={item}
                  isActive={currentTab === item.key}
                  onClick={() => {
                    onTabChange(item.key);
                    onClose?.();
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User session & links */}
      <div className="p-3 border-t border-[#E4E7EC] space-y-2">
        <button
          onClick={onOpenAuthModal}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F9FAFB] transition-colors cursor-pointer text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-[#6941C6] text-white flex items-center justify-center font-bold text-xs shrink-0">
            {currentUser ? currentUser.display_name.slice(0, 2).toUpperCase() : 'G'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[#111827] truncate">
              {currentUser ? currentUser.display_name : 'Guest'}
            </div>
            <div className="text-[10px] text-[#6941C6] font-medium truncate">
              {currentUser ? currentUser.role : 'Sign in'}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1 text-[11px] text-[#667085] px-1">
          {onNavigateToLanding && (
            <button
              onClick={() => {
                onNavigateToLanding();
                onClose?.();
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#6941C6]" />
              <span>Public Portal</span>
            </button>
          )}

          {currentUser && onLogout && (
            <button
              onClick={() => {
                onLogout();
                onClose?.();
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md hover:bg-[#FFF0EF] hover:text-[#B42318] transition-colors cursor-pointer text-[#B42318]"
              title="Sign out of current session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── AppShell: workspace-only (landing has its own layout) ──────── */
export const AppShell: React.FC<Props> = ({
  currentTab,
  onTabChange,
  apiHealthy,
  onProbeClick,
  currentUser,
  onOpenAuthModal,
  onNavigateToLanding,
  onLogout,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FC] text-[#111827]">
      {/* ── Accessible Skip to Main Content Link (GIGW 3.0 / WCAG 2.4.1) ─ */}
      <a href="#workspace-main" className="skip-link">
        Skip to main content
      </a>

      {/* Demo environment notice */}
      <div className="bg-[#FFFBEB] border-b border-[#FEF3C7] text-[#B45309] px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 z-40">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
        <span>
          <strong>VerityAI Excel — Demo Environment</strong> · Synthetic institutional data ·
          SIH 2026 prototype · Statutory decisions remain with authorized human officers.
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden">

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-60 bg-white border-r border-[#E4E7EC] flex-col shrink-0">
          <SidebarContent
            currentTab={currentTab}
            onTabChange={onTabChange}
            currentUser={currentUser}
            onOpenAuthModal={onOpenAuthModal}
            onNavigateToLanding={onNavigateToLanding}
            onLogout={onLogout}
          />
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

          {/* Topbar */}
          <header className="sticky top-0 z-30 bg-white border-b border-[#E4E7EC] px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 max-w-lg">
              {/* Mobile menu trigger */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg text-[#667085] hover:bg-[#F5F0FF] hover:text-[#6941C6] cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  placeholder="Search applications, documents, institutions..."
                  aria-label="Search applications, documents, institutions"
                  className="w-full text-xs rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] pl-9 pr-4 py-2 text-[#111827] placeholder-[#9CA3AF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6941C6]/20 focus:border-[#6941C6] transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Public Portal Return Link */}
              {onNavigateToLanding && (
                <button
                  onClick={onNavigateToLanding}
                  title="Return to Public Landing Page"
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4E7EC] bg-white hover:bg-[#F9FAFB] text-xs font-medium text-[#667085] transition-colors cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-[#6941C6]" />
                  <span>Public Portal</span>
                </button>
              )}

              {/* API health */}
              <button
                onClick={onProbeClick}
                title="Check backend health status"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4E7EC] bg-white hover:bg-[#F9FAFB] text-xs font-medium text-[#667085] transition-colors cursor-pointer"
              >
                <span
                  className={`w-2 h-2 rounded-full ${apiHealthy ? 'bg-[#15803D]' : 'bg-[#B42318]'}`}
                />
                <span className="font-mono text-[11px]">API {apiHealthy ? 'Live' : 'Offline'}</span>
              </button>

              {/* Notifications */}
              <button
                className="p-2 rounded-lg text-[#667085] hover:bg-[#F5F0FF] hover:text-[#6941C6] transition-colors cursor-pointer relative"
                aria-label="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
              </button>

              {/* User Chip */}
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-2 pl-2 border-l border-[#E4E7EC] hover:opacity-80 transition-opacity cursor-pointer"
                title={currentUser ? `${currentUser.display_name} · ${currentUser.role}` : 'Sign in'}
              >
                <div className="w-8 h-8 rounded-lg bg-[#6941C6] text-white flex items-center justify-center font-bold text-xs">
                  {currentUser ? currentUser.display_name.slice(0, 2).toUpperCase() : 'G'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-[#111827] leading-tight">
                    {currentUser ? currentUser.display_name : 'Guest'}
                  </div>
                  <div className="text-[10px] text-[#6941C6] font-medium leading-tight">
                    {currentUser ? currentUser.role : 'Sign In'}
                  </div>
                </div>
              </button>

              {/* Sign Out Button */}
              {currentUser && onLogout && (
                <button
                  onClick={onLogout}
                  title="Sign out of current session"
                  className="p-2 rounded-lg text-[#667085] hover:bg-[#FFF0EF] hover:text-[#B42318] transition-colors cursor-pointer"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </header>

          {/* Page content */}
          <main id="workspace-main" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-[#E4E7EC] bg-white py-3 px-6 text-center text-xs text-[#9CA3AF] flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              <strong className="text-[#667085]">VerityAI Excel</strong> · AI-Assisted Institutional Application Scrutiny
            </span>
            <span className="text-[11px]">SIH 2026 Prototype · Synthetic Data · Decision support only</span>
          </footer>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 bg-white border-r border-[#E4E7EC] flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <SidebarContent
              currentTab={currentTab}
              onTabChange={onTabChange}
              currentUser={currentUser}
              onOpenAuthModal={onOpenAuthModal}
              onNavigateToLanding={onNavigateToLanding}
              onLogout={onLogout}
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
