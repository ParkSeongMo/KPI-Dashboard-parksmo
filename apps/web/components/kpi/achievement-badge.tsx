/**
 * 종합 달성률 배지.
 *
 * 색만으로 구분하지 않는다. 시안처럼 색 점 + 텍스트 라벨을 함께 쓴다.
 * 색각 이상 사용자도 라벨로 구분할 수 있다(screen-behavior.md 접근성).
 */

import { GRADE_LABEL, gradeOf, type Grade } from '@kpi/core'
import { cn } from '@/lib/utils'

const DOT_CLASS: Record<Grade, string> = {
  GOOD: 'bg-emerald-500',
  WARN: 'bg-amber-500',
  FAIL: 'bg-red-500',
}

const TEXT_CLASS: Record<Grade, string> = {
  GOOD: 'text-emerald-700 dark:text-emerald-400',
  WARN: 'text-amber-700 dark:text-amber-500',
  FAIL: 'text-red-700 dark:text-red-400',
}

export function AchievementBadge({ rate, className }: { rate: number; className?: string }) {
  const grade = gradeOf(rate)
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', TEXT_CLASS[grade], className)}>
      <span aria-hidden className={cn('size-2 rounded-full', DOT_CLASS[grade])} />
      {GRADE_LABEL[grade]}
    </span>
  )
}
