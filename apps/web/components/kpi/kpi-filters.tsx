'use client'

/**
 * 목록 필터 — 부서명·팀·이름 텍스트 3개 + 직책·기준기간 셀렉트 2개.
 *
 * 필터 상태는 URL searchParams에 둔다. 새로고침·공유·뒤로가기가 그대로 동작한다.
 * `검색` 시 page를 1로 되돌린다 — 3페이지에서 조건을 좁히면 결과가 없어 빈 화면이 된다.
 *
 * 근거: docs/design-reviews/screen-behavior.md
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { POSITIONS, formatBasePeriod, type BaseHalfValue } from '@kpi/core'

export type PeriodOption = { baseYear: number; baseHalf: BaseHalfValue }

/** 셀렉트에서 `전체`를 뜻하는 값. 빈 문자열은 Radix Select가 허용하지 않는다. */
const ALL = '__all__'

export function KpiFilters({ periods }: { periods: PeriodOption[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [department, setDepartment] = useState(searchParams.get('department') ?? '')
  const [team, setTeam] = useState(searchParams.get('team') ?? '')
  const [name, setName] = useState(searchParams.get('name') ?? '')
  const [position, setPosition] = useState(searchParams.get('position') ?? ALL)
  const [period, setPeriod] = useState(searchParams.get('period') ?? ALL)

  /**
   * Base UI의 Select.Value는 값→라벨 매핑을 자동으로 하지 않는다.
   * 라벨을 직접 넘기지 않으면 내부값(`__all__`)이 그대로 보인다.
   */
  const periodLabel =
    period === ALL
      ? '전체'
      : (() => {
          const [year, half] = period.split('-')
          return formatBasePeriod(Number(year), half as BaseHalfValue)
        })()

  function submit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (department.trim()) params.set('department', department.trim())
    if (team.trim()) params.set('team', team.trim())
    if (name.trim()) params.set('name', name.trim())
    if (position !== ALL) params.set('position', position)
    if (period !== ALL) params.set('period', period)
    // page는 넣지 않는다 → 1페이지로 되돌아간다
    router.push(params.size > 0 ? `/kpi?${params}` : '/kpi')
  }

  function reset() {
    setDepartment('')
    setTeam('')
    setName('')
    setPosition(ALL)
    setPeriod(ALL)
    router.push('/kpi')
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border bg-card p-5"
      aria-label="KPI 검색 조건"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="filter-department">부서명</Label>
          <Input
            id="filter-department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-team">팀</Label>
          <Input id="filter-team" value={team} onChange={(e) => setTeam(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-name">이름</Label>
          <Input id="filter-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-position">직책</Label>
          {/* Base UI Select은 value에 null을 넘길 수 있다. 전체(ALL)로 되돌린다. */}
          <Select value={position} onValueChange={(value) => setPosition(value ?? ALL)}>
            <SelectTrigger id="filter-position" className="w-full">
              <SelectValue>{position === ALL ? '전체' : position}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>전체</SelectItem>
              {POSITIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-period">기준 기간</Label>
          <Select value={period} onValueChange={(value) => setPeriod(value ?? ALL)}>
            <SelectTrigger id="filter-period" className="w-full">
              <SelectValue>{periodLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>전체</SelectItem>
              {periods.map((option) => {
                const value = `${option.baseYear}-${option.baseHalf}`
                return (
                  <SelectItem key={value} value={value}>
                    {formatBasePeriod(option.baseYear, option.baseHalf)}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={reset}>
          초기화
        </Button>
        <Button type="submit">검색</Button>
      </div>
    </form>
  )
}
