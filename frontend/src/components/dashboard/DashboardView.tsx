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
  AlertTriangle,
  ChevronRight,
  Clock,
  CheckCircle2,
  RefreshCw,
  Plus,
  Upload,
  ClipboardCheck,
  Layers,
  ArrowRight,
  ShieldCheck,
  History,
} from 'lucide-react';

interface Props {
  onOpenNewApplication: () => void;
  onOpenUploadDocument?: () => void;
  onSelectApplication: (id: string) => void;
  onNavigateToTab?: (tab: string) => void;
  onInspectDocument?: (doc: DocumentListItem) => void;
}

export const DashboardView: React.FC<Props> = ({
  onOpenNewApplication,
  onOpenUploadDocument,
  onSelectApplication,
  onNavigateToTab,
  onInspectDocument,
}) => {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  async function loadDashboardData() {
    try {
      const [appsRes, docsRes, auditsRes] = await Promise.all([
        fetchApplications({ page_size: 10 }),
        fetchAllDocuments({ pageSize: 50 }),
        fetchAuditEvents(6),
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

  // Format timestamp helper
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

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8FF] text-[#7450D8] border border-[#DCD0F7]">
            <Clock className="w-3 h-3" />
            DRAFT
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
            <CheckCircle2 className="w-3 h-3 text-sky-600" />
            SUBMITTED
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F3EEFC] text-[#5633B8] border border-[#CBB3E8]">
            <Layers className="w-3 h-3" />
            UNDER SCRUTINY
          </span>
        );
      case 'FLAGGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF0EF] text-[#B42318] border border-[#FECDCA]">
            <AlertTriangle className="w-3 h-3 text-[#F04438]" />
            FLAGGED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF9FC] text-[#5F6485] border border-[#E9E6F2]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* 1. Header: Purpose-Driven for Government Scrutiny Reviewer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#171B45]">
              Institutional Scrutiny Overview
            </h1>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#F3EEFC] text-[#7450D8] border border-[#DCD0F7]">
              AICTE Prototype
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5F6485] mt-0.5">
            Real-time institutional application intake, document text extraction status, and evidence-linked scrutiny workflow.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white border border-[#E9E6F2] text-[#5F6485] hover:text-[#7450D8] hover:border-[#DCD0F7] shadow-2xs transition-all cursor-pointer"
            title="Refresh overview data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#7450D8]' : ''}`} />
          </button>

          {onOpenUploadDocument && (
            <button
              onClick={onOpenUploadDocument}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#DCD0F7] bg-white text-xs font-semibold text-[#171B45] hover:bg-[#F3EEFC] hover:text-[#7450D8] transition-all cursor-pointer shadow-2xs"
            >
              <Upload className="w-4 h-4 text-[#7450D8]" />
              <span>Upload Document</span>
            </button>
          )}

          <button
            onClick={onOpenNewApplication}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#F04438] text-white hover:bg-[#E34234] transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Application</span>
          </button>
        </div>
      </div>

      {/* 2. Real Workload Summary Cards (Strictly factual, no fabricated percentages) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <div
          onClick={() => onNavigateToTab?.('applications')}
          className="bg-white p-5 rounded-2xl border border-[#E9E6F2] shadow-xs flex items-center justify-between hover:border-[#DCD0F7] transition-all cursor-pointer group"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#5F6485] uppercase tracking-wider text-[10px]">
              Total Applications
            </span>
            <div className="text-2xl font-extrabold text-[#171B45] group-hover:text-[#7450D8] transition-colors">
              {loading ? '—' : totalApps}
            </div>
            <p className="text-[11px] text-[#8589A6]">Registered approval requests</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#F3EEFC] flex items-center justify-center text-[#7450D8] shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Awaiting Scrutiny */}
        <div
          onClick={() => onNavigateToTab?.('scrutiny')}
          className="bg-white p-5 rounded-2xl border border-[#E9E6F2] shadow-xs flex items-center justify-between hover:border-[#DCD0F7] transition-all cursor-pointer group"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#5F6485] uppercase tracking-wider text-[10px]">
              Awaiting Scrutiny
            </span>
            <div className="text-2xl font-extrabold text-[#171B45] group-hover:text-[#7450D8] transition-colors">
              {loading ? '—' : submittedApps}
            </div>
            <p className="text-[11px] text-sky-700 font-semibold">Ready for review</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Draft Applications */}
        <div
          onClick={() => onNavigateToTab?.('applications')}
          className="bg-white p-5 rounded-2xl border border-[#E9E6F2] shadow-xs flex items-center justify-between hover:border-[#DCD0F7] transition-all cursor-pointer group"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#5F6485] uppercase tracking-wider text-[10px]">
              Draft Applications
            </span>
            <div className="text-2xl font-extrabold text-[#171B45] group-hover:text-[#7450D8] transition-colors">
              {loading ? '—' : draftApps}
            </div>
            <p className="text-[11px] text-[#8589A6]">Intake in progress</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#FAF8FF] flex items-center justify-center text-[#7450D8] shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Ingested Documents & Extraction State */}
        <div
          onClick={() => onNavigateToTab?.('documents')}
          className="bg-white p-5 rounded-2xl border border-[#E9E6F2] shadow-xs flex items-center justify-between hover:border-[#DCD0F7] transition-all cursor-pointer group"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#5F6485] uppercase tracking-wider text-[10px]">
              Ingested Documents
            </span>
            <div className="text-2xl font-extrabold text-[#171B45] group-hover:text-[#7450D8] transition-colors">
              {loading ? '—' : totalDocs}
            </div>
            <p className="text-[11px] text-[#027A48] font-semibold">
              {extractedDocs} extracted • {reviewRequiredDocs > 0 ? `${reviewRequiredDocs} review` : '0 issues'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#ECFDF3] flex items-center justify-center text-[#027A48] shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Central Application Scrutiny Queue Table */}
      <div className="bg-white rounded-3xl border border-[#E9E6F2] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#EEEAF5] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#171B45] flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-[#7450D8]" />
              Active Application Workload & Scrutiny Queue
            </h2>
            <p className="text-[11px] text-[#5F6485]">
              Institutional submissions requiring regulatory document review, field checks, and verification.
            </p>
          </div>

          <button
            onClick={() => onNavigateToTab?.('applications')}
            className="text-xs font-semibold text-[#7450D8] hover:text-[#5633B8] flex items-center gap-1 cursor-pointer"
          >
            <span>View All Applications</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#5F6485] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#7450D8] mx-auto" />
            <p>Loading application scrutiny queue...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5F6485] space-y-2">
            <FileText className="w-8 h-8 text-[#8589A6] mx-auto" />
            <p className="font-semibold text-[#171B45]">No applications registered in this environment</p>
            <p className="text-[11px] max-w-sm mx-auto">
              Create an institutional application or run the database seeder to begin scrutiny testing.
            </p>
            <button
              onClick={onOpenNewApplication}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F04438] text-white text-xs font-semibold mt-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Create Application
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EEEAF5] bg-[#FAF9FC] text-[#8589A6] font-semibold text-[11px]">
                  <th className="py-3 px-5">APPLICATION REFERENCE</th>
                  <th className="py-3 px-4">INSTITUTION</th>
                  <th className="py-3 px-4">CATEGORY</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">DOCUMENTS</th>
                  <th className="py-3 px-5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEAF5]">
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => onSelectApplication(app.id)}
                    className="hover:bg-[#FAF8FF] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F3EEFC] text-[#7450D8] flex items-center justify-center font-bold text-[10px] shrink-0">
                          APP
                        </div>
                        <div>
                          <p className="font-mono font-bold text-[#171B45] group-hover:text-[#7450D8] transition-colors">
                            {app.application_reference}
                          </p>
                          <p className="text-[10px] text-[#8589A6]">
                            Academic Year {app.academic_year || '2026-27'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#171B45] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#8589A6] shrink-0" />
                        <span className="truncate max-w-[200px]" title={app.institution.institution_name}>
                          {app.institution.institution_name}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#8589A6] font-mono pl-5">
                        {app.institution.institution_identifier || app.institution.id}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] font-semibold text-[#7450D8] bg-[#F3EEFC] px-2 py-0.5 rounded">
                        {app.category_code}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {renderStatusBadge(app.lifecycle_status)}
                    </td>

                    <td className="py-3.5 px-4 text-[#5F6485]">
                      <span className="font-semibold text-[#171B45]">
                        {documents.filter((d) => d.application_id === app.id).length} uploaded
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectApplication(app.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#DCD0F7] bg-white text-xs font-semibold text-[#7450D8] hover:bg-[#F3EEFC] transition-colors cursor-pointer shadow-2xs"
                      >
                        <span>Open Workspace</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Two Real Operational Panels: Document Processing Pipeline & Regulatory Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (7 cols): Document Processing & OCR Intake Breakdown */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E9E6F2] shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#EEEAF5] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#171B45] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#7450D8]" />
                Document Intake & OCR Pipeline
              </h3>
              <p className="text-[11px] text-[#5F6485]">
                PyMuPDF digital extraction and RapidOCR scanned fallback status.
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab?.('documents')}
              className="text-xs font-semibold text-[#7450D8] hover:underline"
            >
              All Documents ({totalDocs}) →
            </button>
          </div>

          {/* Extraction Breakdown Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-3 rounded-xl bg-[#ECFDF3] border border-[#D1FADF]">
              <span className="text-[10px] font-bold text-[#027A48] block">EXTRACTED</span>
              <p className="text-lg font-extrabold text-[#027A48] mt-0.5">{extractedDocs}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#EFF8FF] border border-[#B2DDFF]">
              <span className="text-[10px] font-bold text-[#175CD3] block">IN PROGRESS</span>
              <p className="text-lg font-extrabold text-[#175CD3] mt-0.5">{processingDocs}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#FFF6ED] border border-[#FECDCA]">
              <span className="text-[10px] font-bold text-[#C4320A] block">NEEDS REVIEW</span>
              <p className="text-lg font-extrabold text-[#C4320A] mt-0.5">{reviewRequiredDocs}</p>
            </div>
          </div>

          {/* Recent Document List */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] uppercase font-bold text-[#8589A6] block">
              Recent Ingested Files:
            </span>

            {documents.slice(0, 4).map((doc) => (
              <div
                key={doc.id}
                onClick={() => onInspectDocument?.(doc)}
                className="p-3 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2] hover:border-[#DCD0F7] transition-all flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-7 h-7 rounded-lg bg-[#F3EEFC] text-[#7450D8] flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-xs text-[#171B45] group-hover:text-[#7450D8] transition-colors truncate" title={doc.original_filename}>
                      {doc.original_filename}
                    </p>
                    <p className="text-[10px] font-mono text-[#8589A6]">
                      App: {doc.application_id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      doc.processing_status === 'COMPLETED'
                        ? 'bg-[#ECFDF3] text-[#027A48]'
                        : doc.processing_status === 'MANUAL_REVIEW_REQUIRED'
                        ? 'bg-[#FFF6ED] text-[#C4320A]'
                        : 'bg-[#F3EEFC] text-[#7450D8]'
                    }`}
                  >
                    {doc.processing_status}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8589A6]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Immutable Regulatory Audit Trail Feed */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#E9E6F2] shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#EEEAF5] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#171B45] flex items-center gap-2">
                <History className="w-4 h-4 text-[#7450D8]" />
                Recent Audit Trail Events
              </h3>
              <p className="text-[11px] text-[#5F6485]">
                Immutable, append-only regulatory log.
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab?.('audit')}
              className="text-xs font-semibold text-[#7450D8] hover:underline"
            >
              Full Log →
            </button>
          </div>

          {auditEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5F6485]">
              No audit events recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {auditEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2] space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-[#7450D8] bg-white px-2 py-0.5 rounded border border-[#E9E6F2]">
                      {evt.event_type}
                    </span>
                    <span className="text-[10px] text-[#8589A6]">
                      {formatDate(evt.occurred_at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5F6485]">
                    Actor: <span className="font-semibold text-[#171B45]">{evt.actor_id || 'System Worker'}</span>
                    {evt.application_id && <span> • App: {evt.application_id}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
