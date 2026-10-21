import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  fetchAllDocuments,
  fetchApplications,
  getDocumentFileUrl,
  type DocumentListItem,
  type ApplicationListItem,
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

  // Preview state
  const [previewDoc, setPreviewDoc] = useState<DocumentListItem | null>(null);

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

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#171B45] flex items-center gap-2.5">
            <FolderOpen className="w-6 h-6 text-[#7450D8]" />
            Document Repository
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6485] mt-0.5">
            Cryptographically hashed, multi-tenant institutional records with evidence traceability.
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
            placeholder="Search by original filename..."
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
                Upload institutional certificates, NOCs, or balance sheets to start the scrutiny pipeline.
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
                  <th className="py-3.5 px-5">Document / Hash</th>
                  <th className="py-3.5 px-4">Application</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Uploaded</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E6F2] text-xs">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#FAF8FF]/60 transition-colors">
                    {/* File & Hash */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#F3EEFC] text-[#7450D8] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden max-w-[220px]">
                          <p className="font-bold text-[#171B45] truncate" title={doc.original_filename}>
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

                    {/* File size */}
                    <td className="py-3.5 px-4 text-[#5F6485] font-mono text-[11px]">
                      {formatBytes(doc.file_size_bytes)}
                    </td>

                    {/* Status pill */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF8FF] text-[#7450D8] border border-[#DCD0F7]">
                        <Clock className="w-3 h-3" />
                        {doc.processing_status}
                      </span>
                    </td>

                    {/* Upload date */}
                    <td className="py-3.5 px-4 text-[#5F6485] text-[11px]">
                      {formatDate(doc.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1.5 rounded-lg border border-[#DCD0F7] text-[#5F6485] hover:text-[#7450D8] hover:bg-[#F3EEFC] transition-colors cursor-pointer"
                          title="Preview document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={getDocumentFileUrl(doc.id, true)}
                          download={doc.original_filename}
                          className="p-1.5 rounded-lg border border-[#DCD0F7] text-[#5F6485] hover:text-[#12B886] hover:bg-[#E6F8F0] transition-colors cursor-pointer inline-flex items-center"
                          title="Download document"
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

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-[#171B45]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E9E6F2] shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E9E6F2] flex items-center justify-between bg-[#FAF8FF]">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-[#F3EEFC] text-[#7450D8] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-sm font-extrabold text-[#171B45] truncate">
                    {previewDoc.original_filename}
                  </h3>
                  <p className="text-[11px] font-mono text-[#5F6485]">
                    Ref: {previewDoc.id} • {formatBytes(previewDoc.file_size_bytes)} • {previewDoc.media_type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={getDocumentFileUrl(previewDoc.id, true)}
                  download={previewDoc.original_filename}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCD0F7] text-xs font-semibold text-[#171B45] hover:bg-[#F3EEFC] transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-full hover:bg-[#E9E6F2] text-[#5F6485] hover:text-[#171B45] transition-colors cursor-pointer"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="flex-1 bg-[#2C3049] flex items-center justify-center overflow-auto p-4">
              {previewDoc.media_type === 'application/pdf' ? (
                <iframe
                  src={getDocumentFileUrl(previewDoc.id)}
                  title={previewDoc.original_filename}
                  className="w-full h-full rounded-xl bg-white border border-black/20"
                />
              ) : previewDoc.media_type.startsWith('image/') ? (
                <img
                  src={getDocumentFileUrl(previewDoc.id)}
                  alt={previewDoc.original_filename}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
                />
              ) : (
                <div className="text-center text-white space-y-3">
                  <p className="text-sm">Inline preview is not supported for this media type.</p>
                  <a
                    href={getDocumentFileUrl(previewDoc.id, true)}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F04438] text-white text-xs font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
