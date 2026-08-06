/**
 * KPI 수정 화면.
 *
 * 등록과 같은 폼에 기존 값을 채운다. 저장 시 항목은 전체 교체된다(③).
 */

import { notFound } from 'next/navigation'
import { KpiForm, type FormValues } from '@/components/kpi/kpi-form'
import { getKpiEvaluation, listEvaluationAreas } from '@/lib/api-client'
import { yearOptions } from '@kpi/core'

export default async function KpiEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [evaluation, areas] = await Promise.all([getKpiEvaluation(id), listEvaluationAreas()])
  if (!evaluation) notFound()

  const years = yearOptions()
  // 저장된 연도가 옵션 범위 밖일 수 있다. 그때도 셀렉트에서 고를 수 있게 넣어준다.
  const yearsWithCurrent = years.includes(evaluation.baseYear)
    ? years
    : [...years, evaluation.baseYear].sort((a, b) => b - a)

  const initialValues: FormValues = {
    employeeLoginId: evaluation.employeeLoginId,
    employeeName: evaluation.employeeName,
    departmentName: evaluation.departmentName,
    teamName: evaluation.teamName ?? '',
    position: evaluation.position,
    baseYear: String(evaluation.baseYear),
    baseHalf: evaluation.baseHalf,
    items: evaluation.items.map((item) => ({
      evaluationArea: item.evaluationArea,
      itemName: item.itemName,
      metric: item.metric ?? '',
      targetValue: item.targetValue ?? '',
      targetCount: String(item.targetCount),
      achievedCount: String(item.achievedCount),
      weight: String(item.weight),
    })),
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">KPI 수정</h1>
      <KpiForm
        mode="edit"
        evaluationId={evaluation.id}
        initialValues={initialValues}
        areaSuggestions={areas}
        yearOptions={yearsWithCurrent}
      />
    </div>
  )
}
