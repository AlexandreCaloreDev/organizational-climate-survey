import StatCard from "./StatCard";
import { DateRange } from "react-day-picker";

interface StatCardGridsProps {
  dateRange?: DateRange;
  data?: any;
}

const StatCardGrids = ({ dateRange, data }: StatCardGridsProps) => {
  const totalParticipantes = data?.total_respostas || 0;
  const taxa = data?.taxa_participacao ? `${data.taxa_participacao}%` : "0%";
  const npsValue = data?.nps_geral !== undefined ? String(data.nps_geral) : "N/A";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Total de Respostas" value={totalParticipantes.toString()} iconName="clipboardCheck" change="" />
      <StatCard title="Participantes Ativos" value={totalParticipantes.toString()} iconName="users" change="" />
      <StatCard title="Engajamento Médio" value={taxa} iconName="smile" change="" tooltip="Média das respostas positivas na escala" />
      <StatCard title="NPS Geral" value={npsValue} iconName="star" change="" tooltip="Calculado por: % Promotores [9-10] - % Detratores [0-6]" />
    </div>
  );
};

export default StatCardGrids;
