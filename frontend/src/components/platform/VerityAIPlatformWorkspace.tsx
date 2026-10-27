import React, { useState, useEffect } from 'react';
import {
  Key,
  Layers,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  RotateCw,
  Trash2,
  Cpu,
  Lock,
  Plus,
  RefreshCw,
  Terminal,
  Activity,
  AlertTriangle,
} from 'lucide-react';

import {
  fetchIntegrationGatewayHealth,
  fetchIntegrationClients,
  createIntegrationClient,
  rotateIntegrationClientSecret,
  revokeIntegrationClient,
  type IntegrationGatewayHealth,
  type IntegrationClientItem,
  type IntegrationClientCreated,
} from '../../api/client';

export type PlatformTabKey = 'overview' | 'integrations' | 'docs';

export const VerityAIPlatformWorkspace: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<PlatformTabKey>('overview');
  const [health, setHealth] = useState<IntegrationGatewayHealth | null>(null);
  const [clients, setClients] = useState<IntegrationClientItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Key Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientDesc, setNewClientDesc] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'scrutiny:create',
    'scrutiny:read',
    'documents:upload',
  ]);
  const [createdSecretData, setCreatedSecretData] = useState<IntegrationClientCreated | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Rotation Confirmation
  const [rotatingClientId, setRotatingClientId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [hData, cData] = await Promise.all([
        fetchIntegrationGatewayHealth(),
        fetchIntegrationClients().catch(() => []),
      ]);
      setHealth(hData);
      setClients(cData);
    } catch (err: any) {
      console.error('Failed to load platform data', err);
      setError(err?.message || 'Failed to load VerityAI Gateway status.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newClientName.trim()) return;
    setCreateLoading(true);
    setError(null);
    try {
      const created = await createIntegrationClient(newClientName, newClientDesc, selectedScopes);
      setCreatedSecretData(created);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to generate API credentials.');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleRotateSecret(clientId: string) {
    if (!window.confirm('Are you sure you want to rotate this API secret? The existing secret will immediately cease working.')) {
      return;
    }
    setRotatingClientId(clientId);
    try {
      const rotated = await rotateIntegrationClientSecret(clientId);
      setCreatedSecretData(rotated);
      setShowCreateModal(true);
      await loadData();
    } catch (err: any) {
      alert(`Rotation failed: ${err.message}`);
    } finally {
      setRotatingClientId(null);
    }
  }

  async function handleRevokeClient(clientId: string) {
    if (!window.confirm('Are you sure you want to revoke this integration client? All inbound requests using these credentials will be rejected.')) {
      return;
    }
    try {
      await revokeIntegrationClient(clientId);
      await loadData();
    } catch (err: any) {
      alert(`Revocation failed: ${err.message}`);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Brand Header Banner */}
      <div className="bg-gradient-to-r from-[#171B45] via-[#242A68] to-[#171B45] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <Cpu className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7450D8]/30 border border-[#7450D8]/50 text-xs font-semibold text-[#D1C4F8]">
            <Layers className="w-3.5 h-3.5" />
            INDEPENDENT SCRUTINY PLATFORM & API GATEWAY
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            VerityAI Intelligence Engine
          </h1>
          <p className="text-sm text-[#E2E8F0] max-w-2xl leading-relaxed">
            The core VerityAI document-scrutiny platform operates independently from institutional portals.
            Authorizing external platforms, state directorates, and autonomous universities to execute
            deterministic regulatory validation, OCR extraction, and evidence-traceable evaluation.
          </p>

          <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-[#D1C4F8]">
            <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Gateway: <span className="text-white font-bold">ONLINE</span> (v{health?.version || '0.1.0'})
            </div>
            <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              Auth: <span className="text-white">HMAC / PBKDF2 SHA-256</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-300" />
              Engine: <span className="text-white">{health?.ai_provider_mode || 'Local Deterministic Active'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#E2E8F0] gap-4">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center gap-2 pb-3 px-2 font-semibold text-sm border-b-2 transition-colors ${
            activeSubTab === 'overview'
              ? 'border-[#7450D8] text-[#7450D8]'
              : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          <Activity className="w-4 h-4" />
          Platform Overview
        </button>
        <button
          onClick={() => setActiveSubTab('integrations')}
          className={`flex items-center gap-2 pb-3 px-2 font-semibold text-sm border-b-2 transition-colors ${
            activeSubTab === 'integrations'
              ? 'border-[#7450D8] text-[#7450D8]'
              : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          <Key className="w-4 h-4" />
          API Integrations & Keys
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-[#EDE8FC] text-[#7450D8] font-bold">
            {clients.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('docs')}
          className={`flex items-center gap-2 pb-3 px-2 font-semibold text-sm border-b-2 transition-colors ${
            activeSubTab === 'docs'
              ? 'border-[#7450D8] text-[#7450D8]'
              : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          <FileCode className="w-4 h-4" />
          API Documentation
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── TAB 1: OVERVIEW ────────────────────────────────────────── */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
                <span>REGISTERED CLIENTS</span>
                <Key className="w-4 h-4 text-[#7450D8]" />
              </div>
              <div className="text-3xl font-extrabold text-[#0F172A] mt-2">
                {clients.length}
              </div>
              <p className="text-xs text-[#64748B] mt-1">Authorized external integration clients</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
                <span>GATEWAY PROTOCOL</span>
                <Layers className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-extrabold text-[#0F172A] mt-2">
                REST / Multipart
              </div>
              <p className="text-xs text-[#64748B] mt-1">Versioned at /api/v1/integrations</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
                <span>AI PROVIDER MODE</span>
                <ShieldCheck className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-xl font-extrabold text-[#0F172A] mt-2">
                Deterministic
              </div>
              <p className="text-xs text-[#64748B] mt-1">100% offline-capable, advisory only</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
                <span>HUMAN SUPREMACY</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-extrabold text-[#0F172A] mt-2">
                Strict Sign-Off
              </div>
              <p className="text-xs text-[#64748B] mt-1">AI never issues autonomous legal grants</p>
            </div>
          </div>

          {/* Architecture Decoupling Card */}
          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#7450D8]" />
              Architectural Separation: The Engine vs. The Portals
            </h3>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-lg font-mono text-xs text-[#334155] leading-relaxed overflow-x-auto">
              <div className="text-[#7450D8] font-bold"># EXTERNAL INTEGRATING CLIENTS</div>
              <div>├── [Client 1] Current Institutional Portal (via server-side client: vai_client_portal_internal)</div>
              <div>├── [Client 2] State Technical Directorate Portal (via vai_client_state_directorate_demo)</div>
              <div>└── [Client 3] Autonomous University Direct Scrutiny Ingestion Pipeline</div>
              <div className="text-emerald-700 font-bold mt-2"># AUTHENTICATED GATEWAY LAYER (/api/v1/integrations/...)</div>
              <div>├── PBKDF2-HMAC-SHA256 Token Verification (Constant-Time Compare)</div>
              <div>├── Scope Enforcement (scrutiny:create, scrutiny:read) & Idempotency Filter</div>
              <div className="text-sky-700 font-bold mt-2"># VERITYAI INTELLIGENCE CORE (Stateless & Independent)</div>
              <div>├── Multi-Engine OCR & Document Extraction (PyMuPDF / pdfplumber)</div>
              <div>├── Deterministic Regulatory Norms Engine (AICTE APH 2024-27 Clause 6.17)</div>
              <div>├── Cross-Document Anomaly Detection & Evidence Provenance Citations</div>
              <div>└── Official Scrutiny Decision-Support PDF Dossier Generation</div>
            </div>
          </div>

          {/* Capabilities Inventory */}
          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider text-[#64748B]">
              Engine Capabilities & Active Providers
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(health?.capabilities || [
                'PDF_TEXT_EXTRACTION',
                'MULTI_ENGINE_OCR',
                'DETERMINISTIC_REGULATORY_VALIDATION',
                'CROSS_DOCUMENT_ANOMALY_DETECTION',
                'EVIDENCE_PROVENANCE_LINKAGE',
                'DECISION_SUPPORT_REPORT_GENERATION',
              ]).map((cap) => (
                <div key={cap} className="flex items-center gap-2 text-xs font-semibold p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{cap}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: API INTEGRATIONS (KEY MANAGEMENT) ──────────────── */}
      {activeSubTab === 'integrations' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Registered Integration Clients</h2>
              <p className="text-xs text-[#64748B]">
                External platforms authorized to invoke VerityAI Scrutiny via API.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="px-3 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => {
                  setNewClientName('');
                  setNewClientDesc('');
                  setCreatedSecretData(null);
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#7450D8] hover:bg-[#633fc2] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create API Key
              </button>
            </div>
          </div>

          {/* Client Table */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                    <th className="p-3.5">Client Identity</th>
                    <th className="p-3.5">Client Identifier</th>
                    <th className="p-3.5">Secret Prefix</th>
                    <th className="p-3.5">Scopes</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Created</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#64748B]">
                        No external integration clients registered yet. Click &quot;Create API Key&quot; to authorize an external system.
                      </td>
                    </tr>
                  ) : (
                    clients.map((c) => (
                      <tr key={c.client_id} className="hover:bg-[#F8FAFC]">
                        <td className="p-3.5 font-semibold text-[#0F172A]">
                          <div>{c.client_name}</div>
                          {c.description && <div className="text-[11px] text-[#64748B] font-normal">{c.description}</div>}
                        </td>
                        <td className="p-3.5 font-mono text-[#7450D8] font-bold">{c.client_id}</td>
                        <td className="p-3.5 font-mono text-[#64748B]">{c.secret_prefix}</td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {c.scopes.map((s) => (
                              <span key={s} className="px-1.5 py-0.5 text-[10px] rounded bg-[#F1F5F9] text-[#334155] font-mono">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5">
                          {c.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 rounded-full border border-rose-200">
                              Revoked
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-[#64748B]">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="p-3.5 text-right space-x-2">
                          {c.is_active && (
                            <>
                              <button
                                onClick={() => handleRotateSecret(c.client_id)}
                                disabled={rotatingClientId === c.client_id}
                                className="px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors inline-flex items-center gap-1"
                                title="Rotate Secret Key"
                              >
                                <RotateCw className={`w-3 h-3 ${rotatingClientId === c.client_id ? 'animate-spin' : ''}`} />
                                Rotate
                              </button>
                              <button
                                onClick={() => handleRevokeClient(c.client_id)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition-colors inline-flex items-center gap-1"
                                title="Revoke Client"
                              >
                                <Trash2 className="w-3 h-3" />
                                Revoke
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: API DOCUMENTATION ──────────────────────────────── */}
      {activeSubTab === 'docs' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#7450D8]" />
              VerityAI Integration Gateway Contract (v1)
            </h2>
            <p className="text-xs text-[#64748B] leading-relaxed">
              External platforms integrate with VerityAI through standard HTTP/JSON and multipart endpoints.
              All requests must include an authorized client credential via the <code className="bg-[#F1F5F9] px-1 py-0.5 rounded text-[#7450D8]">X-API-Key</code> header.
            </p>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-4 bg-[#0F172A] text-[#F8FAFC] rounded-lg space-y-2">
                <div className="text-[#94A3B8]"># 1. Base URL</div>
                <div className="text-amber-300">http://127.0.0.1:8000/api/v1/integrations</div>

                <div className="text-[#94A3B8] pt-2"># 2. Authentication Header Format</div>
                <div className="text-emerald-400">X-API-Key: vai_client_YOUR_CLIENT_ID:vai_sec_YOUR_SECRET</div>
              </div>

              {/* Endpoint 1 */}
              <div className="border border-[#E2E8F0] rounded-lg p-4 space-y-2 bg-[#F8FAFC]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">POST</span>
                  <span className="font-bold text-[#0F172A]">/scrutiny-jobs</span>
                  <span className="text-[#64748B] text-[11px]">— Submit dossier for independent evaluation</span>
                </div>
                <div className="text-[#64748B] text-[11px]">
                  Content-Type: <code>multipart/form-data</code> | Scope: <code>scrutiny:create</code>
                </div>
                <pre className="p-3 bg-[#0F172A] text-emerald-300 rounded overflow-x-auto text-[11px]">
{`curl -X POST "http://127.0.0.1:8000/api/v1/integrations/scrutiny-jobs" \\
  -H "X-API-Key: vai_client_YOUR_ID:vai_sec_YOUR_SECRET" \\
  -F "external_reference=EXT-APP-2026-0042" \\
  -F "category_code=ENGINEERING_AND_TECHNOLOGY" \\
  -F 'declared_data={"land_area_acres": 8.5, "total_built_up_area_sqm": 12000, "total_approved_intake": 480}' \\
  -F "files=@/path/to/land_deed.pdf"`}
                </pre>
              </div>

              {/* Endpoint 2 */}
              <div className="border border-[#E2E8F0] rounded-lg p-4 space-y-2 bg-[#F8FAFC]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-sky-600 text-white font-bold text-[10px]">GET</span>
                  <span className="font-bold text-[#0F172A]">/scrutiny-jobs/&#123;job_id&#125;/results</span>
                  <span className="text-[#64748B] text-[11px]">— Retrieve evidence-linked findings</span>
                </div>
                <pre className="p-3 bg-[#0F172A] text-sky-300 rounded overflow-x-auto text-[11px]">
{`curl -X GET "http://127.0.0.1:8000/api/v1/integrations/scrutiny-jobs/VAI-JOB-8A9C12E4/results" \\
  -H "X-API-Key: vai_client_YOUR_ID:vai_sec_YOUR_SECRET"`}
                </pre>
              </div>

              {/* Endpoint 3 */}
              <div className="border border-[#E2E8F0] rounded-lg p-4 space-y-2 bg-[#F8FAFC]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-sky-600 text-white font-bold text-[10px]">GET</span>
                  <span className="font-bold text-[#0F172A]">/scrutiny-jobs/&#123;job_id&#125;/report</span>
                  <span className="text-[#64748B] text-[11px]">— Download official decision-support PDF report</span>
                </div>
                <pre className="p-3 bg-[#0F172A] text-purple-300 rounded overflow-x-auto text-[11px]">
{`curl -X GET "http://127.0.0.1:8000/api/v1/integrations/scrutiny-jobs/VAI-JOB-8A9C12E4/report" \\
  -H "X-API-Key: vai_client_YOUR_ID:vai_sec_YOUR_SECRET" \\
  --output "VerityAI_Scrutiny_Report.pdf"`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE / ROTATE API KEY MODAL ──────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {createdSecretData ? (
              /* One-Time Secret Reveal View */
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-base">
                  <CheckCircle2 className="w-5 h-5" />
                  API Credentials Generated Successfully
                </div>

                <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Save this secret key immediately!</strong>
                    For cryptographic security, VerityAI stores only a PBKDF2 hash of this secret.
                    It cannot be recovered or displayed again.
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="font-bold text-[#64748B]">Client ID</label>
                  <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg font-mono text-[#0F172A] select-all">
                    {createdSecretData.client_id}
                  </div>

                  <label className="font-bold text-[#64748B] block pt-2">API Secret (Raw Key)</label>
                  <div className="p-2.5 bg-[#0F172A] border border-[#0F172A] rounded-lg font-mono text-emerald-400 select-all break-all">
                    {createdSecretData.client_secret}
                  </div>

                  <label className="font-bold text-[#64748B] block pt-2">Combined Header Token</label>
                  <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg font-mono text-xs text-[#334155] select-all break-all flex items-center justify-between">
                    <span>{`${createdSecretData.client_id}:${createdSecretData.client_secret}`}</span>
                    <button
                      onClick={() => copyToClipboard(`${createdSecretData.client_id}:${createdSecretData.client_secret}`)}
                      className="ml-2 px-2.5 py-1 text-[11px] font-bold text-[#7450D8] bg-[#EDE8FC] hover:bg-[#DCD4F8] rounded flex items-center gap-1 flex-shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreatedSecretData(null);
                    }}
                    className="px-5 py-2 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-lg"
                  >
                    I Have Saved My Secret
                  </button>
                </div>
              </div>
            ) : (
              /* Create Key Form */
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                    <Key className="w-5 h-5 text-[#7450D8]" />
                    Authorize New External Integration Client
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="text-[#94A3B8] hover:text-[#0F172A] text-lg font-bold"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-[#334155] mb-1">
                      Integration Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. State Directorate of Technical Education"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7450D8]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#334155] mb-1">Description</label>
                    <input
                      type="text"
                      placeholder="e.g. State-level regulatory approval scrutiny pipeline"
                      value={newClientDesc}
                      onChange={(e) => setNewClientDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7450D8]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#334155] mb-2">Granted Scopes</label>
                    <div className="space-y-1.5">
                      {[
                        { id: 'scrutiny:create', label: 'scrutiny:create (Submit documents & trigger scrutiny)' },
                        { id: 'scrutiny:read', label: 'scrutiny:read (Poll status, view findings & download reports)' },
                        { id: 'documents:upload', label: 'documents:upload (Upload supporting statutory documents)' },
                      ].map((s) => (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedScopes.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedScopes([...selectedScopes, s.id]);
                              } else {
                                setSelectedScopes(selectedScopes.filter((x) => x !== s.id));
                              }
                            }}
                            className="rounded text-[#7450D8] focus:ring-[#7450D8]"
                          />
                          <span className="font-mono text-[#334155]">{s.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 font-semibold text-[#64748B] hover:text-[#0F172A]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading || !newClientName.trim()}
                    className="px-5 py-2 font-bold text-white bg-[#7450D8] hover:bg-[#633fc2] rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {createLoading ? 'Generating...' : 'Generate API Credentials'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
