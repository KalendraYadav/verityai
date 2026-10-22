import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Search,
  RefreshCw,
  Building2,
  Calendar,
  FileText,
  ArrowRight,
} from 'lucide-react';
import {
  fetchApplications,
  fetchAllDocuments,
  type ApplicationListItem,
  type DocumentListItem,
} from '../../api/client';

interface Props {
  onSelectApplication: (id: string) => void;
}

export const ScrutinyQueueView: React.FC<Props> = ({ onSelectApplication }) => {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL_ACTIVE' | 'SUBMITTED' | 'UNDER_REVIEW' | 'FLAGGED'>('ALL_ACTIVE');

  async function loadQueue() {
    try {
      const [appsRes, docsRes] = await Promise.all([
        fetchApplications({ page_size: 50 }),
        fetchAllDocuments({ pageSize: 100 }),
      ]);
      setApplications(appsRes.data);
      setDocuments(docsRes.data);
    } catch (e) {
      console.error('Failed to load scrutiny queue', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    loadQueue();
  }

  // Filter for applications relevant to scrutiny review
  const activeScrutinyApps = applications.filter((app) => {
    // If search query is present
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = app.application_reference.toLowerCase().includes(q);
      const matchInst = app.institution.institution_name.toLowerCase().includes(q);
      if (!matchRef && !matchInst) return false;
    }

    if (statusFilter === 'SUBMITTED') {
      return app.lifecycle_status === 'SUBMITTED';
    }
    if (statusFilter === 'UNDER_REVIEW') {
      return app.lifecycle_status === 'UNDER_REVIEW';
    }
    if (statusFilter === 'FLAGGED') {
      return app.lifecycle_status === 'FLAGGED';
    }

    // Default 'ALL_ACTIVE': prioritize SUBMITTED, UNDER_REVIEW, FLAGGED, and also allow scrutinizing any active application
    return true;
  });

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
            Applications awaiting statutory examination, evidence-linked verification, and official reviewer determinations.
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
            placeholder="Search queue by application reference or institution name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#FAF8FF] border border-[#E9E6F2] text-[#171B45] focus:outline-none focus:ring-2 focus:ring-[#7450D8] transition-all placeholder:text-[#8589A6]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL_ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'ALL_ACTIVE'
                ? 'bg-[#7450D8] text-white shadow-xs'
                : 'bg-[#FAF8FF] text-[#5F6485] hover:text-[#171B45] border border-[#E9E6F2]'
            }`}
          >
            All Workload ({applications.length})
          </button>
          <button
            onClick={() => setStatusFilter('SUBMITTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'SUBMITTED'
                ? 'bg-[#7450D8] text-white shadow-xs'
                : 'bg-[#FAF8FF] text-[#5F6485] hover:text-[#171B45] border border-[#E9E6F2]'
            }`}
          >
            Submitted ({applications.filter((a) => a.lifecycle_status === 'SUBMITTED').length})
          </button>
        </div>
      </div>

      {/* 3. Scrutiny Queue List */}
      <div className="bg-white rounded-3xl border border-[#E9E6F2] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#7450D8] mx-auto" />
            <p className="text-xs text-[#5F6485]">Loading scrutiny queue...</p>
          </div>
        ) : activeScrutinyApps.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF8FF] border border-[#DCD0F7] flex items-center justify-center text-[#7450D8] mx-auto">
              <ClipboardCheck className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-[#171B45]">No applications pending scrutiny in this view</h3>
            <p className="text-xs text-[#5F6485] max-w-sm mx-auto">
              When institutions submit applications or upload documents for scrutiny, they appear in this prioritized queue.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E9E6F2]">
            {activeScrutinyApps.map((app) => {
              // Find documents belonging to this application
              const appDocs = documents.filter((d) => d.application_id === app.id);
              const extractedDocsCount = appDocs.filter(
                (d) => d.processing_status === 'COMPLETED' || d.processing_status === 'COMPLETED_WITH_WARNINGS'
              ).length;
              const reviewDocsCount = appDocs.filter(
                (d) => d.processing_status === 'MANUAL_REVIEW_REQUIRED' || d.processing_status === 'FAILED'
              ).length;

              return (
                <div
                  key={app.id}
                  onClick={() => onSelectApplication(app.id)}
                  className="p-5 sm:p-6 hover:bg-[#FAF8FF]/60 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm sm:text-base font-extrabold text-[#171B45] group-hover:text-[#7450D8] transition-colors">
                        {app.application_reference}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          app.lifecycle_status === 'SUBMITTED'
                            ? 'bg-sky-100 text-sky-800 border border-sky-300'
                            : 'bg-[#F3EEFC] text-[#7450D8] border border-[#DCD0F7]'
                        }`}
                      >
                        {app.lifecycle_status}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-[#7450D8] bg-[#F3EEFC] px-2 py-0.5 rounded">
                        {app.category_code}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#5F6485] flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-[#171B45]">
                        <Building2 className="w-3.5 h-3.5 text-[#8589A6]" />
                        {app.institution.institution_name}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#8589A6]" />
                        Academic Year {app.academic_year || '2026-27'}
                      </span>
                      <span>•</span>
                      <span>Updated {new Date(app.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Processing Readiness Indicators */}
                  <div className="flex items-center gap-4 self-start md:self-center">
                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-[#171B45] flex items-center justify-end gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#7450D8]" />
                        <span>{appDocs.length} Submitted Document{appDocs.length === 1 ? '' : 's'}</span>
                      </div>
                      <div className="text-[10px] text-[#5F6485] mt-0.5">
                        {extractedDocsCount} extracted • {reviewDocsCount > 0 ? (
                          <span className="text-[#F04438] font-bold">{reviewDocsCount} need review</span>
                        ) : (
                          <span className="text-[#027A48]">OCR ready</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectApplication(app.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F04438] hover:bg-[#E34234] text-white text-xs font-semibold transition-all shadow-2xs shrink-0 cursor-pointer"
                    >
                      <span>Examine Scrutiny</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
