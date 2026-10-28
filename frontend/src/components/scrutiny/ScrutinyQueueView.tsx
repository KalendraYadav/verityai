import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Search,
  RefreshCw,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileWarning,
} from 'lucide-react';
import {
  fetchScrutinyQueue,
  type ScrutinyQueueItemData,
} from '../../api/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';

interface Props {
  onSelectApplication: (id: string) => void;
}

export const ScrutinyQueueView: React.FC<Props> = ({ onSelectApplication }) => {
  const [queueItems, setQueueItems] = useState<ScrutinyQueueItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<string>('ALL');

  async function loadQueue() {
    try {
      const res = await fetchScrutinyQueue({
        readinessState: readinessFilter !== 'ALL' ? readinessFilter : undefined,
      });
      setQueueItems(res.data);
    } catch (e) {
      console.error('Failed to load scrutiny queue', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, [readinessFilter]);

  function handleRefresh() {
    setRefreshing(true);
    loadQueue();
  }

  const filteredItems = queueItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.application_reference.toLowerCase().includes(q) ||
      item.institution_name.toLowerCase().includes(q) ||
      item.category_code.toLowerCase().includes(q)
    );
  });

  const getReadinessBadge = (state: string) => {
    switch (state) {
      case 'READY_FOR_SCRUTINY':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-medium text-[11px]">
            <CheckCircle2 className="size-3 text-emerald-600" />
            <span>Ready for Scrutiny</span>
          </Badge>
        );
      case 'DOCUMENTS_PENDING':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1 font-medium text-[11px]">
            <FileWarning className="size-3 text-red-600" />
            <span>Documents Pending</span>
          </Badge>
        );
      case 'EXTRACTION_IN_PROGRESS':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 font-medium text-[11px] animate-pulse">
            <Clock className="size-3 text-blue-600" />
            <span>Text Extracting</span>
          </Badge>
        );
      case 'VALIDATION_REQUIRED':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 font-medium text-[11px]">
            <AlertTriangle className="size-3 text-amber-600" />
            <span>Validation Needed</span>
          </Badge>
        );
      case 'ACTION_REQUIRED':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 gap-1 font-medium text-[11px]">
            <AlertTriangle className="size-3 text-amber-700" />
            <span>Action Required</span>
          </Badge>
        );
      case 'SCRUTINY_COMPLETED':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1 font-medium text-[11px]">
            <ShieldCheck className="size-3 text-purple-600" />
            <span>Scrutiny Completed</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px]">
            {state}
          </Badge>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-[30px] font-display font-bold tracking-tight text-[#202936] flex items-center gap-2.5">
              <ClipboardCheck className="size-6 text-[#1F3954] shrink-0" />
              Regulatory Scrutiny Queue
            </h1>
            <span className="stat-number-display text-xs font-bold bg-[#EBF7F0] text-[#0D7A48] border border-[#0D7A48]/20 px-3 py-0.5 rounded-full">
              {filteredItems.length} in Queue
            </span>
          </div>
          <p className="text-sm text-[#536174] mt-1 font-sans font-normal leading-relaxed">
            Prioritized workload queue of institutional applications awaiting statutory scrutiny, rule verification, and finding adjudication.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-9 px-4 rounded-full border border-[#E5DACF] bg-white hover:bg-[#FAF5F0] text-[#536174] hover:text-[#202936] inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          title="Refresh scrutiny queue"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-[#33CC7A]' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* 2. Filters & Queue Scope */}
      <div className="bg-white rounded-2xl border border-[#E5DACF] p-3 sm:p-4 shadow-[0_4px_24px_-4px_rgba(32,41,54,0.04)] flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="size-3.5 text-[#536174] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="scrutiny-queue-search-input"
            name="queue_search"
            aria-label="Search queue by reference, institution, or category"
            type="text"
            placeholder="Search queue by reference, institution, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 text-xs pl-9 pr-4 rounded-full border border-[#E5DACF] bg-[#FAF5F0]/50 focus:bg-white focus:outline-hidden focus:border-[#1F3954] text-[#202936] font-sans"
          />
        </div>

        <div className="flex items-center gap-1 w-full md:w-auto overflow-x-auto bg-[#EEE5DC] p-1 rounded-full border border-[#E5DACF]">
          {[
            { key: 'ALL', label: 'All Active' },
            { key: 'READY_FOR_SCRUTINY', label: 'Ready for Review' },
            { key: 'DOCUMENTS_PENDING', label: 'Docs Pending' },
            { key: 'VALIDATION_REQUIRED', label: 'Validation Needed' },
            { key: 'ACTION_REQUIRED', label: 'Action Required' },
          ].map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setReadinessFilter(pill.key)}
              className={`h-7 text-xs px-3 rounded-full font-medium transition-all cursor-pointer whitespace-nowrap font-sans ${
                readinessFilter === pill.key
                  ? 'bg-[#1F3954] text-[#FAF5F0] shadow-sm'
                  : 'text-[#536174] hover:text-[#202936]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Scrutiny Queue List */}
      <div className="bg-white rounded-2xl border border-[#E5DACF] shadow-[0_4px_24px_-4px_rgba(27,20,17,0.04)] overflow-hidden">
        <div>
          {loading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ClipboardCheck}
                title="No applications matching this scrutiny filter"
                description="Applications enter this prioritized queue upon submission and are categorized according to multi-dimensional readiness."
              />
            </div>
          ) : (
            <div className="divide-y divide-[#E5DACF]">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectApplication(item.id)}
                  className="p-4 sm:p-5 hover:bg-[#FAF5F0]/60 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[13px] font-medium text-[#202936] group-hover:text-[#1F3954] transition-colors">
                        {item.application_reference}
                      </span>
                      {getReadinessBadge(item.readiness_state)}
                      <span className="font-sans text-xs font-medium bg-[#EEE5DC] text-[#202936] border border-[#E5DACF] px-2.5 py-0.5 rounded-full">
                        {item.category_code.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-sans text-[#536174] bg-[#FAF5F0] border border-[#E5DACF] px-2 py-0.5 rounded-full font-normal">
                        Lifecycle: {item.lifecycle_status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-[#536174] flex-wrap font-sans">
                      <span className="flex items-center gap-1 font-medium text-sm text-[#202936]">
                        <Building2 className="size-3.5 text-[#536174] shrink-0" />
                        {item.institution_name}
                      </span>
                      {item.institution_identifier && (
                        <span className="font-mono text-xs text-[#536174] font-normal">
                          [{item.institution_identifier}]
                        </span>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1 text-xs font-normal">
                        <Calendar className="size-3 text-[#536174] shrink-0" />
                        {item.academic_year || '2026-27'}
                      </span>
                      <span>•</span>
                      <span className="text-xs font-normal">
                        Registered {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Readiness Metrics & Direct Action */}
                  <div className="flex items-center gap-4 self-start md:self-center shrink-0">
                    <div className="text-right space-y-0.5 font-sans">
                      <div className="text-xs font-medium text-[#202936] flex items-center justify-end gap-1.5">
                        {item.validation_failure_count > 0 ? (
                          <span className="text-rose-700 font-medium">
                            {item.validation_failure_count} Rule Failure{item.validation_failure_count === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">Rules Satisfied</span>
                        )}
                        <span>•</span>
                        {item.open_findings_count > 0 ? (
                          <span className="text-rose-700 font-medium">
                            {item.open_findings_count} Open Finding{item.open_findings_count === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">0 Open Findings</span>
                        )}
                      </div>
                      <div className="text-xs text-[#536174] font-normal">
                        {item.blockers_count > 0
                          ? `${item.blockers_count} blocker(s) identified`
                          : 'No pending workflow blockers'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectApplication(item.id);
                      }}
                      className="main-btn btn-hover !py-1.5 !px-3.5 !text-xs font-medium gap-1 cursor-pointer shadow-xs text-white font-sans"
                    >
                      <span>Examine</span>
                      <ArrowRight className="size-3 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
