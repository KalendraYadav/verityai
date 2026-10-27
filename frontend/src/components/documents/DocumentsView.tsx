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
  Languages,
  Globe,
  BookOpen,
  Sparkles,
  GitBranch,
  UploadCloud,
} from 'lucide-react';
import {
  fetchAllDocuments,
  fetchApplications,
  fetchDocumentPages,
  fetchDocumentProcessing,
  reprocessDocument,
  getDocumentFileUrl,
  fetchDocumentLanguages,
  fetchDocumentExtractedFields,
  reprocessDocumentMultilingual,
  translateDocumentText,
  fetchRegulatoryGlossary,
  fetchDocumentRevisions,
  uploadDocumentRevision,
  type DocumentListItem,
  type ApplicationListItem,
  type DocumentPageItem,
  type DocumentProcessingStatusData,
  type DocumentLanguageResponse,
  type MultilingualFieldItem,
  type TranslationResponse,
  type DocumentRevisionItem,
} from '../../api/client';
import { DocumentUploadModal } from './DocumentUploadModal';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';

export interface DocumentsViewProps {
  userRole?: string;
  onOpenDossier?: (applicationId: string) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ userRole, onOpenDossier }) => {
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
  const [activeTab, setActiveTab] = useState<'text' | 'file' | 'pipeline' | 'multilingual' | 'revisions'>('text');
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pages, setPages] = useState<DocumentPageItem[]>([]);
  const [processingData, setProcessingData] = useState<DocumentProcessingStatusData | null>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [copiedPageIndex, setCopiedPageIndex] = useState<number | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // Multilingual Scrutiny State
  const [docLanguages, setDocLanguages] = useState<DocumentLanguageResponse | null>(null);
  const [extractedFields, setExtractedFields] = useState<MultilingualFieldItem[]>([]);
  const [glossary, setGlossary] = useState<Record<string, string> | null>(null);
  const [multilingualLoading, setMultilingualLoading] = useState(false);
  const [reprocessingMultilingual, setReprocessingMultilingual] = useState(false);
  const [translateInput, setTranslateInput] = useState('संस्थान का नाम: राजकीय महिला पॉलिटेक्निक। स्वीकृत क्षमता: १२०। शैक्षणिक सत्र: २०२४-२५।');
  const [translationResult, setTranslationResult] = useState<TranslationResponse | null>(null);
  const [translating, setTranslating] = useState(false);

  // Document Revisions State
  const [docRevisions, setDocRevisions] = useState<DocumentRevisionItem[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [revisionSummaryInput, setRevisionSummaryInput] = useState('');
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [uploadingRevision, setUploadingRevision] = useState(false);
  const [revisionMessage, setRevisionMessage] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'hierarchy' | 'flat'>('hierarchy');

  // Group documents hierarchically: Institution -> Application -> Documents
  const institutionGroups = React.useMemo(() => {
    const instMap = new Map<string, {
      institutionId: string;
      institutionName: string;
      institutionIdentifier: string;
      location: string;
      applicationGroups: {
        application: ApplicationListItem;
        documents: DocumentListItem[];
      }[];
      totalDocuments: number;
    }>();

    // Index all applications under their institutions
    applications.forEach((app) => {
      const instId = app.institution?.id || 'UNKNOWN';
      if (!instMap.has(instId)) {
        instMap.set(instId, {
          institutionId: instId,
          institutionName: app.institution?.institution_name || 'Technical Institution',
          institutionIdentifier: app.institution?.institution_identifier || instId,
          location: 'Approved AICTE Institution',
          applicationGroups: [],
          totalDocuments: 0,
        });
      }
      const group = instMap.get(instId)!;
      const appDocs = documents.filter((d) => d.application_id === app.id);
      group.applicationGroups.push({
        application: app,
        documents: appDocs,
      });
      group.totalDocuments += appDocs.length;
    });

    // Handle any documents whose application_id is not in loaded applications list
    const assignedDocIds = new Set(
      Array.from(instMap.values()).flatMap((ig) => ig.applicationGroups.flatMap((ag) => ag.documents.map((d) => d.id)))
    );
    const unassignedDocs = documents.filter((d) => !assignedDocIds.has(d.id));
    if (unassignedDocs.length > 0) {
      instMap.set('OTHER_INSTITUTIONS', {
        institutionId: 'OTHER_INSTITUTIONS',
        institutionName: 'Additional Institutional Dossiers',
        institutionIdentifier: 'SYSTEM',
        location: 'Active Scrutiny Archive',
        applicationGroups: [{
          application: {
            id: 'DIRECT_DOSSIER',
            application_reference: 'DIRECT-SUBMISSIONS',
            institution: { id: 'SYSTEM', institution_name: 'Direct Submissions' },
            category_code: 'STATUTORY_RECORDS',
            academic_year: '2026-27',
            lifecycle_status: 'SUBMITTED',
            pipeline_status: 'COMPLETED',
            document_count: unassignedDocs.length,
            open_findings_count: 0,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
          documents: unassignedDocs,
        }],
        totalDocuments: unassignedDocs.length,
      });
    }

    return Array.from(instMap.values());
  }, [applications, documents]);

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

  async function loadMultilingualData(docId: string) {
    setMultilingualLoading(true);
    try {
      const [langRes, fieldsRes, glossRes] = await Promise.all([
        fetchDocumentLanguages(docId).catch(() => null),
        fetchDocumentExtractedFields(docId).catch(() => []),
        glossary ? Promise.resolve(glossary) : fetchRegulatoryGlossary().catch(() => null),
      ]);
      setDocLanguages(langRes);
      setExtractedFields(fieldsRes);
      if (glossRes && Object.keys(glossRes).length > 0) {
        setGlossary(glossRes);
      }
    } catch (err: any) {
      console.error('Failed to load multilingual data', err);
    } finally {
      setMultilingualLoading(false);
    }
  }

  async function handleReprocessMultilingual() {
    if (!selectedDoc) return;
    setReprocessingMultilingual(true);
    setWorkspaceError(null);
    try {
      await reprocessDocumentMultilingual(selectedDoc.id);
      await loadMultilingualData(selectedDoc.id);
    } catch (err: any) {
      setWorkspaceError(err.message || 'Failed to reprocess multilingual document');
    } finally {
      setReprocessingMultilingual(false);
    }
  }

  async function handleTranslate() {
    if (!selectedDoc || !translateInput.trim()) return;
    setTranslating(true);
    setWorkspaceError(null);
    try {
      const res = await translateDocumentText(selectedDoc.id, {
        text: translateInput.trim(),
        provider: 'GLOSSARY',
      });
      setTranslationResult(res);
    } catch (err: any) {
      setWorkspaceError(err.message || 'Failed to translate document text');
    } finally {
      setTranslating(false);
    }
  }

  async function loadRevisions(docId: string) {
    setLoadingRevisions(true);
    setRevisionMessage(null);
    try {
      const revs = await fetchDocumentRevisions(docId);
      setDocRevisions(revs);
    } catch (err: any) {
      console.error('Failed to load document revisions', err);
    } finally {
      setLoadingRevisions(false);
    }
  }

  async function handleUploadRevision(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoc || !revisionFile) return;
    setUploadingRevision(true);
    setRevisionMessage(null);
    try {
      const rev = await uploadDocumentRevision(selectedDoc.id, revisionFile, revisionSummaryInput);
      setRevisionMessage(`Revision v${rev.revision_number} uploaded successfully.`);
      setRevisionFile(null);
      setRevisionSummaryInput('');
      await loadRevisions(selectedDoc.id);
      await loadData();
    } catch (err: any) {
      setRevisionMessage(`Upload failed: ${err.message}`);
    } finally {
      setUploadingRevision(false);
    }
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
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 font-medium">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            COMPLETED
          </Badge>
        );
      case 'COMPLETED_WITH_WARNINGS':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 font-medium">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            COMPLETED (WARNINGS)
          </Badge>
        );
      case 'PROCESSING':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1.5 font-medium">
            <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
            PROCESSING
          </Badge>
        );
      case 'QUEUED':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1.5 font-medium">
            <Clock className="w-3 h-3 text-purple-600" />
            QUEUED
          </Badge>
        );
      case 'MANUAL_REVIEW_REQUIRED':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 gap-1.5 font-medium">
            <ShieldAlert className="w-3 h-3 text-orange-600" />
            NEEDS REVIEW
          </Badge>
        );
      case 'PARTIAL':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 font-medium">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            PARTIAL
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1.5 font-medium">
            <AlertCircle className="w-3 h-3 text-red-600" />
            FAILED
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground gap-1.5 font-medium">
            {status}
          </Badge>
        );
    }
  };

  const renderQualityBadge = (band: string | null | undefined) => {
    if (!band) return null;
    switch (band) {
      case 'GOOD':
      case 'EXCELLENT':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
            Quality: {band}
          </Badge>
        );
      case 'FAIR':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold">
            Quality: {band}
          </Badge>
        );
      case 'POOR':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold">
            Quality: {band}
          </Badge>
        );
      case 'UNUSABLE':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-semibold">
            Quality: Unusable
          </Badge>
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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1B1411] flex items-center gap-2.5">
            <FolderOpen className="w-6 h-6 text-[#33CC7A]" />
            Document Repository
          </h1>
          <p className="text-xs sm:text-sm text-[#66574F] mt-1">
            Institutional dossier documents, extraction confidence, and cryptographic integrity verification.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 w-9 rounded-full border border-[#E5DACF] bg-white hover:bg-[#FAF5F0] text-[#66574F] hover:text-[#1B1411] flex items-center justify-center transition-colors cursor-pointer"
            title="Refresh repository"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#33CC7A]' : ''}`} />
          </button>

          {userRole !== 'REVIEWER' && (
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="h-9 px-4 rounded-full bg-[#33CC7A] hover:bg-[#2EB86E] text-[#1B1411] font-bold text-xs inline-flex items-center gap-2 transition-all shadow-[0_2px_10px_rgba(51,204,122,0.25)] cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Document
            </button>
          )}
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E5DACF] p-3.5 shadow-[0_4px_24px_-4px_rgba(27,20,17,0.04)] flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#66574F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search documents by original filename or SHA-256 hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 text-xs h-9 rounded-full border border-[#E5DACF] bg-[#FAF5F0]/50 focus:bg-white focus:outline-hidden focus:border-[#1B1411] text-[#1B1411]"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-[#1F3954] hidden sm:block" />
          <select
            value={selectedApplication}
            onChange={(e) => setSelectedApplication(e.target.value)}
            className="px-3.5 py-1.5 text-xs rounded-full bg-[#FAF5F0]/50 border border-[#E5DACF] text-[#1B1411] focus:outline-hidden focus:border-[#1B1411] transition-all cursor-pointer w-full md:w-64"
          >
            <option value="">All Applications</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.application_reference} — {app.institution?.institution_name || 'Institution'}
              </option>
            ))}
          </select>

          {/* Mode toggle */}
          <div className="flex items-center bg-[#EEE5DC] p-1 rounded-full border border-[#E5DACF] shrink-0">
            <button
              type="button"
              className={`h-7 text-xs px-3 rounded-full font-semibold transition-all cursor-pointer ${
                viewMode === 'hierarchy'
                  ? 'bg-[#1B1411] text-[#FAF5F0] shadow-sm'
                  : 'text-[#66574F] hover:text-[#1B1411]'
              }`}
              onClick={() => setViewMode('hierarchy')}
            >
              Dossiers
            </button>
            <button
              type="button"
              className={`h-7 text-xs px-3 rounded-full font-semibold transition-all cursor-pointer ${
                viewMode === 'flat'
                  ? 'bg-[#1B1411] text-[#FAF5F0] shadow-sm'
                  : 'text-[#66574F] hover:text-[#1B1411]'
              }`}
              onClick={() => setViewMode('flat')}
            >
              Flat List
            </button>
          </div>
        </div>
      </div>

      {/* 3. Document Repository View */}
      {loading ? (
        <Card className="p-12 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Loading verified document repository...</p>
        </Card>
      ) : error ? (
        <Card className="p-12 text-center space-y-3 border-destructive/30">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-destructive">{error}</p>
          <Button
            variant="link"
            size="sm"
            onClick={handleRefresh}
          >
            Retry
          </Button>
        </Card>
      ) : documents.length === 0 ? (
        <Card className="p-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-foreground">No documents uploaded</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload institutional certificates, NOCs, or regulatory orders to start automated extraction.
            </p>
          </div>
          {userRole !== 'REVIEWER' && (
            <Button
              onClick={() => setUploadModalOpen(true)}
              size="sm"
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload First Document
            </Button>
          )}
        </Card>
      ) : viewMode === 'hierarchy' ? (
        /* Hierarchical Dossier Grouping: Institution -> Application -> Documents */
        <div className="space-y-6">
          {institutionGroups.map((group) => (
            <Card key={group.institutionId} className="overflow-hidden border-border shadow-xs">
              {/* Institution Header */}
              <div className="p-4 sm:p-5 bg-muted/40 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-foreground">{group.institutionName}</h2>
                      <Badge variant="secondary" className="font-mono text-[11px] font-semibold">
                        Code: {group.institutionIdentifier}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {group.location} • {group.applicationGroups.length} Application{group.applicationGroups.length === 1 ? '' : 's'} • {group.totalDocuments} Supporting Document{group.totalDocuments === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Applications under this institution */}
              <div className="p-4 sm:p-5 space-y-4 bg-muted/10">
                {group.applicationGroups.map((appGroup) => (
                  <Card key={appGroup.application.id} className="overflow-hidden border-border shadow-2xs">
                    {/* Application Dossier Header */}
                    <div className="p-3.5 sm:p-4 bg-card border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs font-bold text-foreground bg-accent/30">
                          {appGroup.application.application_reference}
                        </Badge>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {appGroup.application.category_code}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          AY {appGroup.application.academic_year}
                        </span>
                        <Badge variant="outline" className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                          {appGroup.application.lifecycle_status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        {onOpenDossier && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => onOpenDossier(appGroup.application.id)}
                            className="gap-1.5 h-8 text-xs font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Open Dossier
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Documents Table for this Application */}
                    {appGroup.documents.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground italic">
                        No supporting documents uploaded for this application.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40 text-[10px] font-bold uppercase tracking-wider">
                              <TableHead className="py-2.5 px-4">Document / SHA-256</TableHead>
                              <TableHead className="py-2.5 px-3">Type</TableHead>
                              <TableHead className="py-2.5 px-3">Pages / Size</TableHead>
                              <TableHead className="py-2.5 px-3">Processing Status</TableHead>
                              <TableHead className="py-2.5 px-3">Uploaded</TableHead>
                              <TableHead className="py-2.5 px-4 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="text-xs">
                            {appGroup.documents.map((doc) => (
                              <TableRow
                                key={doc.id}
                                onClick={() => openDocumentWorkspace(doc)}
                                className="hover:bg-muted/30 cursor-pointer group"
                              >
                                <TableCell className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex items-center justify-center shrink-0">
                                      <FileText className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="overflow-hidden max-w-[220px]">
                                      <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-xs" title={doc.original_filename}>
                                        {doc.original_filename}
                                      </p>
                                      <p className="text-[10px] font-mono text-muted-foreground truncate" title={doc.sha256}>
                                        SHA: {doc.sha256.substring(0, 16)}...
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 px-3 text-xs text-foreground font-medium">
                                  {doc.declared_type || doc.media_type.split('/')[1]?.toUpperCase() || 'DOCUMENT'}
                                </TableCell>
                                <TableCell className="py-3 px-3 text-muted-foreground">
                                  <div className="flex flex-col text-[11px]">
                                    <span className="font-semibold text-foreground">
                                      {doc.page_count !== null && doc.page_count !== undefined ? `${doc.page_count} pg` : '—'}
                                    </span>
                                    <span className="font-mono text-[10px]">{formatBytes(doc.file_size_bytes)}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 px-3">
                                  <div className="flex flex-col gap-1 items-start">
                                    {renderStatusBadge(doc.processing_status)}
                                    {renderQualityBadge(doc.extraction_quality_band)}
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 px-3 text-muted-foreground text-[11px]">
                                  {formatDate(doc.created_at)}
                                </TableCell>
                                <TableCell className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => openDocumentWorkspace(doc)}
                                      title="Open Extraction Workspace"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                    <a
                                      href={getDocumentFileUrl(doc.id, true)}
                                      download={doc.original_filename}
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-input text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                      title="Download document file"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Flat Table */
        <Card className="overflow-hidden border-border shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-[11px] font-bold uppercase tracking-wider">
                  <TableHead className="py-3.5 px-5">Document / SHA-256</TableHead>
                  <TableHead className="py-3.5 px-4">Application</TableHead>
                  <TableHead className="py-3.5 px-4">Type</TableHead>
                  <TableHead className="py-3.5 px-4">Pages / Size</TableHead>
                  <TableHead className="py-3.5 px-4">Processing Status</TableHead>
                  <TableHead className="py-3.5 px-4">Uploaded</TableHead>
                  <TableHead className="py-3.5 px-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {documents.map((doc) => (
                  <TableRow
                    key={doc.id}
                    onClick={() => openDocumentWorkspace(doc)}
                    className="hover:bg-muted/30 cursor-pointer group"
                  >
                    <TableCell className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden max-w-[220px]">
                          <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors" title={doc.original_filename}>
                            {doc.original_filename}
                          </p>
                          <p className="text-[10px] font-mono text-muted-foreground truncate" title={doc.sha256}>
                            SHA: {doc.sha256.substring(0, 16)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5 px-4">
                      <Badge variant="outline" className="font-mono text-xs font-semibold text-primary bg-primary/5">
                        {doc.application_id}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-3.5 px-4">
                      <span className="text-xs text-foreground font-medium">
                        {doc.declared_type || doc.media_type.split('/')[1]?.toUpperCase() || 'DOCUMENT'}
                      </span>
                    </TableCell>

                    <TableCell className="py-3.5 px-4 text-muted-foreground">
                      <div className="flex flex-col text-[11px]">
                        <span className="font-semibold text-foreground">
                          {doc.page_count !== null && doc.page_count !== undefined ? `${doc.page_count} page${doc.page_count === 1 ? '' : 's'}` : '—'}
                        </span>
                        <span className="font-mono text-[10px]">{formatBytes(doc.file_size_bytes)}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {renderStatusBadge(doc.processing_status)}
                        {renderQualityBadge(doc.extraction_quality_band)}
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5 px-4 text-muted-foreground text-[11px]">
                      {formatDate(doc.created_at)}
                    </TableCell>

                    <TableCell className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDocumentWorkspace(doc)}
                          title="Open Extraction Workspace"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <a
                          href={getDocumentFileUrl(doc.id, true)}
                          download={doc.original_filename}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-input text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Download document file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        initialApplicationId={selectedApplication || undefined}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Document Workspace / Extraction Detail Dialog */}
      {selectedDoc && (
        <Dialog open={Boolean(selectedDoc)} onOpenChange={(open) => !open && closeWorkspace()}>
          <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden bg-card">
            {/* Modal Header */}
            <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <DialogTitle className="text-base font-bold text-foreground truncate">
                        {selectedDoc.original_filename}
                      </DialogTitle>
                      {renderStatusBadge(effectiveStatus)}
                      {renderQualityBadge(effectiveQualityBand)}
                    </div>
                    <DialogDescription className="text-[11px] font-mono text-muted-foreground mt-0.5">
                      ID: {selectedDoc.id} • App: {selectedDoc.application_id} • {formatBytes(selectedDoc.file_size_bytes)} • {selectedDoc.media_type}
                    </DialogDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReprocess}
                    disabled={reprocessing || effectiveStatus === 'PROCESSING'}
                    className="gap-1.5"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${reprocessing ? 'animate-spin text-primary' : ''}`} />
                    <span>{reprocessing ? 'Reprocessing...' : 'Reprocess'}</span>
                  </Button>

                  <a
                    href={getDocumentFileUrl(selectedDoc.id, true)}
                    download={selectedDoc.original_filename}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-input bg-background text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            </DialogHeader>

            {/* Tabs Container */}
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                const tab = val as 'text' | 'file' | 'pipeline' | 'multilingual' | 'revisions';
                setActiveTab(tab);
                if (tab === 'multilingual' && selectedDoc) loadMultilingualData(selectedDoc.id);
                if (tab === 'revisions' && selectedDoc) loadRevisions(selectedDoc.id);
              }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="px-5 border-b border-border bg-card">
                <TabsList className="bg-transparent h-11 p-0 gap-6">
                  <TabsTrigger
                    value="text"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-11 px-1 font-semibold text-xs sm:text-sm"
                  >
                    <FileText className="w-4 h-4 mr-1.5" />
                    Extracted Text ({pages.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="file"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-11 px-1 font-semibold text-xs sm:text-sm"
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    Original File
                  </TabsTrigger>
                  <TabsTrigger
                    value="pipeline"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-11 px-1 font-semibold text-xs sm:text-sm"
                  >
                    <Layers className="w-4 h-4 mr-1.5" />
                    Processing Run
                  </TabsTrigger>
                  <TabsTrigger
                    value="multilingual"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-11 px-1 font-semibold text-xs sm:text-sm"
                  >
                    <Languages className="w-4 h-4 mr-1.5" />
                    Multilingual & Glossary
                    {docLanguages?.detected_language && (
                      <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1">
                        {docLanguages.detected_language.toUpperCase()}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="revisions"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-11 px-1 font-semibold text-xs sm:text-sm"
                  >
                    <GitBranch className="w-4 h-4 mr-1.5" />
                    Revisions ({docRevisions.length > 0 ? docRevisions.length : '1'})
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Error banner */}
              {workspaceError && (
                <div className="m-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p className="font-semibold">{workspaceError}</p>
                </div>
              )}

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/20">
                {/* TAB 1: Extracted Text */}
                <TabsContent value="text" className="mt-0 space-y-4 max-w-4xl mx-auto">
                  {(effectiveStatus === 'PROCESSING' || effectiveStatus === 'QUEUED') && (
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3.5">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-blue-600">
                          Document Text Extraction & OCR in progress
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          PyMuPDF and RapidOCR are actively extracting text. Updates refresh automatically.
                        </p>
                      </div>
                    </div>
                  )}

                  {effectiveStatus === 'MANUAL_REVIEW_REQUIRED' && pages.length > 0 && pages.every((p) => p.char_count === 0) && (
                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3.5">
                      <ShieldAlert className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-orange-600">
                          No extractable text recognized on any page
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Document may be a blank page, low-contrast scan, or image without discernible text. The system records this honestly and flags it for human reviewer inspection.
                        </p>
                      </div>
                    </div>
                  )}

                  {pagesLoading ? (
                    <div className="py-16 text-center space-y-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" />
                      <p className="text-xs text-muted-foreground">Retrieving extracted page text...</p>
                    </div>
                  ) : pages.length === 0 ? (
                    <Card className="py-16 text-center space-y-3 p-8">
                      <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
                      <h4 className="text-sm font-bold text-foreground">No page records found</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        This document has not been processed yet. Click &quot;Reprocess&quot; above to trigger text extraction.
                      </p>
                    </Card>
                  ) : (
                    pages.map((page, idx) => (
                      <Card key={page.id} className="overflow-hidden shadow-2xs border-border">
                        <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground">
                              Page {page.page_number}
                            </span>

                            {page.text_source === 'DIGITAL_TEXT' ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                Digital Text (PyMuPDF)
                              </Badge>
                            ) : page.text_source === 'OCR' ? (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">
                                Scanned OCR (RapidOCR)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] font-bold">
                                No Text Detected
                              </Badge>
                            )}

                            {page.text_source === 'OCR' && page.ocr_mean_confidence !== null && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                OCR Confidence: {(page.ocr_mean_confidence * 100).toFixed(1)}%
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>{page.char_count} chars</span>
                            {page.duration_ms !== null && <span>• {page.duration_ms} ms</span>}
                            {page.clean_text && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleCopyText(page.clean_text || '', idx)}
                                title="Copy page text"
                              >
                                {copiedPageIndex === idx ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="p-4 font-mono text-xs text-foreground leading-relaxed whitespace-pre-wrap select-text bg-card max-h-96 overflow-y-auto">
                          {page.clean_text ? (
                            page.clean_text
                          ) : (
                            <span className="text-muted-foreground italic font-sans text-xs">
                              [No extractable text recognized on Page {page.page_number}]
                            </span>
                          )}
                        </div>
                      </Card>
                    ))
                  )}

                  <div className="p-3.5 rounded-xl bg-accent/30 border border-border flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Info className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      <strong>VerityAI Principles:</strong> Extracted text represents raw document parsing and is not an endorsement of institutional compliance or proof of certificate authenticity.
                    </span>
                  </div>
                </TabsContent>

                {/* TAB 2: Original File Viewer */}
                <TabsContent value="file" className="mt-0 w-full h-full min-h-[500px]">
                  <div className="w-full h-full min-h-[500px] bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center p-2">
                    {selectedDoc.media_type === 'application/pdf' ? (
                      <iframe
                        src={getDocumentFileUrl(selectedDoc.id)}
                        title={selectedDoc.original_filename}
                        className="w-full h-full min-h-[550px] rounded-lg bg-white border border-border"
                      />
                    ) : selectedDoc.media_type.startsWith('image/') ? (
                      <img
                        src={getDocumentFileUrl(selectedDoc.id)}
                        alt={selectedDoc.original_filename}
                        className="max-h-[550px] max-w-full object-contain rounded-lg shadow-lg"
                      />
                    ) : (
                      <div className="text-center text-white space-y-3">
                        <p className="text-sm">Inline preview not supported for this media type.</p>
                        <Button asChild size="sm">
                          <a href={getDocumentFileUrl(selectedDoc.id, true)} download>
                            <Download className="w-4 h-4 mr-1.5" />
                            Download File
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* TAB 3: Processing Run */}
                <TabsContent value="pipeline" className="mt-0 space-y-4 max-w-3xl mx-auto">
                  <Card className="p-5 border-border shadow-2xs space-y-4">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      Current Processing Run Lifecycle
                    </h4>

                    {processingData?.current_run ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-muted/40 border border-border">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Run ID</span>
                          <p className="font-mono text-xs text-foreground font-semibold">{processingData.current_run.id}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40 border border-border">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Trigger</span>
                          <p className="font-semibold text-xs text-foreground">{processingData.current_run.trigger}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40 border border-border">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Pipeline Version</span>
                          <p className="font-semibold text-xs text-foreground">{processingData.current_run.pipeline_version}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40 border border-border">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Duration</span>
                          <p className="font-semibold text-xs text-foreground">
                            {processingData.current_run.duration_ms ? `${processingData.current_run.duration_ms} ms` : 'Running...'}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40 border border-border">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Started At</span>
                          <p className="font-semibold text-xs text-foreground">{formatDate(processingData.current_run.started_at)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40 border border-border">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Completed At</span>
                          <p className="font-semibold text-xs text-foreground">
                            {processingData.current_run.completed_at ? formatDate(processingData.current_run.completed_at) : '—'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No processing run metadata available.</p>
                    )}

                    {/* Quality Summary Breakdown */}
                    {processingData?.current_run?.quality_summary && (
                      <div className="p-4 rounded-xl bg-accent/20 border border-border space-y-3">
                        <h5 className="text-xs font-bold text-foreground">Quality Summary Metrics</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                          <div className="bg-card p-2.5 rounded-lg border border-border">
                            <span className="text-[10px] text-muted-foreground font-semibold">Total Pages</span>
                            <p className="text-sm font-bold text-foreground">{processingData.current_run.quality_summary.pages_total}</p>
                          </div>
                          <div className="bg-card p-2.5 rounded-lg border border-border">
                            <span className="text-[10px] text-muted-foreground font-semibold">Processed Pages</span>
                            <p className="text-sm font-bold text-emerald-600">{processingData.current_run.quality_summary.pages_processed}</p>
                          </div>
                          <div className="bg-card p-2.5 rounded-lg border border-border">
                            <span className="text-[10px] text-muted-foreground font-semibold">Quality Band</span>
                            <p className="text-xs font-bold text-primary mt-0.5">{processingData.current_run.quality_summary.extraction_quality_band}</p>
                          </div>
                          <div className="bg-card p-2.5 rounded-lg border border-border">
                            <span className="text-[10px] text-muted-foreground font-semibold">Total Chars</span>
                            <p className="text-sm font-bold text-foreground">{processingData.current_run.quality_summary.total_characters}</p>
                          </div>
                        </div>

                        {processingData.current_run.quality_summary.text_source_mix && (
                          <div className="text-[11px] text-muted-foreground pt-1">
                            <span className="font-semibold text-foreground">Source breakdown: </span>
                            Digital Text: {processingData.current_run.quality_summary.text_source_mix.DIGITAL_TEXT} • 
                            OCR: {processingData.current_run.quality_summary.text_source_mix.OCR} • 
                            None: {processingData.current_run.quality_summary.text_source_mix.NONE}
                          </div>
                        )}
                      </div>
                    )}

                    {processingData?.current_run?.error_code && (
                      <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs space-y-1">
                        <p className="font-bold text-destructive">Error Code: {processingData.current_run.error_code}</p>
                        <p className="text-muted-foreground">{processingData.current_run.safe_error_summary}</p>
                      </div>
                    )}
                  </Card>
                </TabsContent>

                {/* TAB 4: Multilingual */}
                <TabsContent value="multilingual" className="mt-0 space-y-6 max-w-4xl mx-auto">
                  {multilingualLoading ? (
                    <Card className="py-16 text-center space-y-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" />
                      <p className="text-xs text-muted-foreground">Analyzing document languages and candidate fields...</p>
                    </Card>
                  ) : (
                    <>
                      <Card className="p-5 border-border shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <Languages className="w-5 h-5 text-primary" />
                              <h4 className="text-sm font-bold text-foreground">
                                Multilingual Script & Language Analysis
                              </h4>
                              {docLanguages?.detected_language ? (
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                  {docLanguages.detected_language === 'en'
                                    ? 'English (EN)'
                                    : docLanguages.detected_language === 'hi'
                                    ? 'Hindi / हिन्दी (HI)'
                                    : docLanguages.detected_language === 'mixed'
                                    ? 'Mixed Script (Hindi + English)'
                                    : 'Undetermined (UND)'}
                                </Badge>
                              ) : (
                                <Badge variant="outline">Not analyzed</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Evaluates script distribution (Devanagari vs. Latin). Short fragments are truthfully classified as undetermined ("und").
                            </p>
                          </div>

                          <Button
                            onClick={handleReprocessMultilingual}
                            disabled={reprocessingMultilingual}
                            size="sm"
                            className="gap-2 shrink-0"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${reprocessingMultilingual ? 'animate-spin' : ''}`} />
                            <span>{reprocessingMultilingual ? 'Analyzing...' : 'Re-run Analysis'}</span>
                          </Button>
                        </div>

                        {docLanguages?.language_distribution && Object.keys(docLanguages.language_distribution).length > 0 && (
                          <div className="pt-2 border-t border-border">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                              Document Page Distribution
                            </span>
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {Object.entries(docLanguages.language_distribution).map(([lang, ratio]) => (
                                <div key={lang} className="p-2.5 rounded-lg bg-muted/40 border border-border">
                                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                    {lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : lang === 'mixed' ? 'Mixed' : 'Undetermined'}
                                  </span>
                                  <p className="text-base font-extrabold text-foreground">
                                    {(ratio * 100).toFixed(0)}%
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {docLanguages?.page_languages && docLanguages.page_languages.length > 0 && (
                          <div className="pt-2 border-t border-border">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                              Page-Level Language Identification
                            </span>
                            <div className="mt-2 divide-y divide-border rounded-lg border border-border overflow-hidden">
                              {docLanguages.page_languages.map((p) => (
                                <div key={p.page_number} className="p-3 bg-card flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground">Page {p.page_number}</span>
                                    <Badge variant="outline" className="text-[10px]">
                                      {p.detected_language ? p.detected_language.toUpperCase() : 'UND'}
                                    </Badge>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {p.language_confidence !== null && p.language_confidence !== undefined ? (
                                      <span>Confidence: {(p.language_confidence * 100).toFixed(0)}%</span>
                                    ) : (
                                      <span className="italic">Confidence: Not assessed (short text)</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>

                      {/* Candidate Fields */}
                      <Card className="p-5 border-border shadow-2xs space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <h4 className="text-sm font-bold text-foreground">
                            Extracted Multilingual Candidate Fields ({extractedFields.length})
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Structured fields extracted via bilingual Hindi/English regulatory patterns. Native Devanagari numerals are normalized into ASCII for deterministic checks.
                        </p>

                        {extractedFields.length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted-foreground bg-muted/30 rounded-lg border border-border">
                            No candidate fields discovered yet. Click &quot;Re-run Analysis&quot; above to scan for bilingual fields.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-border">
                            <Table>
                              <TableHeader className="bg-muted/40">
                                <TableRow>
                                  <TableHead className="py-2.5 px-3">Field Key</TableHead>
                                  <TableHead className="py-2.5 px-3">Raw Evidence</TableHead>
                                  <TableHead className="py-2.5 px-3">Normalized Value</TableHead>
                                  <TableHead className="py-2.5 px-3">Page</TableHead>
                                  <TableHead className="py-2.5 px-3">Confidence</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="text-xs">
                                {extractedFields.map((field) => (
                                  <TableRow key={field.id}>
                                    <TableCell className="py-2.5 px-3 font-semibold text-foreground">{field.field_name}</TableCell>
                                    <TableCell className="py-2.5 px-3 font-mono text-muted-foreground max-w-xs truncate" title={field.raw_value}>
                                      {field.raw_value}
                                    </TableCell>
                                    <TableCell className="py-2.5 px-3 font-mono font-bold text-primary">
                                      {field.normalized_value || field.raw_value}
                                    </TableCell>
                                    <TableCell className="py-2.5 px-3 text-muted-foreground">p. {field.page_number || '—'}</TableCell>
                                    <TableCell className="py-2.5 px-3">
                                      {field.confidence ? (
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                          {(field.confidence * 100).toFixed(0)}%
                                        </Badge>
                                      ) : '—'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </Card>

                      {/* Statutory Bilingual Glossary */}
                      <Card className="p-5 border-border shadow-2xs space-y-4">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <h4 className="text-sm font-bold text-foreground">
                            Statutory Regulatory Bilingual Glossary & Translator
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Standard statutory bilingual dictionary for AICTE and institutional approval terminology. Operates completely offline without external paid APIs.
                        </p>

                        <div className="space-y-3 pt-2">
                          <label className="block text-xs font-semibold text-foreground">
                            Scrutiny Translation Assistant (Local Glossary Adapter)
                          </label>
                          <div className="flex gap-2">
                            <textarea
                              rows={2}
                              value={translateInput}
                              onChange={(e) => setTranslateInput(e.target.value)}
                              placeholder="Enter Hindi regulatory text (e.g. संस्थान का नाम, स्वीकृत क्षमता)..."
                              className="flex-1 p-2.5 text-xs rounded-lg border border-input bg-background font-sans focus:outline-hidden focus:ring-2 focus:ring-ring"
                            />
                            <Button
                              onClick={handleTranslate}
                              disabled={translating || !translateInput.trim()}
                              size="sm"
                              className="gap-1.5 shrink-0"
                            >
                              <Globe className={`w-3.5 h-3.5 ${translating ? 'animate-spin' : ''}`} />
                              <span>{translating ? 'Translating...' : 'Translate'}</span>
                            </Button>
                          </div>

                          {translationResult && (
                            <div className="p-4 rounded-xl bg-accent/20 border border-border space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="font-bold text-primary">Provider: {translationResult.provider}</span>
                                <span>{translationResult.timestamp}</span>
                              </div>
                              <p className="text-xs font-mono font-medium text-foreground leading-relaxed">
                                {translationResult.translated_text}
                              </p>
                              {translationResult.glossary_terms_found.length > 0 && (
                                <div className="pt-2 border-t border-border">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                    Matched Regulatory Terms ({translationResult.glossary_terms_found.length}):
                                  </span>
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {translationResult.glossary_terms_found.map((term, i) => (
                                      <Badge key={i} variant="outline" className="text-[10px]">
                                        <strong>{term.source}</strong> → {term.translated}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {glossary && Object.keys(glossary).length > 0 && (
                          <div className="pt-3 border-t border-border">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                              Statutory Bilingual Terminology Reference ({Object.keys(glossary).length} terms)
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto p-1">
                              {Object.entries(glossary).map(([hi, en]) => (
                                <div key={hi} className="p-2 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs">
                                  <span className="font-semibold text-foreground">{hi}</span>
                                  <span className="text-primary font-medium text-[11px] text-right">{en}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    </>
                  )}
                </TabsContent>

                {/* TAB 5: Revisions */}
                <TabsContent value="revisions" className="mt-0 space-y-5 max-w-4xl mx-auto">
                  <Card className="p-4 border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-primary" />
                        <h4 className="text-sm font-bold text-foreground">Document Amendment & Revision Ledger</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        All amended uploads create immutable revision records. SHA-256 hashes are verified cryptographically.
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedDoc && loadRevisions(selectedDoc.id)}
                      disabled={loadingRevisions}
                      className="gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingRevisions ? 'animate-spin' : ''}`} />
                      Refresh Revisions
                    </Button>
                  </Card>

                  {/* Upload Amendment Form */}
                  <form onSubmit={handleUploadRevision} className="p-5 rounded-xl bg-card border border-border shadow-xs space-y-4">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-primary" />
                      Upload Document Amendment (Creates New Revision)
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">Amended Document File</label>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          required
                          onChange={(e) => setRevisionFile(e.target.files?.[0] || null)}
                          className="w-full text-xs p-2 rounded-lg border border-input bg-muted/20 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">Amendment Summary / Justification</label>
                        <Input
                          type="text"
                          required
                          value={revisionSummaryInput}
                          onChange={(e) => setRevisionSummaryInput(e.target.value)}
                          placeholder="e.g. Corrected scan with clear revenue seal..."
                          className="text-xs"
                        />
                      </div>
                    </div>

                    {revisionMessage && (
                      <div className={`p-3 rounded-lg text-xs font-semibold ${
                        revisionMessage.includes('failed') || revisionMessage.includes('identical')
                          ? 'bg-destructive/10 border border-destructive/20 text-destructive'
                          : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700'
                      }`}>
                        {revisionMessage}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={uploadingRevision || !revisionFile || !revisionSummaryInput.trim()}
                        size="sm"
                        className="gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {uploadingRevision ? 'Uploading Amendment...' : 'Upload New Revision'}
                      </Button>
                    </div>
                  </form>

                  {/* Revisions Table */}
                  <Card className="p-5 border-border shadow-xs space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Revision History Ledger ({docRevisions.length > 0 ? docRevisions.length : 1} revisions)
                    </h5>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 text-[11px] font-bold uppercase">
                            <TableHead className="py-2.5 px-3">Revision</TableHead>
                            <TableHead className="py-2.5 px-3">Status</TableHead>
                            <TableHead className="py-2.5 px-3">Amendment Summary</TableHead>
                            <TableHead className="py-2.5 px-3">SHA-256 Hash</TableHead>
                            <TableHead className="py-2.5 px-3">File Size</TableHead>
                            <TableHead className="py-2.5 px-3">Recorded At</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {docRevisions.length > 0 ? (
                            docRevisions.map((rev, idx) => (
                              <TableRow key={rev.id}>
                                <TableCell className="py-2.5 px-3 font-mono font-bold text-primary">
                                  v{rev.revision_number}
                                </TableCell>
                                <TableCell className="py-2.5 px-3">
                                  <Badge variant={idx === 0 ? 'default' : 'secondary'} className="text-[10px]">
                                    {idx === 0 ? 'CURRENT' : 'HISTORICAL'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2.5 px-3 text-foreground">
                                  {rev.change_reason || 'Initial upload'}
                                </TableCell>
                                <TableCell className="py-2.5 px-3 font-mono text-[10px] text-muted-foreground">
                                  {rev.sha256 ? `${rev.sha256.slice(0, 16)}...` : 'N/A'}
                                </TableCell>
                                <TableCell className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                                  {formatBytes(rev.file_size_bytes)}
                                </TableCell>
                                <TableCell className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                                  {new Date(rev.created_at).toLocaleString('en-GB')}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : selectedDoc ? (
                            <TableRow>
                              <TableCell className="py-2.5 px-3 font-mono font-bold text-primary">v1</TableCell>
                              <TableCell className="py-2.5 px-3">
                                <Badge variant="default" className="text-[10px]">
                                  CURRENT
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-foreground">Initial upload baseline</TableCell>
                              <TableCell className="py-2.5 px-3 font-mono text-[10px] text-muted-foreground">
                                {selectedDoc.sha256 ? `${selectedDoc.sha256.slice(0, 16)}...` : 'N/A'}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                                {formatBytes(selectedDoc.file_size_bytes)}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                                {new Date(selectedDoc.created_at).toLocaleString('en-GB')}
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
