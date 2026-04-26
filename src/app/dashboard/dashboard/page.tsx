import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { DashboardSkeleton } from '@/components/dashboard/skeletons';
import { getDashboardUser } from '@/lib/dashboard/currentUser';
import { getInitialNotifications } from '@/lib/dashboard/getInitialNotifications';

/**
 * Render the dashboard page shell on the server and defer client-side content rendering.
 *
 * Fetches the current dashboard user and initial notifications concurrently, passes them
 * into the server-rendered DashboardLayout, and wraps the client DashboardContent in a
 * Suspense boundary that shows DashboardSkeleton as a fallback.
 *
 * @returns The rendered dashboard page React element
 */
export default async function DashboardPage() {
  const [currentUser, notifications] = await Promise.all([
    getDashboardUser(),
    getInitialNotifications(),
  ]);

  return (
    <DashboardLayout
      currentUser={currentUser}
      pageTitle="대시보드"
      notifications={notifications}
    >
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </DashboardLayout>
  );
}
