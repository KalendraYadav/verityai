import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  Database,
  GitCompare,
  GitBranch,
  Network,
  Radio,
  Lock,
  ShieldAlert,
  Info,
  Cpu,
} from 'lucide-react';
import {
  fetchApplicationDetail,
  fetchApplicationDocuments,
  fetchApplicationAudit,
  fetchCategories,
  getDocumentFileUrl,
  fetchApplicationValidationSummary,
  triggerApplicationValidation,
  fetchApplicationAnalysis,
  triggerApplicationAnalysis,
  reviewFinding,
  fetchWorkflowStatus,
  fetchApplicationReadiness,
  transitionWorkflowState,
  fetchReviewSummary,
  generateReport,
  fetchApplicationReports,
  getReportDownloadUrl,
  fetchRegistryProviders,
  triggerRegistryVerification,
  fetchApplicationRegistryRuns,
  resolveRegistryDiscrepancy,
  fetchApplicationVersions,
  compareApplicationVersions,
  fetchApplicationFreshness,
  fetchRegulatoryPortals,
  probeRegulatoryPortalHealth,
  triggerExternalVerification,
  fetchPortalSyncHistory,
  type ApplicationDetailResponse,
  type DocumentListItem,
  type AuditEventItem,
  type ApplicationCategory,
  type ValidationSummaryData,
  type ApplicationAnalysisData,
  type FindingItem,
  type WorkflowStatusData,
  type ApplicationReadinessData,
  type ReviewSummaryResponse,
  type ScrutinyReportResponse,
  type RegistryProviderInfo,
  type RegistryVerificationRunItem,
  type RegistryVerificationResultItem,
  type ApplicationVersionItem,
  type VersionComparisonResponse,
  type VersionDifferenceItem,
  type ApplicationFreshnessResponse,
  type ExternalPortalConfigItem,
  type ExternalPortalSyncLogItem,
  type ExternalVerificationData,
  triggerApplicationScrutinyJob,
  fetchScrutinyJob,
  fetchApplicationScrutinyJobs,
  retryScrutinyJob,
  type ScrutinyJobResponse,
  type ScrutinyJobListItem,
} from '../../api/client';
import { DocumentUploadModal } from '../documents/DocumentUploadModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatusBadge } from '@/components/common/StatusBadge';


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

  // Phase 6: Anomaly Detection & Candidate Fields
  const [analysisData, setAnalysisData] = useState<ApplicationAnalysisData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<FindingItem | null>(null);
  const [reviewStatusInput, setReviewStatusInput] = useState<string>('CONFIRMED');
  const [reviewCommentInput, setReviewCommentInput] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [anomalySeverityFilter, setAnomalySeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [anomalyReviewFilter, setAnomalyReviewFilter] = useState<'ALL' | 'OPEN' | 'CONFIRMED' | 'DISMISSED' | 'RESOLVED' | 'UNDER_REVIEW'>('ALL');
  const [activeAnomalySection, setActiveAnomalySection] = useState<'findings' | 'fields'>('findings');

  // Phase 8: End-to-End Workflow & Readiness
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatusData | null>(null);
  const [readiness, setReadiness] = useState<ApplicationReadinessData | null>(null);
  const [runningWorkflow, setRunningWorkflow] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [workflowMessage, setWorkflowMessage] = useState<string | null>(null);

  // Phase 4: Persistent Scrutiny Job Integration & Polling
  const [activeScrutinyJob, setActiveScrutinyJob] = useState<ScrutinyJobResponse | null>(null);
  const [_scrutinyHistory, setScrutinyHistory] = useState<ScrutinyJobListItem[]>([]);
  const [jobPolling, setJobPolling] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [retryingJob, setRetryingJob] = useState(false);
  const pollingTimerRef = useRef<any>(null);
  const pollingFailuresRef = useRef<number>(0);

  // Phase 9: Explainable AI, Reviewer Decision Support & Reports
  const [reviewSummary, setReviewSummary] = useState<ReviewSummaryResponse | null>(null);
  const [reportsList, setReportsList] = useState<ScrutinyReportResponse[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'documents' | 'validation' | 'anomalies' | 'requirements' | 'audit' | 'institution' | 'reports' | 'registry' | 'history' | 'portals'>('documents');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Phase 11: Extended Verification & Registry Integration
  const [registryRuns, setRegistryRuns] = useState<RegistryVerificationRunItem[]>([]);
  const [registryProviders, setRegistryProviders] = useState<RegistryProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('SYNTHETIC_AISHE');
  const [verifyingRegistry, setVerifyingRegistry] = useState(false);
  const [registryMessage, setRegistryMessage] = useState<string | null>(null);
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [targetResult, setTargetResult] = useState<RegistryVerificationResultItem | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'ACCEPTED' | 'WAIVED' | 'FLAGGED'>('ACCEPTED');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  // Phase 13: Institutional Dossier History & Versioning
  const [versionsList, setVersionsList] = useState<ApplicationVersionItem[]>([]);
  const [freshnessStatus, setFreshnessStatus] = useState<ApplicationFreshnessResponse | null>(null);
  const [selectedV1, setSelectedV1] = useState<number>(1);
  const [selectedV2, setSelectedV2] = useState<number>(1);
  const [comparisonResult, setComparisonResult] = useState<VersionComparisonResponse | null>(null);
  const [comparingVersions, setComparingVersions] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Phase 14: External Regulatory Portal Interoperability
  const [portalsList, setPortalsList] = useState<ExternalPortalConfigItem[]>([]);
  const [externalVerifData, setExternalVerifData] = useState<ExternalVerificationData | null>(null);
  const [portalSyncLogs, setPortalSyncLogs] = useState<ExternalPortalSyncLogItem[]>([]);
  const [verifyingPortal, setVerifyingPortal] = useState(false);
  const [probingPortalId, setProbingPortalId] = useState<string | null>(null);
  const [portalFeedback, setPortalFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  async function loadWorkspaceData(showLoading = true) {
    if (typeof showLoading !== 'boolean') showLoading = true;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [appData, docsData, auditData, catsData, valData, analysisRes, wfData, readyData, revSum, repList, regRuns, regProviders, versData, freshData, portalsData, logsData, jobsData] = await Promise.all([
        fetchApplicationDetail(applicationId),
        fetchApplicationDocuments(applicationId, 1, 100),
        fetchApplicationAudit(applicationId),
        fetchCategories(),
        fetchApplicationValidationSummary(applicationId).catch(() => null),
        fetchApplicationAnalysis(applicationId).catch(() => null),
        fetchWorkflowStatus(applicationId).catch(() => null),
        fetchApplicationReadiness(applicationId).catch(() => null),
        fetchReviewSummary(applicationId).catch(() => null),
        fetchApplicationReports(applicationId).catch(() => []),
        fetchApplicationRegistryRuns(applicationId).catch(() => []),
        fetchRegistryProviders().catch(() => []),
        fetchApplicationVersions(applicationId).catch(() => []),
        fetchApplicationFreshness(applicationId).catch(() => null),
        fetchRegulatoryPortals().catch(() => []),
        fetchPortalSyncHistory(10).catch(() => []),
        fetchApplicationScrutinyJobs(applicationId).catch(() => []),
      ]);
      setApplication(appData);
      setDocuments(docsData.data);
      setAuditEvents(auditData);
      setCategories(catsData);
      if (valData) {
        setValidationSummary(valData);
      }
      if (analysisRes) {
        setAnalysisData(analysisRes);
      }
      if (wfData) {
        setWorkflowStatus(wfData);
      }
      if (readyData) {
        setReadiness(readyData);
      }
      if (revSum) {
        setReviewSummary(revSum);
      }
      if (repList) {
        setReportsList(repList);
      }
      if (regRuns) {
        setRegistryRuns(regRuns);
      }
      if (regProviders) {
        setRegistryProviders(regProviders);
      }
      if (versData && versData.length > 0) {
        setVersionsList(versData);
        if (versData.length >= 2) {
          setSelectedV1(versData[1].version_number);
          setSelectedV2(versData[0].version_number);
        } else {
          setSelectedV1(versData[0].version_number);
          setSelectedV2(versData[0].version_number);
        }
      }
      if (freshData) {
        setFreshnessStatus(freshData);
      }
      if (portalsData && portalsData.length > 0) {
        setPortalsList(portalsData);
      }
      if (logsData) {
        setPortalSyncLogs(logsData);
      }
      if (jobsData && jobsData.length > 0) {
        setScrutinyHistory(jobsData);
        const latestJob = jobsData[0];
        fetchScrutinyJob(latestJob.id)
          .then((job) => {
            setActiveScrutinyJob(job);
            if (job.status === 'QUEUED' || job.status === 'PROCESSING') {
              startPollingJob(job.id);
            }
          })
          .catch((e) => console.warn('Failed to load latest scrutiny job details', e));
      }

    } catch (err: any) {
      console.error('Failed to load application detail workspace', err);
      setError(err.message || 'Failed to load application workspace');
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function handleTriggerRegistryVerification() {
    setVerifyingRegistry(true);
    setRegistryMessage(null);
    try {
      const run = await triggerRegistryVerification(applicationId, selectedProvider);
      setRegistryRuns((prev) => [run, ...prev]);
      setRegistryMessage(`Verification completed: Status is ${run.overall_status}.`);
      setActiveSubTab('registry');
    } catch (err: any) {
      setRegistryMessage(`Registry verification failed: ${err.message}`);
    } finally {
      setVerifyingRegistry(false);
    }
  }

  async function handleResolveDiscrepancy() {
    if (!targetResult) return;
    setResolving(true);
    try {
      const updated = await resolveRegistryDiscrepancy(targetResult.id, resolutionStatus, resolutionNotes);
      setRegistryRuns((prev) =>
        prev.map((run) => ({
          ...run,
          results: run.results.map((r) => (r.id === updated.id ? updated : r)),
        }))
      );
      setResolutionModalOpen(false);
      setTargetResult(null);
      setResolutionNotes('');
    } catch (err: any) {
      alert(`Failed to resolve discrepancy: ${err.message}`);
    } finally {
      setResolving(false);
    }
  }

  async function handleCompareVersions() {
    if (selectedV1 === selectedV2) {
      setComparisonError('Please select two distinct versions to compare differences.');
      return;
    }
    setComparingVersions(true);
    setComparisonError(null);
    try {
      const diff = await compareApplicationVersions(applicationId, selectedV1, selectedV2);
      setComparisonResult(diff);
    } catch (err: any) {
      setComparisonError(err.message || 'Failed to compare dossier versions');
    } finally {
      setComparingVersions(false);
    }
  }

  async function handleTriggerExternalVerification(providerId: string) {
    setVerifyingPortal(true);
    setPortalFeedback(null);
    try {
      const res = await triggerExternalVerification(applicationId, providerId);
      setExternalVerifData(res);
      setPortalFeedback({
        type: 'success',
        text: `Verification against ${res.provider_name} completed: Overall status is ${res.overall_status}.`
      });
      const logs = await fetchPortalSyncHistory(10).catch(() => []);
      setPortalSyncLogs(logs);
      setActiveSubTab('portals');
    } catch (err: any) {
      setPortalFeedback({
        type: 'error',
        text: `External verification failed: ${err.message}`
      });
    } finally {
      setVerifyingPortal(false);
    }
  }

  async function handleProbePortalHealth(providerId: string) {
    setProbingPortalId(providerId);
    setPortalFeedback(null);
    try {
      const health = await probeRegulatoryPortalHealth(providerId);
      setPortalFeedback({
        type: health.status === 'OPERATIONAL' ? 'success' : 'info',
        text: `[${health.provider_id}] Status: ${health.status}. ${health.message}`
      });
      setPortalsList((prev) =>
        prev.map((p) =>
          p.provider_id === providerId
            ? { ...p, health_status: health.status, health_message: health.message, latency_ms: health.latency_ms }
            : p
        )
      );
      const logs = await fetchPortalSyncHistory(10).catch(() => []);
      setPortalSyncLogs(logs);
    } catch (err: any) {
      setPortalFeedback({
        type: 'error',
        text: `Health probe failed: ${err.message}`
      });
    } finally {
      setProbingPortalId(null);
    }
  }

  async function handleGenerateScrutinyReport(format: 'PDF' | 'JSON' = 'PDF') {
    setGeneratingReport(true);
    setReportError(null);
    setReportMessage(null);
    try {
      const rep = await generateReport(applicationId, format);
      setReportMessage(`Scrutiny ${format} dossier generated successfully (${Math.round(rep.file_size_bytes / 1024)} KB)`);
      const updatedReports = await fetchApplicationReports(applicationId);
      setReportsList(updatedReports);
      const updatedSummary = await fetchReviewSummary(applicationId);
      setReviewSummary(updatedSummary);
      setActiveSubTab('reports');
    } catch (err: any) {
      console.error('Failed to generate report', err);
      setReportError(err.message || 'Report generation failed');
    } finally {
      setGeneratingReport(false);
    }
  }

  function stopPolling() {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    setJobPolling(false);
    pollingFailuresRef.current = 0;
  }

  function startPollingJob(jobId: string) {
    stopPolling();
    setJobPolling(true);
    pollingFailuresRef.current = 0;

    pollingTimerRef.current = setInterval(async () => {
      try {
        const latestJob = await fetchScrutinyJob(jobId);
        setActiveScrutinyJob(latestJob);
        pollingFailuresRef.current = 0;

        if (latestJob.status === 'COMPLETED') {
          stopPolling();
          setWorkflowMessage(`Scrutiny job ${latestJob.id} completed successfully in ${latestJob.duration_ms || 0}ms.`);
          await loadWorkspaceData(false);
        } else if (latestJob.status === 'FAILED') {
          stopPolling();
          setJobError(latestJob.safe_error_summary || 'Scrutiny pipeline execution failed.');
          await loadWorkspaceData(false);
        }
      } catch (err: any) {
        pollingFailuresRef.current += 1;
        console.warn(`Polling error for scrutiny job ${jobId} (attempt ${pollingFailuresRef.current}):`, err);
        if (pollingFailuresRef.current >= 5) {
          stopPolling();
          setJobError('Network connection issue while polling scrutiny job status. Please refresh.');
        }
      }
    }, 2000);
  }

  async function handleTriggerScrutinyJob() {
    setRunningWorkflow(true);
    setJobError(null);
    setWorkflowMessage(null);
    try {
      const job = await triggerApplicationScrutinyJob(applicationId, { job_type: 'FULL_SCRUTINY' }, true);
      setActiveScrutinyJob(job);
      if (job.status === 'COMPLETED') {
        setWorkflowMessage(`Scrutiny completed successfully (${job.duration_ms || 0}ms).`);
        await loadWorkspaceData(false);
      } else if (job.status === 'FAILED') {
        setJobError(job.safe_error_summary || 'Scrutiny job execution failed.');
        await loadWorkspaceData(false);
      } else {
        startPollingJob(job.id);
      }
    } catch (err: any) {
      console.error('Failed to trigger scrutiny job', err);
      setJobError(err.message || 'Failed to trigger scrutiny job');
    } finally {
      setRunningWorkflow(false);
    }
  }

  async function handleRetryScrutinyJob(jobId: string) {
    setRetryingJob(true);
    setJobError(null);
    setWorkflowMessage(null);
    try {
      const retried = await retryScrutinyJob(jobId, true);
      setActiveScrutinyJob(retried);
      if (retried.status === 'COMPLETED') {
        setWorkflowMessage(`Scrutiny retry completed successfully (${retried.duration_ms || 0}ms).`);
        await loadWorkspaceData(false);
      } else if (retried.status === 'FAILED') {
        setJobError(retried.safe_error_summary || 'Scrutiny retry failed.');
        await loadWorkspaceData(false);
      } else {
        startPollingJob(retried.id);
      }
    } catch (err: any) {
      console.error('Failed to retry scrutiny job', err);
      setJobError(err.message || 'Failed to retry scrutiny job');
    } finally {
      setRetryingJob(false);
    }
  }

  async function handleExecuteTransition(targetStatus: string, reason?: string, notes?: string) {
    setTransitioning(true);
    try {
      const updatedWf = await transitionWorkflowState(applicationId, {
        target_status: targetStatus,
        reason: reason || `Reviewer transitioned state to ${targetStatus}`,
        reviewer_notes: notes,
      });
      setWorkflowStatus(updatedWf);
      const [appData, auditData] = await Promise.all([
        fetchApplicationDetail(applicationId),
        fetchApplicationAudit(applicationId),
      ]);
      setApplication(appData);
      setAuditEvents(auditData);
    } catch (err: any) {
      console.error('State transition failed', err);
      alert(`Transition failed: ${err.message}`);
    } finally {
      setTransitioning(false);
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

  async function handleTriggerAnalysis() {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await triggerApplicationAnalysis(applicationId);
      setAnalysisData(result);
      const [appData, auditData] = await Promise.all([
        fetchApplicationDetail(applicationId),
        fetchApplicationAudit(applicationId),
      ]);
      setApplication(appData);
      setAuditEvents(auditData);
      setActiveSubTab('anomalies');
    } catch (err: any) {
      console.error('Analysis failed', err);
      setAnalysisError(err.message || 'Failed to execute anomaly analysis');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmitFindingReview(findingId: string) {
    if (!reviewStatusInput) return;
    setSubmittingReview(true);
    try {
      const updated = await reviewFinding(findingId, {
        review_status: reviewStatusInput,
        comment: reviewCommentInput.trim() || undefined,
        reviewer_id: 'REVIEWER_DESK',
      });
      if (analysisData) {
        const nextFindings = analysisData.findings.map((f) => (f.id === updated.id ? updated : f));
        setAnalysisData({
          ...analysisData,
          findings: nextFindings,
          open_findings: nextFindings.filter((f) => f.review_status === 'OPEN').length,
          confirmed_findings: nextFindings.filter((f) => f.review_status === 'CONFIRMED').length,
          dismissed_findings: nextFindings.filter((f) => f.review_status === 'DISMISSED').length,
          resolved_findings: nextFindings.filter((f) => f.review_status === 'RESOLVED').length,
        });
      }
      setSelectedFinding(null);
      setReviewCommentInput('');
      const auditData = await fetchApplicationAudit(applicationId);
      setAuditEvents(auditData);
    } catch (err: any) {
      console.error('Failed to submit finding review', err);
      setAnalysisError(err.message || 'Failed to update finding status');
    } finally {
      setSubmittingReview(false);
    }
  }

  useEffect(() => {
    loadWorkspaceData();
    return () => {
      stopPolling();
    };
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3FDFF] text-[#0E7490] border border-[#A5F3FC]">
            <Clock className="w-3 h-3 text-[#0E7490]" />
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
      <div className="p-16 text-center space-y-4">
        <div className="concentric-spinner mx-auto" />
        <h3 className="text-sm font-bold text-[#1F3954] font-display">Loading Application Scrutiny Workspace...</h3>
        <p className="text-xs text-[#5F6485]">Retrieving application dossier, documents, and audit records.</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#1F3954] hover:text-[#0E7490] transition-colors cursor-pointer"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#536174] hover:text-[#202936] bg-[#EEE5DC]/70 hover:bg-[#EEE5DC] px-4 py-2 rounded-full transition-colors cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Applications</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => loadWorkspaceData(true)}
            className="h-9 w-9 rounded-full border border-[#E5DACF] bg-white hover:bg-[#FAF5F0] text-[#536174] hover:text-[#202936] flex items-center justify-center transition-colors cursor-pointer"
            title="Refresh application workspace"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleTriggerScrutinyJob}
            disabled={runningWorkflow || jobPolling || (activeScrutinyJob?.status === 'QUEUED' || activeScrutinyJob?.status === 'PROCESSING')}
            className="h-9 px-5 rounded-full bg-[#33CC7A] hover:bg-[#2EB86E] text-[#202936] font-bold text-xs inline-flex items-center gap-2 transition-all shadow-[0_2px_12px_rgba(51,204,122,0.3)] hover:shadow-[0_4px_16px_rgba(51,204,122,0.4)] cursor-pointer disabled:opacity-50"
            title="Execute persistent scrutiny job through authoritative VerityAI scrutiny pipeline"
          >
            <Sparkles className={`w-3.5 h-3.5 ${(runningWorkflow || jobPolling) ? 'animate-spin' : ''}`} />
            <span>
              {jobPolling || activeScrutinyJob?.status === 'PROCESSING'
                ? 'Scrutiny in Progress...'
                : activeScrutinyJob?.status === 'QUEUED'
                ? 'Job Queued...'
                : runningWorkflow
                ? 'Initiating...'
                : 'Run VerityAI Scrutiny'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleGenerateScrutinyReport('PDF')}
            disabled={generatingReport}
            className="h-9 px-4 rounded-full border border-[#E5DACF] bg-white hover:bg-[#FAF5F0] text-[#202936] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Generate multi-page regulatory scrutiny dossier report"
          >
            {generatingReport ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1F3954]" />
            ) : (
              <Download className="w-3.5 h-3.5 text-[#1F3954]" />
            )}
            <span>{generatingReport ? 'Generating...' : 'Scrutiny Dossier (PDF)'}</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerValidation}
            disabled={validating}
            className="h-9 px-4 rounded-full border border-[#E5DACF] bg-white hover:bg-[#FAF5F0] text-[#202936] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Execute deterministic compliance rules against application & documents"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${validating ? 'animate-spin text-[#1F3954]' : ''}`} />
            <span>{validating ? 'Evaluating...' : 'Validation Rules'}</span>
          </button>

          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="h-9 px-4 rounded-full border border-[#E5DACF] bg-[#FAF5F0] hover:bg-[#EEE5DC] text-[#202936] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#1F3954]" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Report Notification if any */}
      {reportMessage && (
        <Alert className="bg-emerald-50 text-emerald-800 border-emerald-200 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <AlertDescription className="text-xs font-semibold text-emerald-800">{reportMessage}</AlertDescription>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setReportMessage(null)} className="h-6 w-6 text-emerald-700 hover:text-emerald-950">
            <X className="w-3.5 h-3.5" />
          </Button>
        </Alert>
      )}
      {reportError && (
        <Alert variant="destructive" className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <AlertDescription className="text-xs font-semibold">{reportError}</AlertDescription>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setReportError(null)} className="h-6 w-6 text-destructive hover:text-destructive">
            <X className="w-3.5 h-3.5" />
          </Button>
        </Alert>
      )}

      {/* Workflow Notification if any */}
      {workflowMessage && (
        <Alert className="bg-primary/10 text-primary border-primary/20 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <AlertDescription className="text-xs font-semibold text-primary">{workflowMessage}</AlertDescription>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setWorkflowMessage(null)} className="h-6 w-6 text-primary hover:text-primary">
            <X className="w-3.5 h-3.5" />
          </Button>
        </Alert>
      )}

      {/* Persistent Scrutiny Job Status Card */}
      {activeScrutinyJob && (
        <Card className={`transition-all shadow-2xs border ${
          activeScrutinyJob.status === 'COMPLETED'
            ? 'bg-emerald-50/60 border-emerald-200'
            : activeScrutinyJob.status === 'FAILED'
            ? 'bg-destructive/10 border-destructive/20'
            : activeScrutinyJob.status === 'PROCESSING'
            ? 'bg-blue-50/60 border-blue-200'
            : 'bg-primary/5 border-primary/20'
        }`}>
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-border">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Cpu className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-foreground">VerityAI Document Scrutiny</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  vai_client_portal_internal
                </Badge>
                <Badge variant="secondary" className="font-mono text-xs">
                  {activeScrutinyJob.id}
                </Badge>
                <Badge
                  variant="outline"
                  className={`gap-1.5 font-bold text-xs ${
                    activeScrutinyJob.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : activeScrutinyJob.status === 'FAILED'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : activeScrutinyJob.status === 'PROCESSING'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {(activeScrutinyJob.status === 'PROCESSING' || activeScrutinyJob.status === 'QUEUED') && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {activeScrutinyJob.status === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {activeScrutinyJob.status === 'FAILED' && <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{activeScrutinyJob.status}</span>
                </Badge>
                {activeScrutinyJob.duration_ms !== null && activeScrutinyJob.duration_ms !== undefined && (
                  <span className="text-[11px] font-mono text-muted-foreground bg-card px-2 py-0.5 rounded border border-border">
                    {activeScrutinyJob.duration_ms} ms
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeScrutinyJob.status === 'FAILED' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRetryScrutinyJob(activeScrutinyJob.id)}
                    disabled={retryingJob || activeScrutinyJob.retry_count >= activeScrutinyJob.max_retries}
                    className="gap-1.5 h-7 text-xs"
                    title={activeScrutinyJob.retry_count >= activeScrutinyJob.max_retries ? "Maximum retries exceeded" : "Retry scrutiny execution"}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${retryingJob ? 'animate-spin' : ''}`} />
                    <span>
                      {retryingJob ? 'Retrying...' : `Retry Scrutiny (${activeScrutinyJob.retry_count}/${activeScrutinyJob.max_retries})`}
                    </span>
                  </Button>
                )}
                {jobPolling && (
                  <Badge variant="outline" className="text-primary bg-card gap-1 font-medium animate-pulse">
                    <Clock className="w-3 h-3" /> Live Tracking Active...
                  </Badge>
                )}
              </div>
            </div>

            {activeScrutinyJob.status === 'FAILED' && activeScrutinyJob.safe_error_summary && (
              <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                <span className="font-bold">Execution Error [{activeScrutinyJob.error_code || 'PIPELINE_ERROR'}]: </span>
                {activeScrutinyJob.safe_error_summary}
              </div>
            )}

            {jobError && (
              <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                {jobError}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted-foreground">
              <div className="bg-card p-2 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Triggered By</span>
                <span className="font-medium text-foreground truncate block">{activeScrutinyJob.triggered_by}</span>
              </div>
              <div className="bg-card p-2 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Created At</span>
                <span className="font-medium text-foreground">{formatDate(activeScrutinyJob.created_at)}</span>
              </div>
              <div className="bg-card p-2 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Started At</span>
                <span className="font-medium text-foreground">{activeScrutinyJob.started_at ? formatDate(activeScrutinyJob.started_at) : '—'}</span>
              </div>
              <div className="bg-card p-2 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Completed At</span>
                <span className="font-medium text-foreground">{activeScrutinyJob.completed_at ? formatDate(activeScrutinyJob.completed_at) : '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* End-to-End Workflow Pipeline Stages & Reviewer Determination Controls */}
      <Card className="shadow-xs border-border">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Workflow Orchestration</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    readiness?.is_ready_for_scrutiny
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {readiness?.readiness_state || 'EVALUATING'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {readiness?.recommended_action || 'Execute pipeline to evaluate document completeness and scrutiny readiness.'}
              </p>
            </div>

            {/* Reviewer Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {application.lifecycle_status === 'SUBMITTED' && (
                <Button
                  size="sm"
                  onClick={() => handleExecuteTransition('UNDER_SCRUTINY', 'Regulatory reviewer initiated scrutiny')}
                  disabled={transitioning}
                  className="font-semibold shadow-2xs"
                >
                  Claim & Begin Scrutiny
                </Button>
              )}

              {application.lifecycle_status === 'UNDER_SCRUTINY' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExecuteTransition('ACTION_REQUIRED', 'Official clarification or document update required')}
                    disabled={transitioning}
                    className="text-amber-800 border-amber-300 hover:bg-amber-50 font-semibold"
                  >
                    Request Information
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleExecuteTransition('SCRUTINY_COMPLETED', 'Regulatory scrutiny completed')}
                    disabled={transitioning}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs"
                  >
                    Finalize Scrutiny Determination
                  </Button>
                </>
              )}

              {application.lifecycle_status === 'ACTION_REQUIRED' && (
                <Button
                  size="sm"
                  onClick={() => handleExecuteTransition('SUBMITTED', 'Institutional applicant resubmitted dossier')}
                  disabled={transitioning}
                  className="font-semibold"
                >
                  Mark Resubmitted
                </Button>
              )}
            </div>
          </div>

          {/* 5-Stage Stepper Progression */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1 text-xs">
            {[
              {
                step: '1. Documents',
                desc: `${documents.length} Uploaded`,
                status: workflowStatus?.stages?.documents?.status || (documents.length > 0 ? 'COMPLETE' : 'PENDING'),
              },
              {
                step: '2. Text Extraction',
                desc: `${documents.filter((d) => d.processing_status === 'COMPLETED' || d.processing_status === 'COMPLETED_WITH_WARNINGS' || d.processing_status === 'EXTRACTED').length} Extracted`,
                status: workflowStatus?.stages?.extraction?.status || 'PARTIAL',
              },
              {
                step: '3. Rules Validation',
                desc: validationSummary ? `${validationSummary.passed}/${validationSummary.total_rules} Passed` : 'Pending',
                status: workflowStatus?.stages?.validation?.status || (validationSummary ? 'COMPLETE' : 'NOT_STARTED'),
              },
              {
                step: '4. Anomaly Findings',
                desc: analysisData ? `${analysisData.open_findings} Open` : 'Pending',
                status: workflowStatus?.stages?.anomalies?.status || (analysisData ? 'COMPLETE' : 'NOT_STARTED'),
              },
              {
                step: '5. Human Decision',
                desc: application.lifecycle_status,
                status: application.lifecycle_status === 'SCRUTINY_COMPLETED' ? 'COMPLETE' : (application.lifecycle_status === 'UNDER_SCRUTINY' ? 'IN_PROGRESS' : 'PENDING'),
              },
            ].map((st, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border transition-all ${
                  st.status === 'COMPLETE'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : st.status === 'IN_PROGRESS'
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-muted/30 border-border text-muted-foreground'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>{st.step}</span>
                  {st.status === 'COMPLETE' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : st.status === 'IN_PROGRESS' ? (
                    <Clock className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  ) : null}
                </div>
                <div className="text-[11px] mt-0.5 opacity-90 truncate">{st.desc}</div>
              </div>
            ))}
          </div>

          {/* Multi-Dimensional Blockers List */}
          {readiness?.blockers && readiness.blockers.length > 0 && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-[11px] text-destructive space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px]">Outstanding Review Blockers ({readiness.blockers.length})</span>
              <ul className="list-disc pl-4 space-y-0.5">
                {readiness.blockers.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Application Scrutiny Header Dossier Card */}
      <Card className="shadow-xs border-border">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-base sm:text-lg font-bold text-foreground">
                  {application.application_reference}
                </span>
                <StatusBadge status={application.lifecycle_status} category="lifecycle" />
                <Badge variant="outline" className="font-sans text-xs font-semibold">
                  {application.category_code}
                </Badge>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                <span>{application.institution.institution_name}</span>
              </h2>
              <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap font-sans mt-0.5">
                <span className="font-mono text-xs text-muted-foreground">
                  ID: {application.institution.institution_identifier || application.institution.id}
                </span>
                <span>•</span>
                <span>Academic Year: {application.academic_year || '2026-27'}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground font-sans">
              <div className="text-right">
                <span className="text-xs font-medium text-muted-foreground font-sans block">Created</span>
                <p className="font-medium text-foreground text-xs">{formatDate(application.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Quick Scrutiny Stat Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-muted/30 border border-border">
              <span className="text-xs font-medium text-muted-foreground font-sans block">Submitted Documents</span>
              <p className="text-2xl font-display font-semibold text-foreground mt-0.5">{documents.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border">
              <span className="text-xs font-medium text-muted-foreground font-sans block">Text Extracted</span>
              <p className="text-2xl font-display font-semibold text-emerald-600 mt-0.5">
                {documents.filter((d) => d.processing_status === 'COMPLETED' || d.processing_status === 'COMPLETED_WITH_WARNINGS').length}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border">
              <span className="text-xs font-medium text-muted-foreground font-sans block">Validation Engine</span>
              {validationSummary ? (
                <p className={`text-xs font-medium mt-1 truncate font-sans ${
                  validationSummary.failed > 0
                    ? 'text-destructive'
                    : validationSummary.needs_review > 0
                    ? 'text-amber-700'
                    : 'text-emerald-600'
                }`}>
                  {validationSummary.failed > 0
                    ? `${validationSummary.failed} Failed / ${validationSummary.total_rules} Rules`
                    : validationSummary.needs_review > 0
                    ? `${validationSummary.needs_review} Needs Review`
                    : `${validationSummary.passed}/${validationSummary.total_rules} Passed`}
                </p>
              ) : (
                <p className="text-xs font-medium text-muted-foreground mt-1 font-sans">Pending Validation</p>
              )}
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border">
              <span className="text-xs font-medium text-muted-foreground font-sans block">Regulatory Category</span>
              <p className="text-xs font-medium text-primary mt-1 truncate font-sans" title={currentCategory?.name || application.category_code}>
                {currentCategory?.name || application.category_code}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Sub-Tab Navigation */}
      <div className="bg-white rounded-2xl border border-[#E5DACF] shadow-[0_4px_24px_-4px_rgba(27,20,17,0.04)] overflow-hidden">
        <div className="p-2 border-b border-[#E5DACF] flex items-center gap-1.5 overflow-x-auto bg-[#FAF5F0]/60">
          <button
            onClick={() => setActiveSubTab('documents')}
            className={`py-2 px-3.5 text-xs font-medium font-sans rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'documents'
                ? 'bg-[#1F3954] text-[#FAF5F0] shadow-xs'
                : 'text-[#536174] hover:text-[#202936] hover:bg-[#EEE5DC]/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documents &amp; OCR ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('validation')}
            className={`py-2 px-3.5 text-xs font-medium font-sans rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'validation'
                ? 'bg-[#1F3954] text-[#FAF5F0] shadow-xs'
                : 'text-[#536174] hover:text-[#202936] hover:bg-[#EEE5DC]/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              Validation Rules {validationSummary ? `(${validationSummary.results.length})` : ''}
            </span>
            {validationSummary && validationSummary.failed > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500" title="Has failed rules" />
            )}
            {validationSummary && validationSummary.failed === 0 && validationSummary.needs_review > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="Needs human review" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('anomalies')}
            className={`py-2 px-3.5 text-xs font-medium font-sans rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'anomalies'
                ? 'bg-[#1F3954] text-[#FAF5F0] shadow-xs'
                : 'text-[#536174] hover:text-[#202936] hover:bg-[#EEE5DC]/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#33CC7A]" />
            <span>
              Anomalies &amp; Fields {analysisData ? `(${analysisData.findings.length})` : ''}
            </span>
            {analysisData && analysisData.open_findings > 0 && (
              <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0 rounded-full text-xs font-medium font-sans">
                {analysisData.open_findings}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('requirements')}
            className={`py-2 px-3.5 text-xs font-medium font-sans rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'requirements'
                ? 'bg-[#1F3954] text-[#FAF5F0] shadow-xs'
                : 'text-[#536174] hover:text-[#202936] hover:bg-[#EEE5DC]/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Declared Data</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`py-2 px-3.5 text-xs font-medium font-sans rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'audit'
                ? 'bg-[#1F3954] text-[#FAF5F0] shadow-xs'
                : 'text-[#536174] hover:text-[#202936] hover:bg-[#EEE5DC]/50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail ({auditEvents.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('institution')}
            className={`py-2 px-3.5 text-xs font-medium font-sans rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'institution'
                ? 'bg-[#1F3954] text-[#FAF5F0] shadow-xs'
                : 'text-[#536174] hover:text-[#202936] hover:bg-[#EEE5DC]/50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Institution Dossier</span>
          </button>

          <button
            onClick={() => setActiveSubTab('reports')}
            className={`py-2 px-3.5 text-xs font-medium font-sans rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'reports'
                ? 'bg-[#1F3954] text-[#FAF5F0] shadow-xs'
                : 'text-[#536174] hover:text-[#202936] hover:bg-[#EEE5DC]/50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Dossier &amp; Reports {reportsList.length > 0 ? `(${reportsList.length})` : ''}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('registry')}
            className={`py-2 px-3.5 text-xs font-medium font-sans rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'registry'
                ? 'bg-[#1F3954] text-[#FAF5F0] shadow-xs'
                : 'text-[#536174] hover:text-[#202936] hover:bg-[#EEE5DC]/50'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>
              Registry Verification {registryRuns.length > 0 ? `(${registryRuns[0].overall_status})` : ''}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`py-2 px-3.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'history'
                ? 'bg-[#1F3954] text-[#FAF5F0] font-bold shadow-xs'
                : 'text-[#536174] hover:text-[#202936] hover:bg-[#EEE5DC]/50'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>
              History &amp; Versions {versionsList.length > 0 ? `(v${versionsList[0].version_number})` : ''}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('portals')}
            className={`py-2 px-3.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'portals'
                ? 'bg-[#1F3954] text-[#FAF5F0] font-bold shadow-xs'
                : 'text-[#536174] hover:text-[#202936] hover:bg-[#EEE5DC]/50'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>
              Gateways ({portalsList.length > 0 ? portalsList.length : '3'})
            </span>
          </button>
        </div>

        {/* Tab 1: Documents & Extraction */}
        {activeSubTab === 'documents' && (
          <div className="p-4 sm:p-6 space-y-4">
            {documents.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <FileText className="w-10 h-10 text-[#8589A6] mx-auto" />
                <h4 className="text-sm font-bold text-[#202936]">No documents uploaded for this application</h4>
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
                            <div className="w-8 h-8 rounded-lg bg-[#E3FDFF] text-[#0E7490] flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="overflow-hidden max-w-[240px]">
                              <p className="font-bold text-[#202936] truncate" title={doc.original_filename}>
                                {doc.original_filename}
                              </p>
                              <p className="text-[10px] font-mono text-[#8589A6] truncate" title={doc.sha256}>
                                SHA: {doc.sha256.substring(0, 16)}...
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-medium text-[#202936]">
                            {doc.declared_type || doc.media_type.split('/')[1]?.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[#5F6485]">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#202936]">
                              {doc.page_count !== null && doc.page_count !== undefined ? `${doc.page_count} pg` : '—'}
                            </span>
                            <span className="font-mono text-[10px]">{formatBytes(doc.file_size_bytes)}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            {renderDocumentStatusBadge(doc.processing_status)}
                            {doc.extraction_quality_band && (
                              <span className="text-[10px] font-semibold text-[#0E7490]">
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
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#A5F3FC] bg-[#E3FDFF]/50 text-[11px] font-semibold text-[#0E7490] hover:bg-[#E3FDFF] transition-colors cursor-pointer"
                                title="Inspect Extracted Text and OCR Records"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect OCR</span>
                              </button>
                            )}

                            <a
                              href={getDocumentFileUrl(doc.id, true)}
                              download={doc.original_filename}
                              className="p-1 rounded-lg border border-[#E9E6F2] text-[#5F6485] hover:text-[#202936] hover:bg-white transition-colors"
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
              <div className="p-12 text-center rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#E3FDFF] text-[#0E7490] flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#1F3954] font-display">No Validation Run Executed Yet</h3>
                <p className="text-xs text-[#5F6485] max-w-md mx-auto leading-relaxed">
                  Evaluate mandatory document requirements, extracted certificates, validity expiry baselines, and institution field consistency.
                </p>
                <button
                  onClick={handleTriggerValidation}
                  disabled={validating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl main-btn btn-hover text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer"
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
                        <span className="font-mono font-semibold text-[#202936]">{validationSummary.evaluation_date || 'Current Date'}</span> • Engine v{validationSummary.pipeline_version}
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
                      <p className="text-base font-extrabold text-[#202936] mt-0.5">{validationSummary.total_rules}</p>
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
                              : 'bg-white border border-[#E9E6F2] text-[#5F6485] hover:border-[#DCD0F7] hover:text-[#202936]'
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
                              <span className="font-mono text-xs font-extrabold text-[#202936]">
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
                          <p className="text-xs sm:text-[13px] text-[#202936] font-medium leading-relaxed">
                            {res.explanation}
                          </p>

                          {/* Comparison Grid (Expected vs Observed) */}
                          {(res.expected_value || res.observed_value) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FAF9FC] p-3 rounded-xl border border-[#EEEAF5] text-xs">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-[#8589A6] block">
                                  Expected Statutory Value
                                </span>
                                <span className="font-mono text-xs font-semibold text-[#202936]">
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
                                <span className="flex items-center gap-1.5 font-medium text-[#202936]">
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

        {/* Tab: AI-Assisted Document Analysis, Candidate Fields & Anomalies */}
        {activeSubTab === 'anomalies' && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* 1. Advisory Banner & Scan Trigger Bar */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#F3EEFC] via-[#FAF8FF] to-[#F3EEFC] border border-[#DCD0F7] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#7450D8] text-white">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7450D8]">
                    AI & Deterministic Scrutiny Advisory
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#027A48] border border-[#A6F4C5]">
                    LOCAL ENGINE ACTIVE
                  </span>
                </div>
                <p className="text-xs text-[#202936] font-medium leading-relaxed max-w-2xl">
                  Cross-document consistency checking, chronological date sanity validation, duplicate upload collision detection, and OCR extraction quality monitoring.
                  All findings require human scrutiny officer review before final decisions.
                </p>
              </div>

              <button
                onClick={handleTriggerAnalysis}
                disabled={analyzing}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl main-btn btn-hover disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
                <span>{analyzing ? 'Executing Scrutiny Scan...' : 'Run Anomaly Detection Scan'}</span>
              </button>
            </div>

            {analysisError && (
              <div className="p-4 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}

            {/* 2. Scrutiny Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2]">
                <span className="text-[10px] uppercase font-bold text-[#8589A6]">Total Anomalies</span>
                <p className="text-lg font-extrabold text-[#202936] mt-0.5">
                  {analysisData?.total_anomalies ?? 0}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FEF3F2] border border-[#FECDCA]">
                <span className="text-[10px] uppercase font-bold text-[#B42318]">Open For Review</span>
                <p className="text-lg font-extrabold text-[#B42318] mt-0.5">
                  {analysisData?.open_findings ?? 0}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FFF6ED] border border-[#FEE4E2]">
                <span className="text-[10px] uppercase font-bold text-[#C4320A]">Confirmed Findings</span>
                <p className="text-lg font-extrabold text-[#C4320A] mt-0.5">
                  {analysisData?.confirmed_findings ?? 0}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#EDFPF6] bg-[#ECFDF3] border border-[#A6F4C5]">
                <span className="text-[10px] uppercase font-bold text-[#027A48]">Resolved / Dismissed</span>
                <p className="text-lg font-extrabold text-[#027A48] mt-0.5">
                  {(analysisData?.dismissed_findings ?? 0) + (analysisData?.resolved_findings ?? 0)}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F3EEFC] border border-[#DCD0F7]">
                <span className="text-[10px] uppercase font-bold text-[#7450D8]">Candidate Fields</span>
                <p className="text-lg font-extrabold text-[#7450D8] mt-0.5">
                  {analysisData?.extracted_fields?.length ?? 0}
                </p>
              </div>
            </div>

            {/* 3. Sub-View Switcher */}
            <div className="flex items-center justify-between border-b border-[#EEEAF5] pb-3 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveAnomalySection('findings')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeAnomalySection === 'findings'
                      ? 'bg-[#1F3954] text-white shadow-xs'
                      : 'bg-[#FAF8FF] text-[#5F6485] hover:text-[#202936] border border-[#E9E6F2]'
                  }`}
                >
                  Cross-Document Discrepancies & Anomalies ({analysisData?.findings?.length ?? 0})
                </button>
                <button
                  onClick={() => setActiveAnomalySection('fields')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeAnomalySection === 'fields'
                      ? 'bg-[#1F3954] text-white shadow-xs'
                      : 'bg-[#FAF8FF] text-[#5F6485] hover:text-[#202936] border border-[#E9E6F2]'
                  }`}
                >
                  Candidate Extracted Fields ({analysisData?.extracted_fields?.length ?? 0})
                </button>
              </div>

              {activeAnomalySection === 'findings' && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-[#8589A6]">Severity:</span>
                    <select
                      value={anomalySeverityFilter}
                      onChange={(e) => setAnomalySeverityFilter(e.target.value as any)}
                      className="px-2 py-1 rounded-lg border border-[#E9E6F2] bg-white text-xs font-semibold text-[#202936]"
                    >
                      <option value="ALL">All Severities</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-[#8589A6]">Verdict:</span>
                    <select
                      value={anomalyReviewFilter}
                      onChange={(e) => setAnomalyReviewFilter(e.target.value as any)}
                      className="px-2 py-1 rounded-lg border border-[#E9E6F2] bg-white text-xs font-semibold text-[#202936]"
                    >
                      <option value="ALL">All Verdicts</option>
                      <option value="OPEN">Open</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="DISMISSED">Dismissed</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 4A. SECTION: ANOMALY FINDINGS */}
            {activeAnomalySection === 'findings' && (
              <div className="space-y-4">
                {(!analysisData || analysisData.findings.length === 0) ? (
                  <div className="p-12 text-center space-y-3 bg-[#FAF8FF] rounded-2xl border border-dashed border-[#DCD0F7]">
                    <Sparkles className="w-8 h-8 text-[#7450D8] mx-auto opacity-70" />
                    <h4 className="text-sm font-bold text-[#202936]">No Anomalies or Discrepancies Recorded</h4>
                    <p className="text-xs text-[#5F6485] max-w-md mx-auto">
                      Click &quot;Run Anomaly Detection Scan&quot; above to cross-reference document names, intake figures, certificate dates, and upload checksums.
                    </p>
                    <button
                      onClick={handleTriggerAnalysis}
                      disabled={analyzing}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7450D8] text-white text-xs font-semibold hover:bg-[#5E3EB8] transition-all cursor-pointer shadow-xs mt-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                      <span>Execute Scrutiny Scan</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analysisData.findings
                      .filter((f) => {
                        if (anomalySeverityFilter !== 'ALL' && f.severity !== anomalySeverityFilter) return false;
                        if (anomalyReviewFilter !== 'ALL' && f.review_status !== anomalyReviewFilter) return false;
                        return true;
                      })
                      .map((finding) => {
                        const isUnderReview = selectedFinding?.id === finding.id;

                        return (
                          <div
                            key={finding.id}
                            className={`p-5 rounded-2xl border transition-all ${
                              finding.severity === 'CRITICAL'
                                ? 'border-[#FECDCA] bg-white border-l-4 border-l-[#B42318]'
                                : finding.severity === 'HIGH'
                                ? 'border-[#FECDCA] bg-white border-l-4 border-l-[#F04438]'
                                : finding.severity === 'MEDIUM'
                                ? 'border-[#FEDF89] bg-white border-l-4 border-l-[#F79009]'
                                : 'border-[#E9E6F2] bg-white border-l-4 border-l-[#7450D8]'
                            }`}
                          >
                            <div className="space-y-3">
                              {/* Header Badges */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-[#1F3954] text-white">
                                    {finding.rule_code}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                    finding.severity === 'CRITICAL'
                                      ? 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]'
                                      : finding.severity === 'HIGH'
                                      ? 'bg-[#FFF6ED] text-[#C4320A] border border-[#FEE4E2]'
                                      : finding.severity === 'MEDIUM'
                                      ? 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]'
                                      : 'bg-[#F3EEFC] text-[#7450D8] border border-[#DCD0F7]'
                                  }`}>
                                    {finding.severity} SEVERITY
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF8FF] text-[#5F6485] border border-[#E9E6F2]">
                                    {finding.category}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                    finding.review_status === 'CONFIRMED'
                                      ? 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]'
                                      : finding.review_status === 'DISMISSED' || finding.review_status === 'RESOLVED'
                                      ? 'bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]'
                                      : finding.review_status === 'UNDER_REVIEW'
                                      ? 'bg-[#FFF6ED] text-[#C4320A] border border-[#FEE4E2]'
                                      : 'bg-[#F8F9FC] text-[#5F6485] border border-[#E9E6F2]'
                                  }`}>
                                    VERDICT: {finding.review_status}
                                  </span>
                                </div>
                              </div>

                              {/* Title & Explanation */}
                              <div>
                                <h5 className="text-sm font-extrabold text-[#202936]">
                                  {finding.title}
                                </h5>
                                <p className="text-xs text-[#5F6485] mt-1 leading-relaxed">
                                  {finding.explanation}
                                </p>
                              </div>

                              {/* Expected vs Observed Grid */}
                              {(finding.expected_value || finding.observed_value) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#FAF9FC] border border-[#EEEAF5] text-xs">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-[#027A48]">Expected Reference</span>
                                    <p className="font-mono text-xs font-semibold text-[#202936] mt-0.5 break-words">
                                      {finding.expected_value || 'N/A'}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-[#B42318]">Observed in Submission</span>
                                    <p className="font-mono text-xs font-semibold text-[#B42318] mt-0.5 break-words">
                                      {finding.observed_value || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Evidence Items Chain */}
                              {finding.evidence_items && finding.evidence_items.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                  <span className="text-[10px] uppercase font-bold text-[#8589A6]">
                                    Evidence Citations ({finding.evidence_items.length}):
                                  </span>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {finding.evidence_items.map((ev, idx) => (
                                      <div
                                        key={ev.id || idx}
                                        className="p-2.5 rounded-lg bg-[#FAF8FF] border border-[#E9E6F2] text-[11px] space-y-1"
                                      >
                                        <div className="flex items-center justify-between font-semibold text-[#202936]">
                                          <span className="truncate">{ev.label}</span>
                                          {ev.page_number && (
                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#7450D8] border border-[#DCD0F7] shrink-0">
                                              Page {ev.page_number}
                                            </span>
                                          )}
                                        </div>
                                        {ev.raw_value && (
                                          <div className="font-mono text-[10px] text-[#5F6485] truncate">
                                            Value: &quot;{ev.raw_value}&quot;
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Recommended Action */}
                              <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#E9E6F2] flex items-start gap-2.5 text-xs text-[#202936]">
                                <AlertTriangle className="w-4 h-4 text-[#7450D8] shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-[#7450D8] block">
                                    Recommended Scrutiny Protocol
                                  </span>
                                  <p className="text-[11px] text-[#5F6485] mt-0.5">
                                    {finding.recommended_action}
                                  </p>
                                </div>
                              </div>

                              {/* Existing Review Notes (if reviewed) */}
                              {finding.review_comment && (
                                <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E9E6F2] text-xs space-y-1">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-[#8589A6]">
                                    <span>Reviewer Verdict Note</span>
                                    {finding.reviewed_at && (
                                      <span>{new Date(finding.reviewed_at).toLocaleString()}</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#202936] italic">
                                    &quot;{finding.review_comment}&quot;
                                  </p>
                                </div>
                              )}

                              {/* Reviewer Action Controls */}
                              <div className="pt-2 flex items-center justify-between flex-wrap gap-2 border-t border-[#EEEAF5]">
                                <div className="text-[11px] text-[#8589A6]">
                                  Detection Method: <span className="font-mono font-medium text-[#202936]">{finding.detection_method}</span>
                                </div>

                                <div>
                                  {!isUnderReview ? (
                                    <button
                                      onClick={() => {
                                        setSelectedFinding(finding);
                                        setReviewStatusInput(finding.review_status === 'OPEN' ? 'CONFIRMED' : finding.review_status);
                                        setReviewCommentInput(finding.review_comment || '');
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8FF] hover:bg-[#F3EEFC] text-[#7450D8] border border-[#DCD0F7] text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      <span>Record Human Verdict</span>
                                    </button>
                                  ) : (
                                    <div className="space-y-3 p-4 rounded-xl bg-[#FAF8FF] border border-[#DCD0F7] mt-2 w-full max-w-lg">
                                      <h6 className="text-xs font-extrabold text-[#202936]">
                                        Record Scrutiny Officer Verdict
                                      </h6>

                                      <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-[#5F6485] block">
                                          Verdict Status
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                                          {(['CONFIRMED', 'DISMISSED', 'UNDER_REVIEW', 'RESOLVED', 'AWAITING_EVIDENCE'] as const).map((st) => (
                                            <button
                                              key={st}
                                              type="button"
                                              onClick={() => setReviewStatusInput(st)}
                                              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border text-center transition-all cursor-pointer ${
                                                reviewStatusInput === st
                                                  ? 'bg-[#1F3954] text-white border-[#1F3954]'
                                                  : 'bg-white text-[#5F6485] border-[#E9E6F2] hover:bg-[#FAF9FC]'
                                              }`}
                                            >
                                              {st}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-[#5F6485] block">
                                          Review Note / Reason
                                        </label>
                                        <textarea
                                          value={reviewCommentInput}
                                          onChange={(e) => setReviewCommentInput(e.target.value)}
                                          placeholder="Enter regulatory justification or instructions for the institutional applicant..."
                                          rows={2}
                                          className="w-full text-xs p-2 rounded-lg border border-[#E9E6F2] bg-white focus:outline-none focus:ring-1 focus:ring-[#7450D8]"
                                        />
                                      </div>

                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedFinding(null)}
                                          className="px-3 py-1.5 rounded-lg border border-[#E9E6F2] text-xs font-semibold text-[#5F6485] hover:bg-white cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          disabled={submittingReview}
                                          onClick={() => handleSubmitFindingReview(finding.id)}
                                          className="px-4 py-1.5 rounded-lg bg-[#F04438] hover:bg-[#E34234] disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
                                        >
                                          {submittingReview ? 'Saving Verdict...' : 'Submit Verdict'}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* 4B. SECTION: CANDIDATE EXTRACTED FIELDS TABLE */}
            {activeAnomalySection === 'fields' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs sm:text-sm font-extrabold text-[#202936]">
                      Normalized Candidate Fields Across Uploaded Documents
                    </h5>
                    <p className="text-[11px] text-[#5F6485]">
                      Discovered by pattern extraction and normalized for cross-checking against declared figures.
                    </p>
                  </div>
                </div>

                {(!analysisData || analysisData.extracted_fields.length === 0) ? (
                  <div className="p-8 text-center text-xs text-[#5F6485] bg-[#FAF8FF] rounded-xl border border-[#E9E6F2]">
                    No candidate fields extracted. Run the anomaly scan to scan document pages.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[#E9E6F2]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#EEEAF5] bg-[#FAF9FC] text-[#8589A6] font-semibold text-[11px]">
                          <th className="py-3 px-4">FIELD KEY</th>
                          <th className="py-3 px-4">NORMALIZED VALUE</th>
                          <th className="py-3 px-4">RAW VALUE</th>
                          <th className="py-3 px-4">PAGE / METHOD</th>
                          <th className="py-3 px-4">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEEAF5] bg-white">
                        {analysisData.extracted_fields.map((ef) => (
                          <tr key={ef.id} className="hover:bg-[#FAF8FF]/60 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-[#202936]">
                              {ef.field_key}
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold text-[#7450D8]">
                              {ef.normalized_value || '—'}
                            </td>
                            <td className="py-3 px-4 text-[#5F6485] max-w-xs truncate" title={ef.raw_value || ''}>
                              {ef.raw_value || '—'}
                            </td>
                            <td className="py-3 px-4 text-[#5F6485]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {ef.page_number && (
                                  <span className="px-1.5 py-0.5 rounded bg-[#FAF8FF] text-[#202936] border border-[#E9E6F2] font-mono text-[10px]">
                                    P.{ef.page_number}
                                  </span>
                                )}
                                <span className="font-mono text-[10px] text-[#8589A6]">
                                  {ef.extraction_method}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ef.extraction_status === 'EXTRACTED'
                                  ? 'bg-[#ECFDF3] text-[#027A48]'
                                  : 'bg-[#FFF6ED] text-[#C4320A]'
                              }`}>
                                {ef.extraction_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Requirements & Declared Data */}
        {activeSubTab === 'requirements' && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Required & Conditional Documents Checklist */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-[#202936] flex items-center gap-2">
                    <span>Statutory Document Scrutiny Checklist</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8FF] text-[#7450D8] border border-[#E9E6F2]">
                      APH 2024–27
                    </span>
                  </h4>
                  <p className="text-[11px] text-[#5F6485]">
                    Dynamic conditional checklist grounded in AICTE Approval Process Handbook 2024-27 for &quot;{readiness?.checklist?.category_name || currentCategory?.name || application.category_code}&quot;.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#7450D8]">
                  {readiness?.checklist ? (
                    <span className="bg-[#FAF8FF] px-2.5 py-1 rounded-lg border border-[#E9E6F2]">
                      {readiness.checklist.total_present} Present • {readiness.checklist.total_required} Mandatory • {readiness.checklist.total_conditional} Conditional
                    </span>
                  ) : (
                    <span>
                      {requiredDocTypes.filter((t) => uploadedTypes.has(t)).length} of {requiredDocTypes.length} Present
                    </span>
                  )}
                </div>
              </div>

              {readiness?.checklist && readiness.checklist.items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {readiness.checklist.items.map((item) => {
                    const isUploaded = item.status === 'REQUIRED_UPLOADED';
                    const isPending = item.status === 'PENDING_VERIFICATION';
                    const isMissing = item.status === 'REQUIRED_MISSING';
                    const isConditionalReview = item.status === 'CONDITIONAL_NEEDS_REVIEW' || item.status === 'NEEDS_HUMAN_REVIEW';

                    return (
                      <div
                        key={item.document_code}
                        className={`p-4 rounded-xl border transition-all ${
                          isUploaded
                            ? 'bg-[#ECFDF3]/40 border-[#D1FADF]'
                            : isPending
                            ? 'bg-[#EFF8FF]/40 border-[#B2DDFF]'
                            : isMissing
                            ? 'bg-[#FFF4F3]/40 border-[#FECDCA]'
                            : isConditionalReview
                            ? 'bg-[#FFFAEB]/50 border-[#FEDF89]'
                            : 'bg-[#F9FAFB] border-[#EAECF0] opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                isUploaded
                                  ? 'bg-[#027A48] text-white'
                                  : isPending
                                  ? 'bg-[#175CD3] text-white'
                                  : isMissing
                                  ? 'bg-[#F04438] text-white'
                                  : isConditionalReview
                                  ? 'bg-[#DC6803] text-white'
                                  : 'bg-[#98A2B3] text-white'
                              }`}
                            >
                              {isUploaded ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : isPending ? (
                                <Clock className="w-3.5 h-3.5 animate-spin" />
                              ) : isMissing ? (
                                <X className="w-3.5 h-3.5" />
                              ) : isConditionalReview ? (
                                <AlertTriangle className="w-3.5 h-3.5" />
                              ) : (
                                <Info className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-xs text-[#202936] truncate">{item.title}</p>
                                <span className="font-mono text-[9px] text-[#8589A6] px-1.5 py-0.2 rounded bg-white border border-[#E9E6F2]">
                                  {item.document_code}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#5F6485] mt-1 leading-relaxed">
                                {item.condition_rationale}
                              </p>
                              {item.activating_condition && (
                                <p className="text-[10px] text-[#7450D8] font-medium mt-0.5">
                                  Triggered by: {item.activating_condition}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-[10px] text-[#8589A6] flex-wrap">
                                <span className="font-medium text-[#475467]">
                                  Ref: {item.source_clause} (p.{item.pdf_page})
                                </span>
                                {item.uploaded_document_name && (
                                  <span className="text-[#027A48] font-medium truncate max-w-xs">
                                    • Uploaded: {item.uploaded_document_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isUploaded
                                  ? 'bg-[#ECFDF3] text-[#027A48]'
                                  : isPending
                                  ? 'bg-[#EFF8FF] text-[#175CD3]'
                                  : isMissing
                                  ? 'bg-[#FFF0EF] text-[#B42318]'
                                  : isConditionalReview
                                  ? 'bg-[#FEF0C7] text-[#B54708]'
                                  : 'bg-[#F2F4F7] text-[#475467]'
                              }`}
                            >
                              {item.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[9px] font-medium text-[#8589A6]">
                              {item.mandatory_or_conditional}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : requiredDocTypes.length === 0 ? (
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
                            <p className="font-bold text-xs text-[#202936]">{reqType}</p>
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
              <h4 className="text-xs sm:text-sm font-extrabold text-[#202936]">
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
                      <p className="font-semibold text-xs text-[#202936] mt-0.5 break-words">
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
                <h4 className="text-xs sm:text-sm font-extrabold text-[#202936]">
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
                        <p className="font-mono text-[11px] text-[#202936]">
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
            <h4 className="text-xs sm:text-sm font-extrabold text-[#202936]">
              Institution Profile & Regulatory Record
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8589A6]">Institution Name</span>
                <p className="font-bold text-sm text-[#202936]">{application.institution.institution_name}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8589A6]">Permanent / AISHE Identifier</span>
                <p className="font-mono font-bold text-sm text-[#7450D8]">
                  {application.institution.institution_identifier || application.institution.id}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF9FC] border border-[#E9E6F2] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8589A6]">State & City</span>
                <p className="font-semibold text-xs text-[#202936]">
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

        {/* Tab 5: Regulatory Scrutiny Dossier & Reports */}
        {activeSubTab === 'reports' && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Header & Generation Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#FAF8FF] border border-[#E9E6F2]">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-[#202936] flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#7450D8]" />
                  Regulatory Scrutiny Dossier & Evidence Reports
                </h4>
                <p className="text-xs text-[#5F6485] mt-1 max-w-xl">
                  Generate structured dossiers compiling application metadata, submitted document extractions, deterministic rule evaluations, and cross-document anomaly findings.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleGenerateScrutinyReport('PDF')}
                  disabled={generatingReport}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl main-btn btn-hover disabled:opacity-60 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <Download className={`w-3.5 h-3.5 ${generatingReport ? 'animate-spin' : ''}`} />
                  <span>{generatingReport ? 'Generating...' : 'Generate PDF Dossier'}</span>
                </button>
                <button
                  onClick={() => handleGenerateScrutinyReport('JSON')}
                  disabled={generatingReport}
                  className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-[#37C2CC]/40 hover:bg-[#E3FDFF] disabled:opacity-60 text-[#0E7490] text-xs font-bold transition-all cursor-pointer"
                >
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Advisory Disclaimer Notice */}
            <div className="p-4 rounded-2xl bg-[#FFF8F7] border border-[#FECDCA] text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-[#B42318]">
                <AlertTriangle className="w-4 h-4" />
                <span>Regulatory Notice — Decision Support Layer</span>
              </div>
              <p className="text-[#5F6485] leading-relaxed">
                {reviewSummary?.disclaimer ||
                  'Automated scrutiny dossiers and AI-assisted findings are strictly advisory decision-support artifacts. They do not constitute official approval, certification, or an adverse regulatory determination. Consequential decisions remain the sole responsibility of authorized human reviewers.'}
              </p>
            </div>

            {/* Actionable Reviewer Recommendations */}
            {reviewSummary?.recommended_actions && reviewSummary.recommended_actions.length > 0 && (
              <div className="p-5 rounded-2xl bg-white border border-[#E9E6F2] shadow-xs space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#202936] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#7450D8]" />
                  Recommended Reviewer Actions ({reviewSummary.recommended_actions.length})
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reviewSummary.recommended_actions.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-[#E9E6F2] bg-[#FAF8FF] space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#202936]">{rec.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            rec.priority === 'HIGH'
                              ? 'bg-[#FEE4E2] text-[#B42318]'
                              : rec.priority === 'MEDIUM'
                              ? 'bg-[#FFFAEB] text-[#B54708]'
                              : 'bg-[#F3EEFC] text-[#7450D8]'
                          }`}
                        >
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-[#5F6485]">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explainable Validation Rule Explanations */}
            <div className="p-5 rounded-2xl bg-white border border-[#E9E6F2] shadow-xs space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#202936] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#7450D8]" />
                Explainable Validation Rule Breakdowns
              </h5>
              {(!reviewSummary?.rule_explanations || reviewSummary.rule_explanations.length === 0) ? (
                <div className="p-8 text-center text-xs text-[#8589A6]">
                  No rule evaluations recorded for this application. Execute the Scrutiny Pipeline above.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#EEEAF5] bg-[#FAF9FC] text-[#8589A6] font-semibold text-[11px]">
                        <th className="py-2.5 px-3">RULE CODE & NAME</th>
                        <th className="py-2.5 px-3">STATUS</th>
                        <th className="py-2.5 px-3">PURPOSE</th>
                        <th className="py-2.5 px-3">EXPECTED VS OBSERVED</th>
                        <th className="py-2.5 px-3">EVIDENCE CITATION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EDF7]">
                      {reviewSummary.rule_explanations.map((r, idx) => (
                        <tr key={idx} className="hover:bg-[#FAF9FD]">
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-[#202936] block">{r.rule_code}</span>
                            <span className="text-[11px] text-[#5F6485]">{r.name}</span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.status === 'PASS' || r.status === 'PASSED'
                                  ? 'bg-[#ECFDF3] text-[#027A48]'
                                  : r.status === 'FAIL' || r.status === 'FAILED'
                                  ? 'bg-[#FEF3F2] text-[#B42318]'
                                  : 'bg-[#FFFAEB] text-[#B54708]'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#5F6485]">{r.purpose}</td>
                          <td className="py-3 px-3 space-y-0.5">
                            <div className="text-[11px]">
                              <span className="font-bold text-[#202936]">Exp:</span> {r.expected}
                            </div>
                            <div className="text-[11px] text-[#5F6485]">
                              <span className="font-bold text-[#202936]">Obs:</span> {r.observed}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[#7450D8] font-mono text-[11px]">
                            {r.evidence_source}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Generated Reports & Artifacts */}
            <div className="p-5 rounded-2xl bg-white border border-[#E9E6F2] shadow-xs space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#202936] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#7450D8]" />
                Generated Scrutiny Artifacts ({reportsList.length})
              </h5>
              {reportsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8589A6]">
                  No reports generated yet. Click "Generate PDF Dossier" above to generate a formal review package.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#EEEAF5] bg-[#FAF9FC] text-[#8589A6] font-semibold text-[11px]">
                        <th className="py-2.5 px-3">REPORT DOSSIER ID</th>
                        <th className="py-2.5 px-3">TYPE / FORMAT</th>
                        <th className="py-2.5 px-3">FILE SIZE</th>
                        <th className="py-2.5 px-3">GENERATED AT</th>
                        <th className="py-2.5 px-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EDF7]">
                      {reportsList.map((rep) => (
                        <tr key={rep.id} className="hover:bg-[#FAF9FD]">
                          <td className="py-3 px-3 font-mono font-bold text-[#202936]">
                            {rep.id.slice(0, 8)}...
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3EEFC] text-[#7450D8] border border-[#DCD0F7]">
                              {rep.format}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#5F6485]">
                            {Math.round(rep.file_size_bytes / 1024)} KB
                          </td>
                          <td className="py-3 px-3 text-[#5F6485]">
                            {formatDate(rep.created_at)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <a
                              href={getReportDownloadUrl(rep.id)}
                              download
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8FF] border border-[#DCD0F7] hover:bg-[#F3EEFC] text-[#7450D8] font-bold text-xs transition-all cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download {rep.format}</span>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Registry Verification (Phase 11) */}
        {activeSubTab === 'registry' && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Statutory Disclaimer & Synthetic Advisory */}
            <div className="p-4 rounded-2xl bg-[#FFF6ED] border border-[#FECDCA] text-xs space-y-2">
              <div className="flex items-center gap-2 text-[#C4320A] font-bold">
                <AlertTriangle className="w-4 h-4 text-[#F04438]" />
                <span>Simulated Reference Data &amp; Autonomous Verification Notice</span>
              </div>
              <p className="text-[#5F6485] leading-relaxed">
                Verification operates against authorized reference datasets and simulated adapters (e.g. AISHE accreditation, sanctioned intake ceilings). Production external government portal APIs are not directly connected; verification results are decision-support indicators and do not constitute final statutory determinations.
              </p>
            </div>

            {/* Provider Trigger Bar */}
            <div className="p-4 rounded-2xl bg-white border border-[#E9E6F2] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#202936] flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#7450D8]" />
                  Regulatory Verification Engine
                </h4>
                <p className="text-xs text-[#5F6485]">
                  Compare institutional identifiers, legal names, intake capacity, and status against reference records.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="text-xs bg-[#FAF9FC] border border-[#DCD0F7] rounded-xl px-3 py-2 text-[#202936] font-medium focus:outline-none focus:border-[#7450D8]"
                >
                  {registryProviders.map((p) => (
                    <option key={p.provider_code} value={p.provider_code}>
                      {p.provider_name} {p.is_available ? '(Active)' : '(Unavailable)'}
                    </option>
                  ))}
                  {registryProviders.length === 0 && (
                    <option value="SYNTHETIC_AISHE">Synthetic AISHE Registry (Active)</option>
                  )}
                </select>

                <button
                  onClick={handleTriggerRegistryVerification}
                  disabled={verifyingRegistry}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl main-btn btn-hover text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verifyingRegistry ? 'animate-spin' : ''}`} />
                  <span>{verifyingRegistry ? 'Verifying...' : 'Execute Registry Verification'}</span>
                </button>
              </div>
            </div>

            {registryMessage && (
              <div className="p-3 rounded-xl bg-[#E3FDFF] border border-[#A5F3FC] text-xs text-[#0E7490] font-medium">
                {registryMessage}
              </div>
            )}

            {/* Latest Verification Outcome */}
            {registryRuns.length > 0 ? (
              <div className="space-y-4">
                {/* Overall Run Card */}
                <div className="p-5 rounded-2xl bg-white border border-[#E9E6F2] shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEEAF5] pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#8589A6] uppercase tracking-wider">Overall Outcome:</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                          registryRuns[0].overall_status === 'MATCH'
                            ? 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]'
                            : registryRuns[0].overall_status === 'MISMATCH' || registryRuns[0].overall_status === 'NOT_FOUND'
                            ? 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]'
                            : 'bg-[#FFF6ED] text-[#C4320A] border-[#FECDCA]'
                        }`}>
                          {registryRuns[0].overall_status}
                        </span>
                      </div>
                      <p className="text-xs text-[#5F6485]">{registryRuns[0].summary}</p>
                    </div>

                    <div className="text-right text-[11px] text-[#8589A6]">
                      <span>Executed: {formatDate(registryRuns[0].executed_at)}</span>
                      <p className="font-mono text-[10px] text-[#5F6485]">Provider: {registryRuns[0].provider_code}</p>
                    </div>
                  </div>

                  {/* Results Breakdown Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#EEEAF5] bg-[#FAF9FC] text-[#8589A6] font-semibold text-[11px]">
                          <th className="py-2.5 px-3">CHECK TYPE</th>
                          <th className="py-2.5 px-3">OUTCOME</th>
                          <th className="py-2.5 px-3">APPLICATION VALUE</th>
                          <th className="py-2.5 px-3">REGISTRY REFERENCE</th>
                          <th className="py-2.5 px-3">EXPLANATION</th>
                          <th className="py-2.5 px-3 text-right">REVIEW</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0EDF7]">
                        {registryRuns[0].results.map((r) => (
                          <tr key={r.id} className="hover:bg-[#FAF9FD]">
                            <td className="py-3 px-3 font-mono font-bold text-[#202936]">
                              {r.check_type}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                r.status === 'MATCH'
                                  ? 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]'
                                  : r.status === 'MISMATCH' || r.status === 'NOT_FOUND'
                                  ? 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]'
                                  : 'bg-[#FFF6ED] text-[#C4320A] border-[#FECDCA]'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-medium text-[#202936]">
                              {r.application_value || '—'}
                            </td>
                            <td className="py-3 px-3 font-medium text-[#202936]">
                              {r.registry_value || '—'}
                            </td>
                            <td className="py-3 px-3 text-[#5F6485] max-w-xs">
                              {r.explanation}
                              {r.resolution_status !== 'UNRESOLVED' && (
                                <div className="mt-1 text-[10px] text-[#027A48] font-bold">
                                  Resolved: {r.resolution_status} ({r.resolution_notes})
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {r.requires_human_review && r.resolution_status === 'UNRESOLVED' ? (
                                <button
                                  onClick={() => {
                                    setTargetResult(r);
                                    setResolutionStatus('ACCEPTED');
                                    setResolutionNotes('');
                                    setResolutionModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded bg-[#FAF8FF] border border-[#DCD0F7] hover:bg-[#F3EEFC] text-[#7450D8] font-bold text-[11px] transition-all cursor-pointer"
                                >
                                  Adjudicate
                                </button>
                              ) : r.resolution_status !== 'UNRESOLVED' ? (
                                <span className="text-[10px] text-[#027A48] font-bold">
                                  {r.resolution_status}
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#8589A6]">OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Historical Verification Runs */}
                {registryRuns.length > 1 && (
                  <div className="p-4 rounded-2xl bg-white border border-[#E9E6F2] shadow-xs space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#202936]">
                      Verification History ({registryRuns.length - 1} prior runs)
                    </h5>
                    <div className="divide-y divide-[#EEEAF5] text-xs">
                      {registryRuns.slice(1).map((hr) => (
                        <div key={hr.id} className="py-2.5 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-[#202936]">{hr.provider_code}</span>
                            <p className="text-[#8589A6] text-[11px]">{hr.summary}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              hr.overall_status === 'MATCH' ? 'bg-[#ECFDF3] text-[#027A48]' : 'bg-[#FEF3F2] text-[#B42318]'
                            }`}>
                              {hr.overall_status}
                            </span>
                            <p className="text-[10px] text-[#8589A6] mt-0.5">{formatDate(hr.executed_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl bg-white border border-[#E9E6F2] space-y-3">
                <Database className="w-10 h-10 text-[#8589A6] mx-auto" />
                <h4 className="text-sm font-bold text-[#202936]">No Registry Verification Runs Yet</h4>
                <p className="text-xs text-[#5F6485] max-w-md mx-auto">
                  Click "Execute Registry Verification" above to check the institution's accreditation, AISHE code, intake quota, and legal name against reference regulatory records.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 9: Dossier History & Versioning */}
        {activeSubTab === 'history' && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Header and Freshness Status */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#E9E6F2] shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-[#7450D8]" />
                  <h4 className="text-sm font-bold text-[#202936]">Dossier Version History & Freshness Auditing</h4>
                  {versionsList.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#FAF8FF] text-[#7450D8] border border-[#DCD0F7]">
                      Current: v{versionsList[0].version_number}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#5F6485]">
                  Every profile update, document revision, or regulatory amendment creates an immutable snapshot. Automated validation and reports track freshness against dossier revisions.
                </p>
              </div>

              {freshnessStatus && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                    freshnessStatus.is_overall_fresh
                      ? 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]'
                      : 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]'
                  }`}>
                    {freshnessStatus.is_overall_fresh ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#027A48]" />
                        <span>Dossier Fresh</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-[#B42318]" />
                        <span>Artifacts Stale</span>
                      </>
                    )}
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                    freshnessStatus.validation_status === 'FRESH'
                      ? 'bg-[#ECFDF3] text-[#027A48]'
                      : freshnessStatus.validation_status === 'STALE'
                      ? 'bg-[#FEF0C7] text-[#B54708]'
                      : 'bg-[#F2F4F7] text-[#475467]'
                  }`}>
                    Validation: {freshnessStatus.validation_status}
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                    freshnessStatus.report_status === 'FRESH'
                      ? 'bg-[#ECFDF3] text-[#027A48]'
                      : freshnessStatus.report_status === 'STALE'
                      ? 'bg-[#FEF0C7] text-[#B54708]'
                      : 'bg-[#F2F4F7] text-[#475467]'
                  }`}>
                    Reports: {freshnessStatus.report_status}
                  </div>
                </div>
              )}
            </div>

            {/* Freshness Alert Banner if Stale */}
            {freshnessStatus && !freshnessStatus.is_overall_fresh && (
              <div className="p-4 rounded-2xl bg-[#FFFAEB] border border-[#FEDF89] flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#B54708] shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h5 className="font-bold text-[#B54708]">Dossier Artifact Staleness Detected</h5>
                  <p className="text-[#B54708]">
                    {freshnessStatus.validation_status === 'STALE' &&
                      'The application or its documents have been amended since the last validation run. Re-run validation to evaluate the latest submitted revision.'}
                    {freshnessStatus.report_status === 'STALE' &&
                      ' Generated scrutiny reports reflect an earlier dossier version. Regenerate the dossier report to incorporate updated findings.'}
                  </p>
                  <div className="flex gap-2 pt-1">
                    {freshnessStatus.validation_status === 'STALE' && (
                      <button
                        onClick={handleTriggerValidation}
                        disabled={validating}
                        className="px-3 py-1 rounded-lg bg-[#B54708] text-white text-[11px] font-bold hover:bg-[#93370D] transition-all cursor-pointer"
                      >
                        {validating ? 'Validating...' : 'Re-run Validation Now'}
                      </button>
                    )}
                    {freshnessStatus.report_status === 'STALE' && (
                      <button
                        onClick={() => handleGenerateScrutinyReport('PDF')}
                        disabled={generatingReport}
                        className="px-3 py-1 rounded-lg bg-[#7450D8] text-white text-[11px] font-bold hover:bg-[#6039C8] transition-all cursor-pointer"
                      >
                        {generatingReport ? 'Generating...' : 'Regenerate Scrutiny Dossier'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Version Comparator Tool */}
            <div className="p-5 rounded-2xl bg-white border border-[#E9E6F2] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEEAF5] pb-3">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-[#202936] flex items-center gap-1.5">
                    <GitCompare className="w-4 h-4 text-[#7450D8]" />
                    Comparative Version Diff Engine
                  </h5>
                  <p className="text-xs text-[#5F6485]">
                    Select any two dossier snapshots to generate field-level and document-level discrepancy analysis.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[#5F6485] font-semibold">Base:</span>
                    <select
                      value={selectedV1}
                      onChange={(e) => setSelectedV1(Number(e.target.value))}
                      className="text-xs p-1.5 rounded-lg border border-[#DCD0F7] bg-[#FAF9FC] font-mono font-bold text-[#202936]"
                    >
                      {versionsList.map((v) => (
                        <option key={v.id} value={v.version_number}>
                          v{v.version_number} ({formatDate(v.created_at)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-[#8589A6] text-xs font-bold">vs</span>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[#5F6485] font-semibold">Target:</span>
                    <select
                      value={selectedV2}
                      onChange={(e) => setSelectedV2(Number(e.target.value))}
                      className="text-xs p-1.5 rounded-lg border border-[#DCD0F7] bg-[#FAF9FC] font-mono font-bold text-[#202936]"
                    >
                      {versionsList.map((v) => (
                        <option key={v.id} value={v.version_number}>
                          v{v.version_number} ({formatDate(v.created_at)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleCompareVersions}
                    disabled={comparingVersions || selectedV1 === selectedV2}
                    className="px-3.5 py-1.5 rounded-xl bg-[#7450D8] text-white text-xs font-bold hover:bg-[#6039C8] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    {comparingVersions ? 'Comparing...' : 'Compare'}
                  </button>
                </div>
              </div>

              {comparisonError && (
                <div className="p-3 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318]">
                  {comparisonError}
                </div>
              )}

              {comparisonResult && (
                <div className="space-y-3 pt-1">
                  <div className="p-3 rounded-xl bg-[#FAF9FD] border border-[#E9E6F2] flex items-center justify-between text-xs">
                    <span className="font-bold text-[#202936]">
                      Comparison: <span className="font-mono text-[#7450D8]">v{comparisonResult.v1_version}</span> vs{' '}
                      <span className="font-mono text-[#7450D8]">v{comparisonResult.v2_version}</span>
                    </span>
                    <span className="text-[#5F6485] font-medium">
                      {comparisonResult.changed_fields_count} of {comparisonResult.total_fields} fields modified
                    </span>
                  </div>

                  {comparisonResult.differences && comparisonResult.differences.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#EEEAF5] bg-[#FAF9FC] text-[#8589A6] font-semibold text-[11px]">
                            <th className="py-2.5 px-3">FIELD / ATTRIBUTE</th>
                            <th className="py-2.5 px-3">BASE VALUE (v{comparisonResult.v1_version})</th>
                            <th className="py-2.5 px-3">TARGET VALUE (v{comparisonResult.v2_version})</th>
                            <th className="py-2.5 px-3">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEAF5]">
                          {comparisonResult.differences.map((diff: VersionDifferenceItem, idx: number) => (
                            <tr key={idx} className="hover:bg-[#FAF9FC]">
                              <td className="py-2 px-3 font-mono font-bold text-[#202936]">{diff.field}</td>
                              <td className="py-2 px-3 font-mono text-[#B42318] bg-[#FEF3F2]/50">
                                {diff.v1_value !== null && diff.v1_value !== undefined ? String(diff.v1_value) : '<none>'}
                              </td>
                              <td className="py-2 px-3 font-mono text-[#027A48] bg-[#ECFDF3]/50">
                                {diff.v2_value !== null && diff.v2_value !== undefined ? String(diff.v2_value) : '<none>'}
                              </td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  diff.is_changed
                                    ? 'bg-[#FEF0C7] text-[#B54708]'
                                    : 'bg-[#F2F4F7] text-[#475467]'
                                }`}>
                                  {diff.is_changed ? 'MODIFIED' : 'IDENTICAL'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-[#5F6485] bg-[#FAF9FC] rounded-xl border border-[#EEEAF5]">
                      No field differences detected between v{comparisonResult.v1_version} and v{comparisonResult.v2_version}.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Application Version Timeline */}
            <div className="p-5 rounded-2xl bg-white border border-[#E9E6F2] shadow-xs space-y-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#202936]">
                Application Dossier Version Timeline ({versionsList.length} recorded versions)
              </h5>

              {versionsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8589A6]">
                  No version history recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#EEEAF5] bg-[#FAF9FC] text-[#8589A6] font-semibold text-[11px]">
                        <th className="py-3 px-3">REVISION</th>
                        <th className="py-3 px-3">CHANGE SUMMARY</th>
                        <th className="py-3 px-3">AFFECTED FIELDS</th>
                        <th className="py-3 px-3">RECORDED AT</th>
                        <th className="py-3 px-3">ACTOR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEEAF5]">
                      {versionsList.map((ver, idx) => (
                        <tr key={ver.id} className="hover:bg-[#FAF9FC]">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[#7450D8]">v{ver.version_number}</span>
                              {idx === 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#ECFDF3] text-[#027A48]">
                                  LATEST
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[#202936] font-semibold max-w-xs truncate">
                            {ver.change_summary || 'Dossier snapshot recorded'}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1">
                              {ver.changed_fields && Object.keys(ver.changed_fields).length > 0 ? (
                                Object.keys(ver.changed_fields).map((f: string, i: number) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded bg-[#FAF8FF] border border-[#DCD0F7] text-[10px] font-mono text-[#7450D8]">
                                    {f}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[#8589A6] text-[10px]">Initial snapshot</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[#5F6485] whitespace-nowrap">
                            {formatDate(ver.created_at)}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-[#8589A6]">
                            {ver.created_by_id || 'SYSTEM'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 10: Regulatory Gateways & Interoperability */}
        {activeSubTab === 'portals' && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Header & Interoperability Summary */}
            <div className="p-4 rounded-2xl bg-white border border-[#E9E6F2] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Network className="w-5 h-5 text-[#7450D8]" />
                  <h4 className="text-sm font-bold text-[#202936]">Regulatory Portal Interoperability & External Gateways</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8FF] text-[#7450D8] border border-[#DCD0F7]">
                    SSRF Protected & TLS Enforced
                  </span>
                </div>
                <p className="text-xs text-[#5F6485]">
                  Exchange authorized compliance records with central institutional registries (AICTE, AISHE, State Boards). Private IP ranges and cloud metadata services are blocked.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadWorkspaceData()}
                  className="px-3 py-1.5 rounded-xl border border-[#DCD0F7] text-xs font-bold text-[#7450D8] hover:bg-[#FAF8FF] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh Gateways
                </button>
              </div>
            </div>

            {/* Feedback Alert */}
            {portalFeedback && (
              <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 ${
                portalFeedback.type === 'success'
                  ? 'bg-[#ECFDF3] border-[#A6F4C5] text-[#027A48]'
                  : portalFeedback.type === 'error'
                  ? 'bg-[#FEF3F2] border-[#FECDCA] text-[#B42318]'
                  : 'bg-[#FAF8FF] border-[#DCD0F7] text-[#7450D8]'
              }`}>
                {portalFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : portalFeedback.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 shrink-0" />
                )}
                <span className="font-medium">{portalFeedback.text}</span>
              </div>
            )}

            {/* Gateways Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {portalsList.map((portal) => (
                <div
                  key={portal.id}
                  className={`p-5 rounded-3xl border transition-all space-y-4 flex flex-col justify-between ${
                    portal.provider_type === 'LOCAL_SYNTHETIC'
                      ? 'bg-white border-[#DCD0F7] shadow-xs'
                      : portal.provider_type === 'CONFIGURABLE_REST'
                      ? 'bg-white border-[#E9E6F2] shadow-xs'
                      : 'bg-[#FAF9FC] border-[#E9E6F2]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        portal.provider_type === 'LOCAL_SYNTHETIC'
                          ? 'bg-[#ECFDF3] text-[#027A48]'
                          : portal.provider_type === 'CONFIGURABLE_REST'
                          ? portal.is_enabled ? 'bg-[#EFF8FF] text-[#175CD3]' : 'bg-[#FEF0C7] text-[#B54708]'
                          : 'bg-[#F2F4F7] text-[#475467]'
                      }`}>
                        {portal.provider_type}
                      </span>
                      <span className={`flex items-center gap-1 text-[11px] font-bold ${
                        portal.health_status === 'OPERATIONAL'
                          ? 'text-[#027A48]'
                          : portal.health_status === 'UNCONFIGURED' || portal.health_status === 'UNCONFIGURED_PROTOTYPE_STUB'
                          ? 'text-[#5F6485]'
                          : 'text-[#B42318]'
                      }`}>
                        <Radio className="w-3 h-3" />
                        {portal.health_status || 'UNKNOWN'}
                      </span>
                    </div>

                    <h5 className="text-xs font-bold text-[#202936] leading-snug">{portal.name}</h5>
                    <p className="text-[11px] text-[#5F6485] leading-relaxed">{portal.description}</p>
                    <div className="text-[10px] font-mono text-[#8589A6] pt-1 border-t border-[#EEEAF5]">
                      Authority: <span className="text-[#202936] font-semibold">{portal.statutory_authority}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#EEEAF5]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#8589A6]">Latency:</span>
                      <span className="font-mono font-bold text-[#202936]">
                        {portal.latency_ms !== null && portal.latency_ms !== undefined ? `${portal.latency_ms} ms` : 'N/A'}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleProbePortalHealth(portal.provider_id)}
                        disabled={probingPortalId === portal.provider_id}
                        className="flex-1 py-1.5 rounded-xl border border-[#DCD0F7] text-[11px] font-bold text-[#7450D8] hover:bg-[#FAF8FF] transition-all cursor-pointer disabled:opacity-50"
                      >
                        {probingPortalId === portal.provider_id ? 'Probing...' : 'Probe Health'}
                      </button>

                      {portal.provider_type !== 'OFFICIAL_STUB' && (
                        <button
                          onClick={() => handleTriggerExternalVerification(portal.provider_id)}
                          disabled={verifyingPortal || (!portal.is_enabled && portal.provider_type !== 'LOCAL_SYNTHETIC')}
                          className="flex-1 py-1.5 rounded-xl bg-[#7450D8] text-white text-[11px] font-bold hover:bg-[#6039C8] transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          {verifyingPortal ? 'Verifying...' : 'Verify Now'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Active External Verification Results */}
            {externalVerifData && (
              <div className="p-5 rounded-2xl bg-white border border-[#E9E6F2] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EEEAF5] pb-3">
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#202936] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#7450D8]" />
                      External Gateway Verification Outcome: {externalVerifData.provider_name}
                    </h5>
                    <p className="text-xs text-[#5F6485]">
                      Retrieved on {formatDate(externalVerifData.retrieved_at)} | Authority: {externalVerifData.statutory_authority}
                    </p>
                  </div>

                  <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                    externalVerifData.overall_status === 'MATCH'
                      ? 'bg-[#ECFDF3] text-[#027A48]'
                      : 'bg-[#FEF3F2] text-[#B42318]'
                  }`}>
                    {externalVerifData.overall_status}
                  </span>
                </div>

                {/* Provenance Banner */}
                <div className="p-3 rounded-xl bg-[#FAF9FD] border border-[#E9E6F2] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#202936]">
                    Target Identifier: <span className="font-mono text-[#7450D8]">{externalVerifData.target_identifier}</span>
                  </span>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-[#5F6485]">
                    <span>Source: {externalVerifData.provenance?.source || 'Internal Gateway'}</span>
                    <span>|</span>
                    <span>Mode: {externalVerifData.provenance?.mode || 'Demo'}</span>
                    {externalVerifData.provenance?.tls_verified && (
                      <>
                        <span>|</span>
                        <span className="text-[#027A48] font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> TLS Verified
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Checks Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#EEEAF5] bg-[#FAF9FC] text-[#8589A6] font-semibold text-[11px]">
                        <th className="py-2.5 px-3">COMPLIANCE CRITERION</th>
                        <th className="py-2.5 px-3">STATUS</th>
                        <th className="py-2.5 px-3">APPLICATION DECLARED</th>
                        <th className="py-2.5 px-3">EXTERNAL PORTAL REFERENCE</th>
                        <th className="py-2.5 px-3">REGULATORY EXPLANATION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEEAF5]">
                      {externalVerifData.checks.map((chk, i) => (
                        <tr key={i} className="hover:bg-[#FAF9FC]">
                          <td className="py-3 px-3 font-semibold text-[#202936]">{chk.check_name}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              chk.status === 'MATCH' ? 'bg-[#ECFDF3] text-[#027A48]' : 'bg-[#FEF3F2] text-[#B42318]'
                            }`}>
                              {chk.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-[#202936]">
                            {chk.declared_value !== null && chk.declared_value !== undefined ? String(chk.declared_value) : 'N/A'}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#7450D8]">
                            {chk.portal_value !== null && chk.portal_value !== undefined ? String(chk.portal_value) : 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-[#5F6485]">{chk.explanation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Outbound Sync & Security Audit Logs */}
            <div className="p-5 rounded-2xl bg-white border border-[#E9E6F2] shadow-xs space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#202936] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#7450D8]" />
                Outbound Gateway Activity & Security Audit Ledger
              </h5>

              {portalSyncLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8589A6]">
                  No outbound gateway requests recorded yet. Click "Probe Health" or "Verify Now" to initiate a gateway exchange.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#EEEAF5] bg-[#FAF9FC] text-[#8589A6] font-semibold text-[11px]">
                        <th className="py-2.5 px-3">GATEWAY PROVIDER</th>
                        <th className="py-2.5 px-3">ACTION</th>
                        <th className="py-2.5 px-3">STATUS</th>
                        <th className="py-2.5 px-3">LATENCY</th>
                        <th className="py-2.5 px-3">HTTP CODE</th>
                        <th className="py-2.5 px-3">RECORDED AT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEEAF5]">
                      {portalSyncLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#FAF9FC]">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#202936]">{log.provider_id}</td>
                          <td className="py-2.5 px-3 font-semibold text-[#5F6485]">{log.action}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'SUCCESS' || log.status === 'OPERATIONAL'
                                ? 'bg-[#ECFDF3] text-[#027A48]'
                                : log.status === 'BLOCKED_SSRF'
                                ? 'bg-[#FEF3F2] text-[#B42318]'
                                : 'bg-[#FAF8FF] text-[#7450D8]'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-[#5F6485]">
                            {log.response_latency_ms !== null && log.response_latency_ms !== undefined ? `${log.response_latency_ms} ms` : '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-[#5F6485]">
                            {log.http_status_code || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-[#5F6485] whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Discrepancy Resolution Modal */}
      {resolutionModalOpen && targetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#E9E6F2] shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EEEAF5] pb-3">
              <h4 className="text-sm font-bold text-[#202936] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#7450D8]" />
                Reviewer Discrepancy Adjudication
              </h4>
              <button
                onClick={() => setResolutionModalOpen(false)}
                className="text-[#8589A6] hover:text-[#202936] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF9FD] border border-[#E9E6F2] space-y-1">
                <span className="font-bold text-[#202936]">{targetResult.check_type}</span>
                <p className="text-[#5F6485]">{targetResult.explanation}</p>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  <div>Declared: <span className="font-bold text-[#202936]">{targetResult.application_value || 'None'}</span></div>
                  <div>Reference: <span className="font-bold text-[#202936]">{targetResult.registry_value || 'None'}</span></div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#5F6485]">Adjudication Decision</label>
                <div className="flex gap-2">
                  {(['ACCEPTED', 'WAIVED', 'FLAGGED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setResolutionStatus(st)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        resolutionStatus === st
                          ? 'bg-[#7450D8] text-white border-[#7450D8]'
                          : 'bg-[#FAF9FC] text-[#5F6485] border-[#DCD0F7] hover:bg-[#F3EEFC]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#5F6485]">Statutory Justification & Reviewer Notes</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Enter detailed reason for resolution (e.g. verified against physical gazette or approval order)..."
                  className="w-full text-xs p-3 rounded-xl border border-[#DCD0F7] bg-[#FAF9FC] focus:outline-none focus:border-[#7450D8]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResolutionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#5F6485] hover:bg-[#FAF9FC] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resolving || resolutionNotes.trim().length < 3}
                onClick={handleResolveDiscrepancy}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#7450D8] text-white hover:bg-[#6039C8] transition-all cursor-pointer disabled:opacity-50"
              >
                {resolving ? 'Recording...' : 'Confirm Adjudication'}
              </button>
            </div>
          </div>
        </div>
      )}

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
