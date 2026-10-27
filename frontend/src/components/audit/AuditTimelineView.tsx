import React, { useState, useEffect } from 'react';
import { fetchAuditEvents, type AuditEventItem } from '../../api/client';
import { History, ShieldCheck, RefreshCw, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EEE5DC]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-[#1B1411] text-[#33CC7A] flex items-center justify-center shadow-sm">
              <History className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1B1411]">
                  Regulatory Audit Trail &amp; Compliance Log
                </h1>
                <span className="rounded-full bg-[#1B1411] text-[#FAF5F0] font-mono text-[10px] font-bold px-2.5 py-0.5">
                  {events.length} Events
                </span>
              </div>
              <p className="text-xs text-[#66574F] mt-0.5">
                Cryptographically sealed, append-only log of institutional submissions, AI validation pipelines, and officer determinations.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="h-8 gap-1.5 text-xs text-[#1B1411] bg-white border-[#EEE5DC] hover:bg-[#FAF5F0] rounded-full px-4 shadow-sm self-start sm:self-auto shrink-0"
          title="Refresh audit log"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin text-[#33CC7A]' : 'text-[#66574F]'}`} />
          <span>Refresh Audit</span>
        </Button>
      </div>

      {/* 2. Timeline Container */}
      <div className="bg-white rounded-2xl border border-[#EEE5DC] shadow-[0_2px_8px_rgba(27,20,17,0.04)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#EEE5DC] flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#33CC7A] shrink-0" />
              <h2 className="text-sm font-bold text-[#1B1411]">
                Chronological Audit Trail
              </h2>
            </div>
            <p className="text-xs text-[#66574F] mt-0.5">
              Non-repudiable, append-only record of all regulatory actions.
            </p>
          </div>
          <span className="font-mono text-[10px] rounded-full bg-[#EEE5DC] text-[#1B1411] px-3 py-1 font-bold">
            Tamper-Evident SHA-256
          </span>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : events.length === 0 ? (
            <EmptyState
              icon={History}
              title="No audit records found"
              description="Actions taken across applications, scrutiny workflows, and document processing will appear chronologically here."
            />
          ) : (
            <div className="relative border-l border-[#EEE5DC] ml-3 sm:ml-4 space-y-5">
              {events.map((event) => (
                <div key={event.id} className="relative pl-5 sm:pl-6 group">
                  {/* Timeline Node */}
                  <div className="absolute -left-2 top-1.5 size-4 rounded-full bg-[#1B1411] border-2 border-[#33CC7A] flex items-center justify-center">
                    <span className="size-1 rounded-full bg-[#33CC7A]" />
                  </div>

                  <div className="bg-[#FAF5F0] border border-[#EEE5DC] rounded-xl p-4 space-y-2.5 hover:border-[#1B1411]/30 transition-all shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-xs text-[#1B1411] font-mono">
                        {event.event_type}
                      </span>
                      <span className="text-[11px] font-mono text-[#66574F]">
                        {new Date(event.occurred_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#66574F]">
                      <div className="flex items-center gap-1.5">
                        <User className="size-3 text-[#66574F]" />
                        <span>Actor: <strong className="text-[#1B1411]">{event.actor_id || 'System Worker'}</strong> ({event.actor_type})</span>
                      </div>

                      {event.application_id && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="size-3 text-[#66574F]" />
                          <span className="font-mono text-[#1F3954] font-semibold">App: {event.application_id}</span>
                        </div>
                      )}
                    </div>

                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="text-[10px] font-mono bg-white p-2.5 rounded-lg border border-[#EEE5DC] text-[#1B1411] overflow-x-auto">
                        {JSON.stringify(event.metadata)}
                      </div>
                    )}
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
