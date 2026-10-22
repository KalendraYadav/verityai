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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready for Scrutiny
          </span>
        );
      case 'DOCUMENTS_PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF0EF] text-[#B42318] border border-[#FECDCA]">
            <FileWarning className="w-3.5 h-3.5" />
            Documents Pending
          </span>
        );
      case 'EXTRACTION_IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            Text Extracting
          </span>
        );
      case 'VALIDATION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]">
            <AlertTriangle className="w-3.5 h-3.5" />
            Validation Needed
          </span>
        );
      case 'ACTION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF4ED] text-[#C4320A] border border-[#FDCEB9]">
            <AlertTriangle className="w-3.5 h-3.5" />
            Action Required
          </span>
        );
      case 'SCRUTINY_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F4F3FF] text-[#5925DC] border border-[#D9D6FE]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Scrutiny Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF9FC] text-[#5F6485] border border-[#E9E6F2]">
            {state}
          </span>
        );
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#171B45] flex items-center gap-2.5">
            <ClipboardCheck className="w-6 h-6 text-[#7450D8]" />
            Regulatory Scrutiny Queue
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6485] mt-0.5">
            Prioritized workload queue of institutional applications awaiting statutory scrutiny, rule verification, and finding adjudication.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 rounded-xl border border-[#DCD0F7] text-[#5F6485] hover:text-[#171B45] bg-white transition-all cursor-pointer shadow-2xs"
          title="Refresh scrutiny queue"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#7450D8]' : ''}`} />
        </button>
      </div>

      {/* 2. Filters & Queue Scope */}
      <div className="bg-white p-4 rounded-2xl border border-[#E9E6F2] shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#8589A6] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search queue by application reference, institution, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#FAF8FF] border border-[#E9E6F2] text-[#171B45] focus:outline-hidden focus:ring-2 focus:ring-[#7450D8] transition-all placeholder:text-[#8589A6]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {[
            { key: 'ALL', label: 'All Active' },
            { key: 'READY_FOR_SCRUTINY', label: 'Ready for Review' },
            { key: 'DOCUMENTS_PENDING', label: 'Docs Pending' },
            { key: 'VALIDATION_REQUIRED', label: 'Validation Needed' },
            { key: 'ACTION_REQUIRED', label: 'Action Required' },
          ].map((pill) => (
            <button
              key={pill.key}
              onClick={() => setReadinessFilter(pill.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                readinessFilter === pill.key
                  ? 'bg-[#7450D8] text-white shadow-xs'
                  : 'bg-[#FAF8FF] text-[#5F6485] hover:text-[#171B45] border border-[#E9E6F2]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Scrutiny Queue List */}
      <div className="bg-white rounded-3xl border border-[#E9E6F2] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#7450D8] mx-auto" />
            <p className="text-xs text-[#5F6485]">Evaluating queue readiness from persistent records...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF8FF] border border-[#DCD0F7] flex items-center justify-center text-[#7450D8] mx-auto">
              <ClipboardCheck className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-[#171B45]">No applications matching this scrutiny filter</h3>
            <p className="text-xs text-[#5F6485] max-w-sm mx-auto">
              Applications enter this queue upon submission and are categorized according to multi-dimensional readiness.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E9E6F2]">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectApplication(item.id)}
                className="p-5 sm:p-6 hover:bg-[#FAF8FF]/60 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-sm sm:text-base font-extrabold text-[#171B45] group-hover:text-[#7450D8] transition-colors">
                      {item.application_reference}
                    </span>
                    {getReadinessBadge(item.readiness_state)}
                    <span className="font-mono text-[11px] font-semibold text-[#7450D8] bg-[#F3EEFC] px-2 py-0.5 rounded">
                      {item.category_code}
                    </span>
                    <span className="text-[11px] font-medium text-[#8589A6] bg-[#FAF9FC] px-2 py-0.5 rounded border border-[#E9E6F2]">
                      State: {item.lifecycle_status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#5F6485] flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-[#171B45]">
                      <Building2 className="w-3.5 h-3.5 text-[#8589A6]" />
                      {item.institution_name}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#8589A6]" />
                      {item.academic_year || '2026-27'}
                    </span>
                    <span>•</span>
                    <span>Registered {new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Readiness Metrics & Direct Action */}
                <div className="flex items-center gap-4 self-start md:self-center">
                  <div className="text-right space-y-0.5">
                    <div className="text-[11px] font-semibold text-[#171B45] flex items-center justify-end gap-2">
                      {item.validation_failure_count > 0 ? (
                        <span className="text-[#F04438] font-bold">
                          {item.validation_failure_count} Rule Failure{item.validation_failure_count === 1 ? '' : 's'}
                        </span>
                      ) : (
                        <span className="text-[#027A48] font-medium">Rules Satisfied</span>
                      )}
                      <span>•</span>
                      {item.open_findings_count > 0 ? (
                        <span className="text-[#F04438] font-bold">
                          {item.open_findings_count} Open Finding{item.open_findings_count === 1 ? '' : 's'}
                        </span>
                      ) : (
                        <span className="text-[#027A48] font-medium">0 Open Findings</span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#8589A6]">
                      {item.blockers_count > 0
                        ? `${item.blockers_count} blocker(s) identified`
                        : 'No pending workflow blockers'}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectApplication(item.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F04438] hover:bg-[#E34234] text-white text-xs font-semibold transition-all shadow-2xs shrink-0 cursor-pointer"
                  >
                    <span>Examine Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
