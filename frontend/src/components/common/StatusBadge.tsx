import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  HelpCircle,
  Database,
} from 'lucide-react';

export type StatusCategory =
  | 'lifecycle'
  | 'pipeline'
  | 'finding'
  | 'verification'
  | 'compliance';

interface StatusBadgeProps {
  status: string;
  category?: StatusCategory;
  showIcon?: boolean;
  className?: string;
  isSimulated?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  category = 'lifecycle',
  showIcon = true,
  className = '',
  isSimulated = false,
}) => {
  const normStatus = (status || '').toUpperCase().trim();

  // 1. Simulated verification badge
  if (isSimulated || normStatus === 'SIMULATED') {
    return (
      <Badge
        variant="outline"
        className={`bg-[#1F3954]/10 text-[#1F3954] border-[#1F3954]/25 rounded-full gap-1.5 font-medium px-2.5 py-0.5 text-xs ${className}`}
      >
        {showIcon && <Database className="size-3 text-[#1F3954] shrink-0" />}
        <span>Simulated Sandbox</span>
      </Badge>
    );
  }

  // 2. Lifecycle Statuses
  if (category === 'lifecycle') {
    switch (normStatus) {
      case 'APPROVED':
      case 'RECOMMENDED_APPROVAL':
        return (
          <Badge
            variant="outline"
            className={`bg-emerald-50 text-[#0D7A48] border-emerald-200/80 rounded-full gap-1 font-semibold px-2.5 py-0.5 text-xs font-sans ${className}`}
          >
            {showIcon && <CheckCircle2 className="size-3 text-[#0D7A48] shrink-0" />}
            <span>Approved</span>
          </Badge>
        );
      case 'REJECTED':
      case 'RECOMMENDED_REJECTION':
        return (
          <Badge
            variant="outline"
            className={`bg-rose-50 text-[#B91C1C] border-rose-200/80 rounded-full gap-1 font-semibold px-2.5 py-0.5 text-xs font-sans ${className}`}
          >
            {showIcon && <XCircle className="size-3 text-[#B91C1C] shrink-0" />}
            <span>Rejected</span>
          </Badge>
        );
      case 'UNDER_SCRUTINY':
      case 'UNDER_REVIEW':
      case 'IN_PROGRESS':
        return (
          <Badge
            variant="outline"
            className={`bg-blue-50 text-[#1F3954] border-blue-200/80 rounded-full gap-1 font-semibold px-2.5 py-0.5 text-xs font-sans ${className}`}
          >
            {showIcon && <Clock className="size-3 text-[#1F3954] shrink-0 animate-pulse" />}
            <span>Under Scrutiny</span>
          </Badge>
        );
      case 'SUBMITTED':
        return (
          <Badge
            variant="outline"
            className={`bg-[#1F3954]/10 text-[#1F3954] border-[#1F3954]/25 rounded-full gap-1 font-semibold px-2.5 py-0.5 text-xs font-sans ${className}`}
          >
            {showIcon && <FileText className="size-3 text-[#1F3954] shrink-0" />}
            <span>Submitted</span>
          </Badge>
        );
      case 'DRAFT':
      default:
        return (
          <Badge
            variant="outline"
            className={`bg-[#FAF5F0] text-[#536174] border-[#E5DDD5] rounded-full gap-1 font-medium px-2.5 py-0.5 text-xs font-sans ${className}`}
          >
            {showIcon && <Clock className="size-3 text-[#718096] shrink-0" />}
            <span>Draft</span>
          </Badge>
        );
    }
  }

  // 3. Pipeline / Processing Statuses
  if (category === 'pipeline') {
    switch (normStatus) {
      case 'COMPLETED':
      case 'SUCCESS':
        return (
          <Badge
            variant="outline"
            className={`bg-emerald-50 text-[#0D7A48] border-emerald-200/80 rounded-full gap-1 font-semibold px-2.5 py-0.5 text-xs font-sans ${className}`}
          >
            {showIcon && <CheckCircle2 className="size-3 text-[#0D7A48] shrink-0" />}
            <span>Completed</span>
          </Badge>
        );
      case 'RUNNING':
      case 'PROCESSING':
        return (
          <Badge
            variant="outline"
            className={`bg-blue-50 text-[#1F3954] border-blue-200/80 rounded-full gap-1 font-semibold px-2.5 py-0.5 text-xs font-sans ${className}`}
          >
            {showIcon && <Clock className="size-3 text-[#1F3954] shrink-0 animate-spin" />}
            <span>Processing</span>
          </Badge>
        );
      case 'FAILED':
      case 'ERROR':
        return (
          <Badge
            variant="outline"
            className={`bg-rose-50 text-[#B91C1C] border-rose-200/80 rounded-full gap-1 font-semibold px-2.5 py-0.5 text-xs font-sans ${className}`}
          >
            {showIcon && <XCircle className="size-3 text-[#B91C1C] shrink-0" />}
            <span>Failed</span>
          </Badge>
        );
      case 'REQUIRES_REVIEW':
      case 'NEEDS_REVIEW':
        return (
          <Badge
            variant="outline"
            className={`bg-amber-50 text-[#B45309] border-amber-200/80 rounded-full gap-1 font-semibold px-2.5 py-0.5 text-xs font-sans ${className}`}
          >
            {showIcon && <AlertTriangle className="size-3 text-[#B45309] shrink-0" />}
            <span>Needs Review</span>
          </Badge>
        );
      case 'PENDING':
      default:
        return (
          <Badge
            variant="outline"
            className={`bg-[#FAF5F0] text-[#536174] border-[#E5DDD5] rounded-full gap-1 font-medium px-2.5 py-0.5 text-xs font-sans ${className}`}
          >
            {showIcon && <Clock className="size-3 text-[#718096] shrink-0" />}
            <span>Pending</span>
          </Badge>
        );
    }
  }

  // 4. Verification / Finding Statuses
  if (category === 'finding' || category === 'compliance') {
    switch (normStatus) {
      case 'PASS':
      case 'COMPLIANT':
      case 'VERIFIED':
        return (
          <Badge
            variant="outline"
            className={`bg-emerald-50 text-[#0D7A48] border-emerald-200/80 rounded-full gap-1 font-semibold px-2.5 py-0.5 text-xs font-sans ${className}`}
          >
            {showIcon && <CheckCircle2 className="size-3 text-[#0D7A48] shrink-0" />}
            <span>Passed</span>
          </Badge>
        );
      case 'FAIL':
      case 'NON_COMPLIANT':
      case 'DISCREPANCY':
        return (
          <Badge
            variant="outline"
            className={`bg-rose-50 text-[#B91C1C] border-rose-200/80 rounded-full gap-1 font-semibold px-2.5 py-0.5 text-xs font-sans ${className}`}
          >
            {showIcon && <XCircle className="size-3 text-[#B91C1C] shrink-0" />}
            <span>Non-Compliant</span>
          </Badge>
        );
      case 'NEEDS_REVIEW':
      case 'ANOMALY':
      case 'FLAGGED':
        return (
          <Badge
            variant="outline"
            className={`bg-amber-50 text-[#B45309] border-amber-200/80 rounded-full gap-1 font-semibold px-2.5 py-0.5 text-xs font-sans ${className}`}
          >
            {showIcon && <AlertTriangle className="size-3 text-[#B45309] shrink-0" />}
            <span>Needs Review</span>
          </Badge>
        );
      case 'UNABLE_TO_EVALUATE':
      case 'INCONCLUSIVE':
      default:
        return (
          <Badge
            variant="outline"
            className={`bg-[#FAF5F0] text-[#536174] border-[#E5DDD5] rounded-full gap-1 font-medium px-2.5 py-0.5 text-xs font-sans ${className}`}
          >
            {showIcon && <HelpCircle className="size-3 text-[#718096] shrink-0" />}
            <span>Inconclusive</span>
          </Badge>
        );
    }
  }

  // Fallback
  return (
    <Badge
      variant="outline"
      className={`bg-[#FAF5F0] text-[#202936] border-[#E5DDD5] rounded-full gap-1 font-medium px-2.5 py-0.5 text-xs ${className}`}
    >
      <span>{status}</span>
    </Badge>
  );
};
