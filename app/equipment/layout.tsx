import AppShell from '@/components/layout/AppShell'

export default async function EquipmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
