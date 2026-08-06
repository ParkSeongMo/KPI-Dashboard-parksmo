/**
 * KPI E2E — screen-behavior.md / server-action-contract.md의 검증 기준을 옮긴 것이다.
 *
 * 실제 Neon DB를 쓴다. 씨드 12건을 건드리지 않도록 테스트가 만드는 데이터는
 * 고유한 아이디(run 스코프)를 쓰고, 끝에서 스스로 지운다.
 */

import { expect, test, type Page } from '@playwright/test'

const RUN = Date.now().toString(36)
const uid = (suffix: string) => `e2e-${RUN}-${suffix}`

/** 폼의 사원 정보를 채운다. */
async function fillEmployee(
  page: Page,
  values: { loginId: string; name: string; department: string; team?: string },
) {
  await page.getByLabel('아이디').fill(values.loginId)
  await page.getByLabel('이름').fill(values.name)
  await page.getByLabel('부서명').fill(values.department)
  if (values.team) await page.getByLabel('팀').fill(values.team)

  await page.locator('#position').click()
  await page.getByRole('option', { name: '사원', exact: true }).click()
}

/** index번째 항목 카드를 채운다. */
async function fillItem(
  page: Page,
  index: number,
  values: { area: string; name: string; target: number; achieved: number; weight: number },
) {
  await page.locator(`#area-${index}`).fill(values.area)
  await page.locator(`#itemName-${index}`).fill(values.name)
  await page.locator(`#targetCount-${index}`).fill(String(values.target))
  await page.locator(`#achievedCount-${index}`).fill(String(values.achieved))
  await page.locator(`#weight-${index}`).fill(String(values.weight))
}

/**
 * 저장 후 상세 화면 도착을 기다리고 그 URL을 돌려준다.
 *
 * URL 정규식으로 판정하면 안 된다 — `/kpi/[^/]+$` 는 `/kpi/new` 에도 매치되어
 * 등록 화면에 머문 상태로 통과한다. 제목으로 판정한다.
 */
async function waitForDetail(page: Page): Promise<string> {
  await expect(page.getByRole('heading', { name: 'KPI 상세' })).toBeVisible()
  return page.url()
}

/** 상세 화면에서 삭제까지 수행한다(정리용). */
async function deleteFromDetail(page: Page) {
  await page.getByTestId('delete-trigger').click()
  await page.getByTestId('delete-confirm').click()
  await page.waitForURL('**/kpi')
}

type ListRow = { name: string; dept: string; team: string; position: string; period: string }

/** 모든 페이지를 훑어 목록 행을 순서대로 모은다. */
async function readAllRows(page: Page): Promise<ListRow[]> {
  await page.goto('/kpi')
  const rows: ListRow[] = []
  for (let pageNo = 1; ; pageNo++) {
    await expect(page.locator('tbody tr').first()).toBeVisible()
    rows.push(
      ...(await page.locator('tbody tr').evaluateAll((trs) =>
        trs.map((tr) => {
          const td = tr.querySelectorAll('td')
          const text = (i: number) => td[i]?.textContent?.trim() ?? ''
          return { name: text(0), dept: text(1), team: text(2), position: text(3), period: text(4) }
        }),
      )),
    )
    const next = page.getByRole('link', { name: '다음' })
    if ((await next.count()) === 0) break
    await next.click()
    await expect(
      page.locator('nav[aria-label="페이지 이동"] [aria-current="page"]'),
    ).toHaveText(String(pageNo + 1))
  }
  return rows
}

/**
 * 정렬 규칙: 기준기간 내림차순 → 부서명 → 팀(빈 값 마지막) → 이름.
 * 문자열 비교는 코드포인트 순으로 한다(Postgres 정렬과 일치한다).
 */
function compareBySortRule(a: ListRow, b: ListRow): number {
  const parse = (period: string) => {
    const m = /^(\d{4})년 ([상하])반기$/.exec(period)
    return { year: m ? Number(m[1]) : 0, half: m?.[2] === '하' ? 1 : 0 }
  }
  const pa = parse(a.period)
  const pb = parse(b.period)
  if (pa.year !== pb.year) return pb.year - pa.year
  if (pa.half !== pb.half) return pb.half - pa.half
  if (a.dept !== b.dept) return a.dept < b.dept ? -1 : 1
  const emptyA = a.team === '-' ? 1 : 0
  const emptyB = b.team === '-' ? 1 : 0
  if (emptyA !== emptyB) return emptyA - emptyB
  if (a.team !== b.team) return a.team < b.team ? -1 : 1
  if (a.name !== b.name) return a.name < b.name ? -1 : 1
  return 0
}

