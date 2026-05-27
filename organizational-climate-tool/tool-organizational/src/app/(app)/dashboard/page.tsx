"use client"

import React, { useEffect, useState } from "react";
import StatCardGrids from "@/components/dashboard/StatCardGrids";
import { ChartBarStacked } from "@/components/dashboard/charts/EngagementChart";
import { ChartRadialShape } from "@/components/dashboard/charts/RadialChart";
import { ChartPieLabel } from "@/components/dashboard/charts/PieChart";
import { ChartBarInteractive } from "@/components/dashboard/charts/BarChartInteractive";
import { ChartLineTrends } from "@/components/dashboard/charts/ChartLineTrends";
import { ChartBarComparative } from "@/components/dashboard/charts/ChartBarComparative";
import { DataTable, Pesquisa, columns } from "@/components/dashboard/DataTable";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { useAuth } from "@/context/AuthContext";
import { pesquisaService } from "@/lib/services/pesquisaService";
import { dashboardService } from "@/lib/services/dashboardService";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Inbox, FilePlus2 } from "lucide-react";

const DashboardPage = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  const [hasDashboards, setHasDashboards] = useState<boolean | null>(null);
  const [loadingDashboards, setLoadingDashboards] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!user?.empresa_id) return;
    setIsLoading(true);
    // Só mostra skeleton na carga inicial — evita piscar ao mudar dateRange
    if (!dashboardData) {
      setLoadingDashboards(true);
    }

    // Carregar pesquisas
    pesquisaService.listByEmpresa(user.empresa_id)
      .then((data) => {
        setPesquisas((data || []).map((p: any) => ({
          id: String(p.id_pesquisa),
          title: p.titulo,
          status: p.status === "Ativa" ? "em_andamento" : p.status === "Concluída" ? "concluido" : "rascunho",
          participantes: p.participantes ?? 0,
          dataCriacao: p.data_criacao || new Date().toISOString(),
          type: p.tipo || undefined,
        })));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));

    const formatDate = (d: Date | undefined) => {
      if (!d) return undefined;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const start_date = formatDate(dateRange?.from);
    const end_date = formatDate(dateRange?.to);

    // Carregar dashboards e agregar dados reais
    dashboardService.getEmpresaDashboardData(user.empresa_id, start_date, end_date)
      .then((dData) => {
        if (dData && (dData.total_respostas > 0 || dData.metricas_por_pergunta.length > 0)) {
          setHasDashboards(true);
          setDashboardData(dData);
        } else {
          setHasDashboards(false);
          setDashboardData(null);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar dados do dashboard no page:", err);
        setHasDashboards(false);
      })
      .finally(() => setLoadingDashboards(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dateRange]);

  // 1. Estado de Carregamento Seguro (Skeletons)
  if (loadingDashboards) {
    return (
      <section className="container mx-auto px-4 mt-10 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-12 w-48 rounded-lg" />
          <Skeleton className="h-10 w-64 rounded-md" />
        </div>
        <Skeleton className="h-4 w-96 mb-8" />
        
        {/* StatCards Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>

        {/* Large Chart Skeleton */}
        <Skeleton className="h-[350px] w-full rounded-xl mt-6" />

        {/* Three Grid Charts Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <Skeleton className="h-[250px] w-full rounded-xl" />
          <Skeleton className="h-[250px] w-full rounded-xl" />
          <Skeleton className="h-[250px] w-full rounded-xl" />
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 mt-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="w-fit text-3xl font-bold tracking-tight bg-blue-500 text-white p-2 rounded-lg">
          Dashboard
        </h1>
        <div className="flex items-center gap-2">
          {dateRange && (
            <Button variant="ghost" onClick={() => setDateRange(undefined)}>
              Limpar
            </Button>
          )}
          <DateRangePicker date={dateRange} onSelect={setDateRange} />
        </div>
      </div>
      <p className="text-muted-foreground mt-2 mb-6">
        Visão geral da sua organização.
      </p>

      {/* 2. Banner de Aviso Elegante (Se sem dados ou com erro) */}
      {!hasDashboards && (
        <div className="mb-8 relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-amber-900 shadow-sm backdrop-blur-sm transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Inbox className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Sem dados disponíveis ou erro ao carregar o dashboard</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Não localizamos dados de clima organizacional ou pesquisas respondidas para sua empresa neste período.
                </p>
              </div>
            </div>
            <Link href="/pesquisas">
              <span className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors duration-200 cursor-pointer shrink-0">
                <FilePlus2 className="h-3.5 w-3.5" />
                Criar Nova Pesquisa
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Exibir sempre todos os componentes para Graceful Degradation */}
      <div className="space-y-6 mt-6">
        <StatCardGrids dateRange={dateRange} data={dashboardData} />

        <div className="w-full">
          <ChartBarInteractive dateRange={dateRange} data={dashboardData} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ChartBarStacked data={dashboardData} />
          <ChartPieLabel data={dashboardData} />
          <ChartRadialShape data={dashboardData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartLineTrends dateRange={dateRange} data={dashboardData} />
          <ChartBarComparative dateRange={dateRange} data={dashboardData} />
        </div>

        <div className="bg-background rounded-lg border p-4 h-full">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={pesquisas} 
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default DashboardPage;