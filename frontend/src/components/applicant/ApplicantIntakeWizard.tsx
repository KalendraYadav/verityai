import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Upload,
  ArrowRight,
  ArrowLeft,
  Building2,
  RefreshCw,
  Lock,
} from 'lucide-react';
import {
  createApplication,
  updateApplication,
  submitApplication,
  fetchApplicationDetail,
  fetchApplicationChecklist,
  uploadDocument,
  type ApplicationDetailResponse,
  type ApplicationCategory,
  type Institution,
  type UserProfile,
  type ChecklistItemData,
  type ApplicationChecklistData,
} from '../../api/client';

interface Props {
  applicationId?: string | null;
  onClose: () => void;
  onComplete: (app: ApplicationDetailResponse) => void;
  currentUser: UserProfile | null;
  categories: ApplicationCategory[];
  institutions: Institution[];
}

export const ApplicantIntakeWizard: React.FC<Props> = ({
  applicationId: initialAppId,
  onClose,
  onComplete,
  currentUser,
  categories,
  institutions,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [app, setApp] = useState<ApplicationDetailResponse | null>(null);
  const [_loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingErrors, setMissingErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Step 1 State: Baseline Category & Academic Year
  const [categoryCode, setCategoryCode] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-27');

  // Step 2 State: Statutory Declared Data
  const [principalName, setPrincipalName] = useState('');
  const [approvedIntake, setApprovedIntake] = useState('');
  const [landAreaAcres, setLandAreaAcres] = useState('');
  const [builtUpAreaSqm, setBuiltUpAreaSqm] = useState('');
  const [buildingAgeYears, setBuildingAgeYears] = useState('');
  const [landOwnershipType, setLandOwnershipType] = useState('OWNED');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [certificateExpiryDate, setCertificateExpiryDate] = useState('');
  const [programmeName, setProgrammeName] = useState('ENGINEERING_AND_TECHNOLOGY');

  // Step 3 State: Checklist & Document Uploads
  const [checklist, setChecklist] = useState<ApplicationChecklistData | null>(null);
  const [uploadingDocCode, setUploadingDocCode] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Derive bound institution
  const boundInstitution = React.useMemo(() => {
    if (currentUser?.institution_id) {
      return (
        institutions.find(
          (i) => i.id === currentUser.institution_id || i.institution_identifier === currentUser.institution_id
        ) || null
      );
    }
    return institutions[0] || null;
  }, [currentUser, institutions]);

  // Load existing application if resuming draft
  useEffect(() => {
    if (initialAppId) {
      setLoading(true);
      fetchApplicationDetail(initialAppId)
        .then((data) => {
          setApp(data);
          setCategoryCode(data.category_code);
          setAcademicYear(data.academic_year || '2026-27');

          const decl = data.declared_data || {};
          if (decl.principal_name) setPrincipalName(String(decl.principal_name));
          if (decl.approved_intake != null) setApprovedIntake(String(decl.approved_intake));
          if (decl.land_area_acres != null) setLandAreaAcres(String(decl.land_area_acres));
          if (decl.built_up_area_sqm != null) setBuiltUpAreaSqm(String(decl.built_up_area_sqm));
          if (decl.building_age_years != null) setBuildingAgeYears(String(decl.building_age_years));
          if (decl.land_ownership_type) setLandOwnershipType(String(decl.land_ownership_type));
          if (decl.certificate_number) setCertificateNumber(String(decl.certificate_number));
          if (decl.certificate_expiry_date) setCertificateExpiryDate(String(decl.certificate_expiry_date));
          if (decl.programme_name) setProgrammeName(String(decl.programme_name));

          // If already submitted, open directly to Step 4 (read-only)
          if (data.lifecycle_status !== 'DRAFT') {
            setCurrentStep(4);
          } else {
            setCurrentStep(2);
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load application draft.');
        })
        .finally(() => setLoading(false));
    } else {
      if (categories.length > 0) {
        setCategoryCode((prev) => prev || categories[0].code);
      }
    }
  }, [initialAppId, categories]);

  // Load checklist whenever application is available
  const loadChecklist = async (appId: string) => {
    try {
      const data = await fetchApplicationChecklist(appId);
      setChecklist(data);
    } catch (err) {
      console.error('Failed to load application checklist', err);
    }
  };

  useEffect(() => {
    if (app?.id) {
      loadChecklist(app.id);
    }
  }, [app?.id, currentStep]);

  // ── Validation Helpers ────────────────────────────────────────────────
  const validateStep1 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!categoryCode || !categoryCode.trim()) {
      errs.categoryCode = 'Please select a statutory application category.';
    }
    if (!academicYear || !academicYear.trim()) {
      errs.academicYear = 'Academic year is required.';
    } else if (!/^\d{4}-\d{2}$/.test(academicYear.trim())) {
      errs.academicYear = 'Academic year must be formatted as YYYY-YY (e.g. 2026-27).';
    }
    if (!programmeName || !programmeName.trim()) {
      errs.programmeName = 'Please select a primary programme.';
    }
    return errs;
  };

  const validateStep2 = (allowIncompleteDraft = false): Record<string, string> => {
    const errs: Record<string, string> = {};

    if (!allowIncompleteDraft) {
      // Mandatory requirements for step progression & submission
      if (!principalName || !principalName.trim()) {
        errs.principalName = 'Head of Institution / Principal Name is required.';
      }

      if (!approvedIntake || !approvedIntake.trim()) {
        errs.approvedIntake = 'Total approved student intake is required.';
      } else {
        const intake = Number(approvedIntake.trim());
        if (isNaN(intake) || intake < 0 || !Number.isInteger(intake)) {
          errs.approvedIntake = 'Approved intake must be a valid non-negative whole number (integer ≥ 0).';
        }
      }

      if (!landAreaAcres || !landAreaAcres.trim()) {
        errs.landAreaAcres = 'Campus land area is required.';
      } else {
        const acres = Number(landAreaAcres.trim());
        if (isNaN(acres) || acres <= 0) {
          errs.landAreaAcres = 'Campus land area must be a positive number greater than 0 acres.';
        }
      }

      if (!builtUpAreaSqm || !builtUpAreaSqm.trim()) {
        errs.builtUpAreaSqm = 'Total built-up instructional area is required.';
      } else {
        const sqm = Number(builtUpAreaSqm.trim());
        if (isNaN(sqm) || sqm <= 0) {
          errs.builtUpAreaSqm = 'Total built-up instructional area must be a positive number greater than 0 sqm.';
        }
      }

      if (!landOwnershipType || !landOwnershipType.trim()) {
        errs.landOwnershipType = 'Campus land title / ownership type is required.';
      }
    } else {
      // Partial draft saving: validate syntax & ranges if field was entered
      if (approvedIntake.trim()) {
        const intake = Number(approvedIntake.trim());
        if (isNaN(intake) || intake < 0 || !Number.isInteger(intake)) {
          errs.approvedIntake = 'Approved intake must be a valid non-negative whole number (integer ≥ 0).';
        }
      }
      if (landAreaAcres.trim()) {
        const acres = Number(landAreaAcres.trim());
        if (isNaN(acres) || acres <= 0) {
          errs.landAreaAcres = 'Campus land area must be a positive number greater than 0 acres.';
        }
      }
      if (builtUpAreaSqm.trim()) {
        const sqm = Number(builtUpAreaSqm.trim());
        if (isNaN(sqm) || sqm <= 0) {
          errs.builtUpAreaSqm = 'Total built-up instructional area must be a positive number greater than 0 sqm.';
        }
      }
    }

    // Common optional fields checks
    if (buildingAgeYears.trim()) {
      const age = Number(buildingAgeYears.trim());
      if (isNaN(age) || age < 0 || !Number.isInteger(age)) {
        errs.buildingAgeYears = 'Building age must be a non-negative whole number (years ≥ 0).';
      }
    }

    if (certificateExpiryDate.trim()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(certificateExpiryDate.trim()) || isNaN(Date.parse(certificateExpiryDate.trim()))) {
        errs.certificateExpiryDate = 'Certificate expiry date must be a valid date formatted as YYYY-MM-DD.';
      }
    }

    return errs;
  };

  // ── Step Navigation Guard ─────────────────────────────────────────────
  const handleStepNavigation = (targetStep: 1 | 2 | 3 | 4) => {
    if (targetStep === currentStep) return;
    setError(null);

    // Backward navigation is always allowed
    if (targetStep < currentStep) {
      setFieldErrors({});
      setCurrentStep(targetStep);
      return;
    }

    // Forward navigation requires completing prior steps
    if (currentStep === 1 || targetStep >= 2) {
      const step1Errs = validateStep1();
      if (Object.keys(step1Errs).length > 0) {
        setFieldErrors(step1Errs);
        setError('Please complete all mandatory Step 1 fields before proceeding.');
        setCurrentStep(1);
        return;
      }
    }

    if (targetStep >= 3) {
      const step2Errs = validateStep2(false);
      if (Object.keys(step2Errs).length > 0) {
        setFieldErrors(step2Errs);
        setError('Please complete all mandatory declared metrics in Step 2 before proceeding.');
        setCurrentStep(2);
        return;
      }
    }

    setFieldErrors({});
    setCurrentStep(targetStep);
  };

  // ── Step 1 Handler: Create or Update Draft ─────────────────────────────
  const handleStep1Proceed = async () => {
    setError(null);
    const errs = validateStep1();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError('Please resolve the mandatory fields marked below before proceeding.');
      return;
    }
    setFieldErrors({});

    if (!boundInstitution) {
      setError('Applicant institution is not bound. Please contact your system administrator.');
      return;
    }

    setSaving(true);
    try {
      if (!app) {
        // Create initial draft
        const created = await createApplication({
          institution_id: boundInstitution.id,
          category_code: categoryCode.trim(),
          academic_year: academicYear.trim(),
          declared_data: {
            institution_name: boundInstitution.institution_name,
            institution_identifier: boundInstitution.institution_identifier,
            programme_name: programmeName.trim(),
          },
        });
        const fullDetail = await fetchApplicationDetail(created.id);
        setApp(fullDetail);
      } else {
        // Update draft category / academic year
        const updated = await updateApplication(app.id, {
          category_code: categoryCode.trim(),
          academic_year: academicYear.trim(),
        });
        setApp(updated);
      }
      setCurrentStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save application draft.');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 2 Handler: Save Declared Statutory Parameters ──────────────────
  const handleStep2SaveAndProceed = async (proceed = true) => {
    if (!app) return;
    setError(null);

    const errs = validateStep2(!proceed); // allowIncompleteDraft when saving draft
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError(
        proceed
          ? 'Please complete all mandatory declared metrics marked below before proceeding.'
          : 'Please correct the invalid metric values marked below before saving draft.'
      );
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const declared: Record<string, any> = {
        institution_name: boundInstitution?.institution_name || '',
        institution_identifier: boundInstitution?.institution_identifier || '',
        programme_name: programmeName.trim(),
        land_ownership_type: landOwnershipType,
      };

      if (principalName.trim()) declared.principal_name = principalName.trim();
      if (approvedIntake.trim()) declared.approved_intake = Number(approvedIntake.trim());
      if (landAreaAcres.trim()) declared.land_area_acres = Number(landAreaAcres.trim());
      if (builtUpAreaSqm.trim()) declared.built_up_area_sqm = Number(builtUpAreaSqm.trim());
      if (buildingAgeYears.trim()) declared.building_age_years = Number(buildingAgeYears.trim());
      if (certificateNumber.trim()) declared.certificate_number = certificateNumber.trim();
      if (certificateExpiryDate.trim()) declared.certificate_expiry_date = certificateExpiryDate.trim();

      const updated = await updateApplication(app.id, {
        declared_data: declared,
      });
      setApp(updated);
      await loadChecklist(app.id);

      if (proceed) {
        setCurrentStep(3);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save statutory declared data.');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 3 Handler: Upload Supporting Document ─────────────────────────
  const handleFileUpload = async (documentCode: string, file: File) => {
    if (!app) return;
    setUploadError(null);

    // Validate size (max 20 MB)
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File size exceeds statutory 20 MB limit.');
      return;
    }

    // Validate type (PDF, PNG, JPG, JPEG)
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Only PDF documents and PNG/JPEG images are permitted.');
      return;
    }

    setUploadingDocCode(documentCode);
    setUploadProgress(20);

    try {
      const interval = setInterval(() => {
        setUploadProgress((p) => (p < 85 ? p + 20 : p));
      }, 150);

      await uploadDocument(app.id, file, documentCode);

      clearInterval(interval);
      setUploadProgress(100);

      // Refresh application detail and checklist
      const [refreshedApp] = await Promise.all([
        fetchApplicationDetail(app.id),
        loadChecklist(app.id),
      ]);
      setApp(refreshedApp);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Document upload failed';
      setUploadError(msg);
    } finally {
      setTimeout(() => {
        setUploadingDocCode(null);
        setUploadProgress(0);
      }, 400);
    }
  };

  // ── Missing Items Tracking for Step 4 & Final Submit ───────────────────
  const missingMandatoryItems = React.useMemo(() => {
    if (!checklist) return [];
    return checklist.items.filter(
      (item) => item.mandatory_or_conditional === 'MANDATORY' && (!item.is_present || item.status === 'REQUIRED_MISSING')
    );
  }, [checklist]);

  const missingDeclaredFields = React.useMemo(() => {
    const missing: { field: string; label: string; step: 1 | 2 }[] = [];
    if (!categoryCode || !categoryCode.trim()) {
      missing.push({ field: 'categoryCode', label: 'Application Category', step: 1 });
    }
    if (!academicYear || !academicYear.trim() || !/^\d{4}-\d{2}$/.test(academicYear.trim())) {
      missing.push({ field: 'academicYear', label: 'Academic Year (format: YYYY-YY)', step: 1 });
    }
    if (!programmeName || !programmeName.trim()) {
      missing.push({ field: 'programmeName', label: 'Primary Programme', step: 1 });
    }
    if (!principalName || !principalName.trim()) {
      missing.push({ field: 'principalName', label: 'Head of Institution / Principal Name', step: 2 });
    }
    const intake = Number(approvedIntake.trim());
    if (!approvedIntake || !approvedIntake.trim() || isNaN(intake) || intake < 0 || !Number.isInteger(intake)) {
      missing.push({ field: 'approvedIntake', label: 'Approved Student Intake (integer ≥ 0)', step: 2 });
    }
    const land = Number(landAreaAcres.trim());
    if (!landAreaAcres || !landAreaAcres.trim() || isNaN(land) || land <= 0) {
      missing.push({ field: 'landAreaAcres', label: 'Campus Land Area (> 0 Acres)', step: 2 });
    }
    const sqm = Number(builtUpAreaSqm.trim());
    if (!builtUpAreaSqm || !builtUpAreaSqm.trim() || isNaN(sqm) || sqm <= 0) {
      missing.push({ field: 'builtUpAreaSqm', label: 'Total Built-up Instructional Area (> 0 Sqm)', step: 2 });
    }
    if (!landOwnershipType || !landOwnershipType.trim()) {
      missing.push({ field: 'landOwnershipType', label: 'Campus Land Title / Ownership Type', step: 2 });
    }
    return missing;
  }, [categoryCode, academicYear, programmeName, principalName, approvedIntake, landAreaAcres, builtUpAreaSqm, landOwnershipType]);

  const isDeclaredComplete = missingDeclaredFields.length === 0;
  const isDossierComplete = isDeclaredComplete && missingMandatoryItems.length === 0;

  // ── Step 4 Handler: Formal Submission ──────────────────────────────────
  const handleSubmitApplication = async () => {
    if (!app) return;
    setError(null);
    setMissingErrors([]);

    // Independent revalidation before submission
    const step1Errs = validateStep1();
    const step2Errs = validateStep2(false);
    const combinedErrs = { ...step1Errs, ...step2Errs };

    if (Object.keys(combinedErrs).length > 0) {
      setFieldErrors(combinedErrs);
      setError('Cannot submit application. Mandatory declared fields are incomplete.');
      setMissingErrors(missingDeclaredFields.map((f) => f.label));
      return;
    }

    if (missingMandatoryItems.length > 0) {
      setError('Cannot submit application. Mandatory statutory documents are missing.');
      setMissingErrors(missingMandatoryItems.map((m) => m.title));
      return;
    }

    setSubmitting(true);
    try {
      const submitted = await submitApplication(app.id);
      setApp(submitted);
      setIsSubmittedSuccess(true);
      onComplete(submitted);
    } catch (err: any) {
      const msg = err.message || 'Submission failed.';
      setError(msg);
      if (err.code === 'SUBMISSION_CHECKLIST_INCOMPLETE' && checklist) {
        const missing = checklist.items
          .filter((i) => i.mandatory_or_conditional === 'MANDATORY' && (!i.is_present || i.status === 'REQUIRED_MISSING'))
          .map((i) => i.title);
        setMissingErrors(missing);
      } else if (err.code === 'APPLICATION_INCOMPLETE') {
        setMissingErrors(missingDeclaredFields.map((f) => f.label));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1F3954]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E5DACF] max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ── Wizard Header ────────────────────────────────────────────── */}
        <div className="px-6 py-4 bg-[#FAF5F0] border-b border-[#E5DACF] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1F3954] text-[#33CC7A] flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold tracking-tight text-[#0F2540] leading-snug">
                  {app ? `Application ${app.application_reference}` : 'New Statutory Approval Application'}
                </h2>
                {app && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      app.lifecycle_status === 'DRAFT'
                        ? 'bg-[#EEE5DC] text-[#202936] border-[#E5DACF]'
                        : 'bg-[#BACDE0]/30 text-[#1F3954] border-[#BACDE0]'
                    }`}
                  >
                    {app.lifecycle_status}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-[#536174] tracking-wide leading-snug">
                {boundInstitution?.institution_name || 'AICTE Institutional Intake Portal'} · Academic Year {academicYear}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#536174] hover:text-[#202936] hover:bg-[#EEE5DC] transition-colors cursor-pointer"
            aria-label="Close intake wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Step Progress Indicator ─────────────────────────────────── */}
        <div className="px-6 py-3 bg-[#FAF5F0]/60 border-b border-[#E5DACF] shrink-0">
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              { num: 1, title: 'Category & Year' },
              { num: 2, title: 'Declared Metrics' },
              { num: 3, title: 'Document Checklist' },
              { num: 4, title: 'Review & Submit' },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num || isSubmittedSuccess;
              return (
                <button
                  key={step.num}
                  disabled={!app && step.num > 1}
                  onClick={() => {
                    handleStepNavigation(step.num as any);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-full text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-[#1F3954] text-[#FAF5F0] font-semibold shadow-sm'
                      : isPast
                      ? 'text-[#1F3954] font-medium bg-[#EBF7F0]'
                      : 'text-[#536174] font-medium hover:bg-[#EEE5DC]/50'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isActive
                        ? 'bg-[#33CC7A] text-[#202936]'
                        : isPast
                        ? 'bg-[#1F3954] text-[#33CC7A]'
                        : 'bg-[#EEE5DC] text-[#536174]'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.num}
                  </div>
                  <span className="truncate hidden sm:inline text-[11px] tracking-wide">{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Wizard Body (Scrollable) ────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* General Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">{error}</div>
                {missingErrors.length > 0 && (
                  <ul className="list-disc pl-4 space-y-0.5 text-red-600 font-medium">
                    {missingErrors.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Submission Success Screen */}
          {isSubmittedSuccess ? (
            <div className="py-8 px-4 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-lg mx-auto">
                <h3 className="text-xl font-extrabold text-[#111827]">
                  Application Successfully Submitted!
                </h3>
                <p className="text-xs text-[#667085] leading-relaxed">
                  Your statutory application dossier has been received and queued for regulatory scrutiny.
                  The application is now permanently locked against modifications.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E4E7EC] max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-[#E4E7EC] pb-2">
                  <span className="text-[#667085]">Application Reference:</span>
                  <span className="font-mono font-bold text-[#111827]">{app?.application_reference}</span>
                </div>
                <div className="flex justify-between border-b border-[#E4E7EC] pb-2">
                  <span className="text-[#667085]">Lifecycle Status:</span>
                  <span className="font-bold text-[#175CD3]">SUBMITTED (Awaiting Scrutiny)</span>
                </div>
                <div className="flex justify-between border-b border-[#E4E7EC] pb-2">
                  <span className="text-[#667085]">Submission Timestamp:</span>
                  <span className="text-[#111827]">
                    {app?.submitted_at
                      ? new Date(app.submitted_at).toLocaleString('en-IN', { timeZoneName: 'short' })
                      : 'Just now'}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-[#667085]">Applicant Institution:</span>
                  <span className="font-medium text-[#111827]">{boundInstitution?.institution_name}</span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl main-btn btn-hover text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ── STEP 1: Category & Academic Year ──────────────────── */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-[13px] font-semibold tracking-tight text-[#0F2540] leading-snug">Step 1: Statutory Category & Academic Year</h3>
                    <p className="text-[12px] text-[#536174] leading-relaxed">
                      Select the statutory approval category under the AICTE Approval Process Handbook (APH 2024-27).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E4E7EC] space-y-3">
                    <div className="text-xs font-semibold text-[#111827] flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-[#37C2CC]" />
                      <span>Applicant Institution</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[#667085]">Institution Name:</span>
                        <div className="font-bold text-[#111827] mt-0.5">
                          {boundInstitution?.institution_name || 'Meridian Institute of Technology'}
                        </div>
                      </div>
                      <div>
                        <span className="text-[#667085]">Institutional Code / Identifier:</span>
                        <div className="font-mono text-[12px] font-semibold text-[#1F3954] mt-0.5">
                          {boundInstitution?.institution_identifier || 'VAI-I-001'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[12px] font-medium text-[#1F3954] mb-1.5">
                        Application Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={categoryCode}
                        onChange={(e) => {
                          setCategoryCode(e.target.value);
                          if (fieldErrors.categoryCode) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.categoryCode;
                              return next;
                            });
                          }
                        }}
                        className={`w-full px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 ${
                          fieldErrors.categoryCode
                            ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500 text-red-900'
                            : 'border-[#D0D5DD] focus:ring-[#37C2CC]/30 focus:border-[#37C2CC] text-[#111827]'
                        }`}
                      >
                        {!categoryCode && <option value="">-- Select Application Category --</option>}
                        {categories.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                      {fieldErrors.categoryCode && (
                        <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fieldErrors.categoryCode}</span>
                        </p>
                      )}
                      <p className="text-[11px] text-[#536174] mt-1 leading-relaxed">
                        Select Extension of Approval (EoA) or specialized approval type.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12px] font-medium text-[#1F3954] mb-1.5">
                          Academic Year <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={academicYear}
                          onChange={(e) => {
                            setAcademicYear(e.target.value);
                            if (fieldErrors.academicYear) {
                              setFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next.academicYear;
                                return next;
                              });
                            }
                          }}
                          placeholder="2026-27"
                          className={`w-full px-3 py-2 rounded-xl border bg-white font-mono focus:outline-none focus:ring-2 ${
                            fieldErrors.academicYear
                              ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500 text-red-900'
                              : 'border-[#D0D5DD] focus:ring-[#37C2CC]/30 focus:border-[#37C2CC] text-[#111827]'
                          }`}
                        />
                        {fieldErrors.academicYear && (
                          <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{fieldErrors.academicYear}</span>
                          </p>
                        )}
                        <p className="text-[11px] text-[#536174] mt-1 leading-relaxed">Format: YYYY-YY (e.g. 2026-27)</p>
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-[#1F3954] mb-1.5">
                          Primary Programme <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={programmeName}
                          onChange={(e) => {
                            setProgrammeName(e.target.value);
                            if (fieldErrors.programmeName) {
                              setFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next.programmeName;
                                return next;
                              });
                            }
                          }}
                          className={`w-full px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 ${
                            fieldErrors.programmeName
                              ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500 text-red-900'
                              : 'border-[#D0D5DD] focus:ring-[#37C2CC]/30 focus:border-[#37C2CC] text-[#111827]'
                          }`}
                        >
                          <option value="ENGINEERING_AND_TECHNOLOGY">Engineering & Technology</option>
                          <option value="MANAGEMENT">Management (MBA / PGDM)</option>
                          <option value="PHARMACY">Pharmacy</option>
                          <option value="COMPUTER_APPLICATIONS">MCA / Computer Applications</option>
                        </select>
                        {fieldErrors.programmeName && (
                          <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{fieldErrors.programmeName}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Declared Statutory Parameters ─────────────── */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-[13px] font-semibold tracking-tight text-[#0F2540] leading-snug">Step 2: Statutory Declared Parameters</h3>
                    <p className="text-[12px] text-[#536174] leading-relaxed">
                      Enter declared institutional capacity, campus land area, and building particulars for APH 2024-27 norm validation.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[12px] font-medium text-[#1F3954] mb-1">
                        Head of Institution / Principal Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={principalName}
                        onChange={(e) => {
                          setPrincipalName(e.target.value);
                          if (fieldErrors.principalName) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.principalName;
                              return next;
                            });
                          }
                        }}
                        placeholder="Dr. K. S. Sharma"
                        className={`w-full px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 ${
                          fieldErrors.principalName
                            ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500 text-red-900'
                            : 'border-[#D0D5DD] focus:ring-[#37C2CC]/30 focus:border-[#37C2CC] text-[#111827]'
                        }`}
                      />
                      {fieldErrors.principalName && (
                        <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fieldErrors.principalName}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-[#1F3954] mb-1">
                        Total Approved Student Intake <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={approvedIntake}
                        onChange={(e) => {
                          setApprovedIntake(e.target.value);
                          if (fieldErrors.approvedIntake) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.approvedIntake;
                              return next;
                            });
                          }
                        }}
                        placeholder="e.g. 360"
                        className={`w-full px-3 py-2 rounded-xl border bg-white font-mono focus:outline-none focus:ring-2 ${
                          fieldErrors.approvedIntake
                            ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500 text-red-900'
                            : 'border-[#D0D5DD] focus:ring-[#37C2CC]/30 focus:border-[#37C2CC] text-[#111827]'
                        }`}
                      />
                      {fieldErrors.approvedIntake ? (
                        <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fieldErrors.approvedIntake}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#536174] mt-1 leading-relaxed">Calculates Faculty-Student Ratio (FSR) norms</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-[#1F3954] mb-1">
                        Campus Land Area (Acres) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={landAreaAcres}
                        onChange={(e) => {
                          setLandAreaAcres(e.target.value);
                          if (fieldErrors.landAreaAcres) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.landAreaAcres;
                              return next;
                            });
                          }
                        }}
                        placeholder="e.g. 5.0"
                        className={`w-full px-3 py-2 rounded-xl border bg-white font-mono focus:outline-none focus:ring-2 ${
                          fieldErrors.landAreaAcres
                            ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500 text-red-900'
                            : 'border-[#D0D5DD] focus:ring-[#37C2CC]/30 focus:border-[#37C2CC] text-[#111827]'
                        }`}
                      />
                      {fieldErrors.landAreaAcres ? (
                        <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fieldErrors.landAreaAcres}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#536174] mt-1 leading-relaxed">Minimum land norm per APH Chapter I (&gt; 0 Acres)</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-[#1F3954] mb-1">
                        Total Built-up Instructional Area (Sqm) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={builtUpAreaSqm}
                        onChange={(e) => {
                          setBuiltUpAreaSqm(e.target.value);
                          if (fieldErrors.builtUpAreaSqm) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.builtUpAreaSqm;
                              return next;
                            });
                          }
                        }}
                        placeholder="e.g. 12500"
                        className={`w-full px-3 py-2 rounded-xl border bg-white font-mono focus:outline-none focus:ring-2 ${
                          fieldErrors.builtUpAreaSqm
                            ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500 text-red-900'
                            : 'border-[#D0D5DD] focus:ring-[#37C2CC]/30 focus:border-[#37C2CC] text-[#111827]'
                        }`}
                      />
                      {fieldErrors.builtUpAreaSqm ? (
                        <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fieldErrors.builtUpAreaSqm}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#536174] mt-1 leading-relaxed">Classroom and laboratory floor requirement (&gt; 0 Sqm)</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-[#1F3954] mb-1">
                        Building Construction Age (Years)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={buildingAgeYears}
                        onChange={(e) => {
                          setBuildingAgeYears(e.target.value);
                          if (fieldErrors.buildingAgeYears) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.buildingAgeYears;
                              return next;
                            });
                          }
                        }}
                        placeholder="e.g. 12"
                        className={`w-full px-3 py-2 rounded-xl border bg-white font-mono focus:outline-none focus:ring-2 ${
                          fieldErrors.buildingAgeYears
                            ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500 text-red-900'
                            : 'border-[#D0D5DD] focus:ring-[#37C2CC]/30 focus:border-[#37C2CC] text-[#111827]'
                        }`}
                      />
                      {fieldErrors.buildingAgeYears ? (
                        <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fieldErrors.buildingAgeYears}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#536174] mt-1 leading-relaxed">Buildings &gt; 30 years require Structural Stability Certificate</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-[#1F3954] mb-1">
                        Campus Land Title / Ownership Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={landOwnershipType}
                        onChange={(e) => {
                          setLandOwnershipType(e.target.value);
                          if (fieldErrors.landOwnershipType) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.landOwnershipType;
                              return next;
                            });
                          }
                        }}
                        className={`w-full px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 ${
                          fieldErrors.landOwnershipType
                            ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500 text-red-900'
                            : 'border-[#D0D5DD] focus:ring-[#37C2CC]/30 focus:border-[#37C2CC] text-[#111827]'
                        }`}
                      >
                        <option value="OWNED">Freehold Owned (Sole Proprietorship / Trust)</option>
                        <option value="REGISTERED_LEASE">30-Year Registered Government / Private Lease</option>
                        <option value="GOVERNMENT_ALLOTMENT">State / Central Government Allotment</option>
                      </select>
                      {fieldErrors.landOwnershipType && (
                        <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fieldErrors.landOwnershipType}</span>
                        </p>
                      )}
                      <p className="text-[11px] text-[#667085] mt-1">Clause 6.17(a) Title Deed Verification</p>
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-[#1F3954] mb-1">
                        Existing Statutory Certificate Number
                      </label>
                      <input
                        type="text"
                        value={certificateNumber}
                        onChange={(e) => setCertificateNumber(e.target.value)}
                        placeholder="e.g. CERT-2024-AICTE-091"
                        className="w-full px-3 py-2 rounded-xl border border-[#D0D5DD] bg-white text-[#111827] font-mono focus:outline-none focus:ring-2 focus:ring-[#37C2CC]/30 focus:border-[#37C2CC]"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-[#1F3954] mb-1">
                        Certificate Expiry Date (YYYY-MM-DD)
                      </label>
                      <input
                        type="date"
                        value={certificateExpiryDate}
                        onChange={(e) => {
                          setCertificateExpiryDate(e.target.value);
                          if (fieldErrors.certificateExpiryDate) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.certificateExpiryDate;
                              return next;
                            });
                          }
                        }}
                        className={`w-full px-3 py-2 rounded-xl border bg-white font-mono focus:outline-none focus:ring-2 ${
                          fieldErrors.certificateExpiryDate
                            ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500 text-red-900'
                            : 'border-[#D0D5DD] focus:ring-[#37C2CC]/30 focus:border-[#37C2CC] text-[#111827]'
                        }`}
                      />
                      {fieldErrors.certificateExpiryDate ? (
                        <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fieldErrors.certificateExpiryDate}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#667085] mt-1">Must be valid through academic approval period</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Document Checklist & Uploads ──────────────── */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-[#111827]">Step 3: Statutory Document Checklist</h3>
                      <p className="text-xs text-[#667085]">
                        Upload supporting documents required for category <strong className="text-[#111827]">{app?.category_code}</strong>.
                      </p>
                    </div>

                    {checklist && (
                      <div className="flex items-center gap-2 bg-[#F9FAFB] px-3 py-1.5 rounded-xl border border-[#E4E7EC] text-xs shrink-0">
                        <span className="text-[#667085]">Completeness:</span>
                        <strong
                          className={`font-mono font-bold ${
                            isDossierComplete ? 'text-[#15803D]' : 'text-[#D97706]'
                          }`}
                        >
                          {checklist.items.filter((i) => i.is_present).length} / {checklist.total_required} Required
                        </strong>
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                      <button
                        onClick={() => setUploadError(null)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Checklist Items Container */}
                  <div className="space-y-3">
                    {!checklist || checklist.items.length === 0 ? (
                      <div className="p-8 text-center text-[#667085] text-xs">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#37C2CC] mb-2" />
                        <span>Evaluating statutory conditional checklist...</span>
                      </div>
                    ) : (
                      checklist.items.map((item) => (
                        <ChecklistItemCard
                          key={item.document_code}
                          item={item}
                          isUploading={uploadingDocCode === item.document_code}
                          uploadProgress={uploadingDocCode === item.document_code ? uploadProgress : 0}
                          onUpload={(file) => handleFileUpload(item.document_code, file)}
                          isLocked={app?.lifecycle_status !== 'DRAFT'}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 4: Review & Final Submission ─────────────────── */}
              {currentStep === 4 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-[13px] font-semibold tracking-tight text-[#0F2540] leading-snug">Step 4: Dossier Review &amp; Final Submission</h3>
                    <p className="text-[12px] text-[#536174] leading-relaxed">
                      Verify all declared metrics and supporting documentation before formal transmission to AICTE.
                    </p>
                  </div>

                  {/* Completeness Warning / Success Box */}
                  {isDossierComplete ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-bold text-sm">All Mandatory Requirements Satisfied</div>
                        <p className="text-emerald-700 leading-relaxed">
                          All mandatory declared metrics and all {checklist?.total_required || 0} statutory documents have been completed and attached.
                          You may now formally submit the application for AICTE scrutiny.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="font-bold text-sm">Submission Blocked: Incomplete Mandatory Information</div>
                        <p className="text-amber-700 leading-relaxed">
                          AICTE regulations require all mandatory declared parameters and statutory certificates before formal submission.
                          Please complete the following unsatisfied requirements:
                        </p>

                        {/* Missing Declared Parameters */}
                        {missingDeclaredFields.length > 0 && (
                          <div className="pt-1">
                            <span className="font-bold text-amber-900 block mb-1">
                              Missing / Invalid Declared Metrics ({missingDeclaredFields.length}):
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {missingDeclaredFields.map((f) => (
                                <button
                                  key={f.field}
                                  onClick={() => handleStepNavigation(f.step)}
                                  className="px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-[11px] transition-colors cursor-pointer border border-amber-300 flex items-center gap-1"
                                >
                                  <span>✎ Complete {f.label}</span>
                                  <span className="text-[10px] opacity-70">(Step {f.step})</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Missing Mandatory Documents */}
                        {missingMandatoryItems.length > 0 && (
                          <div className="pt-1">
                            <span className="font-bold text-amber-900 block mb-1">
                              Missing Mandatory Documents ({missingMandatoryItems.length}):
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {missingMandatoryItems.map((m) => (
                                <button
                                  key={m.document_code}
                                  onClick={() => handleStepNavigation(3)}
                                  className="px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-[11px] transition-colors cursor-pointer border border-amber-300"
                                >
                                  + Upload {m.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary Card */}
                  <div className="p-5 rounded-xl bg-[#F9FAFB] border border-[#E4E7EC] space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-[#E4E7EC] pb-3">
                      <span className="font-bold text-[#111827]">Application Portfolio Summary</span>
                      <span className="font-mono text-[11px] text-[#0E7490] bg-[#E3FDFF] px-2 py-0.5 rounded font-bold">
                        {app?.application_reference}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[#667085]">Category:</span>
                        <div className="font-semibold text-[#111827] mt-0.5">{app?.category_code}</div>
                      </div>
                      <div>
                        <span className="text-[#667085]">Academic Year:</span>
                        <div className="font-mono font-semibold text-[#111827] mt-0.5">
                          {app?.academic_year || academicYear}
                        </div>
                      </div>
                      <div>
                        <span className="text-[#667085]">Head of Institute:</span>
                        <div className="font-semibold text-[#111827] mt-0.5">{principalName || 'Not declared'}</div>
                      </div>
                      <div>
                        <span className="text-[#667085]">Approved Intake:</span>
                        <div className="font-mono font-semibold text-[#111827] mt-0.5">
                          {approvedIntake ? `${approvedIntake} Students` : 'Not declared'}
                        </div>
                      </div>
                      <div>
                        <span className="text-[#667085]">Campus Land:</span>
                        <div className="font-mono font-semibold text-[#111827] mt-0.5">
                          {landAreaAcres ? `${landAreaAcres} Acres (${landOwnershipType})` : 'Not declared'}
                        </div>
                      </div>
                      <div>
                        <span className="text-[#667085]">Built-up Area:</span>
                        <div className="font-mono font-semibold text-[#111827] mt-0.5">
                          {builtUpAreaSqm ? `${builtUpAreaSqm} Sqm` : 'Not declared'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statutory Declaration Checkbox */}
                  <div className="p-4 rounded-xl bg-[#E3FDFF]/60 border border-[#A5F3FC] text-xs space-y-2">
                    <div className="flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-[#0E7490] shrink-0 mt-0.5" />
                      <div className="text-[#344054] leading-relaxed">
                        <strong>Statutory Undertaking:</strong> By submitting, the institution certifies that all declared
                        information and attached certificates are authentic, valid, and compliant with AICTE Approval Process
                        Handbook 2024-27 norms. Once submitted, the application dossier is permanently locked for scrutiny.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Wizard Footer Actions ───────────────────────────────────── */}
        {!isSubmittedSuccess && (
          <div className="px-6 py-4 bg-[#FAF5F0] border-t border-[#E5DACF] flex items-center justify-between shrink-0">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep((s) => (s - 1) as any)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#D0D5DD] bg-white text-[#344054] text-xs font-semibold hover:bg-[#F2F4F7] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {/* Save Draft Action for Step 2 & 3 */}
              {app && app.lifecycle_status === 'DRAFT' && currentStep > 1 && currentStep < 4 && (
                <button
                  type="button"
                  onClick={() => handleStep2SaveAndProceed(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-full border border-[#E5DACF] bg-[#FAF5F0] text-[#202936] text-xs font-semibold hover:bg-[#EEE5DC] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
              )}

              {/* Step 1 Next */}
              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={handleStep1Proceed}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#33CC7A] text-[#202936] text-xs font-bold hover:bg-[#2EB86E] transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <span>{saving ? 'Creating Draft...' : 'Proceed to Declared Metrics'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {/* Step 2 Next */}
              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={() => handleStep2SaveAndProceed(true)}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#33CC7A] text-[#202936] text-xs font-bold hover:bg-[#2EB86E] transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <span>{saving ? 'Saving...' : 'Proceed to Document Checklist'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {/* Step 3 Next */}
              {currentStep === 3 && (
                <button
                  type="button"
                  onClick={() => handleStepNavigation(4)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#33CC7A] text-[#202936] text-xs font-bold hover:bg-[#2EB86E] transition-all cursor-pointer shadow-xs"
                >
                  <span>Proceed to Final Review</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {/* Step 4 Submit */}
              {currentStep === 4 && (
                <button
                  type="button"
                  onClick={handleSubmitApplication}
                  disabled={submitting || !isDossierComplete || app?.lifecycle_status !== 'DRAFT'}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#33CC7A] text-[#202936] text-xs font-bold shadow-md hover:bg-[#2EB86E] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Transmitting Dossier to AICTE...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit Application to AICTE</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Checklist Item Component ──────────────────────────────────────── */
function ChecklistItemCard({
  item,
  isUploading,
  uploadProgress,
  onUpload,
  isLocked,
}: {
  item: ChecklistItemData;
  isUploading: boolean;
  uploadProgress: number;
  onUpload: (file: File) => void;
  isLocked: boolean;
}) {
  const isSatisfied = item.is_present || item.status === 'REQUIRED_UPLOADED';
  const isMandatory = item.mandatory_or_conditional === 'MANDATORY';

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        isSatisfied
          ? 'bg-white border-emerald-200 shadow-2xs'
          : isMandatory
          ? 'bg-white border-amber-200 shadow-2xs'
          : 'bg-[#F9FAFB] border-[#E4E7EC]'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-[#111827] text-xs">{item.title}</h4>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isMandatory ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {isMandatory ? 'MANDATORY' : 'CONDITIONAL'}
            </span>
            <span className="font-mono text-[10px] text-[#667085] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
              {item.source_clause || item.document_code}
            </span>
          </div>

          <p className="text-[11px] text-[#667085] leading-relaxed">
            {item.condition_rationale}
          </p>

          {isSatisfied && item.uploaded_document_name && (
            <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-medium pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Attached: <strong className="font-mono">{item.uploaded_document_name}</strong></span>
              <span className="text-emerald-500">• SHA-256 Verified</span>
            </div>
          )}
        </div>

        {/* Upload Dropzone / Button */}
        <div className="shrink-0 flex items-center gap-2">
          {isSatisfied ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Satisfied</span>
            </span>
          ) : isLocked ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 font-medium text-xs border border-gray-200">
              <Lock className="w-3.5 h-3.5" />
              <span>Locked</span>
            </span>
          ) : (
            <label className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#33CC7A] hover:bg-[#2EB86E] text-[#202936] text-xs font-bold transition-all cursor-pointer shadow-xs">
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? `${uploadProgress}%` : 'Upload File'}</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onUpload(file);
                    e.target.value = '';
                  }
                }}
                className="sr-only"
              />
            </label>
          )}
        </div>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="mt-3 w-full bg-[#EEE5DC] rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-[#33CC7A] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}
