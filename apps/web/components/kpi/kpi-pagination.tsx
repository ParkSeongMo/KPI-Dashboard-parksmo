/**
 * 목록 페이지네이션 — `이전` / 페이지 번호 / `다음`.
 *
 * 필터 조건을 유지한 채 page만 바꾼다.
 * 1페이지에서 `이전`, 마지막에서 `다음`은 링크가 아니라 비활성 표시로 둔다.
 */

import Link from 'next/link'
import { cn } from '@/lib/utils'

type Props = {
  page: number
  totalCount: number
  pageSize: number
  /** 현재 필터 조건. page를 제외한 값들이다. */
  params: Record<string, string>
}

export function KpiPagination({ page, totalCount, pageSize, params }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  if (totalPages <= 1) return null

  const href = (target: number) => {
    const next = new URLSearchParams(params)
    if (target > 1) next.set('page', String(target))
    else next.delete('page')
    return next.size > 0 ? `/kpi?${next}` : '/kpi'
  }

  const itemClass = 'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm'

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="페이지 이동">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(itemClass, 'hover:bg-accent')}>
          이전
        </Link>
      ) : (
        <span className={cn(itemClass, 'text-muted-foreground')} aria-disabled>
          이전
        </span>
      )}

      {Array.from({ length: totalPages }, (_, index) => index + 1).map((target) =>
        target === page ? (
          <span
            key={target}
            aria-current="page"
            className={cn(itemClass, 'bg-primary font-medium text-primary-foreground')}
          >
            {target}
          </span>
        ) : (
          <Link key={target} href={href(target)} className={cn(itemClass, 'hover:bg-accent')}>
            {target}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={href(page + 1)} className={cn(itemClass, 'hover:bg-accent')}>
          다음
        </Link>
      ) : (
        <span className={cn(itemClass, 'text-muted-foreground')} aria-disabled>
          다음
        </span>
      )}
    </nav>
  )
}
