/**
 * KPI 목록 화면.
 *
 * 검색 조건은 searchParams에 있다. 서버 컴포넌트가 service를 직접 호출한다.
 * 근거: docs/design-reviews/screen-behavior.md
 */

import Link from 'next/link'
import { AchievementBadge } from '@/components/kpi/achievement-badge'
import { KpiFilters } from '@/components/kpi/kpi-filters'
import { KpiPagination } from '@/components/kpi/kpi-pagination'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatBasePeriod, formatOptional, formatPercent1, type BaseHalfValue } from '@kpi/core'
import type { KpiListQuery } from '@kpi/core/contract'
import { listBasePeriods, listKpiEvaluations } from '@/lib/api-client'

type SearchParams = Record<string, string | string[] | undefined>

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/** `2026-SECOND` 한 덩어리로 주고받는다. 파싱 실패 시 조건에서 무시한다. */
function parsePeriod(value: string | undefined) {
  if (!value) return {}
  const match = /^(\d{4})-(FIRST|SECOND)$/.exec(value)
  if (!match) return {}
  return { baseYear: Number(match[1]), baseHalf: match[2] as BaseHalfValue }
}

function toQuery(searchParams: SearchParams): KpiListQuery {
  const page = Number(single(searchParams.page) ?? '1')
  return {
    departmentName: single(searchParams.department),
    teamName: single(searchParams.team),
    employeeName: single(searchParams.name),
    position: single(searchParams.position),
    ...parsePeriod(single(searchParams.period)),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

/** 페이지네이션 링크에 유지할 필터 조건 (page 제외) */
function filterParams(searchParams: SearchParams): Record<string, string> {
  const keys = ['department', 'team', 'name', 'position', 'period'] as const
  const result: Record<string, string> = {}
  for (const key of keys) {
    const value = single(searchParams[key])
    if (value) result[key] = value
  }
  return result
}

export default async function KpiListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolved = await searchParams
  const query = toQuery(resolved)
  const params = filterParams(resolved)
  const hasFilter = Object.keys(params).length > 0

  const [result, periods] = await Promise.all([listKpiEvaluations(query), listBasePeriods()])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">KPI 목록</h1>
        {/* Base UI Button에는 asChild가 없다. 링크는 buttonVariants로 스타일만 입힌다. */}
        <Link href="/kpi/new" className={buttonVariants({ size: 'lg' })}>
          KPI 등록
        </Link>
      </div>

      <KpiFilters periods={periods} />

      <p className="text-sm text-muted-foreground">총 {result.totalCount}건</p>

      {result.rows.length === 0 ? (
        <div className="rounded-lg border bg-card px-6 py-16 text-center">
          {hasFilter ? (
            <>
              <p className="text-sm text-muted-foreground">조건에 맞는 KPI가 없습니다.</p>
              <Link href="/kpi" className={buttonVariants({ variant: 'link', className: 'mt-2' })}>
                필터 초기화
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">등록된 KPI가 없습니다.</p>
              <Link
                href="/kpi/new"
                className={buttonVariants({ variant: 'link', className: 'mt-2' })}
              >
                첫 KPI 등록하기
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>부서명</TableHead>
                  <TableHead>팀</TableHead>
                  <TableHead>직책</TableHead>
                  <TableHead>기준 기간</TableHead>
                  <TableHead>종합 달성률</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-semibold">{row.employeeName}</TableCell>
                    <TableCell>{row.departmentName}</TableCell>
                    <TableCell>{formatOptional(row.teamName)}</TableCell>
                    <TableCell>{row.position}</TableCell>
                    <TableCell>{formatBasePeriod(row.baseYear, row.baseHalf)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span className="font-medium">
                          {formatPercent1(row.totalAchievementRate)}
                        </span>
                        <AchievementBadge rate={row.totalAchievementRate} />
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/kpi/${row.id}`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        상세보기
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <KpiPagination
            page={result.page}
            totalCount={result.totalCount}
            pageSize={result.pageSize}
            params={params}
          />
        </>
      )}
    </div>
  )
}
