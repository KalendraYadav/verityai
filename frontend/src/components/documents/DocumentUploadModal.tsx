import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Search,
  BookOpen,
  Info,
} from 'lucide-react';
import {
  fetchApplications,
  uploadDocument,
  type ApplicationListItem,
  type DocumentUploadResponseData,
} from '../../api/client';
import {
  REGULATORY_GROUPS,
  getDocumentByCode,
  searchDocuments,
  type RegulatoryDocumentType,
} from '../../data/documentRegistry';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (doc: DocumentUploadResponseData) => void;
  initialApplicationId?: string;
}

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

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
  const [categorySearch, setCategorySearch] = useState<string>('');

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<DocumentUploadResponseData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Identify currently selected application object
  const selectedApp = useMemo(() => {
    return applications.find((a) => a.id === selectedAppId);
  }, [applications, selectedAppId]);

  // Filtered documents grounded in AICTE APH 2024-27
  const filteredDocuments = useMemo(() => {
    return searchDocuments(categorySearch, selectedApp?.category_code);
  }, [categorySearch, selectedApp?.category_code]);

  // Group filtered documents by regulatory head
  const groupedDocuments = useMemo(() => {
    const groups: Record<string, RegulatoryDocumentType[]> = {};
    for (const group of REGULATORY_GROUPS) {
      groups[group] = [];
    }
    for (const doc of filteredDocuments) {
      if (!groups[doc.categoryGroup]) {
        groups[doc.categoryGroup] = [];
      }
      groups[doc.categoryGroup].push(doc);
    }
    return groups;
  }, [filteredDocuments]);

  // Currently selected statutory document entry
  const selectedDocMetadata = useMemo(() => {
    return getDocumentByCode(declaredType);
  }, [declaredType]);

  // Sort applications cleanly: primary demo apps first
  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      const refA = a.application_reference || '';
      const refB = b.application_reference || '';

      const isDemoA = /^VAI-2026-001[0-5]$/.test(refA);
      const isDemoB = /^VAI-2026-001[0-5]$/.test(refB);

      if (isDemoA && !isDemoB) return -1;
      if (!isDemoA && isDemoB) return 1;

      return refA.localeCompare(refB);
    });
  }, [applications]);

  useEffect(() => {
    if (isOpen) {
      setLoadingApps(true);
      fetchApplications({ page_size: 50 })
        .then((res) => {
          setApplications(res.data);
          if (initialApplicationId) {
            setSelectedAppId(initialApplicationId);
          } else if (res.data.length > 0 && !selectedAppId) {
            const sorted = [...res.data].sort((a, b) => {
              const refA = a.application_reference || '';
              const refB = b.application_reference || '';
              const isDemoA = /^VAI-2026-001[0-5]$/.test(refA);
              const isDemoB = /^VAI-2026-001[0-5]$/.test(refB);
              if (isDemoA && !isDemoB) return -1;
              if (!isDemoA && isDemoB) return 1;
              return refA.localeCompare(refB);
            });
            setSelectedAppId(sorted[0].id);
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
      setCategorySearch('');
    }
  }, [isOpen, initialApplicationId]);

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
      setClientError(
        `File exceeds maximum size limit of 20MB (${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB).`
      );
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

    if (!declaredType) {
      setClientError('Please select an official AICTE statutory document category.');
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
      const res = await uploadDocument(selectedAppId, file, declaredType);
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto bg-card border-border shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Upload Statutory Document
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                AICTE Approval Process Handbook (APH 2024–27) Intake
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* Success State */}
          {uploadResult ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-600 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Document Uploaded Successfully</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  File received, encrypted, and registered under reference{' '}
                  <span className="font-mono font-bold text-primary">{uploadResult.id}</span>.
                  Processing run queued in status{' '}
                  <Badge variant="outline" className="font-semibold">{uploadResult.processing_status}</Badge>.
                </p>

                {uploadResult.possible_duplicate && (
                  <Alert variant="destructive" className="border-amber-500/30 bg-amber-500/10 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <AlertTitle className="text-xs font-bold">Duplicate Detected</AlertTitle>
                    <AlertDescription className="text-[11px]">
                      An identical document checksum was found in institutional records. Flagged for scrutiny review.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-muted-foreground space-y-0.5 font-mono">
                  <div>SHA-256: {uploadResult.sha256.substring(0, 24)}...</div>
                  <div>Size: {formatBytes(uploadResult.file_size_bytes)}</div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUploadResult(null);
                    setFile(null);
                    setDeclaredType('');
                  }}
                >
                  Upload Another
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onClose}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-4">
              {/* Target Application Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Target Application *</span>
                  {loadingApps && (
                    <span className="text-[10px] text-primary font-normal">Loading dossiers...</span>
                  )}
                </label>
                <select
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  disabled={uploading || loadingApps}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring transition-all cursor-pointer"
                >
                  <option value="">— Select an Application —</option>
                  {sortedApplications.map((app) => {
                    const instName = app.institution?.institution_name || 'Institution';
                    const instCode = app.institution?.institution_identifier || app.institution?.id || '';
                    const label = instCode
                      ? `${app.application_reference} — ${instName} [${instCode}]`
                      : `${app.application_reference} — ${instName}`;
                    return (
                      <option key={app.id} value={app.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Regulatory Document Category */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Regulatory Document Category *
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    AICTE APH 2024–27 Compliant
                  </span>
                </div>

                {/* Filter Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Search category (e.g. affidavit, stability, fire, accounts)..."
                    className="pl-8 text-xs h-8"
                  />
                  {categorySearch && (
                    <button
                      type="button"
                      onClick={() => setCategorySearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Grouped Category Dropdown */}
                <select
                  value={declaredType}
                  onChange={(e) => setDeclaredType(e.target.value)}
                  disabled={uploading}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring transition-all cursor-pointer"
                >
                  <option value="">— Select Official Statutory Category —</option>
                  {REGULATORY_GROUPS.map((group) => {
                    const docsInGroup = groupedDocuments[group] || [];
                    if (docsInGroup.length === 0) return null;
                    return (
                      <optgroup key={group} label={group}>
                        {docsInGroup.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.shortTitle} {d.mandatoryOrConditional === 'MANDATORY' ? '• (Mandatory)' : '• (Conditional)'}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>

                {/* Statutory Detail Card */}
                {selectedDocMetadata && (
                  <div className="p-3.5 rounded-xl bg-accent/40 border border-border space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <BookOpen className="w-4 h-4 text-primary shrink-0" />
                        <span>{selectedDocMetadata.shortTitle}</span>
                      </div>
                      <Badge
                        variant={selectedDocMetadata.mandatoryOrConditional === 'MANDATORY' ? 'default' : 'secondary'}
                        className="text-[10px] shrink-0"
                      >
                        {selectedDocMetadata.mandatoryOrConditional === 'MANDATORY'
                          ? 'Mandatory'
                          : 'Conditionally Required'}
                      </Badge>
                    </div>

                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">Official APH Title: </span>
                      <em className="text-foreground">"{selectedDocMetadata.officialTitle}"</em>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-1.5 border-t border-border">
                      <div>
                        <span className="font-semibold text-foreground">Source Reference: </span>
                        <span className="font-mono text-primary">
                          {selectedDocMetadata.sourceReference}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Handbook Page: </span>
                        <span>p. {selectedDocMetadata.pdfPage}</span>
                      </div>
                    </div>

                    <div className="text-[11px] bg-background/80 p-2.5 rounded-lg border border-border text-muted-foreground leading-relaxed flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{selectedDocMetadata.conditionDescription}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Drag and Drop Zone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Select or Drop Document *
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-primary bg-primary/10'
                      : file
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
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
                        <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-primary">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-foreground truncate max-w-[280px]">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatBytes(file.size)} • {file.type || 'Document'}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-card shadow-2xs border border-border flex items-center justify-center mx-auto text-primary">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-foreground">
                          Drag & drop document here, or <span className="text-primary underline">browse</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Accepted: PDF, PNG, JPEG. Max file size: 20 MB.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Errors */}
              {clientError && (
                <Alert variant="destructive" className="py-2.5">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-xs">{clientError}</AlertDescription>
                </Alert>
              )}

              {serverError && (
                <Alert variant="destructive" className="py-2.5">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-xs">{serverError}</AlertDescription>
                </Alert>
              )}

              {/* Footer actions */}
              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="teal"
                  size="sm"
                  className="btn-hover"
                  disabled={uploading || !file || !selectedAppId || !declaredType}
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
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
