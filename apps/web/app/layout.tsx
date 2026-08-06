import type { Metadata } from 'next'
import Link from 'next/link'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'KPI 대시보드',
  description: 'KPI 등록·조회·수정 데모',
  // 데모 전제로 인증이 없으므로 검색 노출을 막는다(auth-demo-scope.md)
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-muted/30">
        <header className="border-b bg-background">
          <div className="mx-auto w-full max-w-6xl px-6 py-3">
            <Link href="/kpi" className="text-sm font-semibold">
              KPI 대시보드
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  )
}
