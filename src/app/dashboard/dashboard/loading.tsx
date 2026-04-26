import { DashboardLayout, DashboardSkeleton } from '@/components/dashboard';
import { MOCK_USER } from '@/constants/mockData';

/**
 * Render the dashboard loading UI used by the Next.js App Router during initial page load and client-side navigation.
 *
 * Displays the standard dashboard layout populated with a skeleton placeholder so the sidebar and header remain stable while content loads.
 *
 * @returns The JSX element that renders the dashboard skeleton inside the dashboard layout
 */
export default function DashboardLoading() {
  return (
    <DashboardLayout
      currentUser={MOCK_USER}
      pageTitle="대시보드"
      notifications={[]}
    >
      <DashboardSkeleton />
    </DashboardLayout>
  );
}
