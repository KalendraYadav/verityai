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
import { CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      cardBg: 'bg-emerald-50/40',
      cardBorder: 'border-emerald-200',
      meaning: 'Check evaluated; observed evidentiary values satisfied statutory requirements.',
      rule: 'Always carries structured justification; missing fields NEVER yield PASS.',
    },
    {
      status: 'FAIL',
      icon: XCircle,
      badge: 'bg-red-50 text-destructive border-red-200',
      cardBg: 'bg-red-50/40',
      cardBorder: 'border-red-200',
      meaning: 'Check evaluated with reliable inputs; expectation was explicitly not met (e.g. date expired).',
      rule: 'Requires GOOD or FAIR extraction quality; never auto-rejects an application.',
    },
    {
      status: 'NEEDS_REVIEW',
      icon: AlertTriangle,
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      cardBg: 'bg-amber-50/40',
      cardBorder: 'border-amber-200',
      meaning: 'Outcome depends on human legal judgment, minor variations, or low-confidence extraction.',
      rule: 'Preserves evidence links and highlights ambiguity for the scrutiny reviewer.',
    },
    {
      status: 'UNABLE_TO_EVALUATE',
      icon: FileQuestion,
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      cardBg: 'bg-blue-50/40',
      cardBorder: 'border-blue-200',
      meaning: 'Inputs were unavailable (e.g., OCR unreadable, blank file, document missing).',
      rule: 'Never converted to FAIL; records that evaluation could not be attempted honestly.',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EEE5DC]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-[#1B1411] text-[#33CC7A] flex items-center justify-center shadow-sm">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1B1411]">
                  Statutory Validation Engine & Scrutiny Norms
                </h1>
                <span className="inline-flex items-center rounded-full bg-[#1B1411] text-[#FAF5F0] text-[10px] font-mono font-bold px-2.5 py-0.5">
                  AICTE Norms Baseline
                </span>
              </div>
              <p className="text-xs text-[#66574F] mt-0.5">
                Deterministic compliance rules, evidence traceability architecture, and statutory guidelines for AICTE institutional scrutiny.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="h-8 gap-1.5 text-xs text-[#1B1411] bg-white border-[#EEE5DC] hover:bg-[#FAF5F0] rounded-full px-4 shadow-sm self-start sm:self-auto shrink-0"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin text-[#33CC7A]' : 'text-[#66574F]'}`} />
          <span>Refresh Engine</span>
        </Button>
      </div>

      {/* 2. Core Principles (3 Linea Themed Editorial Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Human Review Authority */}
        <div className="bg-white rounded-2xl border border-[#EEE5DC] p-5 shadow-[0_2px_8px_rgba(27,20,17,0.03)] hover:border-[#1B1411]/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="size-8 rounded-full bg-[#1B1411] text-[#33CC7A] flex items-center justify-center">
                <Scale className="size-4" />
              </div>
              <span className="text-[10px] font-bold uppercase rounded-full bg-[#EEE5DC] text-[#1B1411] px-2.5 py-0.5 font-mono">
                Non-Negotiable
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#1B1411] mb-1.5">Human Review Authority</h3>
            <p className="text-xs text-[#66574F] leading-relaxed">
              The AI engine never makes adverse or final statutory decisions. Authorized officials hold consequential decision-making authority; VerityAI provides evidence-linked decision support.
            </p>
          </div>
        </div>

        {/* Evidence Traceability */}
        <div className="bg-white rounded-2xl border border-[#EEE5DC] p-5 shadow-[0_2px_8px_rgba(27,20,17,0.03)] hover:border-[#1B1411]/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="size-8 rounded-full bg-[#E8F8F0] text-[#1B804D] flex items-center justify-center">
                <Layers className="size-4" />
              </div>
              <span className="text-[10px] font-bold uppercase rounded-full bg-[#E8F8F0] text-[#1B804D] px-2.5 py-0.5 font-mono">
                Provenance
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#1B1411] mb-1.5">Evidence Traceability</h3>
            <p className="text-xs text-[#66574F] leading-relaxed">
              Every finding cites the exact source document, page number, and extracted character span. No values, findings, or authenticity statuses are ever invented or unreferenced.
            </p>
          </div>
        </div>

        {/* Honest Status Distinction */}
        <div className="bg-white rounded-2xl border border-[#EEE5DC] p-5 shadow-[0_2px_8px_rgba(27,20,17,0.03)] hover:border-[#1B1411]/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="size-8 rounded-full bg-[#EBF2F7] text-[#1F3954] flex items-center justify-center">
                <Info className="size-4" />
              </div>
              <span className="text-[10px] font-bold uppercase rounded-full bg-[#EBF2F7] text-[#1F3954] px-2.5 py-0.5 font-mono">
                Truth in Data
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#1B1411] mb-1.5">Honest Status Distinction</h3>
            <p className="text-xs text-[#66574F] leading-relaxed">
              Extracted text ≠ verified information. OCR confidence is an engine estimate, not proof of authenticity. Suspected anomalies are never labeled as confirmed fraud.
            </p>
          </div>
        </div>
      </div>

      {/* Advisory Disclaimer Banner */}
      <div className="bg-[#FAF5F0] border border-[#E5D7CA] rounded-2xl p-4 flex items-start gap-3 shadow-sm">
        <AlertTriangle className="size-4 text-[#D97706] shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-[#1B1411] block mb-0.5">
            Decision Support Advisory — Regulatory Baseline
          </span>
          <p className="text-[#66574F] leading-relaxed">
            Validation evaluations are algorithmic decision-support assessments based on AICTE Approval Process Handbook (APH 2024–27) rules. Final statutory determinations remain strictly with authorized regulatory officers.
          </p>
        </div>
      </div>

      {/* 3. Deterministic Scrutiny Rule Catalog */}
      <div className="bg-white rounded-2xl border border-[#EEE5DC] shadow-[0_2px_8px_rgba(27,20,17,0.04)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#EEE5DC] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="size-4 text-[#1B1411] shrink-0" />
              <h2 className="text-sm font-bold text-[#1B1411]">
                Configured Scrutiny Rule Catalog
              </h2>
              <span className="rounded-full font-mono text-[10px] font-bold text-[#1B1411] bg-[#EEE5DC] px-2.5 py-0.5">
                {rules.length} Rules Active
              </span>
            </div>
            <p className="text-xs text-[#66574F] mt-0.5">
              Deterministic validation rules persisted in the database and executed against applications.
            </p>
          </div>

          {/* Search & Severity Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#66574F] pointer-events-none" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter rules by code or keyword..."
                className="h-8 text-xs pl-8 pr-3 w-48 sm:w-56 bg-[#FAF5F0] border-[#EEE5DC] rounded-full focus:bg-white text-[#1B1411]"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#FAF5F0] p-1 rounded-full border border-[#EEE5DC] text-[11px]">
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`h-6 px-2.5 text-[10px] font-bold rounded-full transition-all ${
                    severityFilter === sev
                      ? 'bg-[#1B1411] text-[#FAF5F0] shadow-sm'
                      : 'text-[#66574F] hover:text-[#1B1411]'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">No scrutiny rules match the current criteria.</p>
              <p className="text-[11px]">
                {rules.length === 0
                  ? 'No rules registered in database. Ensure backend migrations have run.'
                  : 'Try adjusting your search terms or severity filter.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                    RULE CODE & TYPE
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                    SEVERITY
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                    DESCRIPTION & PARAMETERS
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                    APPLIES TO
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground py-2.5 px-4">
                    PROVENANCE & STATUS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule: ValidationRuleItem) => (
                  <TableRow key={rule.id || rule.rule_code} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="py-3 px-4 align-top">
                      <div className="font-mono font-semibold text-xs text-foreground">{rule.rule_code}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="font-mono text-[9px] bg-secondary text-primary border-primary/20">
                          {rule.rule_type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">v{rule.rule_version}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4 align-top">
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold uppercase ${
                          rule.severity === 'CRITICAL'
                            ? 'bg-red-50 text-destructive border-red-200'
                            : rule.severity === 'HIGH'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {rule.severity}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-3 px-4 align-top text-xs max-w-md">
                      <div className="font-semibold text-xs text-foreground mb-0.5">{rule.rule_name}</div>
                      <div className="text-[11px] text-muted-foreground leading-relaxed mb-2">{rule.description}</div>
                      {rule.parameters && Object.keys(rule.parameters).length > 0 && (
                        <div className="bg-muted/40 p-2 rounded-md border border-border font-mono text-[10px] text-foreground space-y-0.5">
                          {Object.entries(rule.parameters).map(([k, v]) => (
                            <div key={k} className="truncate">
                              <span className="text-muted-foreground font-medium">{k}:</span>{' '}
                              <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-3 px-4 align-top text-xs">
                      {rule.applies_to?.categories && rule.applies_to.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {rule.applies_to.categories.map((c: string) => (
                            <Badge key={c} variant="outline" className="font-mono text-[9px] bg-secondary text-primary border-primary/20">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[10px] italic">All Categories</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3 px-4 align-top">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-semibold gap-1 ${
                            rule.enabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          <span className={`size-1.5 rounded-full ${rule.enabled ? 'bg-emerald-600' : 'bg-muted-foreground'}`} />
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {rule.provenance === 'SYNTHETIC_DEMO' ? 'Synthetic Demo' : rule.provenance}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </div>

      {/* 4. Result Status Vocabulary Standards */}
      <div className="bg-white rounded-2xl border border-[#EEE5DC] shadow-[0_2px_8px_rgba(27,20,17,0.04)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#EEE5DC]">
          <span className="w-fit text-[10px] font-bold uppercase rounded-full bg-[#1B1411] text-[#FAF5F0] px-2.5 py-0.5 font-mono mb-2 inline-block">
            Statutory Semantics
          </span>
          <h2 className="text-sm font-bold text-[#1B1411]">
            Result Status Vocabulary Standards
          </h2>
          <p className="text-xs text-[#66574F] mt-0.5">
            Every automated evaluation adheres strictly to mutually exclusive statutory result states. An anomaly is never reported as confirmed fraud.
          </p>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {resultVocabulary.map((voc) => {
            const VocIcon = voc.icon;
            return (
              <div
                key={voc.status}
                className={`p-4 rounded-xl ${voc.cardBg} border ${voc.cardBorder} space-y-2`}
              >
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-0.5 font-mono ${voc.badge}`}>
                  <VocIcon className="size-3" />
                  <span>{voc.status}</span>
                </span>
                <p className="text-xs font-semibold text-[#1B1411] leading-snug">{voc.meaning}</p>
                <p className="text-[11px] text-[#66574F] leading-relaxed">{voc.rule}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Institutional Category Requirements */}
      <div className="bg-white rounded-2xl border border-[#EEE5DC] shadow-[0_2px_8px_rgba(27,20,17,0.04)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#EEE5DC] flex flex-row items-center justify-between">
          <div>
            <span className="w-fit text-[10px] font-bold uppercase rounded-full bg-[#1B1411] text-[#FAF5F0] px-2.5 py-0.5 font-mono mb-2 inline-block">
              Statutory Schema
            </span>
            <h2 className="text-sm font-bold text-[#1B1411]">
              Active Institutional Category Requirements
            </h2>
            <p className="text-xs text-[#66574F] mt-0.5">
              Statutory categories registered in the database, defining required document types per application.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={loadData}
            disabled={loading}
            className="text-[#66574F] hover:text-[#1B1411] rounded-full"
            title="Refresh categories"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin text-[#33CC7A]' : ''}`} />
          </Button>
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ) : categories.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#66574F]">No categories found in database.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat: ApplicationCategory) => (
                <div key={cat.code} className="p-4 rounded-xl bg-[#FAF5F0] border border-[#EEE5DC] space-y-2.5 hover:border-[#1B1411]/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs rounded-full bg-[#1B1411] text-[#FAF5F0] px-2.5 py-0.5 font-bold">
                      {cat.code}
                    </span>
                    <span className="text-[10px] rounded-full bg-[#E8F8F0] text-[#1B804D] px-2.5 py-0.5 font-semibold inline-flex items-center gap-1 font-mono">
                      <span className="size-1.5 rounded-full bg-[#33CC7A]" />
                      Active Standard
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-[#1B1411]">{cat.name}</h3>
                    <p className="text-[11px] text-[#66574F] mt-0.5 leading-relaxed">{cat.description || 'Institutional approval category'}</p>
                  </div>

                  {cat.required_document_types && cat.required_document_types.length > 0 && (
                    <div className="pt-2 border-t border-[#EEE5DC]">
                      <span className="text-[10px] uppercase font-bold text-[#66574F] block mb-1 tracking-wider font-mono">
                        Required Document Types ({cat.required_document_types.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {cat.required_document_types.map((t: string) => (
                          <span key={t} className="text-[10px] font-mono text-[#1B1411] border border-[#EEE5DC] bg-white rounded-full px-2 py-0.5">
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
    </div>
  );
};
