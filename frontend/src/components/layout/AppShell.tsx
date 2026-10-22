import React, { useState } from 'react';
import { EntityLockerLogo } from '../brand/EntityLockerLogo';
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
  viewMode: 'landing' | 'dashboard';
  onViewModeChange: (mode: 'landing' | 'dashboard') => void;
  apiHealthy: boolean;
  onProbeClick: () => void;
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<Props> = ({
  currentTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  apiHealthy,
  onProbeClick,
  currentUser,
  onOpenAuthModal,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'applications', label: 'Applications', icon: FileText },
    { key: 'scrutiny', label: 'Scrutiny Queue', icon: ClipboardCheck },
    { key: 'documents', label: 'Documents', icon: FolderOpen },
    { key: 'compliance', label: 'Validation Rules', icon: ShieldCheck },
    { key: 'institutions', label: 'Institutions', icon: Building2 },
    { key: 'registry', label: 'Registry Verification', icon: Database },
    { key: 'gateways', label: 'Regulatory Gateways', icon: Network },
    { key: 'audit', label: 'Audit Trail', icon: History },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9FC] text-[#171B45]">
      {/* Top Notice: Synthetic Demo Banner (Mandatory per AGENTS.md) */}
      <div className="bg-[#FFF0EF] border-b border-[#FECDCA] text-[#B42318] px-4 py-1.5 text-xs font-medium flex items-center justify-between gap-2 z-40">
        <div className="flex items-center gap-2 mx-auto">
          <span className="w-2 h-2 rounded-full bg-[#F04438] animate-pulse" />
          <span>
            <strong>EntityLocker Demo Environment</strong> — Synthetic institutional data for SIH 2026. Official statutory decisions remain with authorized human scrutiny officials.
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-2 text-[11px] text-[#5F6485]">
          <span>VerityAI Scrutiny Engine v0.2</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 bg-white border-r border-[#E9E6F2] flex-col justify-between shrink-0">
          <div>
            {/* Sidebar Brand Header */}
            <div className="p-5 border-b border-[#EEEAF5]">
              <EntityLockerLogo size="md" />
            </div>

            {/* Sidebar Navigation Items */}
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.key && viewMode === 'dashboard';
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      onViewModeChange('dashboard');
                      onTabChange(item.key);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all relative cursor-pointer ${
                      isActive
                        ? 'bg-[#F3EEFC] text-[#7450D8]'
                        : 'text-[#5F6485] hover:text-[#171B45] hover:bg-[#FAF8FF]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#7450D8] rounded-r-md" />
                    )}
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#7450D8]' : 'text-[#8589A6]'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Bottom: Scrutiny Session Info (Mandatory Truthful Display) */}
          <div className="p-4 m-3 rounded-2xl bg-[#FAF8FF] border border-[#DCD0F7]/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-[#171B45]">
                <ShieldCheck className="w-4 h-4 text-[#7450D8]" />
                <span>Scrutiny Session</span>
              </div>
              <span className={`font-bold text-[10px] uppercase ${currentUser ? 'text-[#12B886]' : 'text-[#8589A6]'}`}>
                {currentUser ? 'Active' : 'Guest'}
              </span>
            </div>
            <div className="text-[11px] text-[#5F6485] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-[#8589A6]">User:</span>
                <span className="font-semibold text-[#171B45] truncate max-w-[120px]">{currentUser ? currentUser.display_name : 'Guest User'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8589A6]">Role:</span>
                <span className="font-semibold text-[#7450D8]">{currentUser ? currentUser.role : 'GUEST / DEMO'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8589A6]">Engine:</span>
                <span className="font-mono text-[#7450D8]">VerityAI v0.2</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Topbar (Reference 4) */}
          <header className="sticky top-0 z-30 bg-white border-b border-[#E9E6F2] px-4 lg:px-8 py-3 flex items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3 flex-1 max-w-xl">
              {/* Mobile menu trigger */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg text-[#5F6485] hover:bg-[#F3EEFC] hover:text-[#7450D8] cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Global Search Bar */}
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8589A6]" />
                <input
                  type="text"
                  placeholder="Search applications, AISHE ID, institutions, documents..."
                  className="w-full text-xs rounded-xl border border-[#E9E6F2] bg-[#FAF9FC] pl-10 pr-4 py-2 text-[#171B45] placeholder-[#8589A6] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#7450D8]/20 focus:border-[#7450D8] transition-all"
                />
              </div>
            </div>

            {/* Right Topbar Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* View Switcher: Landing Page vs Portal */}
              <div className="hidden sm:inline-flex p-1 rounded-xl bg-[#FAF8FF] border border-[#DCD0F7]/60 text-xs font-semibold">
                <button
                  onClick={() => onViewModeChange('landing')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'landing'
                      ? 'bg-white text-[#7450D8] shadow-xs'
                      : 'text-[#5F6485] hover:text-[#171B45]'
                  }`}
                >
                  Landing
                </button>
                <button
                  onClick={() => onViewModeChange('dashboard')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'dashboard'
                      ? 'bg-white text-[#7450D8] shadow-xs'
                      : 'text-[#5F6485] hover:text-[#171B45]'
                  }`}
                >
                  Scrutiny Portal
                </button>
              </div>

              {/* API Live Status Probe */}
              <button
                onClick={onProbeClick}
                title="Click to check backend health status"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E9E6F2] bg-white hover:bg-[#FAF8FF] text-xs font-medium text-[#5F6485] transition-colors cursor-pointer"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    apiHealthy ? 'bg-[#12B886]' : 'bg-[#E34234]'
                  }`}
                />
                <span className="font-mono text-[11px]">API: {apiHealthy ? 'Live' : 'Check'}</span>
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button className="p-2 rounded-xl text-[#5F6485] hover:bg-[#F3EEFC] hover:text-[#7450D8] transition-colors cursor-pointer">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F04438]" />
                </button>
              </div>

              {/* User Profile Area */}
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-2.5 pl-2 border-l border-[#EEEAF5] hover:opacity-80 transition-opacity cursor-pointer text-left"
                title={currentUser ? `Signed in as ${currentUser.display_name} (${currentUser.role}). Click to manage session.` : 'Click to sign in'}
              >
                <div className="w-9 h-9 rounded-xl bg-[#7450D8] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {currentUser ? currentUser.display_name.slice(0, 2).toUpperCase() : 'SO'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-[#171B45] leading-tight flex items-center gap-1.5">
                    <span>{currentUser ? currentUser.display_name : 'Scrutiny Desk'}</span>
                  </div>
                  <div className="text-[11px] text-[#5F6485] leading-tight flex items-center gap-1">
                    <span className="font-semibold text-[#7450D8]">{currentUser ? currentUser.role : 'Regulatory Reviewer'}</span>
                    <span className="text-[#8589A6]">·</span>
                    <span className="text-[#8589A6] text-[10px] underline">{currentUser ? 'Manage' : 'Sign In'}</span>
                  </div>
                </div>
              </button>
            </div>
          </header>

          {/* Children View (Landing or Authenticated Portal) */}
          <main className="flex-1">{children}</main>

          {/* Standard Footer */}
          <footer className="border-t border-[#EEEAF5] bg-white py-4 px-6 text-center text-xs text-[#5F6485] flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <strong>EntityLocker</strong> — AI-Assisted Institutional Application Scrutiny & Document Locker
            </div>
            <div className="text-[11px] text-[#8589A6]">
              SIH 2026 Prototype · Synthetic Data Sandbox · AICTE Decision Support
            </div>
          </footer>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 bg-white border-r border-[#E9E6F2] flex flex-col justify-between p-4 z-10 animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EEEAF5] mb-4">
                <EntityLockerLogo size="sm" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-[#5F6485] hover:bg-[#F3EEFC]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* View switch on mobile */}
              <div className="mb-4 grid grid-cols-2 gap-1 p-1 bg-[#FAF8FF] border border-[#DCD0F7] rounded-xl text-xs font-semibold">
                <button
                  onClick={() => {
                    onViewModeChange('landing');
                    setMobileMenuOpen(false);
                  }}
                  className={`py-1.5 rounded-lg ${
                    viewMode === 'landing' ? 'bg-white text-[#7450D8] shadow-xs' : 'text-[#5F6485]'
                  }`}
                >
                  Landing
                </button>
                <button
                  onClick={() => {
                    onViewModeChange('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className={`py-1.5 rounded-lg ${
                    viewMode === 'dashboard' ? 'bg-white text-[#7450D8] shadow-xs' : 'text-[#5F6485]'
                  }`}
                >
                  Portal
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.key && viewMode === 'dashboard';
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        onViewModeChange('dashboard');
                        onTabChange(item.key);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
                        isActive
                          ? 'bg-[#F3EEFC] text-[#7450D8]'
                          : 'text-[#5F6485] hover:bg-[#FAF8FF]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#EEEAF5] text-[11px] text-[#8589A6]">
              VerityAI Scrutiny System
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
