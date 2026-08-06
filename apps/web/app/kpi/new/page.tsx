/**
 * KPI 등록 화면.
 */

import { EMPTY_ITEM, KpiForm, type FormValues } from '@/components/kpi/kpi-form'
import { listEvaluationAreas } from '@/lib/api-client'
import { yearOptions } from '@kpi/core'

export default async function KpiCreatePage() {
  const areas = await listEvaluationAreas()
  const years = yearOptions()

  const initialValues: FormValues = {
    employeeLoginId: '',
    employeeName: '',
    departmentName: '',
    teamName: '',
    position: '',
    baseYear: String(years[0]),
    baseHalf: 'SECOND',
    items: [{ ...EMPTY_ITEM }],
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">KPI 등록</h1>
      <KpiForm
        mode="create"
        initialValues={initialValues}
        areaSuggestions={areas}
        yearOptions={years}
      />
    </div>
  )
}
