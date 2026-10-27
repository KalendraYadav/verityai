import React, { useState, useEffect } from 'react';
import {
  fetchApplications,
  fetchAllDocuments,
  fetchAuditEvents,
  type ApplicationListItem,
  type DocumentListItem,
  type AuditEventItem,
} from '../../api/client';
import {
  FileText,
  Building2,
  ChevronRight,
  Clock,
  RefreshCw,
  Plus,
  Upload,
  ClipboardCheck,
  ArrowRight,
  ShieldCheck,
  History,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';

interface Props {
  onOpenNewApplication: () => void;
  onOpenUploadDocument?: () => void;
  onSelectApplication: (id: string) => void;
  onNavigateToTab?: (tab: string) => void;
  onInspectDocument?: (doc: DocumentListItem) => void;
  userRole?: string;
}

export const DashboardView: React.FC<Props> = ({
  onOpenNewApplication,
  onOpenUploadDocument,
  onSelectApplication,
  onNavigateToTab,
  onInspectDocument,
  userRole,
}) => {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  async function loadDashboardData() {
    try {
      const isPrivilegedAdmin = userRole === 'ADMIN';
      const [appsRes, docsRes, auditsRes] = await Promise.all([
        fetchApplications({ page_size: 10 }),
        fetchAllDocuments({ pageSize: 50 }),
        isPrivilegedAdmin ? fetchAuditEvents(6) : Promise.resolve([]),
      ]);
      setApplications(appsRes.data);
      setDocuments(docsRes.data);
      setAuditEvents(auditsRes);
    } catch (err: unknown) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    loadDashboardData();
  }

  // Real workload metrics directly computed from backend records
  const totalApps = applications.length;
  const submittedApps = applications.filter((a) => a.lifecycle_status === 'SUBMITTED').length;
  const draftApps = applications.filter((a) => a.lifecycle_status === 'DRAFT').length;

  const totalDocs = documents.length;
  const extractedDocs = documents.filter(
    (d) => d.processing_status === 'COMPLETED' || d.processing_status === 'COMPLETED_WITH_WARNINGS'
  ).length;
  const processingDocs = documents.filter(
    (d) => d.processing_status === 'PROCESSING' || d.processing_status === 'QUEUED'
  ).length;
  const reviewRequiredDocs = documents.filter(
    (d) => d.processing_status === 'MANUAL_REVIEW_REQUIRED' || d.processing_status === 'FAILED'
  ).length;

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1B1411]">
              {userRole === 'ADMIN'
                ? 'Executive Governance & Scrutiny Overview'
                : 'Scrutiny Officer Workspace Overview'}
            </h1>
          </div>
          <p className="text-xs text-[#66574F] mt-1">
            Operational overview of institutional applications, document processing, and scrutiny queue status.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh overview metrics"
            className="h-9 px-3.5 rounded-full border border-[#E5DACF] bg-white hover:bg-[#FAF5F0] text-[#66574F] hover:text-[#1B1411] inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-[#33CC7A]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {userRole !== 'REVIEWER' && onOpenUploadDocument && (
            <button
              type="button"
              onClick={onOpenUploadDocument}
              className="h-9 px-4 rounded-full border border-[#E5DACF] bg-white hover:bg-[#FAF5F0] text-[#1B1411] inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <Upload className="size-3.5 text-[#1F3954]" />
              <span>Upload Document</span>
            </button>
          )}

          {userRole !== 'REVIEWER' ? (
            <button
              type="button"
              onClick={onOpenNewApplication}
              className="h-9 px-4 rounded-full bg-[#33CC7A] hover:bg-[#2EB86E] text-[#1B1411] inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-all shadow-[0_2px_10px_rgba(51,204,122,0.25)] cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>New Application</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateToTab?.('scrutiny')}
              className="h-9 px-4 rounded-full bg-[#33CC7A] hover:bg-[#2EB86E] text-[#1B1411] inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-all shadow-[0_2px_10px_rgba(51,204,122,0.25)] cursor-pointer"
            >
              <ClipboardCheck className="size-3.5" />
              <span>Open Scrutiny Queue</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Real Workload Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Applications"
          value={loading ? '—' : totalApps}
          subtitle="Registered institutional dossiers"
          icon={FileText}
          onClick={() => onNavigateToTab?.('applications')}
        />
        <StatCard
          title="Awaiting Scrutiny"
          value={loading ? '—' : submittedApps}
          subtitle="Submitted & review ready"
          icon={ClipboardCheck}
          trend={{ value: 'Prioritized Queue', isPositive: true }}
          onClick={() => onNavigateToTab?.('scrutiny')}
        />
        <StatCard
          title="Draft Applications"
          value={loading ? '—' : draftApps}
          subtitle="Intake & upload in progress"
          icon={Clock}
          onClick={() => onNavigateToTab?.('applications')}
        />
        <StatCard
          title="Ingested Documents"
          value={loading ? '—' : totalDocs}
          subtitle={`${extractedDocs} extracted · ${reviewRequiredDocs} require review`}
          icon={ShieldCheck}
          onClick={() => onNavigateToTab?.('documents')}
        />
      </div>

      {/* 3. Central Application Scrutiny Queue Table */}
      <div className="bg-white rounded-2xl border border-[#E5DACF] shadow-[0_4px_24px_-4px_rgba(27,20,17,0.04)] overflow-hidden">
        <div className="p-5 border-b border-[#E5DACF] flex flex-row items-center justify-between bg-[#FAF5F0]/40">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2 text-[#1B1411]">
              <ClipboardCheck className="size-4 text-[#1F3954] shrink-0" />
              Active Application Workload &amp; Scrutiny Queue
            </h2>
            <p className="text-xs text-[#66574F] mt-0.5">
              Institutional dossiers requiring statutory document verification and officer review.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab?.('applications')}
            className="text-xs font-semibold text-[#1F3954] hover:text-[#1B1411] bg-[#EEE5DC]/70 hover:bg-[#EEE5DC] h-7 px-3 rounded-full inline-flex items-center transition-colors cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="size-3.5 ml-1" />
          </button>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : applications.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FileText}
                title="No applications registered in this environment"
                description="Initialize an institutional application or seed synthetic data to begin scrutiny testing."
                actionLabel="Create Application"
                onAction={onOpenNewApplication}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#FAF5F0] border-b border-[#E5DACF] text-[11px] font-mono font-bold text-[#66574F] uppercase tracking-wider hover:bg-transparent">
                  <TableHead className="py-3 px-4 text-[#66574F]">
                    APPLICATION REFERENCE
                  </TableHead>
                  <TableHead className="py-3 px-4 text-[#66574F]">
                    INSTITUTION
                  </TableHead>
                  <TableHead className="py-3 px-4 text-[#66574F]">
                    CATEGORY
                  </TableHead>
                  <TableHead className="py-3 px-4 text-[#66574F]">
                    LIFECYCLE STATUS
                  </TableHead>
                  <TableHead className="py-3 px-4 text-[#66574F]">
                    SUPPORTING DOCS
                  </TableHead>
                  <TableHead className="py-3 px-4 text-right text-[#66574F]">
                    ACTION
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow
                    key={app.id}
                    onClick={() => onSelectApplication(app.id)}
                    className="cursor-pointer hover:bg-[#FAF5F0]/60 border-b border-[#E5DACF]/60 transition-colors"
                  >
                    <TableCell className="py-3 px-4">
                      <div>
                        <p className="font-mono font-bold text-xs text-[#1B1411]">
                          {app.application_reference}
                        </p>
                        <p className="text-[10px] text-[#66574F]">
                          AY {app.academic_year || '2026-27'}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      <div className="font-medium text-xs text-[#1B1411] flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-[#66574F] shrink-0" />
                        <span className="truncate max-w-[200px]" title={app.institution.institution_name}>
                          {app.institution.institution_name}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#66574F] font-mono pl-5">
                        {app.institution.institution_identifier || app.institution.id.slice(0, 8)}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      <span className="font-mono text-[10px] rounded-full bg-[#EEE5DC] text-[#1B1411] px-2.5 py-0.5 font-bold">
                        {app.category_code}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      <StatusBadge status={app.lifecycle_status} category="lifecycle" />
                    </TableCell>

                    <TableCell className="py-3 px-4 text-xs text-[#66574F]">
                      <span className="font-bold text-[#1B1411]">
                        {documents.filter((d) => d.application_id === app.id).length}
                      </span>{' '}
                      documents
                    </TableCell>

                    <TableCell className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectApplication(app.id)}
                        className="h-7 text-xs gap-1 rounded-full border border-[#E5DACF] bg-[#FAF5F0] hover:bg-[#EEE5DC] text-[#1B1411] transition-colors"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="size-3 text-[#66574F]" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* 4. Operational Panels: Document Pipeline & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Document Intake & OCR Pipeline */}
        <Card className="lg:col-span-7 border-border shadow-[0_1px_3px_0_rgba(23,27,69,0.04)]">
          <CardHeader className="p-4 sm:p-5 border-b border-border flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <FileText className="size-4 text-primary shrink-0" />
                Document Intake & Extraction Pipeline
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                PyMuPDF digital extraction and RapidOCR scanned fallback tracking.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToTab?.('documents')}
              className="text-xs text-primary hover:text-primary hover:bg-secondary h-7 px-2"
            >
              All Docs ({totalDocs}) →
            </Button>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 block">EXTRACTED</span>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">{extractedDocs}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50/80 border border-blue-200">
                <span className="text-[10px] font-bold text-blue-800 block">IN PROGRESS</span>
                <p className="text-lg font-bold text-blue-700 mt-0.5">{processingDocs}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 block">NEEDS REVIEW</span>
                <p className="text-lg font-bold text-amber-700 mt-0.5">{reviewRequiredDocs}</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                Recent Ingested Dossier Files
              </span>

              {documents.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onInspectDocument?.(doc)}
                  className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="size-7 rounded-md bg-secondary text-primary flex items-center justify-center shrink-0">
                      <FileText className="size-3.5" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-medium text-xs text-foreground group-hover:text-primary transition-colors truncate" title={doc.original_filename}>
                        {doc.original_filename}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground truncate">
                        Format: {doc.media_type || 'application/pdf'} · {doc.page_count ? `${doc.page_count} pages` : 'Uploaded'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={doc.processing_status} category="pipeline" showIcon={false} />
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Scrutiny Guidelines OR Recent Audit Trail */}
        <Card className="lg:col-span-5 border-border shadow-[0_1px_3px_0_rgba(23,27,69,0.04)]">
          {userRole === 'ADMIN' ? (
            <>
              <CardHeader className="p-4 sm:p-5 border-b border-border flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <History className="size-4 text-primary shrink-0" />
                    Recent Audit Trail Events
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Immutable append-only regulatory log.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateToTab?.('audit')}
                  className="text-xs text-primary hover:text-primary hover:bg-secondary h-7 px-2"
                >
                  Full Log →
                </Button>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-3">
                {auditEvents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No audit events recorded yet.
                  </div>
                ) : (
                  auditEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2.5 rounded-lg border border-border bg-muted/20 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-[11px] font-mono">
                          {evt.event_type}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(evt.occurred_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Actor: {evt.actor_id || 'SYSTEM'} · Target: {evt.actor_type}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="p-4 sm:p-5 border-b border-border">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <ShieldCheck className="size-4 text-primary shrink-0" />
                  Statutory Scrutiny Directives
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Standard operating procedures for decision-support evaluation.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-secondary/60 border border-primary/20 space-y-1">
                  <span className="font-bold text-primary block text-[11px]">
                    1. Traceability Principle
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Every automated finding must link directly to the source document, page, and bounding box coordinates.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 space-y-1">
                  <span className="font-bold text-amber-900 block text-[11px]">
                    2. Human Authority Mandate
                  </span>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    AI flags and anomaly alerts are advisory indicators. Rejection and deficiency decisions require human officer sign-off.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1">
                  <span className="font-bold text-foreground block text-[11px]">
                    3. Registry Ground Truth
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    AISHE, Land, and GST checks use simulated external registries labeled honestly with verified timestamps.
                  </p>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};