test.describe('목록', () => {
  /**
   * 이름 순서를 하드코딩하지 않는다. 사용자가 데이터를 추가하면 곧바로 깨진다.
   * 검증할 것은 "정렬 규칙이 지켜지는가"이므로 규칙 자체를 확인한다.
   */
  test('정렬 규칙이 지켜지고 시안의 씨드 순서가 그 안에서 유지된다', async ({ page }) => {
    const rows = await readAllRows(page)
    expect(rows.length).toBeGreaterThanOrEqual(12)

    for (let i = 1; i < rows.length; i++) {
      expect(
        compareBySortRule(rows[i - 1], rows[i]),
        `${i - 1}번(${rows[i - 1].name} ${rows[i - 1].dept} ${rows[i - 1].team} ${rows[i - 1].period})와 ` +
          `${i}번(${rows[i].name} ${rows[i].dept} ${rows[i].team} ${rows[i].period})의 순서가 규칙과 어긋난다`,
      ).toBeLessThanOrEqual(0)
    }

    // 시안 10건의 상대 순서는 그대로 유지된다
    const seed = ['이명희', '김철수', '홍길동', '정태현', '강수연', '박지성', '최민아', '오정민', '윤태진', '한명수']
    const actual = rows.map((r) => r.name).filter((name) => seed.includes(name))
    expect(actual).toEqual(seed)
  })

  test('달성률과 배지가 시안과 일치한다', async ({ page }) => {
    await page.goto('/kpi')
    await expect(page.getByRole('heading', { name: 'KPI 목록' })).toBeVisible()

    const hong = page.locator('tbody tr', { hasText: '홍길동' })
    await expect(hong).toContainText('90.0%')
    await expect(hong).toContainText('양호')

    const park = page.locator('tbody tr', { hasText: '박지성' })
    await expect(park).toContainText('25.0%')
    await expect(park).toContainText('미달')

    // 팀이 빈 값인 행은 "-"로 표시된다
    await expect(page.locator('tbody tr', { hasText: '강수연' })).toContainText('-')
  })

  test('페이지 2에서 필터를 걸면 1페이지로 돌아간다', async ({ page }) => {
    await page.goto('/kpi?page=2')
    await expect(page.locator('nav[aria-label="페이지 이동"] [aria-current="page"]')).toHaveText('2')

    await page.getByLabel('부서명').fill('영업')
    await page.getByRole('button', { name: '검색' }).click()

    await expect(page).toHaveURL(/department=/)
    expect(new URL(page.url()).searchParams.get('page')).toBeNull()

    // 건수를 하드코딩하지 않는다. 보이는 모든 행이 조건을 만족하는지 본다.
    const depts = await page.locator('tbody tr td:nth-child(2)').allInnerTexts()
    expect(depts.length).toBeGreaterThan(0)
    for (const dept of depts) expect(dept).toContain('영업')
  })

  test('초기화가 필터를 비운다', async ({ page }) => {
    await page.goto('/kpi?department=영업')
    const filtered = await page.locator('tbody tr').count()
    expect(filtered).toBeGreaterThan(0)

    await page.getByRole('button', { name: '초기화' }).click()
    await expect(page).toHaveURL(/\/kpi$/)
    // 씨드가 12건이라 첫 페이지는 페이지 크기(10)만큼 채워진다
    await expect(page.locator('tbody tr')).toHaveCount(10)
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(filtered)
  })

  test('필터 결과가 0건이면 조건 안내와 초기화 링크를 보여준다', async ({ page }) => {
    await page.goto('/kpi?name=존재하지않는이름')
    await expect(page.getByText('조건에 맞는 KPI가 없습니다.')).toBeVisible()
    await expect(page.getByRole('link', { name: '필터 초기화' })).toBeVisible()
    await expect(page.getByText('등록된 KPI가 없습니다.')).toHaveCount(0)
  })
})

test.describe('상세', () => {
  test('계산 결과와 평가영역 병합이 시안과 같다', async ({ page }) => {
    await page.goto('/kpi')
    await page.locator('tbody tr', { hasText: '홍길동' }).getByRole('link', { name: '상세보기' }).click()

    await expect(page.getByRole('heading', { name: 'KPI 상세' })).toBeVisible()
    await expect(page.getByTestId('total-rate')).toHaveText('90.0%')

    const rows = page.locator('tbody tr')
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0)).toContainText('36.0')
    await expect(rows.nth(1)).toContainText('24.0')
    await expect(rows.nth(2)).toContainText('30.0')

    // 인접한 "개발" 2행이 하나로 병합된다
    await expect(page.locator('td[rowspan="2"]')).toHaveText('개발')
    // 도넛 범례에 영역 비중이 텍스트로 나온다(색만으로 구분하지 않는다)
    await expect(page.getByText('개발 (70%)')).toBeVisible()
    await expect(page.getByText('품질 (30%)')).toBeVisible()
  })

  test('없는 id는 404다', async ({ page }) => {
    const response = await page.goto('/kpi/does-not-exist')
    expect(response?.status()).toBe(404)
  })
})

