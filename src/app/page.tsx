import { redirect } from 'next/navigation';

export default function RootPage() {
  // 루트 접근 시 홈페이지로 바로 이동
  redirect('/dashboard/dashboard');
}