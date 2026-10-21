import React, { useState, useEffect } from 'react';
import { fetchInstitutions, type Institution } from '../../api/client';
import { Building2, Search, MapPin, ShieldCheck, RefreshCw } from 'lucide-react';

export const EntitiesView: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await fetchInstitutions();
      setInstitutions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = institutions.filter(
    (inst) =>
      inst.institution_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inst.institution_identifier &&
        inst.institution_identifier.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inst.city && inst.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#171B45] flex items-center gap-2">
            Linked Entities & Institutions
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6485] mt-0.5">
            Registered educational institutions and organizational tenants in the VerityAI ecosystem.
          </p>
        </div>

        <button
          onClick={load}
          className="p-2 rounded-xl border border-[#E9E6F2] text-[#5F6485] hover:bg-[#FAF8FF] hover:text-[#7450D8] transition-colors cursor-pointer self-start sm:self-auto"
          title="Refresh entities"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8589A6]" />
        <input
          type="text"
          placeholder="Filter by institution name, code, or city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs rounded-xl border border-[#E9E6F2] bg-white pl-10 pr-4 py-2.5 text-[#171B45] focus:outline-hidden focus:ring-2 focus:ring-[#7450D8]/20 focus:border-[#7450D8]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-[#5F6485]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#7450D8] mx-auto mb-2" />
            Loading registered entities...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-[#8589A6]">
            No institutions match your search query.
          </div>
        ) : (
          filtered.map((inst, idx) => (
            <div
              key={inst.id}
              className="bg-white rounded-2xl border border-[#E9E6F2] p-5 shadow-xs hover:border-[#DCD0F7] transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      idx % 2 === 0
                        ? 'bg-[#F3EEFC] text-[#7450D8]'
                        : 'bg-[#FFF0EF] text-[#F04438]'
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#171B45] line-clamp-1">
                      {inst.institution_name}
                    </h3>
                    <div className="text-[11px] font-mono text-[#7450D8] font-semibold">
                      {inst.institution_identifier || inst.id}
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4F2] text-[#12B886]">
                  {inst.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-[#5F6485] pt-2 border-t border-[#EEEAF5]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#8589A6]" />
                  <span>
                    {inst.city ? `${inst.city}, ` : ''}{inst.state || 'India'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#8589A6]" />
                  <span>Category: {inst.institution_type?.replace(/_/g, ' ') || 'ENGINEERING COLLEGE'}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] text-[#8589A6]">
                <span>Tenant Isolation: Enforced</span>
                <span className="font-semibold text-[#7450D8]">View Dossier →</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