test.describe('등록', () => {
  test('항목 조작 버튼의 비활성 조건이 맞다', async ({ page }) => {
    await page.goto('/kpi/new')

    // 항목이 1개면 삭제할 수 없다
    await expect(page.getByRole('button', { name: '1번 항목 삭제' })).toBeDisabled()
    await expect(page.getByRole('button', { name: '1번 항목 위로 이동' })).toBeDisabled()
    await expect(page.getByRole('button', { name: '1번 항목 아래로 이동' })).toBeDisabled()

    await page.getByRole('button', { name: '+ 항목 추가' }).click()
    await expect(page.getByTestId('item-card')).toHaveCount(2)

    // 첫 항목의 ↑ 와 마지막 항목의 ↓ 만 비활성이다
    await expect(page.getByRole('button', { name: '1번 항목 위로 이동' })).toBeDisabled()
    await expect(page.getByRole('button', { name: '1번 항목 아래로 이동' })).toBeEnabled()
    await expect(page.getByRole('button', { name: '2번 항목 위로 이동' })).toBeEnabled()
    await expect(page.getByRole('button', { name: '2번 항목 아래로 이동' })).toBeDisabled()
    await expect(page.getByRole('button', { name: '1번 항목 삭제' })).toBeEnabled()
  })

  test('가중치 합이 100%가 아니면 저장되지 않는다', async ({ page }) => {
    await page.goto('/kpi/new')
    await fillEmployee(page, { loginId: uid('weight'), name: '가중치검증', department: '테스트본부' })
    await fillItem(page, 0, { area: '개발', name: '항목A', target: 10, achieved: 8, weight: 80 })

    await expect(page.getByTestId('weight-summary')).toContainText('현재 합계 80%')
    await expect(page.getByTestId('weight-summary')).toContainText('가중치 합이 100%여야 합니다')

    // 저장 버튼은 비활성이 아니다 — 눌러도 저장되지 않고 안내만 나온다
    await expect(page.getByTestId('submit')).toBeEnabled()
    await page.getByTestId('submit').click()

    await expect(page.getByRole('alert').first()).toContainText('가중치 합이 100%여야 합니다')
    await expect(page).toHaveURL(/\/kpi\/new$/)
  })

  test('33.33 + 33.33 + 33.34 는 100%로 인정되고 저장된다', async ({ page }) => {
    await page.goto('/kpi/new')
    await fillEmployee(page, { loginId: uid('thirds'), name: '균등배분', department: '테스트본부' })

    await page.getByRole('button', { name: '+ 항목 추가' }).click()
    await page.getByRole('button', { name: '+ 항목 추가' }).click()
    await fillItem(page, 0, { area: '개발', name: '항목A', target: 10, achieved: 10, weight: 33.33 })
    await fillItem(page, 1, { area: '개발', name: '항목B', target: 10, achieved: 10, weight: 33.33 })
    await fillItem(page, 2, { area: '품질', name: '항목C', target: 10, achieved: 10, weight: 33.34 })

    // 부동소수로 더하면 99.99000000000001 이 되어 오탐이 난다
    await expect(page.getByTestId('weight-summary')).toContainText('현재 합계 100%')
    await expect(page.getByTestId('weight-summary')).not.toContainText('100%여야 합니다')

    await page.getByTestId('submit').click()
    await waitForDetail(page)
    await expect(page.getByTestId('total-rate')).toHaveText('100.0%')

    await deleteFromDetail(page)
  })

  test('목표 초과 입력은 허용되고 달성률은 100%로 상한이 걸린다', async ({ page }) => {
    await page.goto('/kpi/new')
    await fillEmployee(page, { loginId: uid('cap'), name: '초과달성', department: '테스트본부' })
    await fillItem(page, 0, { area: '개발', name: '초과항목', target: 10, achieved: 12, weight: 100 })

    await page.getByTestId('submit').click()
    await waitForDetail(page)

    await expect(page.getByTestId('total-rate')).toHaveText('100.0%')
    const row = page.locator('tbody tr').first()
    // 원본 숫자는 그대로 보인다
    await expect(row).toContainText('12')
    await expect(row).toContainText('(상한)')

    await deleteFromDetail(page)
  })

  test('목표개수 0을 저장할 수 있고 달성률이 100%가 된다', async ({ page }) => {
    await page.goto('/kpi/new')
    await fillEmployee(page, { loginId: uid('zero'), name: '목표미설정', department: '테스트본부' })
    await fillItem(page, 0, { area: '개발', name: '목표없는항목', target: 0, achieved: 0, weight: 100 })

    await page.getByTestId('submit').click()
    await waitForDetail(page)

    await expect(page.getByTestId('total-rate')).toHaveText('100.0%')
    const row = page.locator('tbody tr').first()
    await expect(row).toContainText('100.0%')
    // 목표 미설정에는 별도 표기를 붙이지 않는다. 초과 달성 상한 표기와도 구분된다.
    await expect(row).not.toContainText('(상한)')
    await expect(row).not.toContainText('목표 미설정')

    await deleteFromDetail(page)
  })

  test('같은 사원·기간을 두 번 등록하면 중복 안내가 나온다', async ({ page }) => {
    const loginId = uid('dup')

    await page.goto('/kpi/new')
    await fillEmployee(page, { loginId, name: '중복검증', department: '테스트본부' })
    await fillItem(page, 0, { area: '개발', name: '항목A', target: 10, achieved: 10, weight: 100 })
    await page.getByTestId('submit').click()
    const detailUrl = await waitForDetail(page)

    await page.goto('/kpi/new')
    await fillEmployee(page, { loginId, name: '중복검증', department: '테스트본부' })
    await fillItem(page, 0, { area: '개발', name: '항목A', target: 10, achieved: 10, weight: 100 })
    await page.getByTestId('submit').click()

    await expect(page.getByRole('alert').first()).toContainText('이미 있습니다')
    await expect(page).toHaveURL(/\/kpi\/new$/)

    await page.goto(detailUrl)
    await deleteFromDetail(page)
  })
})

