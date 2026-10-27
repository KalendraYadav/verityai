import React, { useState, useEffect } from 'react';
import { fetchInstitutions, type Institution } from '../../api/client';
import { Building2, Search, MapPin, ShieldCheck, RefreshCw, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="size-6 text-primary shrink-0" />
              Registered Institutional Entities
            </h1>
            <Badge variant="outline" className="text-xs font-semibold bg-secondary text-primary border-primary/20">
              {institutions.length} Entities
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Accredited higher-education institutions, polytechnics, and universities evaluated under AICTE regulatory scrutiny norms.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="h-8 gap-1.5 text-xs text-muted-foreground self-start sm:self-auto"
          title="Refresh entities"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* 2. Search */}
      <div className="relative max-w-md">
        <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Filter by institution name, AISHE code, or city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 text-xs pl-8 pr-4 bg-card"
        />
      </div>

      {/* 3. Entity Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Building2}
              title="No institutions match your search query"
              description="Try adjusting your keywords or clearing the filter to see all registered educational entities."
            />
          </div>
        ) : (
          filtered.map((inst, idx) => (
            <Card
              key={inst.id}
              className="border-border shadow-[0_1px_3px_0_rgba(23,27,69,0.04)] hover:border-primary/40 transition-colors flex flex-col justify-between"
            >
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={`size-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        idx % 2 === 0
                          ? 'bg-secondary text-primary'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <Building2 className="size-4" />
                    </div>
                    <div className="overflow-hidden">
                      <CardTitle className="text-sm font-semibold text-foreground truncate" title={inst.institution_name}>
                        {inst.institution_name}
                      </CardTitle>
                      <CardDescription className="text-xs font-mono text-primary font-medium mt-0.5">
                        {inst.institution_identifier || inst.id.slice(0, 10)}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] shrink-0 font-medium">
                    {inst.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="px-4 sm:px-5 py-2 space-y-2 text-xs text-muted-foreground border-t border-border/60">
                <div className="flex items-center gap-2 pt-1">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {inst.city ? `${inst.city}, ` : ''}{inst.state || 'India'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">Category: {inst.institution_type?.replace(/_/g, ' ') || 'TECHNICAL COLLEGE'}</span>
                </div>
              </CardContent>

              <CardFooter className="px-4 sm:px-5 py-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground bg-muted/20">
                <span className="font-mono text-[10px]">Tenant Isolation: Enforced</span>
                <span className="font-semibold text-primary inline-flex items-center gap-1 hover:underline cursor-pointer">
                  <span>Dossiers</span>
                  <ArrowRight className="size-3" />
                </span>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
