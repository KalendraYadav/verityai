import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  Search,
  Filter,
  Upload,
  FileText,
  Eye,
  Download,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Layers,
  Info,
  ShieldAlert,
} from 'lucide-react';
import {
  fetchAllDocuments,
  fetchApplications,
  fetchDocumentPages,
  fetchDocumentProcessing,
  reprocessDocument,
  getDocumentFileUrl,
  type DocumentListItem,
  type ApplicationListItem,
  type DocumentPageItem,
  type DocumentProcessingStatusData,
} from '../../api/client';
import { DocumentUploadModal } from './DocumentUploadModal';

export const DocumentsView: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApplication, setSelectedApplication] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Document Detail Workspace State
  const [selectedDoc, setSelectedDoc] = useState<DocumentListItem | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'file' | 'pipeline'>('text');
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pages, setPages] = useState<DocumentPageItem[]>([]);
  const [processingData, setProcessingData] = useState<DocumentProcessingStatusData | null>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [copiedPageIndex, setCopiedPageIndex] = useState<number | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const pollIntervalRef = useRef<number | null>(null);

  async function loadData() {
    try {
      const [docsRes, appsRes] = await Promise.all([
        fetchAllDocuments({
          application_id: selectedApplication || undefined,
          q: searchQuery || undefined,
          pageSize: 50,
        }),
        fetchApplications({ page_size: 50 }),
      ]);
      setDocuments(docsRes.data);
      setApplications(appsRes.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load documents', err);
      setError(err.message || 'Failed to retrieve documents from the server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedApplication]);

  // Load document detail, pages, and processing status when a document is opened
  async function openDocumentWorkspace(doc: DocumentListItem) {
    setSelectedDoc(doc);
    setActiveTab('text');
    setPagesLoading(true);
    setWorkspaceError(null);

    try {
      const [pagesRes, procRes] = await Promise.all([
        fetchDocumentPages(doc.id).catch(() => ({ document_id: doc.id, page_count: 0, pages: [] })),
        fetchDocumentProcessing(doc.id).catch(() => null),
      ]);
      setPages(pagesRes.pages);
      setProcessingData(procRes);

      // If document is actively QUEUED or PROCESSING, start polling
      const currentStatus = procRes?.processing_status || doc.processing_status;
      if (currentStatus === 'QUEUED' || currentStatus === 'PROCESSING') {
        startPolling(doc.id);
      }
    } catch (err: any) {
      setWorkspaceError(err.message || 'Failed to load document extraction details.');
    } finally {
      setPagesLoading(false);
    }
  }

  function startPolling(docId: string) {
    stopPolling();
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const proc = await fetchDocumentProcessing(docId);
        setProcessingData(proc);

        if (proc.processing_status !== 'QUEUED' && proc.processing_status !== 'PROCESSING') {
          // Terminal state reached: fetch latest pages & refresh main table
          stopPolling();
          const pagesRes = await fetchDocumentPages(docId);
          setPages(pagesRes.pages);
          loadData();
        }
      } catch (e) {
        console.error('Error during status polling', e);
      }
    }, 2500);
  }

  function stopPolling() {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  function closeWorkspace() {
    stopPolling();
    setSelectedDoc(null);
    setPages([]);
    setProcessingData(null);
  }

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  async function handleReprocess() {
    if (!selectedDoc) return;
    setReprocessing(true);
    setWorkspaceError(null);
    try {
      const newStatus = await reprocessDocument(selectedDoc.id);
      setProcessingData(newStatus);
      setPagesLoading(true);
      startPolling(selectedDoc.id);
      loadData();
    } catch (err: any) {
      setWorkspaceError(err.message || 'Reprocessing request failed.');
    } finally {
      setReprocessing(false);
    }
  }

  function handleCopyText(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedPageIndex(index);
    setTimeout(() => setCopiedPageIndex(null), 2000);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    loadData();
  }

  function handleRefresh() {
    setRefreshing(true);
    loadData();
  }

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
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF3] text-[#027A48] border border-[#D1FADF]">
            <CheckCircle2 className="w-3 h-3 text-[#12B886]" />
            COMPLETED
          </span>
        );
      case 'COMPLETED_WITH_WARNINGS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]">
            <AlertCircle className="w-3 h-3 text-[#F79009]" />
            COMPLETED (WARNINGS)
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
            <RefreshCw className="w-3 h-3 animate-spin text-[#175CD3]" />
            PROCESSING
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3EEFC] text-[#7450D8] border border-[#DCD0F7]">
            <Clock className="w-3 h-3 text-[#7450D8]" />
            QUEUED
          </span>
        );
      case 'MANUAL_REVIEW_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF6ED] text-[#C4320A] border border-[#FECDCA]">
            <ShieldAlert className="w-3 h-3 text-[#E34234]" />
            NEEDS REVIEW
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]">
            <AlertTriangle className="w-3 h-3 text-[#F79009]" />
            PARTIAL
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]">
            <AlertCircle className="w-3 h-3 text-[#F04438]" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF8FF] text-[#5F6485] border border-[#E9E6F2]">
            {status}
          </span>
        );
    }
  };

  const renderQualityBadge = (band: string | null | undefined) => {
    if (!band) return null;
    switch (band) {
      case 'GOOD':
      case 'EXCELLENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#ECFDF3] text-[#027A48] border border-[#D1FADF]">
            Quality: {band}
          </span>
        );
      case 'FAIR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
            Quality: {band}
          </span>
        );
      case 'POOR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]">
            Quality: {band}
          </span>
        );
      case 'UNUSABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]">
            Quality: Unusable
          </span>
        );
      default:
        return null;
    }
  };

  const effectiveStatus = processingData?.processing_status || selectedDoc?.processing_status || 'QUEUED';
  const effectiveQualityBand = processingData?.extraction_quality_band || selectedDoc?.extraction_quality_band;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#171B45] flex items-center gap-2.5">
            <FolderOpen className="w-6 h-6 text-[#7450D8]" />
            Document Repository & OCR Workspace
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6485] mt-0.5">
            Evidence-traceable text extraction, page-level OCR confidence, and cryptographically verified storage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-[#DCD0F7] text-[#5F6485] hover:text-[#171B45] hover:bg-white transition-all cursor-pointer bg-white/70"
            title="Refresh repository"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#7450D8]' : ''}`} />
          </button>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#F04438] text-white hover:bg-[#E34234] transition-all shadow-xs cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E9E6F2] shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#8589A6] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents by original filename or hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#FAF8FF] border border-[#E9E6F2] text-[#171B45] focus:outline-none focus:ring-2 focus:ring-[#7450D8] transition-all placeholder:text-[#8589A6]"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-[#7450D8] hidden sm:block" />
          <select
            value={selectedApplication}
            onChange={(e) => setSelectedApplication(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-[#FAF8FF] border border-[#E9E6F2] text-[#171B45] focus:outline-none focus:ring-2 focus:ring-[#7450D8] transition-all cursor-pointer w-full md:w-64"
          >
            <option value="">All Applications</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.application_reference} ({app.institution?.institution_name || 'Inst'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Document List Table */}
      <div className="bg-white rounded-3xl border border-[#E9E6F2] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#7450D8] mx-auto" />
            <p className="text-xs text-[#5F6485]">Loading verified document repository...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF4F3] text-[#F04438] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-[#F04438]">{error}</p>
            <button
              onClick={handleRefresh}
              className="text-xs text-[#7450D8] underline font-bold cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#F3EEFC] text-[#7450D8] flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-[#171B45]">No documents uploaded</h3>
              <p className="text-xs text-[#5F6485] leading-relaxed">
                Upload institutional certificates, NOCs, or regulatory orders to start automated extraction.
              </p>
            </div>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F04438] text-white text-xs font-semibold hover:bg-[#E34234] transition-all cursor-pointer shadow-xs"
            >
              <Upload className="w-4 h-4" />
              Upload First Document
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E9E6F2] bg-[#FAF8FF] text-[11px] font-bold text-[#5F6485] uppercase tracking-wider">
                  <th className="py-3.5 px-5">Document / SHA-256</th>
                  <th className="py-3.5 px-4">Application</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Pages / Size</th>
                  <th className="py-3.5 px-4">Processing Status</th>
                  <th className="py-3.5 px-4">Uploaded</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E6F2] text-xs">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => openDocumentWorkspace(doc)}
                    className="hover:bg-[#FAF8FF]/70 transition-colors cursor-pointer group"
                  >
                    {/* File & Hash */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#F3EEFC] text-[#7450D8] group-hover:bg-[#7450D8] group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden max-w-[220px]">
                          <p className="font-bold text-[#171B45] truncate group-hover:text-[#7450D8] transition-colors" title={doc.original_filename}>
                            {doc.original_filename}
                          </p>
                          <p className="text-[10px] font-mono text-[#8589A6] truncate" title={doc.sha256}>
                            SHA: {doc.sha256.substring(0, 16)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Application reference */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-semibold text-[#7450D8] bg-[#F3EEFC] px-2.5 py-1 rounded-lg">
                        {doc.application_id}
                      </span>
                    </td>

                    {/* Declared / Detected Type */}
                    <td className="py-3.5 px-4">
                      <span className="text-xs text-[#171B45] font-medium">
                        {doc.declared_type || doc.media_type.split('/')[1]?.toUpperCase() || 'DOCUMENT'}
                      </span>
                    </td>

                    {/* Pages & Size */}
                    <td className="py-3.5 px-4 text-[#5F6485]">
                      <div className="flex flex-col text-[11px]">
                        <span className="font-semibold text-[#171B45]">
                          {doc.page_count !== null && doc.page_count !== undefined ? `${doc.page_count} page${doc.page_count === 1 ? '' : 's'}` : '—'}
                        </span>
                        <span className="font-mono text-[10px]">{formatBytes(doc.file_size_bytes)}</span>
                      </div>
                    </td>

                    {/* Processing status pill */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {renderStatusBadge(doc.processing_status)}
                        {renderQualityBadge(doc.extraction_quality_band)}
                      </div>
                    </td>

                    {/* Upload date */}
                    <td className="py-3.5 px-4 text-[#5F6485] text-[11px]">
                      {formatDate(doc.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDocumentWorkspace(doc)}
                          className="p-1.5 rounded-lg border border-[#DCD0F7] text-[#5F6485] hover:text-[#7450D8] hover:bg-[#F3EEFC] transition-colors cursor-pointer"
                          title="Open Extraction Workspace"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={getDocumentFileUrl(doc.id, true)}
                          download={doc.original_filename}
                          className="p-1.5 rounded-lg border border-[#DCD0F7] text-[#5F6485] hover:text-[#12B886] hover:bg-[#E6F8F0] transition-colors cursor-pointer inline-flex items-center"
                          title="Download document file"
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

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        initialApplicationId={selectedApplication || undefined}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Document Workspace / Extraction Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-[#171B45]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl border border-[#E9E6F2] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E9E6F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF8FF]">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-[#F3EEFC] text-[#7450D8] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-extrabold text-[#171B45] truncate">
                      {selectedDoc.original_filename}
                    </h3>
                    {renderStatusBadge(effectiveStatus)}
                    {renderQualityBadge(effectiveQualityBand)}
                  </div>
                  <p className="text-[11px] font-mono text-[#5F6485] mt-0.5">
                    ID: {selectedDoc.id} • App: {selectedDoc.application_id} • {formatBytes(selectedDoc.file_size_bytes)} • {selectedDoc.media_type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={handleReprocess}
                  disabled={reprocessing || effectiveStatus === 'PROCESSING'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCD0F7] bg-white text-xs font-semibold text-[#171B45] hover:bg-[#F3EEFC] hover:text-[#7450D8] transition-all disabled:opacity-50 cursor-pointer"
                  title="Re-run text extraction & OCR pipeline"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${reprocessing ? 'animate-spin text-[#7450D8]' : ''}`} />
                  <span>{reprocessing ? 'Reprocessing...' : 'Reprocess'}</span>
                </button>

                <a
                  href={getDocumentFileUrl(selectedDoc.id, true)}
                  download={selectedDoc.original_filename}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCD0F7] bg-white text-xs font-semibold text-[#171B45] hover:bg-[#F3EEFC] transition-all"
                  title="Download original file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>

                <button
                  onClick={closeWorkspace}
                  className="p-1.5 rounded-full hover:bg-[#E9E6F2] text-[#5F6485] hover:text-[#171B45] transition-colors cursor-pointer"
                  title="Close workspace"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="px-5 border-b border-[#E9E6F2] bg-white flex items-center gap-6">
              <button
                onClick={() => setActiveTab('text')}
                className={`py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'text'
                    ? 'border-[#7450D8] text-[#7450D8]'
                    : 'border-transparent text-[#5F6485] hover:text-[#171B45]'
                }`}
              >
                <FileText className="w-4 h-4" />
                Extracted Text & OCR Records ({pages.length})
              </button>

              <button
                onClick={() => setActiveTab('file')}
                className={`py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'file'
                    ? 'border-[#7450D8] text-[#7450D8]'
                    : 'border-transparent text-[#5F6485] hover:text-[#171B45]'
                }`}
              >
                <Eye className="w-4 h-4" />
                Original Document File
              </button>

              <button
                onClick={() => setActiveTab('pipeline')}
                className={`py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'pipeline'
                    ? 'border-[#7450D8] text-[#7450D8]'
                    : 'border-transparent text-[#5F6485] hover:text-[#171B45]'
                }`}
              >
                <Layers className="w-4 h-4" />
                Processing Run & Quality
              </button>
            </div>

            {/* Error banner if any */}
            {workspaceError && (
              <div className="m-4 p-3.5 rounded-xl bg-[#FFF4F3] border border-[#FECDCA] text-[#B42318] text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#F04438]" />
                <p className="font-semibold">{workspaceError}</p>
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAF8FF]/50">
              
              {/* TAB 1: Extracted Text & OCR */}
              {activeTab === 'text' && (
                <div className="space-y-4 max-w-4xl mx-auto">
                  
                  {/* Processing indicator */}
                  {(effectiveStatus === 'PROCESSING' || effectiveStatus === 'QUEUED') && (
                    <div className="p-4 rounded-2xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center gap-3.5">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#175CD3] shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#175CD3]">
                          Document Text Extraction & OCR in progress
                        </p>
                        <p className="text-[11px] text-[#5F6485] mt-0.5">
                          PyMuPDF and RapidOCR are actively extracting text from this document. Updates refresh automatically.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Empty text notice */}
                  {effectiveStatus === 'MANUAL_REVIEW_REQUIRED' && pages.length > 0 && pages.every((p) => p.char_count === 0) && (
                    <div className="p-4 rounded-2xl bg-[#FFF6ED] border border-[#FECDCA] flex items-start gap-3.5">
                      <ShieldAlert className="w-5 h-5 text-[#C4320A] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[#C4320A]">
                          No extractable text recognized on any page
                        </p>
                        <p className="text-[11px] text-[#5F6485] leading-relaxed">
                          The document may be a blank page, low-contrast scan, or image without discernible text. 
                          The system records this honestly and flags it for human reviewer inspection rather than assuming failure.
                        </p>
                      </div>
                    </div>
                  )}

                  {pagesLoading ? (
                    <div className="py-16 text-center space-y-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#7450D8] mx-auto" />
                      <p className="text-xs text-[#5F6485]">Retrieving extracted page text...</p>
                    </div>
                  ) : pages.length === 0 ? (
                    <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-[#E9E6F2] p-8">
                      <FileText className="w-8 h-8 text-[#8589A6] mx-auto" />
                      <h4 className="text-sm font-bold text-[#171B45]">No page records found</h4>
                      <p className="text-xs text-[#5F6485] max-w-sm mx-auto">
                        This document has not been processed yet. Click &quot;Reprocess&quot; above to trigger text extraction.
                      </p>
                    </div>
                  ) : (
                    pages.map((page, idx) => (
                      <div
                        key={page.id}
                        className="bg-white rounded-2xl border border-[#E9E6F2] shadow-2xs overflow-hidden"
                      >
                        {/* Page Header */}
                        <div className="px-4 py-3 bg-[#FAF8FF] border-b border-[#E9E6F2] flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-[#171B45]">
                              Page {page.page_number}
                            </span>

                            {page.text_source === 'DIGITAL_TEXT' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#ECFDF3] text-[#027A48] border border-[#D1FADF]">
                                Digital Text (PyMuPDF)
                              </span>
                            ) : page.text_source === 'OCR' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F3EEFC] text-[#7450D8] border border-[#DCD0F7]">
                                Scanned OCR (RapidOCR)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF8FF] text-[#8589A6] border border-[#E9E6F2]">
                                No Text Detected
                              </span>
                            )}

                            {page.text_source === 'OCR' && page.ocr_mean_confidence !== null && (
                              <span
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]"
                                title="Estimate of recognition quality from the OCR engine, not proof of authenticity"
                              >
                                OCR Confidence: {(page.ocr_mean_confidence * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-[#5F6485]">
                            <span>{page.char_count} chars</span>
                            {page.duration_ms !== null && <span>• {page.duration_ms} ms</span>}
                            {page.clean_text && (
                              <button
                                onClick={() => handleCopyText(page.clean_text || '', idx)}
                                className="p-1 rounded-md hover:bg-white border border-transparent hover:border-[#DCD0F7] text-[#5F6485] hover:text-[#7450D8] transition-colors cursor-pointer"
                                title="Copy page text"
                              >
                                {copiedPageIndex === idx ? (
                                  <Check className="w-3.5 h-3.5 text-[#12B886]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Page Content */}
                        <div className="p-4 font-mono text-xs text-[#171B45] leading-relaxed whitespace-pre-wrap select-text bg-white max-h-96 overflow-y-auto">
                          {page.clean_text ? (
                            page.clean_text
                          ) : (
                            <span className="text-[#8589A6] italic font-sans text-xs">
                              [No extractable text recognized on Page {page.page_number}]
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Non-negotiable Disclaimer */}
                  <div className="p-3.5 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2] flex items-center gap-2 text-[11px] text-[#5F6485]">
                    <Info className="w-4 h-4 text-[#7450D8] shrink-0" />
                    <span>
                      <strong>VerityAI Principles:</strong> Extracted text represents raw document parsing and is not an endorsement of institutional compliance or proof of certificate authenticity.
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: Original File Viewer */}
              {activeTab === 'file' && (
                <div className="w-full h-full min-h-[500px] bg-[#2C3049] rounded-2xl overflow-hidden flex items-center justify-center p-2">
                  {selectedDoc.media_type === 'application/pdf' ? (
                    <iframe
                      src={getDocumentFileUrl(selectedDoc.id)}
                      title={selectedDoc.original_filename}
                      className="w-full h-full min-h-[550px] rounded-xl bg-white border border-black/20"
                    />
                  ) : selectedDoc.media_type.startsWith('image/') ? (
                    <img
                      src={getDocumentFileUrl(selectedDoc.id)}
                      alt={selectedDoc.original_filename}
                      className="max-h-[550px] max-w-full object-contain rounded-xl shadow-lg"
                    />
                  ) : (
                    <div className="text-center text-white space-y-3">
                      <p className="text-sm">Inline preview not supported for this media type.</p>
                      <a
                        href={getDocumentFileUrl(selectedDoc.id, true)}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F04438] text-white text-xs font-semibold"
                      >
                        <Download className="w-4 h-4" />
                        Download File
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Processing Run & Quality */}
              {activeTab === 'pipeline' && (
                <div className="space-y-4 max-w-3xl mx-auto">
                  <div className="bg-white p-5 rounded-2xl border border-[#E9E6F2] shadow-2xs space-y-4">
                    <h4 className="text-sm font-extrabold text-[#171B45] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#7450D8]" />
                      Current Processing Run Lifecycle
                    </h4>

                    {processingData?.current_run ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2]">
                          <span className="text-[10px] uppercase font-bold text-[#5F6485]">Run ID</span>
                          <p className="font-mono text-xs text-[#171B45] font-semibold">{processingData.current_run.id}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2]">
                          <span className="text-[10px] uppercase font-bold text-[#5F6485]">Trigger</span>
                          <p className="font-semibold text-xs text-[#171B45]">{processingData.current_run.trigger}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2]">
                          <span className="text-[10px] uppercase font-bold text-[#5F6485]">Pipeline Version</span>
                          <p className="font-semibold text-xs text-[#171B45]">{processingData.current_run.pipeline_version}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2]">
                          <span className="text-[10px] uppercase font-bold text-[#5F6485]">Total Duration</span>
                          <p className="font-semibold text-xs text-[#171B45]">
                            {processingData.current_run.duration_ms ? `${processingData.current_run.duration_ms} ms` : 'Running...'}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2]">
                          <span className="text-[10px] uppercase font-bold text-[#5F6485]">Started At</span>
                          <p className="font-semibold text-xs text-[#171B45]">{formatDate(processingData.current_run.started_at)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2]">
                          <span className="text-[10px] uppercase font-bold text-[#5F6485]">Completed At</span>
                          <p className="font-semibold text-xs text-[#171B45]">
                            {processingData.current_run.completed_at ? formatDate(processingData.current_run.completed_at) : '—'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#5F6485]">No processing run metadata available.</p>
                    )}

                    {/* Quality Summary Breakdown */}
                    {processingData?.current_run?.quality_summary && (
                      <div className="p-4 rounded-xl bg-[#FAF8FF] border border-[#DCD0F7] space-y-3">
                        <h5 className="text-xs font-bold text-[#171B45]">Quality Summary Metrics</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                          <div className="bg-white p-2.5 rounded-lg border border-[#E9E6F2]">
                            <span className="text-[10px] text-[#5F6485] font-semibold">Total Pages</span>
                            <p className="text-sm font-bold text-[#171B45]">{processingData.current_run.quality_summary.pages_total}</p>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-[#E9E6F2]">
                            <span className="text-[10px] text-[#5F6485] font-semibold">Processed Pages</span>
                            <p className="text-sm font-bold text-[#027A48]">{processingData.current_run.quality_summary.pages_processed}</p>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-[#E9E6F2]">
                            <span className="text-[10px] text-[#5F6485] font-semibold">Quality Band</span>
                            <p className="text-xs font-bold text-[#7450D8] mt-0.5">{processingData.current_run.quality_summary.extraction_quality_band}</p>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-[#E9E6F2]">
                            <span className="text-[10px] text-[#5F6485] font-semibold">Total Chars</span>
                            <p className="text-sm font-bold text-[#171B45]">{processingData.current_run.quality_summary.total_characters}</p>
                          </div>
                        </div>

                        {processingData.current_run.quality_summary.text_source_mix && (
                          <div className="text-[11px] text-[#5F6485] pt-1">
                            <span className="font-semibold text-[#171B45]">Source breakdown: </span>
                            Digital Text: {processingData.current_run.quality_summary.text_source_mix.DIGITAL_TEXT} • 
                            OCR: {processingData.current_run.quality_summary.text_source_mix.OCR} • 
                            None: {processingData.current_run.quality_summary.text_source_mix.NONE}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Safe Error Details */}
                    {processingData?.current_run?.error_code && (
                      <div className="p-3.5 rounded-xl bg-[#FFF4F3] border border-[#FECDCA] text-xs space-y-1">
                        <p className="font-bold text-[#B42318]">Error Code: {processingData.current_run.error_code}</p>
                        <p className="text-[#5F6485]">{processingData.current_run.safe_error_summary}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
