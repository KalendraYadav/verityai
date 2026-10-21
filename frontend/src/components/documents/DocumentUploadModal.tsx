import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  fetchApplications,
  uploadDocument,
  type ApplicationListItem,
  type DocumentUploadResponseData,
} from '../../api/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (doc: DocumentUploadResponseData) => void;
  initialApplicationId?: string;
}

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

const DOCUMENT_TYPES = [
  { value: '', label: 'Auto-Detect / Unspecified' },
  { value: 'LAND_DOCUMENT', label: 'Land Document & Title Deed' },
  { value: 'AFFILIATION_CERTIFICATE', label: 'University Affiliation Certificate' },
  { value: 'NOC', label: 'State Government NOC' },
  { value: 'BUILDING_PLAN', label: 'Approved Building Plan' },
  { value: 'FIRE_SAFETY_CERTIFICATE', label: 'Fire Safety Certificate' },
  { value: 'BALANCE_SHEET', label: 'Audited Financial Balance Sheet' },
  { value: 'FACULTY_LIST', label: 'Faculty List & Qualifications' },
];

export const DocumentUploadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  initialApplicationId,
}) => {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string>(initialApplicationId || '');
  const [declaredType, setDeclaredType] = useState<string>('');

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<DocumentUploadResponseData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingApps(true);
      fetchApplications({ page_size: 50 })
        .then((res) => {
          setApplications(res.data);
          if (initialApplicationId) {
            setSelectedAppId(initialApplicationId);
          } else if (res.data.length > 0 && !selectedAppId) {
            setSelectedAppId(res.data[0].id);
          }
        })
        .catch((err) => {
          console.error('Failed to load applications', err);
        })
        .finally(() => {
          setLoadingApps(false);
        });
    } else {
      // Reset state when closed
      setFile(null);
      setClientError(null);
      setServerError(null);
      setUploadResult(null);
      setDeclaredType('');
    }
  }, [isOpen, initialApplicationId]);

  if (!isOpen) return null;

  function validateFile(selectedFile: File): boolean {
    setClientError(null);
    setServerError(null);

    // 1. Empty file
    if (selectedFile.size === 0) {
      setClientError('The selected file is empty (0 bytes). Please select a valid document.');
      return false;
    }

    // 2. Max size
    if (selectedFile.size > MAX_SIZE_BYTES) {
      setClientError(`File exceeds maximum size limit of 20MB (${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB).`);
      return false;
    }

    // 3. Extension check
    const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setClientError(`Unsupported format '${ext}'. Allowed formats: PDF, PNG, JPG, JPEG.`);
      return false;
    }

    return true;
  }

  function handleFileSelection(selectedFile: File) {
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
    } else {
      setFile(null);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAppId) {
      setClientError('Please select a target application for this document.');
      return;
    }

    if (!file) {
      setClientError('Please choose a file to upload.');
      return;
    }

    setUploading(true);
    setServerError(null);
    setClientError(null);

    try {
      const res = await uploadDocument(
        selectedAppId,
        file,
        declaredType || undefined
      );
      setUploadResult(res);
      onSuccess(res);
    } catch (err: any) {
      console.error('Upload failed', err);
      setServerError(err.message || 'An unexpected error occurred while uploading the document.');
    } finally {
      setUploading(false);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#171B45]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E9E6F2] shadow-2xl w-full max-w-lg overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-[#E9E6F2] flex items-center justify-between bg-[#F8F6FE]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F3EEFC] text-[#7450D8] flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#171B45]">Upload Document</h2>
              <p className="text-xs text-[#5F6485]">Multi-tenant secure document intake & verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5F6485] hover:text-[#171B45] hover:bg-[#E9E6F2] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Success State */}
          {uploadResult ? (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#E6F8F0] border border-[#12B886]/30 space-y-3">
                <div className="flex items-center gap-2.5 text-[#12B886] font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Document Uploaded Successfully</span>
                </div>
                <p className="text-xs text-[#171B45] leading-relaxed">
                  File received, encrypted, and registered under reference{' '}
                  <span className="font-mono font-bold text-[#7450D8]">{uploadResult.id}</span>.
                  Processing run has been queued in status <span className="font-bold">{uploadResult.processing_status}</span>.
                </p>

                {uploadResult.possible_duplicate && (
                  <div className="p-3 rounded-xl bg-[#FEF0C7] border border-[#F59E0B]/30 flex items-start gap-2 text-xs text-[#92400E]">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>Duplicate Detected:</strong> An identical document checksum was found in institutional records. Flagged for review scrutiny.
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-[#12B886]/20 text-[11px] text-[#5F6485] space-y-1 font-mono">
                  <div>SHA-256: {uploadResult.sha256.substring(0, 24)}...</div>
                  <div>Size: {formatBytes(uploadResult.file_size_bytes)}</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUploadResult(null);
                    setFile(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-[#DCD0F7] text-xs font-semibold text-[#7450D8] hover:bg-[#F3EEFC] transition-all cursor-pointer"
                >
                  Upload Another
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-[#F04438] text-white text-xs font-semibold hover:bg-[#E34234] transition-all cursor-pointer shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-4">
              
              {/* Application Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#171B45] flex items-center justify-between">
                  <span>Target Application *</span>
                  {loadingApps && <span className="text-[10px] text-[#7450D8] font-normal">Loading...</span>}
                </label>
                <select
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  disabled={uploading || loadingApps}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCD0F7] bg-white text-xs text-[#171B45] focus:outline-none focus:ring-2 focus:ring-[#7450D8] focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="">— Select an Application —</option>
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.application_reference} — {app.institution?.institution_name || 'Institution'} ({app.category_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Type Selector (Optional Declared Type) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#171B45]">
                  Document Category / Regulatory Type
                </label>
                <select
                  value={declaredType}
                  onChange={(e) => setDeclaredType(e.target.value)}
                  disabled={uploading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCD0F7] bg-white text-xs text-[#171B45] focus:outline-none focus:ring-2 focus:ring-[#7450D8] focus:border-transparent transition-all cursor-pointer"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Drag and Drop Dropzone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#171B45]">
                  Select or Drop Document *
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#7450D8] bg-[#F3EEFC]'
                      : file
                      ? 'border-[#12B886]/50 bg-[#F0FDF4]'
                      : 'border-[#DCD0F7] bg-[#FAF8FF] hover:bg-[#F3EEFC]/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelection(e.target.files[0]);
                      }
                    }}
                  />

                  {file ? (
                    <div className="flex items-center justify-between gap-3 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-[#DCD0F7] flex items-center justify-center text-[#7450D8]">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-[#171B45] truncate max-w-[240px]">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-[#5F6485]">
                            {formatBytes(file.size)} • {file.type || 'Document'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-[#DCD0F7] text-[11px] font-semibold text-[#5F6485] hover:text-[#F04438] hover:border-[#F04438] bg-white transition-all cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-[#E9E6F2] flex items-center justify-center mx-auto text-[#7450D8]">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-[#171B45]">
                          Drag & drop document here, or <span className="text-[#7450D8] underline">browse</span>
                        </p>
                        <p className="text-[11px] text-[#5F6485]">
                          Accepted: PDF, PNG, JPEG. Max file size: 20 MB.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Client or Server Errors */}
              {clientError && (
                <div className="p-3 rounded-xl bg-[#FFF4F3] border border-[#F04438]/30 flex items-center gap-2 text-xs text-[#F04438]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{clientError}</span>
                </div>
              )}

              {serverError && (
                <div className="p-3 rounded-xl bg-[#FFF4F3] border border-[#F04438]/30 flex items-center gap-2 text-xs text-[#F04438]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E9E6F2]">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={uploading}
                  className="px-4 py-2.5 rounded-xl border border-[#DCD0F7] text-xs font-semibold text-[#5F6485] hover:text-[#171B45] hover:bg-[#F8F6FE] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !file || !selectedAppId}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F04438] text-white text-xs font-semibold hover:bg-[#E34234] transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Encrypting & Storing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload Document</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
