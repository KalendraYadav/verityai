import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  FileText,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Download,
  RefreshCw,
  Layers,
  History,
  Check,
  X,
  FileQuestion,
  AlertCircle,
  HelpCircle,
  XCircle,
  CheckCircle,
  Filter,
} from 'lucide-react';
import {
  fetchApplicationDetail,
  fetchApplicationDocuments,
  fetchApplicationAudit,
  fetchCategories,
  getDocumentFileUrl,
  fetchApplicationValidationSummary,
  triggerApplicationValidation,
  type ApplicationDetailResponse,
  type DocumentListItem,
  type AuditEventItem,
  type ApplicationCategory,
  type ValidationSummaryData,
} from '../../api/client';
import { DocumentUploadModal } from '../documents/DocumentUploadModal';

interface Props {
  applicationId: string;
  onBack: () => void;
  onInspectDocument?: (doc: DocumentListItem) => void;
}

export const ApplicationDetailWorkspace: React.FC<Props> = ({
  applicationId,
  onBack,
  onInspectDocument,
}) => {
  const [application, setApplication] = useState<ApplicationDetailResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [categories, setCategories] = useState<ApplicationCategory[]>([]);
  const [validationSummary, setValidationSummary] = useState<ValidationSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resultFilter, setResultFilter] = useState<'ALL' | 'PASS' | 'FAIL' | 'NEEDS_REVIEW' | 'UNABLE_TO_EVALUATE'>('ALL');

  const [activeSubTab, setActiveSubTab] = useState<'documents' | 'validation' | 'requirements' | 'audit' | 'institution'>('documents');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  async function loadWorkspaceData() {
    setLoading(true);
    setError(null);
    try {
      const [appData, docsData, auditData, catsData, valData] = await Promise.all([
        fetchApplicationDetail(applicationId),
        fetchApplicationDocuments(applicationId, 1, 100),
        fetchApplicationAudit(applicationId),
        fetchCategories(),
        fetchApplicationValidationSummary(applicationId).catch(() => null),
      ]);
      setApplication(appData);
      setDocuments(docsData.data);
      setAuditEvents(auditData);
      setCategories(catsData);
      if (valData) {
        setValidationSummary(valData);
      }
    } catch (err: any) {
      console.error('Failed to load application detail workspace', err);
      setError(err.message || 'Failed to load application workspace');
    } finally {
      setLoading(false);
    }
  }

  async function handleTriggerValidation() {
    setValidating(true);
    setValidationError(null);
    try {
      const summary = await triggerApplicationValidation(applicationId);
      setValidationSummary(summary);
      const [appData, auditData] = await Promise.all([
        fetchApplicationDetail(applicationId),
        fetchApplicationAudit(applicationId),
      ]);
      setApplication(appData);
      setAuditEvents(auditData);
      setActiveSubTab('validation');
    } catch (err: any) {
      console.error('Validation failed', err);
      setValidationError(err.message || 'Failed to execute validation rules');
    } finally {
      setValidating(false);
    }
  }

  useEffect(() => {
    loadWorkspaceData();
  }, [applicationId]);

  const currentCategory = categories.find((c) => c.code === application?.category_code);

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FAF8FF] text-[#7450D8] border border-[#DCD0F7]">
            <Clock className="w-3.5 h-3.5" />
            DRAFT
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
            SUBMITTED FOR SCRUTINY
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F3EEFC] text-[#5633B8] border border-[#CBB3E8]">
            <Layers className="w-3.5 h-3.5" />
            UNDER SCRUTINY
          </span>
        );
      case 'FLAGGED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFF0EF] text-[#B42318] border border-[#FECDCA]">
            <AlertTriangle className="w-3.5 h-3.5 text-[#F04438]" />
            NEEDS ATTENTION
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#FAF9FC] text-[#5F6485] border border-[#E9E6F2]">
            {status}
          </span>
        );
    }
  };

  const renderDocumentStatusBadge = (docStatus: string) => {
    switch (docStatus) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF3] text-[#027A48] border border-[#D1FADF]">
            <Check className="w-3 h-3 text-[#12B886]" />
            COMPLETED
          </span>
        );
      case 'COMPLETED_WITH_WARNINGS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]">
            <AlertCircle className="w-3 h-3 text-[#F79009]" />
            WARNINGS
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
            <RefreshCw className="w-3 h-3 animate-spin text-[#175CD3]" />
            PROCESSING
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F3EEFC] text-[#7450D8] border border-[#DCD0F7]">
            <Clock className="w-3 h-3" />
            QUEUED
          </span>
        );
      case 'MANUAL_REVIEW_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF6ED] text-[#C4320A] border border-[#FECDCA]">
            <FileQuestion className="w-3 h-3 text-[#E34234]" />
            NEEDS REVIEW
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]">
            <X className="w-3 h-3 text-[#F04438]" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF9FC] text-[#5F6485]">
            {docStatus}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#7450D8] mx-auto" />
        <h3 className="text-sm font-bold text-[#171B45]">Loading Application Scrutiny Workspace...</h3>
        <p className="text-xs text-[#5F6485]">Retrieving application dossier, documents, and audit records.</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#7450D8] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Applications
        </button>
        <div className="bg-[#FFF4F3] border border-[#FECDCA] rounded-2xl p-6 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-[#F04438] mx-auto" />
          <h3 className="text-sm font-bold text-[#B42318]">Application Not Found or Error Loading</h3>
          <p className="text-xs text-[#5F6485]">{error}</p>
        </div>
      </div>
    );
  }

  // Check required document completeness
  const requiredDocTypes = currentCategory?.required_document_types || [];
  const uploadedTypes = new Set(
    documents.map((d) => d.declared_type || d.detected_type || d.effective_type).filter(Boolean)
  );

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* 1. Top Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E9E6F2] text-xs font-bold text-[#5F6485] hover:text-[#171B45] hover:border-[#DCD0F7] transition-all shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Applications</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={loadWorkspaceData}
            className="p-2.5 rounded-xl bg-white border border-[#E9E6F2] text-[#5F6485] hover:text-[#7450D8] shadow-2xs transition-all cursor-pointer"
            title="Refresh application workspace"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleTriggerValidation}
            disabled={validating}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7450D8] hover:bg-[#623ec2] disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
            title="Execute deterministic compliance rules against application & documents"
          >
            <RefreshCw className={`w-4 h-4 ${validating ? 'animate-spin' : ''}`} />
            <span>{validating ? 'Evaluating...' : validationSummary ? 'Re-run Validation' : 'Run Scrutiny Validation'}</span>
          </button>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F04438] hover:bg-[#E34234] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Supporting Document</span>
          </button>
        </div>
      </div>

      {/* 2. Application Scrutiny Header Dossier Card */}
      <div className="bg-white rounded-3xl border border-[#E9E6F2] shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EEEAF5] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-base sm:text-lg font-extrabold text-[#171B45]">
                {application.application_reference}
              </span>
              {renderStatusBadge(application.lifecycle_status)}
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#F3EEFC] text-[#7450D8] border border-[#DCD0F7]">
                {application.category_code}
              </span>
            </div>
            <p className="text-xs text-[#5F6485] flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-[#171B45]">
                <Building2 className="w-3.5 h-3.5 text-[#7450D8]" />
                {application.institution.institution_name}
              </span>
              <span>•</span>
              <span className="font-mono text-[11px]">
                ID: {application.institution.institution_identifier || application.institution.id}
              </span>
              <span>•</span>
              <span>Academic Year: {application.academic_year || '2026-27'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#5F6485]">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#8589A6]">Created</span>
              <p className="font-medium text-[#171B45] text-xs">{formatDate(application.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Quick Scrutiny Stat Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2]">
            <span className="text-[10px] uppercase font-bold text-[#5F6485]">Submitted Documents</span>
            <p className="text-base font-extrabold text-[#171B45] mt-0.5">{documents.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2]">
            <span className="text-[10px] uppercase font-bold text-[#5F6485]">Text Extracted</span>
            <p className="text-base font-extrabold text-[#027A48] mt-0.5">
              {documents.filter((d) => d.processing_status === 'COMPLETED' || d.processing_status === 'COMPLETED_WITH_WARNINGS').length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2]">
            <span className="text-[10px] uppercase font-bold text-[#5F6485]">Validation Engine</span>
            {validationSummary ? (
              <p className={`text-xs font-extrabold mt-1 truncate ${
                validationSummary.failed > 0
                  ? 'text-[#B42318]'
                  : validationSummary.needs_review > 0
                  ? 'text-[#C4320A]'
                  : 'text-[#027A48]'
              }`}>
                {validationSummary.failed > 0
                  ? `${validationSummary.failed} Failed / ${validationSummary.total_rules} Rules`
                  : validationSummary.needs_review > 0
                  ? `${validationSummary.needs_review} Needs Review`
                  : `${validationSummary.passed}/${validationSummary.total_rules} Passed`}
              </p>
            ) : (
              <p className="text-xs font-bold text-[#8589A6] mt-1">Pending Validation</p>
            )}
          </div>
          <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2]">
            <span className="text-[10px] uppercase font-bold text-[#5F6485]">Regulatory Category</span>
            <p className="text-xs font-bold text-[#7450D8] mt-1 truncate" title={currentCategory?.name || application.category_code}>
              {currentCategory?.name || application.category_code}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Sub-Tab Navigation */}
      <div className="bg-white rounded-2xl border border-[#E9E6F2] shadow-2xs overflow-hidden">
        <div className="px-5 border-b border-[#E9E6F2] flex items-center gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('documents')}
            className={`py-3.5 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'documents'
                ? 'border-[#7450D8] text-[#7450D8]'
                : 'border-transparent text-[#5F6485] hover:text-[#171B45]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Submitted Documents & OCR ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('validation')}
            className={`py-3.5 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'validation'
                ? 'border-[#7450D8] text-[#7450D8]'
                : 'border-transparent text-[#5F6485] hover:text-[#171B45]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              Validation Rules & Results {validationSummary ? `(${validationSummary.results.length})` : ''}
            </span>
            {validationSummary && validationSummary.failed > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#F04438]" title="Has failed rules" />
            )}
            {validationSummary && validationSummary.failed === 0 && validationSummary.needs_review > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#F79009]" title="Needs human review" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('requirements')}
            className={`py-3.5 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'requirements'
                ? 'border-[#7450D8] text-[#7450D8]'
                : 'border-transparent text-[#5F6485] hover:text-[#171B45]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Declared Data & Checklist</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`py-3.5 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'audit'
                ? 'border-[#7450D8] text-[#7450D8]'
                : 'border-transparent text-[#5F6485] hover:text-[#171B45]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Scrutiny Audit Trail ({auditEvents.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('institution')}
            className={`py-3.5 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'institution'
                ? 'border-[#7450D8] text-[#7450D8]'
                : 'border-transparent text-[#5F6485] hover:text-[#171B45]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Institution Dossier</span>
          </button>
        </div>

        {/* Tab 1: Documents & Extraction */}
        {activeSubTab === 'documents' && (
          <div className="p-4 sm:p-6 space-y-4">
            {documents.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <FileText className="w-10 h-10 text-[#8589A6] mx-auto" />
                <h4 className="text-sm font-bold text-[#171B45]">No documents uploaded for this application</h4>
                <p className="text-xs text-[#5F6485] max-w-sm mx-auto">
                  Upload the mandatory institutional documents (e.g. NOC, Land/Building Certificate, Approval Letter) to enable extraction and scrutiny.
                </p>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F04438] text-white text-xs font-semibold hover:bg-[#E34234] transition-all cursor-pointer shadow-xs mt-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload First Document
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#EEEAF5] bg-[#FAF9FC] text-[#8589A6] font-semibold text-[11px]">
                      <th className="py-3 px-4">DOCUMENT / HASH</th>
                      <th className="py-3 px-4">TYPE</th>
                      <th className="py-3 px-4">PAGES / SIZE</th>
                      <th className="py-3 px-4">EXTRACTION STATUS</th>
                      <th className="py-3 px-4">UPLOADED</th>
                      <th className="py-3 px-4 text-right">SCRUTINY ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEAF5]">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-[#FAF8FF] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#F3EEFC] text-[#7450D8] flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="overflow-hidden max-w-[240px]">
                              <p className="font-bold text-[#171B45] truncate" title={doc.original_filename}>
                                {doc.original_filename}
                              </p>
                              <p className="text-[10px] font-mono text-[#8589A6] truncate" title={doc.sha256}>
                                SHA: {doc.sha256.substring(0, 16)}...
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-medium text-[#171B45]">
                            {doc.declared_type || doc.media_type.split('/')[1]?.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[#5F6485]">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#171B45]">
                              {doc.page_count !== null && doc.page_count !== undefined ? `${doc.page_count} pg` : '—'}
                            </span>
                            <span className="font-mono text-[10px]">{formatBytes(doc.file_size_bytes)}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            {renderDocumentStatusBadge(doc.processing_status)}
                            {doc.extraction_quality_band && (
                              <span className="text-[10px] font-semibold text-[#7450D8]">
                                Band: {doc.extraction_quality_band}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[#8589A6] text-[11px]">
                          {formatDate(doc.created_at)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {onInspectDocument && (
                              <button
                                onClick={() => onInspectDocument(doc)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DCD0F7] bg-[#FAF8FF] text-[11px] font-semibold text-[#7450D8] hover:bg-[#F3EEFC] transition-colors cursor-pointer"
                                title="Inspect Extracted Text and OCR Records"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect OCR</span>
                              </button>
                            )}

                            <a
                              href={getDocumentFileUrl(doc.id, true)}
                              download={doc.original_filename}
                              className="p-1 rounded-lg border border-[#E9E6F2] text-[#5F6485] hover:text-[#171B45] hover:bg-white transition-colors"
                              title="Download original document file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Validation Rules & Results (Phase 5 Deterministic Engine) */}
        {activeSubTab === 'validation' && (
          <div className="p-4 sm:p-6 space-y-6">
            {validationError && (
              <div className="p-4 rounded-2xl bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
                <button
                  onClick={() => setValidationError(null)}
                  className="text-[#B42318] hover:underline font-bold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {!validationSummary || !validationSummary.validation_run_id ? (
              <div className="p-12 text-center rounded-3xl border border-dashed border-[#DCD0F7] bg-[#FAF8FF] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F3EEFC] text-[#7450D8] flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#171B45]">No Validation Run Executed Yet</h3>
                <p className="text-xs text-[#5F6485] max-w-md mx-auto leading-relaxed">
                  Evaluate mandatory document requirements, extracted certificates, validity expiry baselines, and institution field consistency.
                </p>
                <button
                  onClick={handleTriggerValidation}
                  disabled={validating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7450D8] hover:bg-[#623ec2] disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${validating ? 'animate-spin' : ''}`} />
                  <span>{validating ? 'Evaluating Scrutiny Rules...' : 'Run Scrutiny Validation'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Validation Summary Header Card */}
                <div className="p-5 sm:p-6 rounded-3xl bg-[#FAF8FF] border border-[#DCD0F7] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEEAF5] pb-4">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#7450D8] bg-[#F3EEFC] px-2 py-0.5 rounded">
                          Run ID: {validationSummary.validation_run_id.substring(0, 8)}...
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            validationSummary.failed > 0
                              ? 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]'
                              : validationSummary.needs_review > 0
                              ? 'bg-[#FFF6ED] text-[#C4320A] border border-[#FECDCA]'
                              : 'bg-[#ECFDF3] text-[#027A48] border border-[#D1FADF]'
                          }`}
                        >
                          {validationSummary.failed > 0 ? (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-[#F04438]" />
                              {validationSummary.failed} Failed Check(s)
                            </>
                          ) : validationSummary.needs_review > 0 ? (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-[#F79009]" />
                              Requires Review ({validationSummary.needs_review})
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-[#027A48]" />
                              All Evaluated Rules Passed
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5F6485] mt-1.5">
                        Evaluated {validationSummary.evaluated_at ? formatDate(validationSummary.evaluated_at) : 'recently'} • Baseline Date:{' '}
                        <span className="font-mono font-semibold text-[#171B45]">{validationSummary.evaluation_date || 'Current Date'}</span> • Engine v{validationSummary.pipeline_version}
                      </p>
                    </div>

                    <button
                      onClick={handleTriggerValidation}
                      disabled={validating}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#DCD0F7] hover:border-[#7450D8] text-xs font-bold text-[#7450D8] shadow-2xs transition-all cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${validating ? 'animate-spin' : ''}`} />
                      <span>{validating ? 'Re-evaluating...' : 'Re-run Validation'}</span>
                    </button>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3 rounded-xl bg-white border border-[#E9E6F2]">
                      <span className="text-[10px] uppercase font-bold text-[#8589A6]">Total Evaluated</span>
                      <p className="text-base font-extrabold text-[#171B45] mt-0.5">{validationSummary.total_rules}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[#E9E6F2]">
                      <span className="text-[10px] uppercase font-bold text-[#027A48]">Passed</span>
                      <p className="text-base font-extrabold text-[#027A48] mt-0.5">{validationSummary.passed}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[#E9E6F2]">
                      <span className="text-[10px] uppercase font-bold text-[#B42318]">Failed</span>
                      <p className="text-base font-extrabold text-[#B42318] mt-0.5">{validationSummary.failed}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[#E9E6F2]">
                      <span className="text-[10px] uppercase font-bold text-[#C4320A]">Needs Review</span>
                      <p className="text-base font-extrabold text-[#C4320A] mt-0.5">{validationSummary.needs_review}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[#E9E6F2]">
                      <span className="text-[10px] uppercase font-bold text-[#175CD3]">Unable To Eval</span>
                      <p className="text-base font-extrabold text-[#175CD3] mt-0.5">{validationSummary.unable_to_evaluate}</p>
                    </div>
                  </div>
                </div>

                {/* Filter Controls */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[#5F6485] mr-1 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" /> Filter:
                    </span>
                    {(['ALL', 'PASS', 'FAIL', 'NEEDS_REVIEW', 'UNABLE_TO_EVALUATE'] as const).map((filterKey) => {
                      const count =
                        filterKey === 'ALL'
                          ? validationSummary.results.length
                          : filterKey === 'PASS'
                          ? validationSummary.passed
                          : filterKey === 'FAIL'
                          ? validationSummary.failed
                          : filterKey === 'NEEDS_REVIEW'
                          ? validationSummary.needs_review
                          : validationSummary.unable_to_evaluate;
                      return (
                        <button
                          key={filterKey}
                          onClick={() => setResultFilter(filterKey)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            resultFilter === filterKey
                              ? 'bg-[#7450D8] text-white shadow-2xs'
                              : 'bg-white border border-[#E9E6F2] text-[#5F6485] hover:border-[#DCD0F7] hover:text-[#171B45]'
                          }`}
                        >
                          {filterKey.replace(/_/g, ' ')} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed Rule Results List */}
                <div className="space-y-3">
                  {validationSummary.results
                    .filter((r) => resultFilter === 'ALL' || r.status === resultFilter)
                    .map((res) => {
                      const sourceDoc = documents.find((d) => d.id === res.source_document_id);
                      return (
                        <div
                          key={res.id}
                          className="bg-white rounded-2xl border border-[#E9E6F2] p-4 sm:p-5 shadow-xs space-y-3 transition-all hover:border-[#DCD0F7]"
                        >
                          {/* Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F4F2F9] pb-3">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-mono text-xs font-extrabold text-[#171B45]">
                                {res.rule_code}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F3EEFC] text-[#7450D8]">
                                {res.rule_type}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  res.severity === 'CRITICAL' || res.severity === 'HIGH'
                                    ? 'bg-[#FFF0EF] text-[#B42318] border border-[#FECDCA]'
                                    : 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]'
                                }`}
                              >
                                {res.severity}
                              </span>
                            </div>

                            {/* Status Badge */}
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border self-start sm:self-auto ${
                                res.status === 'PASS'
                                  ? 'bg-[#ECFDF3] text-[#027A48] border-[#D1FADF]'
                                  : res.status === 'FAIL'
                                  ? 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]'
                                  : res.status === 'NEEDS_REVIEW'
                                  ? 'bg-[#FFF6ED] text-[#C4320A] border-[#FECDCA]'
                                  : 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]'
                              }`}
                            >
                              {res.status === 'PASS' ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : res.status === 'FAIL' ? (
                                <X className="w-3.5 h-3.5" />
                              ) : (
                                <HelpCircle className="w-3.5 h-3.5" />
                              )}
                              {res.status}
                            </span>
                          </div>

                          {/* Rule Explanation */}
                          <p className="text-xs sm:text-[13px] text-[#171B45] font-medium leading-relaxed">
                            {res.explanation}
                          </p>

                          {/* Comparison Grid (Expected vs Observed) */}
                          {(res.expected_value || res.observed_value) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FAF9FC] p-3 rounded-xl border border-[#EEEAF5] text-xs">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-[#8589A6] block">
                                  Expected Statutory Value
                                </span>
                                <span className="font-mono text-xs font-semibold text-[#171B45]">
                                  {res.expected_value || 'None specified'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase text-[#8589A6] block">
                                  Observed Evidentiary Value
                                </span>
                                <span
                                  className={`font-mono text-xs font-bold ${
                                    res.status === 'FAIL' ? 'text-[#B42318]' : 'text-[#027A48]'
                                  }`}
                                >
                                  {res.observed_value || 'None extracted'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Evidence Tray & Provenance Links */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F8F7FB] text-[11px] text-[#5F6485]">
                            <div className="flex items-center gap-3 flex-wrap">
                              {sourceDoc ? (
                                <span className="flex items-center gap-1.5 font-medium text-[#171B45]">
                                  <FileText className="w-3.5 h-3.5 text-[#7450D8]" />
                                  <span>{sourceDoc.original_filename}</span>
                                </span>
                              ) : res.source_document_id ? (
                                <span className="font-mono text-[10px]">Doc: {res.source_document_id.substring(0, 8)}...</span>
                              ) : (
                                <span className="italic text-[#8589A6]">No single source document</span>
                              )}

                              {res.source_page_number && (
                                <span className="px-2 py-0.5 rounded bg-[#F3EEFC] font-mono text-[10px] font-bold text-[#7450D8]">
                                  Page {res.source_page_number}
                                </span>
                              )}

                              {res.evidence_payload?.text_source && (
                                <span className="font-mono text-[10px] text-[#8589A6]">
                                  Source: {res.evidence_payload.text_source}
                                </span>
                              )}

                              {res.evidence_payload?.ocr_confidence && (
                                <span className="font-mono text-[10px] text-[#027A48]">
                                  Conf: {Math.round(res.evidence_payload.ocr_confidence * 100)}%
                                </span>
                              )}

                              {res.unresolved_reason && (
                                <span className="px-2 py-0.5 rounded bg-[#FFF6ED] text-[#C4320A] font-mono text-[10px] font-bold border border-[#FECDCA]">
                                  Reason: {res.unresolved_reason}
                                </span>
                              )}
                            </div>

                            {/* Direct inspection action */}
                            {sourceDoc && onInspectDocument && (
                              <button
                                onClick={() => onInspectDocument(sourceDoc)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DCD0F7] bg-[#FAF8FF] text-[11px] font-semibold text-[#7450D8] hover:bg-[#F3EEFC] transition-colors cursor-pointer shrink-0"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect Source OCR</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Requirements & Declared Data */}
        {activeSubTab === 'requirements' && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Required Documents Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-[#171B45]">
                    Mandatory Regulatory Documents Checklist
                  </h4>
                  <p className="text-[11px] text-[#5F6485]">
                    Evaluation criteria defined for category &quot;{currentCategory?.name || application.category_code}&quot;.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#7450D8]">
                  {requiredDocTypes.filter((t) => uploadedTypes.has(t)).length} of {requiredDocTypes.length} Present
                </span>
              </div>

              {requiredDocTypes.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2] text-xs text-[#5F6485]">
                  No strict mandatory document types configured for this illustrative category.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {requiredDocTypes.map((reqType) => {
                    const isPresent = uploadedTypes.has(reqType);
                    return (
                      <div
                        key={reqType}
                        className={`p-3.5 rounded-xl border flex items-center justify-between ${
                          isPresent
                            ? 'bg-[#ECFDF3]/40 border-[#D1FADF]'
                            : 'bg-[#FFF4F3]/40 border-[#FECDCA]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                              isPresent ? 'bg-[#027A48] text-white' : 'bg-[#F04438] text-white'
                            }`}
                          >
                            {isPresent ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-[#171B45]">{reqType}</p>
                            <p className="text-[10px] text-[#5F6485]">
                              {isPresent ? 'Document uploaded & registered' : 'Mandatory document missing'}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPresent ? 'bg-[#ECFDF3] text-[#027A48]' : 'bg-[#FFF0EF] text-[#B42318]'
                          }`}
                        >
                          {isPresent ? 'PRESENT' : 'MISSING'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Declared Application Data Fields */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs sm:text-sm font-extrabold text-[#171B45]">
                Institution-Declared Form Data
              </h4>
              <p className="text-[11px] text-[#5F6485]">
                Original declared fields submitted by the applicant for regulatory scrutiny.
              </p>

              {Object.keys(application.declared_data || {}).length === 0 ? (
                <div className="p-4 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2] text-xs text-[#5F6485]">
                  No custom declared fields were submitted for this draft.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(application.declared_data).map(([key, value]) => (
                    <div key={key} className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2]">
                      <span className="text-[10px] font-bold text-[#8589A6] uppercase tracking-wider block">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <p className="font-semibold text-xs text-[#171B45] mt-0.5 break-words">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Scrutiny Audit Trail */}
        {activeSubTab === 'audit' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-[#171B45]">
                  Immutable Regulatory Event Log
                </h4>
                <p className="text-[11px] text-[#5F6485]">
                  Every upload, extraction, and reviewer action recorded in strict chronological sequence.
                </p>
              </div>
            </div>

            {auditEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5F6485]">
                No audit events recorded for this application yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {auditEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2] flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#F3EEFC] text-[#7450D8]">
                          {evt.event_type}
                        </span>
                        <span className="text-[11px] text-[#5F6485]">by Actor: {evt.actor_id || 'System'}</span>
                      </div>
                      {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                        <p className="font-mono text-[11px] text-[#171B45]">
                          {JSON.stringify(evt.metadata)}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-[#8589A6] shrink-0">
                      {formatDate(evt.occurred_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Institution Dossier */}
        {activeSubTab === 'institution' && (
          <div className="p-4 sm:p-6 space-y-4">
            <h4 className="text-xs sm:text-sm font-extrabold text-[#171B45]">
              Institution Profile & Regulatory Record
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8589A6]">Institution Name</span>
                <p className="font-bold text-sm text-[#171B45]">{application.institution.institution_name}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8589A6]">Permanent / AISHE Identifier</span>
                <p className="font-mono font-bold text-sm text-[#7450D8]">
                  {application.institution.institution_identifier || application.institution.id}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8589A6]">State & City</span>
                <p className="font-semibold text-xs text-[#171B45]">
                  {application.institution.city ? `${application.institution.city}, ` : ''}
                  {application.institution.state || 'India'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8589A6]">Tenant Status</span>
                <p className="font-semibold text-xs text-[#027A48]">
                  {application.institution.status || 'ACTIVE'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        initialApplicationId={application.id}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          setUploadModalOpen(false);
          loadWorkspaceData();
        }}
      />
    </div>
  );
};
