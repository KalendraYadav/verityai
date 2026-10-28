import React, { useState } from 'react';
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
  ChevronRight,
  LogOut,
  Globe,
  Users,
  Cpu,
  User,
  Activity,
} from 'lucide-react';

import type { UserProfile } from '../../api/client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export type NavItemKey =
  | 'overview'
  | 'users'
  | 'applications'
  | 'scrutiny'
  | 'documents'
  | 'compliance'
  | 'institutions'
  | 'registry'
  | 'gateways'
  | 'audit'
  | 'platform';

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

/* ── Dynamic Navigation groups based on authenticated role ──────── */
export function getNavGroups(role?: string) {
  if (role === 'ADMIN') {
    return [
      {
        label: 'GOVERNANCE & ACCESS',
        items: [
          { key: 'overview' as NavItemKey, label: 'Executive Overview', icon: LayoutDashboard },
          { key: 'users' as NavItemKey, label: 'User & Role Access', icon: Users },
          { key: 'applications' as NavItemKey, label: 'Application Portfolio', icon: FileText },
          { key: 'institutions' as NavItemKey, label: 'Institutions', icon: Building2 },
        ],
      },
      {
        label: 'INDEPENDENT PLATFORM',
        items: [
          { key: 'platform' as NavItemKey, label: 'VerityAI Scrutiny Platform', icon: Cpu },
        ],
      },
      {
        label: 'REGULATORY & AUDIT',
        items: [
          { key: 'compliance' as NavItemKey, label: 'Regulatory Norms', icon: ShieldCheck },
          { key: 'registry' as NavItemKey, label: 'Statutory Registries', icon: Database },
          { key: 'gateways' as NavItemKey, label: 'Regulatory Gateways', icon: Network },
          { key: 'audit' as NavItemKey, label: 'Global Audit Trail', icon: History },
        ],
      },
    ];
  }

  if (role === 'INSTITUTION_USER') {
    return [
      {
        label: 'APPLICANT PORTAL',
        items: [
          { key: 'overview' as NavItemKey, label: 'Applicant Dashboard', icon: LayoutDashboard },
          { key: 'applications' as NavItemKey, label: 'My Applications', icon: FileText },
        ],
      },
      {
        label: 'INSTITUTIONAL DOSSIER',
        items: [
          { key: 'documents' as NavItemKey, label: 'Document Repository', icon: FolderOpen },
        ],
      },
    ];
  }

  // Scrutiny Officer (Reviewer) and default least-privilege view
  return [
    {
      label: 'SCRUTINY WORKSPACE',
      items: [
        { key: 'overview' as NavItemKey, label: 'Scrutiny Overview', icon: LayoutDashboard },
        { key: 'applications' as NavItemKey, label: 'Application Dossiers', icon: FileText },
        { key: 'scrutiny' as NavItemKey, label: 'Scrutiny Queue', icon: ClipboardCheck },
      ],
    },
    {
      label: 'INDEPENDENT ENGINE',
      items: [
        { key: 'platform' as NavItemKey, label: 'VerityAI Platform & APIs', icon: Cpu },
      ],
    },
    {
      label: 'EVIDENCE & VERIFICATION',
      items: [
        { key: 'documents' as NavItemKey, label: 'Document Repository', icon: FolderOpen },
        { key: 'compliance' as NavItemKey, label: 'Validation Norms', icon: ShieldCheck },
        { key: 'registry' as NavItemKey, label: 'Registry Verification', icon: Database },
      ],
    },
  ];
}

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
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-full text-sm font-sans transition-all relative cursor-pointer ${
        isActive
          ? 'bg-[#1F3954] text-[#FAF5F0] font-semibold shadow-xs'
          : 'text-[#536174] hover:text-[#202936] hover:bg-[#EAE4DC] font-medium'
      }`}
    >
      <Icon className={`size-4 shrink-0 ${isActive ? 'text-[#37C2CC]' : 'text-[#536174]'}`} />
      <span className="truncate">{item.label}</span>
      {isActive && <ChevronRight className="size-3.5 ml-auto text-[#37C2CC] shrink-0" />}
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
    <div className="flex flex-col h-full bg-[#F5EFEB] border-r border-[#E5DDD5]">
      {/* Brand Header */}
      <div className="shrink-0 px-5 py-4 border-b border-[#E5DDD5] flex items-center justify-between bg-[#F5EFEB]">
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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1F3954] flex items-center justify-center text-white shadow-xs border border-[#37C2CC]/30 shrink-0">
              <ShieldCheck className="size-4.5 text-[#37C2CC]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-display font-extrabold text-[17px] tracking-tight text-[#202936]">Verity<span className="text-[#0E7490]">AI</span></span>
                <span className="text-[#1F3954] font-bold text-[10px] uppercase tracking-wider bg-[#37C2CC]/25 px-1.5 py-0.5 rounded font-sans border border-[#37C2CC]/30">
                  Excel
                </span>
              </div>
              <span className="text-[11px] text-[#536174] font-medium tracking-normal mt-0.5 font-sans">
                Regulatory Scrutiny Workspace
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 min-h-0 px-3 py-4 space-y-5 overflow-y-auto">
        {getNavGroups(currentUser?.role).map((group) => (
          <div key={group.label}>
            <div className="px-3.5 mb-1.5 text-[11px] font-bold text-[#64748B] uppercase tracking-[0.06em] font-sans">
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

      {/* User Session & Actions - Fixed at bottom */}
      <div className="shrink-0 p-3 border-t border-[#E5DDD5] space-y-1.5 bg-[#F5EFEB] mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2.5 p-2 rounded-2xl bg-white/80 border border-[#E5DDD5] hover:bg-white transition-all cursor-pointer text-left shadow-xs">
              <Avatar className="size-8 rounded-full bg-[#1F3954] text-[#FAF5F0] font-semibold text-xs border border-[#37C2CC]/30">
                <AvatarFallback className="rounded-full bg-[#1F3954] text-[#FAF5F0] font-semibold">
                  {currentUser ? currentUser.display_name.slice(0, 2).toUpperCase() : 'G'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-[13px] font-semibold text-[#202936] truncate font-sans">
                  {currentUser ? currentUser.display_name : 'Guest User'}
                </div>
                <div className="text-xs text-[#0D7A48] font-semibold truncate font-sans">
                  {currentUser ? currentUser.role : 'Sign In Required'}
                </div>
              </div>
              <ChevronRight className="size-3.5 text-[#718096]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-white border-[#E5DDD5] rounded-2xl shadow-lg">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[#202936]">{currentUser?.display_name || 'Guest'}</span>
                <span className="text-[10px] text-[#718096] font-mono">{currentUser?.email || 'Unauthorized'}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onOpenAuthModal} className="cursor-pointer">
                <User className="size-3.5 mr-2" />
                <span>Switch Persona / Auth</span>
              </DropdownMenuItem>
              {onNavigateToLanding && (
                <DropdownMenuItem onClick={onNavigateToLanding} className="cursor-pointer">
                  <Globe className="size-3.5 mr-2 text-primary" />
                  <span>Public Portal</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            {currentUser && onLogout && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onLogout}
                  className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="size-3.5 mr-2" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {currentUser && onLogout && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onLogout();
              onClose?.();
            }}
            className="w-full h-8 px-3 text-xs font-medium justify-start text-[#66574F] hover:text-[#DC2626] hover:bg-[#FEE2E2]/60 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="size-3.5 mr-2 text-[#66574F]" />
            <span>Sign Out</span>
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── AppShell ───────────────────────────────────────────────────── */
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
    <div className="h-screen h-[100dvh] max-h-[100dvh] flex flex-col bg-[#FAF5F0] text-[#202936] font-sans overflow-hidden">
      {/* ── Accessible Skip to Main Content Link ─ */}
      <a href="#workspace-main" className="skip-link">
        Skip to main content
      </a>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop Sidebar - Stationary, full height */}
        <aside className="hidden lg:flex w-64 bg-[#F5EFEB] border-r border-[#E5DDD5] flex-col shrink-0 h-full overflow-hidden">
          <SidebarContent
            currentTab={currentTab}
            onTabChange={onTabChange}
            currentUser={currentUser}
            onOpenAuthModal={onOpenAuthModal}
            onNavigateToLanding={onNavigateToLanding}
            onLogout={onLogout}
          />
        </aside>

        {/* Main Workspace Area - Independently scrollable */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-[#FAF5F0]" id="workspace-scroll-container">
          {/* Topbar */}
          <header className="sticky top-0 z-30 shrink-0 bg-[#FAF5F0]/95 backdrop-blur-md border-b border-[#E5DDD5] px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 max-w-lg">
              {/* Mobile menu trigger */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden text-[#66574F]"
                aria-label="Open navigation menu"
              >
                <Menu className="size-4" />
              </Button>

              {/* Quick Search */}
              <div className="relative flex-1">
                <div className="verity-search-container">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className="size-4 verity-search-icon" />
                  </div>
                  <input
                    id="global-header-search"
                    name="global_search"
                    type="search"
                    placeholder="Search dossiers, institutions, statutory norms..."
                    aria-label="Search applications, documents, institutions"
                    className="verity-search-input"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-[#536174] hover:text-[#202936] hover:bg-[#EEE5DC] rounded-full relative"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
              </Button>

              <Separator orientation="vertical" className="h-5 hidden sm:block bg-[#E5DDD5]" />

              {/* User Dropdown Profile Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 pl-2 hover:opacity-85 transition-opacity cursor-pointer outline-none"
                    title={currentUser ? `${currentUser.display_name} · ${currentUser.role}` : 'Sign In'}
                  >
                    <Avatar className="size-8 rounded-full bg-[#1F3954] text-[#FAF5F0] font-semibold text-xs border border-[#37C2CC]/30">
                      <AvatarFallback className="rounded-full bg-[#1F3954] text-[#FAF5F0] font-semibold">
                        {currentUser ? currentUser.display_name.slice(0, 2).toUpperCase() : 'G'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left">
                      <div className="text-xs sm:text-[13px] font-semibold text-[#202936] leading-tight font-sans">
                        {currentUser ? currentUser.display_name : 'Guest User'}
                      </div>
                      <div className="text-xs text-[#0D7A48] font-semibold leading-tight font-sans">
                        {currentUser ? currentUser.role : 'Sign In'}
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>
                    <div className="text-xs font-semibold text-[#202936]">{currentUser?.display_name || 'Guest User'}</div>
                    <div className="text-[10px] text-[#718096] font-mono font-normal">{currentUser?.email || 'Not authenticated'}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={onOpenAuthModal} className="cursor-pointer">
                      <User className="size-3.5 mr-2" />
                      <span>Switch Role / Sign In</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onProbeClick} className="cursor-pointer justify-between">
                      <div className="flex items-center">
                        <Activity className="size-3.5 mr-2 text-primary" />
                        <span>Diagnostics &amp; Health</span>
                      </div>
                      <span className={`size-2 rounded-full ${apiHealthy ? 'bg-[#0D7A48]' : 'bg-[#B91C1C]'}`} title={apiHealthy ? 'API Active' : 'API Offline'} />
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  {currentUser && onLogout && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={onLogout}
                        className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <LogOut className="size-3.5 mr-2" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content Viewport */}
          <main id="workspace-main" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>

          {/* Institutional Footer */}
          <footer className="shrink-0 border-t border-[#E5DDD5] bg-[#FAF5F0] py-2.5 px-6 text-center text-xs text-[#536174] flex flex-col sm:flex-row items-center justify-between gap-2 font-sans font-normal">
            <span>
              <span className="font-semibold text-[#202936]">VerityAI</span> · Institutional Application Scrutiny System
            </span>
            <span className="text-xs text-[#718096] font-normal">
              Decision-Support Architecture · Transparent Evidence Provenance
            </span>
          </footer>
        </div>
      </div>

      {/* Accessible Mobile Navigation Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <SidebarContent
            currentTab={currentTab}
            onTabChange={onTabChange}
            currentUser={currentUser}
            onOpenAuthModal={onOpenAuthModal}
            onNavigateToLanding={onNavigateToLanding}
            onLogout={onLogout}
            onClose={() => setMobileMenuOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};
