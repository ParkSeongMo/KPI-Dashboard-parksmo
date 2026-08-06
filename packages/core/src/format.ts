/**
 * 표시 전용 서식.
 *
 * 반올림은 이 파일에서만 한다. lib/kpi/calc.ts는 반올림하지 않는다.
 * 계산 중간에 반올림하면 종합 달성률에 누적 오차가 생기고, 프론트와 서버가
 * 각자 반올림하면 소수 1자리에서 값이 갈린다(docs/design-reviews/kpi-domain-model.md).
 */

/**
 * 소수 1자리로 반올림한다. 시안의 표기가 전부 1자리다(77.6%, 85.5%, 26.7%, 36.0).
 *
 * toFixed는 짝수 반올림(banker's rounding)에 가까운 부동소수 동작을 보여 값이
 * 기대와 어긋날 수 있다. 0.5는 항상 올림(HALF_UP)하도록 명시적으로 처리한다.
 */
export function round1(value: number): number {
  const scaled = value * 10
  // 부동소수 표현 오차(예: 26.65 * 10 = 266.49999999999994)를 먼저 정리한다
  const corrected = Math.round(scaled * 1e6) / 1e6
  return Math.sign(corrected) * Math.round(Math.abs(corrected)) / 10
}

/** `90.0%` 형태 */
export function formatPercent1(value: number): string {
  return `${round1(value).toFixed(1)}%`
}

/** `36.0` 형태 — 가중점수처럼 % 기호가 없는 값 */
export function formatScore1(value: number): string {
  return round1(value).toFixed(1)
}

/** 정수 백분율 표기. 도넛 범례의 `개발 (70%)`처럼 소수가 불필요한 곳에 쓴다. */
export function formatPercentCompact(value: number): string {
  const r = round1(value)
  return Number.isInteger(r) ? `${r}%` : `${r.toFixed(1)}%`
}

/** 팀이 빈 값이면 `-`로 표시한다(시안 목록과 동일) */
export function formatOptional(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '-'
}
