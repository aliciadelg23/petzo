import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/lib/colors';
import type { OrderStatus } from '@/features/orders/api';

const LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pago',
  PROCESSING: 'Em preparação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

const BG: Record<OrderStatus, string> = {
  PENDING_PAYMENT: '#fef3c7',
  PAID: '#d1fae5',
  PROCESSING: '#dbeafe',
  SHIPPED: '#e0e7ff',
  DELIVERED: colors.neutral200,
  CANCELLED: '#fee2e2',
};

const FG: Record<OrderStatus, string> = {
  PENDING_PAYMENT: '#92400e',
  PAID: '#065f46',
  PROCESSING: '#1e40af',
  SHIPPED: '#3730a3',
  DELIVERED: colors.neutral700,
  CANCELLED: '#991b1b',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <View style={[styles.badge, { backgroundColor: BG[status] }]}>
      <Text style={[styles.text, { color: FG[status] }]}>{LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '600' },
});
