import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Info,
  Layers,
  Scale,
  RefreshCw,
  Code2,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
  XCircle,
} from 'lucide-react';
import {
  fetchCategories,
  fetchValidationRules,
  type ApplicationCategory,
  type ValidationRuleItem,
} from '../../api/client';

export const ValidationComplianceView: React.FC = () => {
  const [categories, setCategories] = useState<ApplicationCategory[]>([]);
  const [rules, setRules] = useState<ValidationRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');

  async function loadData() {
    setLoading(true);
    try {
      const [cats, ruleList] = await Promise.all([
        fetchCategories(),
        fetchValidationRules(),
      ]);
      setCategories(cats);
      setRules(ruleList);
    } catch (e) {
      console.error('Failed to load validation rules or categories', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      r.rule_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.rule_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSeverity = severityFilter === 'ALL' || r.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const resultVocabulary = [
    {
      status: 'PASS',
      icon: CheckCircle2,
      badge: 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]',
      cardBg: 'bg-[#F0FDF4]',
      cardBorder: 'border-[#BBF7D0]',
      meaning: 'Check evaluated; observed evidentiary values satisfied statutory requirements.',
      rule: 'Always carries structured justification; missing fields NEVER yield PASS.',
    },
    {
      status: 'FAIL',
      icon: XCircle,
      badge: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]',
      cardBg: 'bg-[#FEF2F2]',
      cardBorder: 'border-[#FECACA]',
      meaning: 'Check evaluated with reliable inputs; expectation was explicitly not met (e.g. date expired).',
      rule: 'Requires GOOD or FAIR extraction quality; never auto-rejects an application.',
    },
    {
      status: 'NEEDS_REVIEW',
      icon: AlertTriangle,
      badge: 'bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]',
      cardBg: 'bg-[#FFFBEB]',
      cardBorder: 'border-[#FDE68A]',
      meaning: 'Outcome depends on human legal judgment, minor variations, or low-confidence extraction.',
      rule: 'Preserves evidence links and highlights ambiguity for the scrutiny reviewer.',
    },
    {
      status: 'UNABLE_TO_EVALUATE',
      icon: FileQuestion,
      badge: 'bg-[#DBEAFE] text-[#1D4ED8] border-[#93C5FD]',
      cardBg: 'bg-[#EFF6FF]',
      cardBorder: 'border-[#BFDBFE]',
      meaning: 'Inputs were unavailable (e.g., OCR unreadable, blank file, document missing).',
      rule: 'Never converted to FAIL; records that evaluation could not be attempted honestly.',
    },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E4E7EC]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F3EEFF] text-[#6941C6] border border-[#DCD0F7] text-[10px] font-bold uppercase tracking-wider mb-2">
            Regulatory Standards Engine
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827] flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-[#6941C6]" />
            Validation Engine &amp; Regulatory Scrutiny Standards
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Deterministic compliance rules, evidence traceability architecture, and statutory guidelines for AICTE institutional scrutiny.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E4E7EC] text-[#374151] hover:bg-[#F9FAFB] hover:border-[#D0D5DD] transition-all shadow-2xs cursor-pointer self-start sm:self-auto shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#6941C6] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Engine State</span>
        </button>
      </div>

      {/* 2. Core Principles (3 Distinct Themed Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Human Review Authority */}
        <div className="bg-white p-5 rounded-2xl border border-[#DCD0F7] shadow-xs space-y-3 relative overflow-hidden transition-all hover:shadow-sm" style={{ borderTop: '3px solid #6941C6' }}>
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#F3EEFF] text-[#6941C6] border border-[#DCD0F7] flex items-center justify-center">
              <Scale className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6941C6] bg-[#F3EEFF] px-2 py-0.5 rounded-full">
              Non-Negotiable
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111827]">Human Review Authority</h3>
            <p className="text-xs text-[#5F6485] leading-relaxed mt-1">
              The AI engine never makes adverse or final statutory decisions. Officials hold consequential decision-making authority; VerityAI provides evidence-linked decision support.
            </p>
          </div>
        </div>

        {/* Evidence Traceability */}
        <div className="bg-white p-5 rounded-2xl border border-[#BBF7D0] shadow-xs space-y-3 relative overflow-hidden transition-all hover:shadow-sm" style={{ borderTop: '3px solid #15803D' }}>
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#ECFDF3] text-[#15803D] border border-[#BBF7D0] flex items-center justify-center">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#15803D] bg-[#ECFDF3] px-2 py-0.5 rounded-full">
              Provenance
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111827]">Evidence Traceability</h3>
            <p className="text-xs text-[#5F6485] leading-relaxed mt-1">
              Every finding cites the exact source document, page number, and extracted character span. No values, findings, or authenticity statuses are ever invented or unreferenced.
            </p>
          </div>
        </div>

        {/* Honest Status Distinction */}
        <div className="bg-white p-5 rounded-2xl border border-[#BFDBFE] shadow-xs space-y-3 relative overflow-hidden transition-all hover:shadow-sm" style={{ borderTop: '3px solid #1D4ED8' }}>
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] flex items-center justify-center">
              <Info className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1D4ED8] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
              Truth in Data
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111827]">Honest Status Distinction</h3>
            <p className="text-xs text-[#5F6485] leading-relaxed mt-1">
              Extracted text ≠ verified information. OCR confidence is an engine estimate, not proof of authenticity. Suspected anomalies are never labeled as confirmed fraud.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Deterministic Scrutiny Rule Catalog */}
      <div className="bg-white rounded-2xl border border-[#E4E7EC] shadow-sm overflow-hidden">
        {/* Table Top Controls & Search */}
        <div className="p-5 border-b border-[#E4E7EC] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FAF9FC]">
          <div>
            <h2 className="text-sm font-bold text-[#111827] flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#6941C6]" />
              <span>Configured Scrutiny Rule Catalog</span>
              <span className="text-[11px] font-mono font-bold text-[#6941C6] bg-[#F3EEFF] border border-[#DCD0F7] px-2 py-0.5 rounded-full">
                {rules.length} Rules Active
              </span>
            </h2>
            <p className="text-xs text-[#667085] mt-0.5">
              Deterministic validation rules persisted in the database and executed against applications.
            </p>
          </div>

          {/* Search & Severity Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter rules by code or keyword..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E4E7EC] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6941C6]/20 focus:border-[#6941C6] transition-all w-48 sm:w-60"
              />
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#E4E7EC] text-[11px]">
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    severityFilter === sev
                      ? 'bg-[#6941C6] text-white shadow-2xs'
                      : 'text-[#667085] hover:text-[#111827] hover:bg-[#F9FAFB]'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#667085] flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#6941C6] animate-spin" />
            <span>Loading deterministic scrutiny rules...</span>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#667085] space-y-2">
            <p className="font-semibold text-[#111827]">No scrutiny rules match the current criteria.</p>
            <p className="text-[11px] text-[#9CA3AF]">
              {rules.length === 0
                ? 'No rules registered in database. Ensure backend migrations have run.'
                : 'Try adjusting your search terms or severity filter.'}
            </p>
            {(searchQuery || severityFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSeverityFilter('ALL');
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6941C6] bg-[#F3EEFF] border border-[#DCD0F7] rounded-lg hover:bg-[#E8DEFD] transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB] text-[#667085] font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-5">Rule Code &amp; Type</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Description &amp; Parameters</th>
                  <th className="py-3 px-4">Applies To</th>
                  <th className="py-3 px-4">Provenance &amp; Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E7EC]">
                {filteredRules.map((rule: ValidationRuleItem) => (
                  <tr key={rule.id || rule.rule_code} className="hover:bg-[#FAF9FC] transition-colors">
                    <td className="py-3.5 px-5 align-top">
                      <div className="font-mono font-bold text-[#111827] text-xs">{rule.rule_code}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F3EEFF] text-[#6941C6] border border-[#DCD0F7]">
                          {rule.rule_type}
                        </span>
                        <span className="text-[10px] text-[#9CA3AF] font-mono">v{rule.rule_version}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          rule.severity === 'CRITICAL'
                            ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'
                            : rule.severity === 'HIGH'
                            ? 'bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]'
                            : 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                        }`}
                      >
                        {rule.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 align-top text-[#475467] leading-relaxed max-w-md">
                      <div className="font-bold text-[#111827] text-xs mb-1">{rule.rule_name}</div>
                      <div className="text-[11px] text-[#475467] mb-2">{rule.description}</div>
                      {rule.parameters && Object.keys(rule.parameters).length > 0 && (
                        <div className="bg-[#F8F9FC] p-2.5 rounded-lg border border-[#E4E7EC] font-mono text-[10px] text-[#344054] space-y-1">
                          {Object.entries(rule.parameters).map(([k, v]) => (
                            <div key={k} className="truncate">
                              <span className="text-[#667085] font-semibold">{k}:</span>{' '}
                              <span className="text-[#111827]">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 align-top text-[#111827] text-[11px]">
                      {rule.applies_to?.categories && rule.applies_to.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {rule.applies_to.categories.map((c: string) => (
                            <span key={c} className="px-2 py-0.5 rounded text-[10px] bg-[#F8F9FC] border border-[#DCD0F7] font-mono font-semibold text-[#6941C6]">
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#9CA3AF] text-[10px] italic">All Categories</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            rule.enabled
                              ? 'bg-[#ECFDF3] text-[#15803D] border border-[#BBF7D0]'
                              : 'bg-[#F2F4F7] text-[#667085] border border-[#E4E7EC]'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${rule.enabled ? 'bg-[#15803D]' : 'bg-[#9CA3AF]'}`} />
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className="text-[10px] text-[#9CA3AF] font-mono">
                          {rule.provenance === 'SYNTHETIC_DEMO' ? 'Synthetic Demo Rule' : rule.provenance}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Result Status Vocabulary Standards */}
      <div className="bg-white rounded-2xl border border-[#E4E7EC] shadow-sm p-6 space-y-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F3EEFF] text-[#6941C6] border border-[#DCD0F7] text-[10px] font-bold uppercase tracking-wider mb-1.5">
            Statutory Semantics
          </div>
          <h2 className="text-base font-bold text-[#111827]">
            Result Status Vocabulary Standards
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Every evaluation adheres strictly to mutually exclusive statutory result states. An anomaly is never reported as confirmed fraud.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {resultVocabulary.map((voc) => {
            const VocIcon = voc.icon;
            return (
              <div
                key={voc.status}
                className={`p-4 rounded-xl ${voc.cardBg} border ${voc.cardBorder} space-y-2.5 transition-all hover:shadow-xs`}
              >
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${voc.badge}`}>
                    <VocIcon className="w-3 h-3" />
                    {voc.status}
                  </span>
                </div>
                <p className="text-xs font-bold text-[#111827] leading-snug">{voc.meaning}</p>
                <p className="text-[11px] text-[#475467] leading-relaxed">{voc.rule}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Active Institutional Category Requirements */}
      <div className="bg-white rounded-2xl border border-[#E4E7EC] shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F3EEFF] text-[#6941C6] border border-[#DCD0F7] text-[10px] font-bold uppercase tracking-wider mb-1.5">
              Statutory Schema
            </div>
            <h2 className="text-base font-bold text-[#111827]">
              Active Institutional Category Requirements
            </h2>
            <p className="text-xs text-[#667085] mt-0.5">
              Statutory categories registered in the database, defining required document types per application.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E4E7EC] text-[#667085] hover:text-[#6941C6] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
            title="Refresh categories"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#667085]">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#667085]">No categories found in database.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat: ApplicationCategory) => (
              <div key={cat.code} className="p-5 rounded-xl bg-white border border-[#E4E7EC] shadow-2xs space-y-3 hover:border-[#DCD0F7] transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#6941C6] bg-[#F3EEFF] border border-[#DCD0F7] px-2.5 py-0.5 rounded-md">
                    {cat.code}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#15803D] bg-[#ECFDF3] border border-[#BBF7D0] px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                    Active Standard
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#111827]">{cat.name}</h3>
                  <p className="text-xs text-[#667085] mt-0.5 leading-relaxed">{cat.description || 'Institutional approval category'}</p>
                </div>

                {cat.required_document_types && cat.required_document_types.length > 0 && (
                  <div className="pt-2 border-t border-[#F2F4F7]">
                    <span className="text-[10px] uppercase font-bold text-[#667085] block mb-1.5 tracking-wider">
                      Required Document Types ({cat.required_document_types.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.required_document_types.map((t: string) => (
                        <span key={t} className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-[#F9FAFB] border border-[#E4E7EC] text-[#344054]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
