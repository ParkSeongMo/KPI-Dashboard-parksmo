'use client'

/**
 * KPI 등록·수정 공용 폼.
 *
 * 핵심 규칙 (screen-behavior.md, server-action-contract.md):
 *  - 하단 고정 바에 현재 가중치 합계를 **실시간** 표시한다. 계산은 calc의 정수 환산을 쓴다.
 *  - **저장 버튼을 비활성하지 않는다.** disabled 버튼은 키보드 포커스를 못 받고
 *    스크린리더가 막힌 이유를 읽어주지 못한다. 누르면 검증하고 첫 오류로 포커스를 옮긴다.
 *  - 항목이 1개만 남으면 삭제를 비활성한다. 첫 항목의 ↑, 마지막 항목의 ↓도 비활성.
 *  - 평가영역은 기존 값 자동완성 + 자유 입력이다.
 */

import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createKpiEvaluationAction, updateKpiEvaluationAction } from '@/app/kpi/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BASE_HALVES,
  POSITIONS,
  isWeightTotalValid,
  weightTotalPercent,
  type BaseHalfValue,
} from '@kpi/core'

export type FormItem = {
  evaluationArea: string
  itemName: string
  metric: string
  targetValue: string
  targetCount: string
  achievedCount: string
  weight: string
}

export type FormValues = {
  employeeLoginId: string
  employeeName: string
  departmentName: string
  teamName: string
  position: string
  baseYear: string
  baseHalf: BaseHalfValue
  items: FormItem[]
}

export const EMPTY_ITEM: FormItem = {
  evaluationArea: '',
  itemName: '',
  metric: '',
  targetValue: '',
  targetCount: '',
  achievedCount: '0',
  weight: '',
}

const HALF_LABEL: Record<BaseHalfValue, string> = { FIRST: '상반기', SECOND: '하반기' }

type Props = {
  mode: 'create' | 'edit'
  evaluationId?: string
  initialValues: FormValues
  /** 기존에 쓰인 평가영역 — datalist 자동완성 후보 */
  areaSuggestions: string[]
  yearOptions: number[]
}

