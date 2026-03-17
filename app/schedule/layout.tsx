import AppShell from '@/components/layout/AppShell'

export default async function ScheduleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
