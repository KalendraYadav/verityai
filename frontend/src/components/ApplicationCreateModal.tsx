import { useState, useEffect } from 'react';
import { createApplication, type Institution, type ApplicationCategory } from '../api/client';
import { X, Plus, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  institutions: Institution[];
  categories: ApplicationCategory[];
}

export function ApplicationCreateModal({
  isOpen,
  onClose,
  onSuccess,
  institutions,
  categories,
}: Props) {
  const [institutionId, setInstitutionId] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [certificateExpiryDate, setCertificateExpiryDate] = useState('');
  const [programmeName, setProgrammeName] = useState('');
  const [approvedIntake, setApprovedIntake] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (institutions.length > 0 && !institutionId) {
        setInstitutionId(institutions[0].id);
      }
      if (categories.length > 0 && !categoryCode) {
        setCategoryCode(categories[0].code);
      }
      setError(null);
    }
  }, [isOpen, institutions, categories]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!institutionId) {
      setError('Please select an applicant institution.');
      return;
    }
    if (!categoryCode) {
      setError('Please select an application category.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedInst = institutions.find((i) => i.id === institutionId);
      const declaredData: Record<string, any> = {
        institution_name: selectedInst?.institution_name || '',
        institution_identifier: selectedInst?.institution_identifier || '',
      };

      if (certificateNumber.trim()) declaredData.certificate_number = certificateNumber.trim();
      if (certificateExpiryDate.trim()) declaredData.certificate_expiry_date = certificateExpiryDate.trim();
      if (programmeName.trim()) declaredData.programme_name = programmeName.trim();
      if (approvedIntake.trim()) declaredData.approved_intake = Number(approvedIntake);

      await createApplication({
        institution_id: institutionId,
        category_code: categoryCode,
        academic_year: academicYear,
        declared_data: declaredData,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create application');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-[#D9DFE7] max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-50 border-b border-[#D9DFE7] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0B2545]">New Institutional Application</h3>
            <p className="text-xs text-slate-500">Initiate a preliminary draft application record</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Creation Error: </span>
                {error}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Applicant Institution <span className="text-red-500">*</span>
            </label>
            <select
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              required
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0F766E] focus:border-transparent"
            >
              <option value="" disabled>Select Institution</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.institution_name} ({inst.institution_identifier || inst.id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value)}
                required
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0F766E] focus:border-transparent"
              >
                {categories.map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2026-27"
                required
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E] focus:border-transparent"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
              Declared Preliminary Fields (Optional in Draft)
            </h4>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Accreditation Certificate No.
                  </label>
                  <input
                    type="text"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    placeholder="CERT-SYN-000123"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Certificate Expiry Date
                  </label>
                  <input
                    type="date"
                    value={certificateExpiryDate}
                    onChange={(e) => setCertificateExpiryDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
                  />
                  <span className="text-[10px] text-slate-400">Standard YYYY-MM-DD</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Primary Programme
                  </label>
                  <input
                    type="text"
                    value={programmeName}
                    onChange={(e) => setProgrammeName(e.target.value)}
                    placeholder="Computer Science and Engineering"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Approved Intake
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={approvedIntake}
                    onChange={(e) => setApprovedIntake(e.target.value)}
                    placeholder="120"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#0B5F59] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Create Draft Application
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
