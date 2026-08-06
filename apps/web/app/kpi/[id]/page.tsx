/**
 * KPI 상세 화면.
 *
 * 평가영역 셀은 **인접한 동일 값만** rowspan으로 병합한다(표시 규칙).
 * 도넛의 영역 비중은 인접 여부와 무관하게 같은 이름을 모두 합산한다(계산 규칙).
 * 둘을 섞지 않는다 — screen-behavior.md.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AchievementBadge } from '@/components/kpi/achievement-badge'
import { AreaDonut } from '@/components/kpi/area-donut'
import { DeleteEvaluationButton } from '@/components/kpi/delete-evaluation-button'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  areaRowSpans,
  areaWeightRatios,
  formatBasePeriod,
  formatOptional,
  formatPercent1,
  formatScore1,
  isRateCapped,
  itemAchievementRate,
  itemWeightedScore,
  totalAchievementRate,
  type CalcItem,
} from '@kpi/core'
import { getKpiEvaluation } from '@/lib/api-client'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  )
}

export default async function KpiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const evaluation = await getKpiEvaluation(id)
  if (!evaluation) notFound()

  const calcItems: CalcItem[] = evaluation.items.map((item) => ({
    evaluationArea: item.evaluationArea,
    targetCount: item.targetCount,
    achievedCount: item.achievedCount,
    weight: item.weight,
  }))

  const total = totalAchievementRate(calcItems)
  const areas = areaWeightRatios(calcItems)
  const spans = areaRowSpans(calcItems)

  return (
    <div className="space-y-6">
      <Link href="/kpi" className="text-sm text-muted-foreground hover:underline">
        ← 목록으로
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">KPI 상세</h1>
        <div className="flex gap-2">
          <Link
            href={`/kpi/${evaluation.id}/edit`}
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            수정
          </Link>
          <DeleteEvaluationButton id={evaluation.id} name={evaluation.employeeName} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">사원 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="아이디" value={evaluation.employeeLoginId} />
            <Field label="이름" value={evaluation.employeeName} />
            <Field label="부서명" value={evaluation.departmentName} />
            <Field label="팀" value={formatOptional(evaluation.teamName)} />
            <Field label="직책" value={evaluation.position} />
            <Field
              label="기준 기간"
              value={formatBasePeriod(evaluation.baseYear, evaluation.baseHalf)}
            />
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">종합 달성률</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold" data-testid="total-rate">
              {formatPercent1(total)}
            </p>
            <AchievementBadge rate={total} className="mt-3 text-sm" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">평가영역별 비중</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaDonut data={areas} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">KPI 항목</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>평가영역</TableHead>
                  <TableHead>항목</TableHead>
                  <TableHead>측정지표</TableHead>
                  <TableHead>목표치</TableHead>
                  <TableHead className="text-right">목표개수</TableHead>
                  <TableHead className="text-right">달성개수</TableHead>
                  <TableHead className="text-right">가중치</TableHead>
                  <TableHead className="text-right">달성률</TableHead>
                  <TableHead className="text-right">가중점수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluation.items.map((item, index) => {
                  const calcItem = calcItems[index]
                  const capped = isRateCapped(calcItem)
                  return (
                    <TableRow key={item.id}>
                      {spans[index] > 0 && (
                        <TableCell
                          rowSpan={spans[index]}
                          className="bg-muted/40 align-top font-medium"
                        >
                          {item.evaluationArea}
                        </TableCell>
                      )}
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatOptional(item.metric)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatOptional(item.targetValue)}
                      </TableCell>
                      <TableCell className="text-right">{item.targetCount}</TableCell>
                      <TableCell className="text-right">{item.achievedCount}</TableCell>
                      <TableCell className="text-right">
                        {formatPercent1(item.weight)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercent1(itemAchievementRate(calcItem))}
                        {capped && (
                          <span
                            className="ml-1 text-xs text-amber-700 dark:text-amber-500"
                            title="목표를 초과했지만 달성률은 100%로 상한을 적용합니다"
                          >
                            (상한)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatScore1(itemWeightedScore(calcItem))}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
