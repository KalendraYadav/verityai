import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  RefreshCw,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Upload,
  ExternalLink,
  Info,
  Check,
  X,
} from 'lucide-react';
import {
  fetchRegistryProviders,
  fetchRegistryRecords,
  importRegistryDataset,
  type RegistryProviderInfo,
  type RegistryRecordItem,
} from '../../api/client';

interface Props {
  onSelectApplication?: (id: string) => void;
  onNavigateToApplications?: () => void;
}

export const RegistryVerificationView: React.FC<Props> = ({
  onNavigateToApplications,
}) => {
  const [providers, setProviders] = useState<RegistryProviderInfo[]>([]);
  const [records, setRecords] = useState<RegistryRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('SYNTHETIC_AISHE');

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function loadData() {
    try {
      const [provList, recList] = await Promise.all([
        fetchRegistryProviders(),
        fetchRegistryRecords({
          provider_code: selectedProvider,
          q: searchQuery.trim() || undefined,
        }),
      ]);
      setProviders(provList);
      setRecords(recList);
    } catch (err: unknown) {
      console.error('Failed to load registry information', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedProvider]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    fetchRegistryRecords({
      provider_code: selectedProvider,
      q: searchQuery.trim() || undefined,
    })
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function handleQuickSeed() {
    const sampleBatch = {
      provider_code: 'SYNTHETIC_AISHE',
      source_dataset: 'SYNTHETIC_REGISTRY_2026',
      dataset_version: '1.2-PILOT',
      records: [
        {
          reference_identifier: 'SYN-INST-0004',
          institution_name: 'National Polytechnic of Engineering & Technology',
          state: 'Maharashtra',
          district: 'Pune',
          address: 'Sector 14, Hinjawadi Tech Park, Pune',
          status: 'ACTIVE',
          approved_intake: 480,
          year_of_establishment: 2011,
        },
        {
          reference_identifier: 'SYN-INST-0005',
          institution_name: 'Vanguard College of Pharmaceutical Sciences',
          state: 'Karnataka',
          district: 'Bengaluru Urban',
          address: 'Peenya Industrial Area, Bengaluru',
          status: 'ACTIVE',
          approved_intake: 120,
          year_of_establishment: 2016,
        },
      ],
    };
    setImportJsonText(JSON.stringify(sampleBatch, null, 2));
  }

  async function handleExecuteImport() {
    setImporting(true);
    setImportResult(null);
    setImportError(null);
    try {
      const parsed = JSON.parse(importJsonText);
      const res = await importRegistryDataset(parsed);
      setImportResult(
        `Import successful: ${res.created_count} created, ${res.updated_count} updated across ${res.total_processed} records.`
      );
      loadData();
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Invalid JSON format or network error');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#171B45] flex items-center gap-2.5">
            <Database className="w-6 h-6 text-[#7450D8]" />
            Regulatory Reference Registries & AISHE Gateways
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6485] mt-0.5">
            Institutional reference database for deterministic cross-verification of institution legal names, AISHE codes, and approved intake ceilings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            className="p-2 rounded-xl border border-[#E9E6F2] text-[#5F6485] hover:bg-[#FAF8FF] hover:text-[#7450D8] transition-colors cursor-pointer"
            title="Refresh Registry Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setShowImportModal(true);
              setImportResult(null);
              setImportError(null);
              if (!importJsonText) handleQuickSeed();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7450D8] hover:bg-[#5633B8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Reference Dataset</span>
          </button>
        </div>
      </div>

      {/* 2. Advisory Notice Banner */}
      <div className="p-4 rounded-2xl bg-[#F3EEFC] border border-[#DCD0F7] text-xs text-[#5633B8] flex items-start gap-3">
        <Info className="w-4 h-4 text-[#7450D8] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold">Statutory Provenance & Registry Integration Disclosure:</span>
          <p className="text-[11px] text-[#5F6485] leading-relaxed">
            Per SIH 2026 prototype specifications, reference data is verified against the Synthetic AISHE Registry adapter. External live government API calls require official AICTE credentials and are designated with honest statutory stubs to avoid false claims of operational deployment.
          </p>
        </div>
      </div>

      {/* 3. Configured Registry Providers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => (
          <div
            key={p.provider_code}
            onClick={() => setSelectedProvider(p.provider_code)}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              selectedProvider === p.provider_code
                ? 'bg-white border-[#7450D8] ring-2 ring-[#7450D8]/10 shadow-xs'
                : 'bg-white border-[#E9E6F2] hover:border-[#DCD0F7]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                  p.is_available ? 'bg-[#ECFDF3] text-[#027A48]' : 'bg-[#FFF0EF] text-[#B42318]'
                }`}>
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#171B45]">{p.provider_name}</h3>
                  <span className="font-mono text-[10px] text-[#7450D8]">{p.provider_code}</span>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                p.status === 'AVAILABLE'
                  ? 'bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]'
                  : 'bg-[#FAF9FC] text-[#5F6485] border border-[#E9E6F2]'
              }`}>
                {p.status}
              </span>
            </div>

            <p className="text-xs text-[#5F6485] leading-relaxed mb-3">
              {p.description}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#EEEAF5] text-[11px]">
              <span className="text-[#8589A6]">Authority: <strong className="text-[#171B45]">{p.statutory_authority}</strong></span>
              {p.is_synthetic && (
                <span className="px-2 py-0.2 rounded-md bg-[#FAF8FF] text-[#7450D8] border border-[#DCD0F7] text-[10px] font-bold">
                  SIMULATED SANDBOX
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 4. Registered Institutional Reference Records */}
      <div className="bg-white rounded-2xl border border-[#E9E6F2] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#EEEAF5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#7450D8]" />
            <h2 className="text-sm font-bold text-[#171B45]">
              Registered Reference Records ({records.length})
            </h2>
          </div>

          {/* Search Filter */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8589A6]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search identifier or name..."
                className="text-xs rounded-xl border border-[#E9E6F2] bg-[#FAF9FC] pl-9 pr-3 py-1.5 text-[#171B45] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#7450D8]/20 focus:border-[#7450D8]"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-[#FAF8FF] border border-[#DCD0F7] text-[#7450D8] text-xs font-semibold hover:bg-[#F3EEFC] transition-colors cursor-pointer"
            >
              Filter
            </button>
          </form>
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF9FC] border-b border-[#EEEAF5] text-[11px] font-bold text-[#5F6485] uppercase tracking-wider">
                <th className="py-3 px-4">AISHE / Ref Identifier</th>
                <th className="py-3 px-4">Legal Institution Name</th>
                <th className="py-3 px-4">State & District</th>
                <th className="py-3 px-4">Approved Intake</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Dataset Version</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEAF5]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#5F6485]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#7450D8]" />
                    Loading registry reference records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#8589A6]">
                    No reference records found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FAF8FF] transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#7450D8] bg-[#F3EEFC] px-2 py-0.5 rounded-md border border-[#DCD0F7]">
                        {r.reference_identifier}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#171B45]">{r.institution_name}</div>
                      <div className="text-[10px] text-[#8589A6] font-mono mt-0.5">
                        Norm: {r.institution_name_normalized}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#5F6485]">
                      {r.state || 'N/A'}{r.district ? `, ${r.district}` : ''}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-[#171B45]">
                      {r.approved_intake ? `${r.approved_intake} seats` : 'Not Specified'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'ACTIVE'
                          ? 'bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]'
                          : 'bg-[#FAF9FC] text-[#5F6485] border border-[#E9E6F2]'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#8589A6] font-mono">
                      {r.source_dataset}:{r.dataset_version}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & CTA */}
        <div className="p-4 bg-[#FAF9FC] border-t border-[#EEEAF5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5F6485]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#12B886]" />
            <span>Deterministic Cross-Verification Engine · Levenshtein Distance & Token Jaccard Matching</span>
          </div>

          {onNavigateToApplications && (
            <button
              onClick={onNavigateToApplications}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#DCD0F7] text-[#7450D8] font-semibold hover:bg-[#FAF8FF] transition-colors cursor-pointer text-xs"
            >
              <span>Verify Institutional Dossier</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 5. Import Dataset Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E9E6F2] shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#EEEAF5] pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-[#171B45]">
                <Upload className="w-4 h-4 text-[#7450D8]" />
                Import Reference Dataset Batch (JSON)
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg text-[#8589A6] hover:bg-[#FAF8FF] hover:text-[#171B45]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#5F6485]">
              Upload or paste authorized institutional records to populate the verification baseline. Duplicate records within the batch or matching existing reference identifiers are updated with transactional integrity.
            </p>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-[#171B45]">
                <span>JSON Payload</span>
                <button
                  onClick={handleQuickSeed}
                  className="text-[11px] text-[#7450D8] hover:underline cursor-pointer"
                >
                  Load Sample Batch
                </button>
              </div>
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                rows={10}
                className="w-full font-mono text-[11px] p-3 rounded-xl border border-[#E9E6F2] bg-[#FAF9FC] text-[#171B45] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#7450D8]/20 focus:border-[#7450D8]"
                placeholder="Paste JSON import payload..."
              />
            </div>

            {importResult && (
              <div className="p-3 rounded-xl bg-[#ECFDF3] border border-[#A6F4C5] text-xs text-[#027A48] flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{importResult}</span>
              </div>
            )}

            {importError && (
              <div className="p-3 rounded-xl bg-[#FFF0EF] border border-[#FECDCA] text-xs text-[#B42318] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#F04438]" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EEEAF5]">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5F6485] hover:bg-[#FAF8FF] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={importing || !importJsonText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7450D8] hover:bg-[#5633B8] disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${importing ? 'animate-spin' : ''}`} />
                {importing ? 'Importing Batch...' : 'Execute Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
