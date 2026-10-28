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
} from 'lucide-react';
import {
  fetchRegistryProviders,
  fetchRegistryRecords,
  importRegistryDataset,
  type RegistryProviderInfo,
  type RegistryRecordItem,
} from '../../api/client';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-[30px] font-display font-bold tracking-tight text-[#202936] flex items-center gap-2.5">
              <Database className="size-6 text-[#1F3954] shrink-0" />
              Statutory Reference Registries &amp; AISHE Integrations
            </h1>
            <span className="text-xs font-semibold bg-[#EBF7F0] text-[#0D7A48] border border-[#0D7A48]/20 px-3 py-0.5 rounded-full font-sans">
              Deterministic Baseline
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#536174] mt-1 font-sans font-normal">
            Reference database for deterministic cross-verification of institution legal names, AISHE codes, and approved intake ceilings.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            className="h-9 px-4 rounded-full border border-[#E5DACF] bg-white hover:bg-[#FAF5F0] text-[#536174] hover:text-[#202936] inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer font-sans"
            title="Refresh Registry Data"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-[#33CC7A]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowImportModal(true);
              setImportResult(null);
              setImportError(null);
              if (!importJsonText) handleQuickSeed();
            }}
            className="h-9 px-4 rounded-full bg-[#33CC7A] hover:bg-[#2EB86E] text-[#202936] font-medium text-xs inline-flex items-center gap-1.5 transition-all shadow-[0_2px_10px_rgba(51,204,122,0.25)] cursor-pointer font-sans"
          >
            <Upload className="size-3.5" />
            <span>Import Reference Dataset</span>
          </button>
        </div>
      </div>

      {/* 2. Advisory Notice */}
      <div className="bg-[#FAF5F0] border border-[#E5DACF] rounded-2xl p-4 text-xs space-y-1 font-sans">
        <div className="flex items-center gap-2 font-medium text-[#1F3954]">
          <Info className="size-4 text-[#1F3954] shrink-0" />
          <span>Statutory Provenance &amp; Verification Disclosure</span>
        </div>
        <p className="text-xs text-[#536174] leading-relaxed pl-6 font-normal">
          Reference data is evaluated against authorized statutory registry fixtures and local AISHE adapters. External live government network calls require configured institutional credentials; unconfigured endpoints operate in simulated sandbox mode to ensure evidence integrity.
        </p>
      </div>

      {/* 3. Providers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => {
          const isSelected = selectedProvider === p.provider_code;
          return (
            <div
              key={p.provider_code}
              onClick={() => setSelectedProvider(p.provider_code)}
              className={`rounded-2xl border transition-all cursor-pointer shadow-[0_2px_12px_-2px_rgba(32,41,54,0.04)] p-5 space-y-3 ${
                isSelected
                  ? 'border-[#1F3954] ring-2 ring-[#1F3954]/15 bg-white'
                  : 'border-[#E5DACF] hover:border-[#1F3954]/50 bg-white'
              }`}
            >
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`size-8 rounded-lg flex items-center justify-center font-medium text-xs shrink-0 font-sans ${
                        p.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-destructive'
                      }`}
                    >
                      <Database className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-display font-semibold text-foreground">
                        {p.provider_name}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs text-primary font-medium">
                        {p.provider_code}
                      </CardDescription>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-xs font-medium font-sans ${
                      p.status === 'AVAILABLE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {p.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="px-4 sm:px-5 py-2 text-xs text-muted-foreground leading-relaxed font-sans font-normal">
                {p.description}
              </CardContent>

              <CardFooter className="px-4 sm:px-5 py-2.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/20 font-sans">
                <span>
                  Authority: <strong className="text-foreground font-medium">{p.statutory_authority}</strong>
                </span>
                {p.is_synthetic && (
                  <span className="bg-[#EEE5DC] text-[#202936] border border-[#E5DACF] text-[10px] font-medium px-2 py-0.5 rounded-full font-sans">
                    SIMULATED SANDBOX
                  </span>
                )}
              </CardFooter>
            </div>
          );
        })}
      </div>

      {/* 4. Registered Institutional Reference Records Table */}
      <div className="bg-white rounded-2xl border border-[#E5DACF] shadow-[0_4px_24px_-4px_rgba(27,20,17,0.04)] overflow-hidden">
        <div className="p-5 border-b border-[#E5DACF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF5F0]/40">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-[#1F3954] shrink-0" />
            <h2 className="text-[17px] font-display font-semibold text-[#202936]">
              Reference Registry Records ({records.length})
            </h2>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#536174] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search identifier or institution name..."
                className="h-9 text-xs pl-8 pr-3 w-64 rounded-full border border-[#E5DACF] bg-white text-[#202936] focus:outline-hidden focus:border-[#1F3954] font-sans"
              />
            </div>
            <button
              type="submit"
              className="h-9 px-4 rounded-full bg-[#1F3954] text-[#FAF5F0] hover:bg-[#1F3954]/90 text-xs font-medium cursor-pointer font-sans"
            >
              Filter
            </button>
          </form>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground py-2.5 px-4 font-sans tracking-normal">
                  AISHE / Ref Identifier
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground py-2.5 px-4 font-sans tracking-normal">
                  Legal Institution Name
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground py-2.5 px-4 font-sans tracking-normal">
                  State &amp; District
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground py-2.5 px-4 font-sans tracking-normal">
                  Approved Intake
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground py-2.5 px-4 font-sans tracking-normal">
                  Status
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground py-2.5 px-4 font-sans tracking-normal">
                  Dataset Version
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-xs text-muted-foreground font-sans">
                    <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading registry reference records...
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-xs text-muted-foreground font-sans">
                    No reference records found matching your filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="py-3 px-4 font-mono font-medium text-xs text-primary">
                      <Badge variant="outline" className="bg-secondary text-primary border-primary/20 font-mono text-xs">
                        {r.reference_identifier}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="font-medium text-sm text-foreground font-sans">{r.institution_name}</div>
                      <div className="text-xs text-muted-foreground font-sans mt-0.5">
                        Norm: {r.institution_name_normalized}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-xs text-muted-foreground font-sans">
                      {r.state || 'N/A'}{r.district ? `, ${r.district}` : ''}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-sans font-medium text-xs text-foreground">
                      {r.approved_intake ? `${r.approved_intake} seats` : 'Not Specified'}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium ${
                          r.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-[11px] text-muted-foreground font-mono">
                      {r.source_dataset}:{r.dataset_version}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        <CardFooter className="p-3.5 bg-muted/20 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
            <span>Deterministic Cross-Verification Engine · Levenshtein Distance & Token Jaccard Matching</span>
          </div>

          {onNavigateToApplications && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToApplications}
              className="h-7 text-xs gap-1.5 text-primary border-primary/30 hover:bg-secondary hover:text-primary"
            >
              <span>Verify Institutional Dossier</span>
              <ExternalLink className="size-3" />
            </Button>
          )}
        </CardFooter>
      </div>

      {/* 5. Accessible Import Dataset Dialog */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Upload className="size-4 text-primary" />
              Import Reference Dataset Batch (JSON)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upload or paste authorized institutional records to populate the verification baseline. Duplicate records within the batch or matching existing reference identifiers are updated with transactional integrity.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex justify-between items-center text-xs font-medium text-foreground">
              <span>JSON Payload</span>
              <button
                onClick={handleQuickSeed}
                className="text-[11px] text-primary hover:underline cursor-pointer font-semibold"
              >
                Load Sample Batch
              </button>
            </div>
            <Textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              rows={9}
              className="font-mono text-[11px] bg-muted/20"
              placeholder="Paste JSON import payload..."
            />

            {importResult && (
              <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 py-2">
                <Check className="size-4 text-emerald-600 shrink-0" />
                <AlertDescription className="text-xs">{importResult}</AlertDescription>
              </Alert>
            )}

            {importError && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="size-4 shrink-0" />
                <AlertDescription className="text-xs">{importError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImportModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteImport}
              disabled={importing || !importJsonText.trim()}
              className="text-xs gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${importing ? 'animate-spin' : ''}`} />
              <span>{importing ? 'Importing Batch...' : 'Execute Import'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
