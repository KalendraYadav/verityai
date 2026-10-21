import React, { useState, useEffect } from 'react';
import { fetchAuditEvents, type AuditEventItem } from '../../api/client';
import { History, ShieldCheck, RefreshCw, FileText, User } from 'lucide-react';

export const AuditTimelineView: React.FC = () => {
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAuditEvents(50);
      setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#171B45] flex items-center gap-2">
            <History className="w-6 h-6 text-[#7450D8]" />
            Regulatory Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6485] mt-0.5">
            Immutable, append-only log of application ingestion, status transitions, and scrutiny actions.
          </p>
        </div>

        <button
          onClick={load}
          className="p-2 rounded-xl border border-[#E9E6F2] text-[#5F6485] hover:bg-[#FAF8FF] hover:text-[#7450D8] transition-colors cursor-pointer self-start sm:self-auto"
          title="Refresh audit log"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E9E6F2] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#EEEAF5] flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-[#171B45] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#12B886]" />
            Chronological Events ({events.length})
          </div>
          <span className="text-[11px] text-[#8589A6]">Foreign Keys: RESTRICT · Non-repudiable</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#5F6485]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#7450D8] mx-auto mb-2" />
            Loading audit events...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#8589A6]">
            No audit records found.
          </div>
        ) : (
          <div className="p-6">
            <div className="relative border-l-2 border-[#E9E6F2] ml-4 space-y-6">
              {events.map((event) => (
                <div key={event.id} className="relative pl-6 group">
                  {/* Dot icon on line */}
                  <div className="absolute -left-2.5 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-[#7450D8] flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7450D8]" />
                  </div>

                  <div className="bg-[#FAF9FC] border border-[#E9E6F2] rounded-xl p-4 space-y-1 hover:border-[#DCD0F7] transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-xs text-[#171B45] uppercase tracking-wide">
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] font-mono text-[#8589A6]">
                        {new Date(event.occurred_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#5F6485] pt-1">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#8589A6]" />
                        <span>Actor: {event.actor_id || 'System Worker'} ({event.actor_type})</span>
                      </div>

                      {event.application_id && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#8589A6]" />
                          <span className="font-mono text-[#7450D8]">App: {event.application_id}</span>
                        </div>
                      )}
                    </div>

                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="text-[11px] font-mono bg-white p-2 rounded-lg border border-[#EEEAF5] text-[#5F6485] mt-2">
                        {JSON.stringify(event.metadata)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