test.describe('수정·삭제', () => {
  test('항목 순서를 바꿔 저장하면 상세 표 순서가 바뀐다', async ({ page }) => {
    await page.goto('/kpi/new')
    await fillEmployee(page, { loginId: uid('order'), name: '순서검증', department: '테스트본부' })
    await page.getByRole('button', { name: '+ 항목 추가' }).click()
    await fillItem(page, 0, { area: '개발', name: '첫째항목', target: 10, achieved: 10, weight: 50 })
    await fillItem(page, 1, { area: '품질', name: '둘째항목', target: 10, achieved: 10, weight: 50 })
    await page.getByTestId('submit').click()
    const detailUrl = await waitForDetail(page)
    await expect(page.locator('tbody tr').first()).toContainText('첫째항목')

    await page.getByRole('link', { name: '수정' }).click()
    await page.getByRole('button', { name: '2번 항목 위로 이동' }).click()
    await page.getByTestId('submit').click()
    await waitForDetail(page)

    await expect(page.locator('tbody tr').first()).toContainText('둘째항목')

    await page.goto(detailUrl)
    await deleteFromDetail(page)
  })

  test('삭제하면 목록에서 사라지고 상세는 404가 되며, 같은 사원·기간을 다시 등록할 수 있다', async ({
    page,
  }) => {
    const loginId = uid('softdelete')

    await page.goto('/kpi/new')
    await fillEmployee(page, { loginId, name: '삭제검증', department: '테스트본부' })
    await fillItem(page, 0, { area: '개발', name: '항목A', target: 10, achieved: 10, weight: 100 })
    await page.getByTestId('submit').click()
    const detailUrl = await waitForDetail(page)

    await deleteFromDetail(page)

    // 목록에서 사라진다
    await page.goto('/kpi?name=삭제검증')
    await expect(page.getByText('조건에 맞는 KPI가 없습니다.')).toBeVisible()

    // 상세 직접 접근은 404
    const response = await page.goto(detailUrl)
    expect(response?.status()).toBe(404)

    // sentinel 방식의 핵심 — 삭제 후 같은 사원·기간 재등록이 된다
    await page.goto('/kpi/new')
    await fillEmployee(page, { loginId, name: '삭제검증', department: '테스트본부' })
    await fillItem(page, 0, { area: '개발', name: '항목A', target: 10, achieved: 10, weight: 100 })
    await page.getByTestId('submit').click()
    await waitForDetail(page)
    await expect(page.getByTestId('total-rate')).toHaveText('100.0%')

    await deleteFromDetail(page)
  })
})
