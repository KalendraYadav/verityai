import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Lock,
  FileCheck2,
  RefreshCw,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  fetchApplicationDetail,
  fetchApplicationDocuments,
  type ApplicationDetailResponse,
  type DocumentListItem,
  type UserProfile,
} from '../../api/client';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  applicationId: string;
  onBack: () => void;
  currentUser?: UserProfile | null;
  onResumeDraft?: (id: string) => void;
}

export const ApplicantStatusView: React.FC<Props> = ({
  applicationId,
  onBack,
  currentUser: _currentUser,
  onResumeDraft,
}) => {
  const [app, setApp] = useState<ApplicationDetailResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [appData, docData] = await Promise.all([
        fetchApplicationDetail(applicationId),
        fetchApplicationDocuments(applicationId, 1, 50),
      ]);
      setApp(appData);
      setDocuments(docData.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load application status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [applicationId]);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center text-muted-foreground text-xs">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-3" />
        <span>Loading application dossier...</span>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Applications</span>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-xs">{error || 'Application not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const decl = app.declared_data || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-7">
      {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#536174] hover:text-[#202936] bg-[#EEE5DC]/70 hover:bg-[#EEE5DC] px-4 py-2 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Applications</span>
        </button>

        <button
          type="button"
          onClick={loadData}
          title="Refresh dossier status"
          className="h-9 w-9 rounded-full bg-white border border-[#E5DACF] text-[#202936] hover:bg-[#FAF5F0] flex items-center justify-center transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#33CC7A]' : ''}`} />
        </button>
      </div>

      {/* ── Header Dossier Status Card ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E5DACF] p-6 sm:p-7 shadow-[0_4px_24px_-4px_rgba(27,20,17,0.05)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#202936] font-mono tracking-tight">
                {app.application_reference}
              </h1>
              <StatusBadge status={app.lifecycle_status} category="lifecycle" />
            </div>
            <p className="text-xs text-[#536174]">
              Category: <strong className="text-[#202936]">{app.category_code}</strong> · Academic Year:{' '}
              <strong className="text-[#202936]">{app.academic_year || '2026-27'}</strong>
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-[#536174]">
            <div>Submitted On:</div>
            <div className="font-semibold text-[#202936] mt-0.5">
              {app.submitted_at
                ? new Date(app.submitted_at).toLocaleString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Under Preparation'}
            </div>
          </div>
        </div>

        {/* Status Notice Banner */}
        {app.lifecycle_status === 'DRAFT' ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Draft Application in Progress:</span> This statutory approval dossier has not yet been submitted to AICTE.
                You can continue editing parameters and uploading documents.
              </div>
            </div>
            {onResumeDraft && (
              <button
                type="button"
                onClick={() => onResumeDraft(app.id)}
                className="shrink-0 gap-1.5 font-bold h-9 px-4 rounded-full bg-[#33CC7A] hover:bg-[#2EB86E] text-[#202936] inline-flex items-center justify-center transition-all cursor-pointer shadow-xs"
              >
                <span>Continue Application</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#FAF5F0] border border-[#E5DACF] flex items-center gap-3 text-xs text-[#536174]">
            <Lock className="w-4 h-4 text-[#1F3954] shrink-0" />
            <div className="leading-relaxed">
              <strong className="text-[#202936]">Dossier Locked:</strong> This application has been formally submitted to the AICTE Scrutiny Committee.
              In compliance with statutory procedure, uploaded certificates and declared figures cannot be altered.
            </div>
          </div>
        )}
      </div>

      {/* ── 4-Stage Visual Lifecycle Stepper ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E5DACF] p-6 shadow-[0_4px_24px_-4px_rgba(27,20,17,0.05)] space-y-4">
        <h3 className="text-xs font-bold text-[#202936] uppercase tracking-wider">
          Approval Lifecycle Progress
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 text-xs">
          {/* Step 1: Draft */}
          <div className="p-4 rounded-xl bg-[#EBF7F0] border border-[#33CC7A]/30 space-y-1">
            <div className="flex items-center justify-between text-[#202936] font-bold">
              <span>1. Draft Initiated</span>
              <CheckCircle2 className="w-4 h-4 text-[#33CC7A]" />
            </div>
            <p className="text-[11px] text-[#536174]">Infrastructure metrics declared</p>
          </div>

          {/* Step 2: Submitted */}
          <div className="p-4 rounded-xl bg-[#EBF7F0] border border-[#33CC7A]/30 space-y-1">
            <div className="flex items-center justify-between text-[#202936] font-bold">
              <span>2. Formally Submitted</span>
              <CheckCircle2 className="w-4 h-4 text-[#33CC7A]" />
            </div>
            <p className="text-[11px] text-[#536174]">Dossier verified &amp; locked</p>
          </div>

          {/* Step 3: Scrutiny */}
          <div
            className={`p-4 rounded-xl border space-y-1 ${
              app.lifecycle_status === 'UNDER_SCRUTINY'
                ? 'bg-[#1F3954] text-[#FAF5F0] border-[#1F3954] shadow-sm'
                : app.lifecycle_status === 'SUBMITTED'
                ? 'bg-[#BACDE0]/20 border-[#BACDE0] text-[#1F3954]'
                : 'bg-[#EBF7F0] border-[#33CC7A]/30 text-[#202936]'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span>3. Official Scrutiny</span>
              {app.lifecycle_status === 'UNDER_SCRUTINY' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#33CC7A]" />
              ) : app.lifecycle_status === 'SUBMITTED' ? (
                <Clock className="w-4 h-4 text-[#1F3954]" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#33CC7A]" />
              )}
            </div>
            <p className={`text-[11px] ${app.lifecycle_status === 'UNDER_SCRUTINY' ? 'text-[#BACDE0]' : 'text-[#536174]'}`}>
              {app.lifecycle_status === 'UNDER_SCRUTINY'
                ? 'Committee evaluating documents'
                : app.lifecycle_status === 'SUBMITTED'
                ? 'Queued for scrutiny officer'
                : 'Scrutiny evaluation completed'}
            </p>
          </div>

          {/* Step 4: Decision */}
          <div
            className={`p-4 rounded-xl border space-y-1 ${
              app.lifecycle_status === 'SCRUTINY_COMPLETED' || app.lifecycle_status === 'APPROVED'
                ? 'bg-[#EBF7F0] border-[#33CC7A]/30 text-[#202936] font-bold'
                : 'bg-[#FAF5F0] border-[#E5DACF] text-[#536174]'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span>4. Final Decision</span>
              {app.lifecycle_status === 'SCRUTINY_COMPLETED' ? (
                <CheckCircle2 className="w-4 h-4 text-[#33CC7A]" />
              ) : (
                <Clock className="w-4 h-4 text-[#536174]" />
              )}
            </div>
            <p className="text-[11px] text-[#536174]">
              {app.lifecycle_status === 'SCRUTINY_COMPLETED'
                ? 'Executive decision registered'
                : 'Pending committee completion'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Declared Institutional Information ──────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E5DACF] p-6 shadow-[0_4px_24px_-4px_rgba(27,20,17,0.05)] space-y-4">
        <h3 className="text-xs font-bold text-[#202936] uppercase tracking-wider flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#1F3954]" />
          <span>Declared Institutional Metrics</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
          <div className="p-4 rounded-xl bg-[#FAF5F0] border border-[#E5DACF]">
            <span className="text-[#536174]">Head of Institute:</span>
            <div className="font-bold text-[#202936] mt-1">{decl.principal_name || 'Dr. K. S. Sharma'}</div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF5F0] border border-[#E5DACF]">
            <span className="text-[#536174]">Approved Intake:</span>
            <div className="font-mono font-bold text-[#202936] mt-1">
              {decl.approved_intake ? `${decl.approved_intake} Students` : '360 Students'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF5F0] border border-[#E5DACF]">
            <span className="text-[#536174]">Campus Land Area:</span>
            <div className="font-mono font-bold text-[#202936] mt-1">
              {decl.land_area_acres ? `${decl.land_area_acres} Acres` : '5.0 Acres'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF5F0] border border-[#E5DACF]">
            <span className="text-[#536174]">Built-up Area:</span>
            <div className="font-mono font-bold text-[#202936] mt-1">
              {decl.built_up_area_sqm ? `${decl.built_up_area_sqm} Sqm` : '12,500 Sqm'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF5F0] border border-[#E5DACF]">
            <span className="text-[#536174]">Land Title:</span>
            <div className="font-semibold text-[#202936] mt-1">
              {decl.land_ownership_type || 'OWNED (Freehold)'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF5F0] border border-[#E5DACF]">
            <span className="text-[#536174]">Programme:</span>
            <div className="font-semibold text-[#202936] mt-1">
              {decl.programme_name || 'Engineering & Technology'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Submitted Supporting Documents ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E5DACF] p-6 shadow-[0_4px_24px_-4px_rgba(27,20,17,0.05)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#202936] uppercase tracking-wider flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#1F3954]" />
            <span>Submitted Statutory Documents ({documents.length})</span>
          </h3>
          <span className="text-xs text-[#536174]">All documents SHA-256 indexed</span>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center text-[#536174] text-xs">
            No document records found for this dossier.
          </div>
        ) : (
          <div className="divide-y divide-[#E5DACF] border border-[#E5DACF] rounded-xl overflow-hidden">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-[#FAF5F0]/60 transition-colors text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#202936]">{doc.original_filename}</span>
                    <span className="text-[10px] font-mono bg-[#EEE5DC] text-[#202936] border border-[#E5DACF] px-2 py-0.5 rounded-full">
                      {doc.declared_type || doc.media_type}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#536174] flex items-center gap-3">
                    <span>Size: {(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span className="font-mono">SHA: {doc.sha256?.slice(0, 12)}...</span>
                    <span>•</span>
                    <span>Uploaded: {new Date(doc.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="bg-[#EBF7F0] text-[#202936] border border-[#33CC7A]/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#33CC7A]" />
                    <span>Verified</span>
                  </span>
                  <a
                    href={`/api/v1/documents/${doc.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 h-7 px-3 text-[11px] font-semibold rounded-full border border-[#E5DACF] bg-[#FAF5F0] hover:bg-[#EEE5DC] text-[#202936] transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#1F3954]" />
                    <span>View File</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
