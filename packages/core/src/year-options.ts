/**
 * 기준연도 셀렉트 옵션.
 *
 * 시안에는 2026 하나만 보이고 범위 근거가 없다(screen-behavior.md 미해결 2번).
 * 현재 연도를 기준으로 과거 2년 ~ 다음 해까지 두고, 최신이 먼저 오게 한다.
 * 확정되면 이 함수만 고친다.
 */

const PAST_YEARS = 2
const FUTURE_YEARS = 1

export function yearOptions(now: Date = new Date()): number[] {
  const current = now.getFullYear()
  const years: number[] = []
  for (let year = current + FUTURE_YEARS; year >= current - PAST_YEARS; year--) {
    years.push(year)
  }
  return years
}
