import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Info,
  Layers,
  Scale,
  RefreshCw,
  Code2,
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

  const resultVocabulary = [
    {
      status: 'PASS',
      badge: 'bg-[#ECFDF3] text-[#027A48] border-[#D1FADF]',
      meaning: 'Check evaluated; observed evidentiary values satisfied statutory requirements.',
      rule: 'Always carries structured justification; missing fields NEVER yield PASS.',
    },
    {
      status: 'FAIL',
      badge: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]',
      meaning: 'Check evaluated with reliable inputs; expectation was explicitly not met (e.g. date expired).',
      rule: 'Requires GOOD or FAIR extraction quality; never auto-rejects an application.',
    },
    {
      status: 'NEEDS_REVIEW',
      badge: 'bg-[#FFF6ED] text-[#C4320A] border-[#FECDCA]',
      meaning: 'Outcome depends on human legal judgment, minor variations, or low-confidence extraction.',
      rule: 'Preserves evidence links and highlights ambiguity for the scrutiny reviewer.',
    },
    {
      status: 'UNABLE_TO_EVALUATE',
      badge: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
      meaning: 'Inputs were unavailable (e.g., OCR unreadable, blank file, document missing).',
      rule: 'Never converted to FAIL; records that evaluation could not be attempted honestly.',
    },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#171B45] flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-[#7450D8]" />
          Validation Engine & Regulatory Scrutiny Standards
        </h1>
        <p className="text-xs sm:text-sm text-[#5F6485] mt-0.5">
          Deterministic compliance rules, evidence traceability architecture, and non-negotiable statutory guidelines for AICTE scrutiny.
        </p>
      </div>

      {/* 2. Core Principles (Non-negotiables per AGENTS.md & AI_PIPELINE.md) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E9E6F2] shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-[#F3EEFC] text-[#7450D8] flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-[#171B45]">Human Review Authority</h3>
          <p className="text-[11px] text-[#5F6485] leading-relaxed">
            The AI engine never makes adverse or final statutory decisions. Officials hold consequential decision-making authority; VerityAI provides evidence-linked decision support.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E9E6F2] shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-[#ECFDF3] text-[#027A48] flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-[#171B45]">Evidence Traceability</h3>
          <p className="text-[11px] text-[#5F6485] leading-relaxed">
            Every finding cites the exact source document, page number, and extracted character span. No values, findings, or authenticity statuses are ever invented or unreferenced.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E9E6F2] shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-[#EFF8FF] text-[#175CD3] flex items-center justify-center">
            <Info className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-[#171B45]">Honest Status Distinction</h3>
          <p className="text-[11px] text-[#5F6485] leading-relaxed">
            Extracted text ≠ verified information. OCR confidence is an engine estimate, not proof of authenticity. Suspected anomalies are never labeled as confirmed fraud.
          </p>
        </div>
      </div>

      {/* 3. Deterministic Scrutiny Rule Catalog */}
      <div className="bg-white rounded-3xl border border-[#E9E6F2] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#EEEAF5] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#171B45] flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#7450D8]" />
              Configured Scrutiny Rule Catalog (Live Database)
            </h2>
            <p className="text-[11px] text-[#5F6485]">
              Active deterministic validation rules persisted in the database and executed against applications.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#7450D8] bg-[#F3EEFC] px-2.5 py-1 rounded-lg font-bold">
              {rules.length} Rules Registered
            </span>
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg border border-[#E9E6F2] text-[#5F6485] hover:text-[#7450D8]"
              title="Refresh rules"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#5F6485]">Loading rule catalog...</div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#5F6485]">No validation rules registered. Run seed script or contact administrator.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EEEAF5] bg-[#FAF9FC] text-[#8589A6] font-semibold text-[11px]">
                  <th className="py-3 px-5">RULE CODE & TYPE</th>
                  <th className="py-3 px-4">SEVERITY</th>
                  <th className="py-3 px-4">DESCRIPTION & PARAMETERS</th>
                  <th className="py-3 px-4">APPLIES TO</th>
                  <th className="py-3 px-4">PROVENANCE & STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEAF5]">
                {rules.map((rule: ValidationRuleItem) => (
                  <tr key={rule.id || rule.rule_code} className="hover:bg-[#FAF8FF] transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-mono font-bold text-[#171B45] text-xs">{rule.rule_code}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F3EEFC] text-[#7450D8]">
                          {rule.rule_type}
                        </span>
                        <span className="text-[10px] text-[#8589A6] font-mono">v{rule.rule_version}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          rule.severity === 'CRITICAL' || rule.severity === 'HIGH'
                            ? 'bg-[#FFF0EF] text-[#B42318] border border-[#FECDCA]'
                            : 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]'
                        }`}
                      >
                        {rule.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#5F6485] leading-relaxed max-w-md">
                      <div className="font-semibold text-[#171B45] text-xs mb-0.5">{rule.rule_name}</div>
                      <div className="text-[11px] mb-1.5">{rule.description}</div>
                      {rule.parameters && Object.keys(rule.parameters).length > 0 && (
                        <div className="bg-[#F8F9FC] p-2 rounded-lg border border-[#E9E6F2] font-mono text-[10px] text-[#5F6485] space-y-0.5">
                          {Object.entries(rule.parameters).map(([k, v]) => (
                            <div key={k} className="truncate">
                              <span className="text-[#8589A6]">{k}:</span>{' '}
                              <span className="text-[#171B45]">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#171B45] text-[11px]">
                      {rule.applies_to?.categories && rule.applies_to.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {rule.applies_to.categories.map((c: string) => (
                            <span key={c} className="px-2 py-0.5 rounded text-[10px] bg-[#FAF9FC] border border-[#E9E6F2] font-mono text-[#7450D8]">
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#8589A6] text-[10px] italic">All Categories</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            rule.enabled
                              ? 'bg-[#ECFDF3] text-[#027A48] border border-[#D1FADF]'
                              : 'bg-[#F2F4F7] text-[#5F6485] border border-[#E4E7EC]'
                          }`}
                        >
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className="text-[10px] text-[#8589A6] font-mono">
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
      <div className="bg-white rounded-3xl border border-[#E9E6F2] shadow-xs p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#171B45]">
            Result Status Vocabulary Standards
          </h2>
          <p className="text-[11px] text-[#5F6485]">
            Every evaluation adheres strictly to mutually exclusive statutory result states.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {resultVocabulary.map((voc) => (
            <div key={voc.status} className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#E9E6F2] space-y-2">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${voc.badge}`}>
                {voc.status}
              </span>
              <p className="text-xs font-semibold text-[#171B45]">{voc.meaning}</p>
              <p className="text-[11px] text-[#5F6485] leading-relaxed">{voc.rule}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Active Category Standards from Backend */}
      <div className="bg-white rounded-3xl border border-[#E9E6F2] shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#171B45]">
              Active Institutional Category Requirements
            </h2>
            <p className="text-[11px] text-[#5F6485]">
              Real statutory categories registered in the backend database.
            </p>
          </div>
          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-[#E9E6F2] text-[#5F6485] hover:text-[#7450D8]"
            title="Refresh categories"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#5F6485]">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#5F6485]">No categories found in database.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat: ApplicationCategory) => (
              <div key={cat.code} className="p-4 rounded-2xl bg-[#FAF8FF] border border-[#DCD0F7] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#7450D8]">{cat.code}</span>
                  <span className="text-[10px] font-semibold text-[#027A48] bg-[#ECFDF3] px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[#171B45]">{cat.name}</h3>
                <p className="text-xs text-[#5F6485]">{cat.description || 'Institutional approval category'}</p>

                {cat.required_document_types && cat.required_document_types.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-[#8589A6] block mb-1">
                      Required Document Types:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {cat.required_document_types.map((t: string) => (
                        <span key={t} className="px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-[#E9E6F2] text-[#171B45]">
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
