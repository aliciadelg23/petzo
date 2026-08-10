'use client';

// CLIENT — Recharts trabalha só no browser (SVG + hooks internos).

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatBRL } from '@/features/catalog/lib';

interface Props {
  data: { date: string; revenue: number; orders: number }[];
}

export function SalesChart({ data }: Props) {
  // Formata data para exibir só o dia (DD/MM)
  const chartData = data.map((d) => ({
    ...d,
    label: `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`,
    revenueBRL: d.revenue / 100,
  }));

  return (
    <div className="h-72 w-full rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-neutral-900">
        Vendas — últimos 30 dias
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `R$ ${v.toFixed(0)}`}
          />
          <Tooltip
            formatter={(v: number) => formatBRL(Math.round(v * 100))}
            labelFormatter={(l: string) => `Dia ${l}`}
          />
          <Line
            type="monotone"
            dataKey="revenueBRL"
            name="Receita"
            stroke="#d84f14"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
