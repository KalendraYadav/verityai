import React, { useState, useEffect } from 'react';
import { createApplication, type Institution, type ApplicationCategory } from '../api/client';
import { Plus, AlertCircle, Loader2, Sparkles, Building2 } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Building2 className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                New Institutional Application Dossier
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Initiate a preliminary draft application record for statutory review.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="size-4" />
              <AlertTitle className="text-xs font-semibold">Creation Error</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">
              Applicant Institution <span className="text-destructive">*</span>
            </label>
            <select
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              required
              className="w-full text-xs rounded-md border border-input px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all"
            >
              <option value="" disabled>Select Institution</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.institution_name} [{inst.institution_identifier || inst.id.slice(0, 8)}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground">
                Category <span className="text-destructive">*</span>
              </label>
              <select
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value)}
                required
                className="w-full text-xs rounded-md border border-input px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all"
              >
                {categories.map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground">
                Academic Year <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2026-27"
                required
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-2.5">
              <Sparkles className="size-3.5" />
              <span>Declared Preliminary Fields</span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Accreditation Certificate No.
                  </label>
                  <Input
                    type="text"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    placeholder="CERT-SYN-000123"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Certificate Expiry Date
                  </label>
                  <Input
                    type="date"
                    value={certificateExpiryDate}
                    onChange={(e) => setCertificateExpiryDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">Format: YYYY-MM-DD</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Primary Programme
                  </label>
                  <Input
                    type="text"
                    value={programmeName}
                    onChange={(e) => setProgrammeName(e.target.value)}
                    placeholder="Computer Science and Engineering"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Approved Intake
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={approvedIntake}
                    onChange={(e) => setApprovedIntake(e.target.value)}
                    placeholder="120"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="text-xs font-semibold gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  <span>Create Draft Application</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
