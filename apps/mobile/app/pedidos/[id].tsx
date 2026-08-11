import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusBadge } from '@/components/StatusBadge';
import { useOrderQuery } from '@/features/orders/hooks';
import { formatBRL } from '@/lib/format';
import { colors, spacing } from '@/lib/colors';

export default function PedidoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useOrderQuery(id);

  if (q.isPending) return <ScreenContainer><Text style={styles.muted}>Carregando…</Text></ScreenContainer>;
  if (q.isError || !q.data)
    return <ScreenContainer><Text style={styles.error}>Pedido não encontrado.</Text></ScreenContainer>;

  const o = q.data;
  const addr = o.addressSnapshot;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.id}>#{o.id.slice(-8)}</Text>
        <StatusBadge status={o.status} />
      </View>
      <Text style={styles.date}>{new Date(o.createdAt).toLocaleString('pt-BR')}</Text>

      <Section title="Itens">
        {o.items.map((it) => (
          <View key={it.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{it.nameSnapshot}</Text>
              <Text style={styles.itemQty}>
                {it.quantity} × {formatBRL(it.priceSnapshot)}
              </Text>
            </View>
            <Text style={styles.itemTotal}>{formatBRL(it.lineTotal)}</Text>
          </View>
        ))}
      </Section>

      <Section title="Totais">
        <Row label="Subtotal" value={formatBRL(o.subtotal)} />
        {o.discount > 0 && <Row label="Desconto" value={`- ${formatBRL(o.discount)}`} />}
        <Row label="Frete" value={o.shipping === 0 ? 'Grátis' : formatBRL(o.shipping)} />
        <Row label="Total" value={formatBRL(o.total)} strong />
      </Section>

      <Section title="Endereço de entrega">
        <Text style={styles.addr}>
          {addr.street}, {addr.number}
          {addr.complement ? ` - ${addr.complement}` : ''}
        </Text>
        <Text style={styles.addr}>
          {addr.district} · {addr.city}/{addr.state}
        </Text>
        <Text style={styles.addrLight}>CEP {addr.zip}</Text>
      </Section>

      {o.payment && (
        <Section title="Pagamento">
          <Text style={styles.addr}>
            {o.payment.provider} · {o.payment.status}
          </Text>
          {o.payment.paidAt && (
            <Text style={styles.addrLight}>
              Pago em {new Date(o.payment.paidAt).toLocaleString('pt-BR')}
            </Text>
          )}
        </Section>
      )}
    </ScreenContainer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, strong && styles.totalStrong]}>{label}</Text>
      <Text style={[styles.totalLabel, strong && styles.totalStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.neutral500 },
  error: { color: colors.red600 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  id: { fontSize: 16, fontWeight: '700', color: colors.neutral900, fontFamily: 'monospace' },
  date: { color: colors.neutral500, fontSize: 12, marginTop: 4, marginBottom: spacing.md },
  section: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.neutral900, marginBottom: spacing.sm },
  itemRow: { flexDirection: 'row', paddingVertical: 4 },
  itemName: { color: colors.neutral900 },
  itemQty: { color: colors.neutral500, fontSize: 12 },
  itemTotal: { fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalLabel: { color: colors.neutral700 },
  totalStrong: { fontWeight: '700', color: colors.neutral900, fontSize: 16 },
  addr: { color: colors.neutral900 },
  addrLight: { color: colors.neutral500, fontSize: 12, marginTop: 2 },
});
