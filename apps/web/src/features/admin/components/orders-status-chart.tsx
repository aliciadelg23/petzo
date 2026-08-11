/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — recharts 2.15 types conflitam com @types/react 19 (forçado
// pelo override do workspace). Runtime OK; reverter quando recharts publicar
// tipos compatíveis com React 19 (issue recharts#4795).
'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OrderStatus } from '../types';

const LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Aguard.',
  PAID: 'Pago',
  PROCESSING: 'Em prep.',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancel.',
};

const COLOR: Record<OrderStatus, string> = {
  PENDING_PAYMENT: '#eab308',
  PAID: '#10b981',
  PROCESSING: '#3b82f6',
  SHIPPED: '#6366f1',
  DELIVERED: '#737373',
  CANCELLED: '#ef4444',
};

interface Props {
  data: Record<OrderStatus, number>;
}

export function OrdersStatusChart({ data }: Props) {
  const rows = (Object.keys(data) as OrderStatus[]).map((k) => ({
    status: k,
    label: LABEL[k],
    count: data[k],
    fill: COLOR[k],
  }));

  return (
    <div className="h-72 w-full rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-neutral-900">Pedidos por status</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" name="Quantidade" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