export function KpiForm({ mode, evaluationId, initialValues, areaSuggestions, yearOptions }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<FormValues>(initialValues)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const weightItems = useMemo(
    () => values.items.map((item) => ({ weight: Number(item.weight) || 0 })),
    [values.items],
  )
  const totalPercent = weightTotalPercent(weightItems)
  const weightValid = isWeightTotalValid(weightItems)

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function setItem(index: number, key: keyof FormItem, value: string) {
    setValues((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }))
  }

  function addItem() {
    setValues((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }))
  }

  function removeItem(index: number) {
    setValues((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction
    setValues((prev) => {
      if (target < 0 || target >= prev.items.length) return prev
      const items = [...prev.items]
      ;[items[index], items[target]] = [items[target], items[index]]
      return { ...prev, items }
    })
  }

  /** 폼 문자열 → Server Action 입력. 숫자 변환은 여기서 한다. */
  function toPayload() {
    return {
      employeeLoginId: values.employeeLoginId,
      employeeName: values.employeeName,
      departmentName: values.departmentName,
      teamName: values.teamName,
      position: values.position,
      baseYear: Number(values.baseYear),
      baseHalf: values.baseHalf,
      items: values.items.map((item) => ({
        evaluationArea: item.evaluationArea,
        itemName: item.itemName,
        metric: item.metric,
        targetValue: item.targetValue,
        targetCount: Number(item.targetCount),
        achievedCount: Number(item.achievedCount),
        weight: Number(item.weight),
      })),
    }
  }

  /** 검증 실패 시 첫 오류 입력으로 포커스를 옮긴다(접근성). */
  function focusFirstInvalid() {
    const first = formRef.current?.querySelector<HTMLElement>('[data-invalid="true"]')
    first?.focus()
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createKpiEvaluationAction(toPayload())
          : await updateKpiEvaluationAction(evaluationId!, toPayload())

      if (result.ok) {
        toast.success(mode === 'create' ? 'KPI를 등록했습니다.' : 'KPI를 수정했습니다.')
        router.push(`/kpi/${result.data.id}`)
        return
      }

      const error = result.error
      if (error.code === 'VALIDATION') {
        setFieldErrors(error.fieldErrors)
        setFormError(error.formErrors[0] ?? error.fieldErrors.items?.[0] ?? '입력을 확인해주세요.')
        focusFirstInvalid()
        return
      }
      if (error.code === 'NOT_FOUND') {
        // 열어 둔 사이 삭제됐다 — 폼을 유지하지 않고 목록으로 보낸다
        toast.error(error.message)
        router.push('/kpi')
        return
      }
      setFieldErrors({})
      setFormError(error.message)
    })
  }

  const itemsError = fieldErrors.items?.[0]

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-6 pb-28">
      {formError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {formError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">사원 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextField
            id="employeeLoginId"
            label="아이디"
            required
            value={values.employeeLoginId}
            onChange={(v) => setField('employeeLoginId', v)}
            errors={fieldErrors.employeeLoginId}
          />
          <TextField
            id="employeeName"
            label="이름"
            required
            value={values.employeeName}
            onChange={(v) => setField('employeeName', v)}
            errors={fieldErrors.employeeName}
          />
          <TextField
            id="departmentName"
            label="부서명"
            required
            value={values.departmentName}
            onChange={(v) => setField('departmentName', v)}
            errors={fieldErrors.departmentName}
          />
          <TextField
            id="teamName"
            label="팀"
            value={values.teamName}
            onChange={(v) => setField('teamName', v)}
            errors={fieldErrors.teamName}
          />

          <div className="space-y-2">
            <Label htmlFor="position">
              직책 <RequiredMark />
            </Label>
            {/*
              Base UI Select에서 "선택 없음"은 null이다. undefined를 넘기면
              uncontrolled로 시작했다가 controlled로 바뀌어 React가 경고한다.
            */}
            <Select
              value={values.position || null}
              onValueChange={(v) => setField('position', v ?? '')}
            >
              <SelectTrigger id="position" className="w-full" aria-required>
                <SelectValue>{values.position || '선택'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={fieldErrors.position} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseYear">
              기준연도 <RequiredMark />
            </Label>
            <Select
              value={values.baseYear}
              onValueChange={(v) => setField('baseYear', v ?? values.baseYear)}
            >
              <SelectTrigger id="baseYear" className="w-full" aria-required>
                <SelectValue>{values.baseYear}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={fieldErrors.baseYear} />
          </div>

          <div className="space-y-2">
            {/* 시안 라벨은 "기준분기"였지만 값이 반기이므로 "기준 반기"로 고쳤다 */}
            <Label htmlFor="baseHalf">
              기준 반기 <RequiredMark />
            </Label>
            <Select
              value={values.baseHalf}
              onValueChange={(v) => setField('baseHalf', (v as BaseHalfValue) ?? values.baseHalf)}
            >
              <SelectTrigger id="baseHalf" className="w-full" aria-required>
                <SelectValue>{HALF_LABEL[values.baseHalf]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BASE_HALVES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {HALF_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={fieldErrors.baseHalf} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">KPI 항목</CardTitle>
          <p className="text-xs text-muted-foreground">
            동일한 평가영역의 항목을 인접하게 배치하면 상세 화면에서 하나로 묶여 표시됩니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {itemsError && (
            <p role="alert" className="text-sm text-destructive">
              {itemsError}
            </p>
          )}

          {values.items.map((item, index) => (
            <div key={index} className="rounded-lg border p-4" data-testid="item-card">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${index + 1}번 항목 위로 이동`}
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${index + 1}번 항목 아래로 이동`}
                    disabled={index === values.items.length - 1}
                    onClick={() => moveItem(index, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    aria-label={`${index + 1}번 항목 삭제`}
                    disabled={values.items.length === 1}
                    onClick={() => removeItem(index)}
                  >
                    삭제
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor={`area-${index}`}>
                    평가영역 <RequiredMark />
                  </Label>
                  <Input
                    id={`area-${index}`}
                    list="evaluation-areas"
                    value={item.evaluationArea}
                    onChange={(e) => setItem(index, 'evaluationArea', e.target.value)}
                    aria-required
                  />
                </div>
                <ItemText
                  index={index}
                  name="itemName"
                  label="항목"
                  required
                  value={item.itemName}
                  onChange={setItem}
                />
                <ItemText
                  index={index}
                  name="metric"
                  label="측정지표"
                  value={item.metric}
                  onChange={setItem}
                />
                <ItemText
                  index={index}
                  name="targetValue"
                  label="목표치"
                  value={item.targetValue}
                  onChange={setItem}
                />
                <ItemNumber
                  index={index}
                  name="targetCount"
                  label="목표개수"
                  min={0}
                  step={1}
                  value={item.targetCount}
                  onChange={setItem}
                />
                <ItemNumber
                  index={index}
                  name="achievedCount"
                  label="달성개수"
                  min={0}
                  step={1}
                  value={item.achievedCount}
                  onChange={setItem}
                />
                <ItemNumber
                  index={index}
                  name="weight"
                  label="가중치 (%)"
                  min={0.01}
                  step={0.01}
                  value={item.weight}
                  onChange={setItem}
                />
              </div>
            </div>
          ))}

          <datalist id="evaluation-areas">
            {areaSuggestions.map((area) => (
              <option key={area} value={area} />
            ))}
          </datalist>

          <Button type="button" variant="outline" onClick={addItem}>
            + 항목 추가
          </Button>
        </CardContent>
      </Card>

      {/* 하단 고정 바 — 합계는 aria-live로 알린다 */}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <p
            aria-live="polite"
            className={weightValid ? 'text-sm text-muted-foreground' : 'text-sm text-destructive'}
            data-testid="weight-summary"
          >
            현재 합계 {totalPercent}%
            {!weightValid && ` — 저장하려면 가중치 합이 100%여야 합니다 (현재 ${totalPercent}%)`}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              취소
            </Button>
            {/* 비활성하지 않는다. 누르면 검증하고 오류를 알린다. */}
            <Button type="submit" size="lg" disabled={pending} data-testid="submit">
              {pending ? '저장 중…' : '저장'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden>
      *
    </span>
  )
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return (
    <p role="alert" className="text-xs text-destructive">
      {errors[0]}
    </p>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  required,
  errors,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  errors?: string[]
}) {
  const invalid = Boolean(errors?.length)
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} {required && <RequiredMark />}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required}
        aria-invalid={invalid}
        data-invalid={invalid}
      />
      <FieldError errors={errors} />
    </div>
  )
}

function ItemText({
  index,
  name,
  label,
  value,
  onChange,
  required,
}: {
  index: number
  name: keyof FormItem
  label: string
  value: string
  onChange: (index: number, key: keyof FormItem, value: string) => void
  required?: boolean
}) {
  const id = `${name}-${index}`
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} {required && <RequiredMark />}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(index, name, e.target.value)}
        aria-required={required}
      />
    </div>
  )
}

function ItemNumber({
  index,
  name,
  label,
  value,
  onChange,
  min,
  step,
}: {
  index: number
  name: keyof FormItem
  label: string
  value: string
  onChange: (index: number, key: keyof FormItem, value: string) => void
  min: number
  step: number
}) {
  const id = `${name}-${index}`
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} <RequiredMark />
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(index, name, e.target.value)}
        aria-required
      />
    </div>
  )
}
