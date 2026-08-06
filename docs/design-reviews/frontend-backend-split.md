# 프론트엔드·백엔드 분리 Design Review

작성일 2026-08-06 · 상태 **확정(6단계)** · 선행 [stack-and-structure.md](stack-and-structure.md), [server-action-contract.md](server-action-contract.md), [auth-demo-scope.md](auth-demo-scope.md)

②에서 정한 **단일 Next.js 앱** 구조를 **모노레포 2앱 + 공유 패키지**로 바꾼다. 기존 동작은 유지한다.

## 목표

- 백엔드를 독립 배포·독립 소비 가능한 HTTP API로 떼어낸다.
- 프론트엔드가 DB를 전혀 알지 못하게 한다.
- 화면 동작(①③④에서 확정한 것)은 그대로 유지한다. 사용자에게 보이는 변화는 없다.

## 사전 검토 — 프론트엔드의 계산 로직

분리 요청과 함께 "프론트엔드에 계산 로직이 필요한가"를 검토했다. **이미 거의 없다.**

| 클라이언트 컴포넌트 | 가져다 쓰는 것 | 성격 |
|---|---|---|
| `kpi-form.tsx` | `isWeightTotalValid`, `weightTotalPercent` | 가중치 합산 — 유일한 계산 |
| `area-donut.tsx` | `formatPercentCompact` | 표시 반올림 |
| `kpi-filters.tsx` | `POSITIONS`, `formatBasePeriod` | 상수·라벨 |

달성률·가중점수·종합 달성률·배지 등급·영역 비중·rowspan은 **전부 서버에서만 계산되고 클라이언트 번들에 들어가지 않는다.**

남은 가중치 합산은 서버로 옮기지 않는다.
- 시안의 하단 고정 바가 입력하는 동안 상시 합계를 보여준다. API 호출로 바꾸면 키 입력마다 왕복이 생긴다.
- 신뢰 경계가 아니다. 백엔드가 같은 규칙으로 재검증한다.
- 공유 패키지(`packages/core`)의 같은 함수를 쓰므로 규칙이 갈릴 수 없다.

## 구조

```text
/
├─ package.json              npm workspaces 루트. 스크립트 오케스트레이션
├─ packages/core/            양쪽이 공유하는 순수 코드 (DB·React·HTTP 의존 없음)
│  ├─ src/calc.ts            달성률·가중점수·종합·영역비중·배지·rowspan
│  ├─ src/schema.ts          zod 입력 스키마 + 가중치 100% 검증
│  ├─ src/constants.ts       직책 목록, 배지 구간, ALIVE sentinel, PAGE_SIZE
│  ├─ src/format.ts          표시 반올림
│  ├─ src/year-options.ts
│  └─ src/contract.ts        API 요청/응답 타입 (양쪽이 같은 타입을 본다)
├─ apps/api/                 Hono + Prisma. Neon에 접속하는 유일한 앱
│  ├─ src/index.ts           Hono 앱. `export default app` (Vercel 무설정 배포)
│  ├─ src/dev.ts             로컬 실행용 @hono/node-server
│  ├─ src/routes/kpi.ts      REST 라우트
│  ├─ src/service.ts         Prisma 접근 (기존 lib/kpi/service.ts 이동)
│  ├─ src/db.ts              Prisma client 싱글턴 (기존 lib/db.ts 이동)
│  ├─ src/auth.ts            API 키 검증 미들웨어
│  ├─ prisma/                schema.prisma, migrations, seed.ts
│  └─ prisma.config.ts
└─ apps/web/                 Next.js. DB를 모른다
   ├─ app/                   화면 + Server Actions(내용은 API 호출로 교체)
   ├─ components/
   └─ lib/api-client.ts      백엔드 호출 전담
```

`packages/core`에는 **DB·React·HTTP 의존이 없다.** 그래야 양쪽이 안전하게 import한다.

## 호출 경로 — BFF

**브라우저는 백엔드를 직접 부르지 않는다.**

```text
브라우저 ──▶ apps/web (Next.js)  ──▶ apps/api (Hono) ──▶ Neon
           서버 컴포넌트/Server Action        내부 전용
```

이 구조를 택한 이유:

- **CORS가 필요 없다.** 호출이 서버 대 서버다.
- **API 키가 브라우저에 노출되지 않는다.** `apps/web`의 서버 환경변수에만 둔다.
- **Vercel Deployment Protection이 계속 유효하다.** ⑤에서 인증 없이 데모를 돌리는 전제가 이 보호 한 겹이었다. 브라우저가 백엔드를 직접 부르는 구조였다면 백엔드가 공개 인터넷에 그대로 열려 그 전제가 깨진다.
- 백엔드는 여전히 독립 배포되고, 나중에 모바일 등 다른 소비자가 붙을 수 있다.

## 인증 — ⑤의 보완

⑤에서 "애플리케이션 인증 없음(데모)"을 확정했다. 그 결정은 유지하되, **분리로 생기는 새 표면 하나를 막는다.**

- `apps/api`는 `x-api-key` 헤더를 검증한다. 값은 `apps/web`의 서버 환경변수 `KPI_API_KEY`와 `apps/api`의 `API_KEY`로 각각 둔다.
- 이것은 **사용자 인증이 아니라 서비스 간 인증**이다. 사용자 로그인은 여전히 없다.
- `apps/web`에는 Vercel Deployment Protection을 그대로 켠다.
- 키가 없거나 틀리면 `401`.

## API 계약

베이스 경로 `/api/kpi-evaluations`. 모든 응답은 JSON.

| 메서드 | 경로 | 성공 | 실패 |
|---|---|---|---|
| GET | `/` (쿼리: `department` `team` `name` `position` `period` `page`) | `200` `KpiListResult` | — |
| GET | `/:id` | `200` `KpiEvaluationDetail` | `404` |
| POST | `/` | `201` `{ id }` | `400` `409` |
| PUT | `/:id` | `200` `{ id }` | `400` `404` `409` |
| DELETE | `/:id` | `200` `{ id }` | `404` |
| GET | `/meta/base-periods` | `200` `{ baseYear, baseHalf }[]` | — |
| GET | `/meta/evaluation-areas` | `200` `string[]` | — |

에러 본문은 하나의 모양을 쓴다.

```json
{ "error": { "code": "VALIDATION", "message": "...", "fieldErrors": { "items": ["..."] } } }
```

| HTTP | code | ③의 `ActionError` |
|---|---|---|
| 400 | `VALIDATION` | `VALIDATION` |
| 401 | `UNAUTHORIZED` | (신규 — 서비스 간 인증 실패) |
| 404 | `NOT_FOUND` | `NOT_FOUND` |
| 409 | `DUPLICATE_PERIOD` | `DUPLICATE_PERIOD` |

`apps/web`의 Server Action은 **③에서 정한 반환 타입을 그대로 유지한다.** 화면 코드는 바뀌지 않는다. HTTP 상태 → `ActionError` 변환은 `lib/api-client.ts` 한 곳에서 한다. Prisma 에러 코드를 밖으로 흘리지 않던 규칙이 HTTP 계층으로 한 단계 옮겨간 것이다.

## 유지되는 것

- ①의 계산 규칙 전부(목표개수 0 = 100% 포함), 배지 구간, 반올림 위치
- ③의 sentinel `deletedAt` + 4컬럼 `@@unique`, 소프트 삭제, 항목 전체 교체 + 트랜잭션
- ④의 화면 동작·정렬 규칙·접근성
- Prisma 스키마와 마이그레이션 — **DB 변경 없음**

## 검증 기준

- 기능: 기존 단위 26개와 E2E 15개가 **수정 없이** 통과해야 한다. 화면 동작이 바뀌지 않았다는 뜻이다.
- `packages/core`에 `@prisma/client`·`react`·`next` import가 없다(grep으로 확인).
- `apps/web`에 `@prisma/client`·`PrismaClient` import가 없다(grep으로 확인).
- API 키 없이 `apps/api`를 호출하면 `401`.
- 각 앱이 독립적으로 빌드된다.

## Out of Scope

- 사용자 로그인·역할 기반 권한 (⑤ 결정 유지)
- 백엔드 rate limit, 관측성, 캐싱 계층
- 브라우저 → 백엔드 직접 호출 경로

## 구현하며 부딪힌 것 (2026-08-06)

### 1. Tailwind가 호이스트된 패키지의 CSS를 해석하지 못한다

`apps/web/app/globals.css`의 `@import "shadcn/tailwind.css"`가 모노레포로 옮긴 뒤 깨졌다.

- Node는 같은 디렉터리에서 이 지정자를 정상 해석한다(`require.resolve`로 확인). 패키지의 `exports`에도 `./tailwind.css` 항목이 있다.
- 실패하는 것은 **Tailwind의 PostCSS 해석기**다. 워크스페이스 루트로 호이스트된 `node_modules`를 찾지 못한다.
- `next.config.ts`의 `turbopack.root`를 저장소 루트로 지정해도 해결되지 않았다(해석 주체가 Turbopack이 아니다).
- `@tailwindcss/postcss`의 `base` 옵션은 **클래스 스캔용**이라 import 해석과 무관하다.
- 결국 실제 파일을 상대 경로로 가리켰다. 629줄짜리 벤더 CSS라 저장소에 복사하는 것보다 낫다고 판단했다. shadcn을 `apps/web/node_modules`로 중첩 설치하게 되면 이 경로를 함께 고쳐야 한다.

`turbopack.root` 설정 자체는 남겨 뒀다. 모노레포에서 루트를 명시하는 것이 맞다.

### 2. `.env`는 저장소 루트에 하나만 둔다

앱마다 복사하면 값이 어긋난다. `apps/api/src/env.ts`와 `apps/api/prisma.config.ts`가 각각 루트 `.env`를 명시적 경로로 읽는다. cwd가 어디든 같은 파일을 본다. 배포 환경에서는 플랫폼 환경변수가 주어지므로 파일이 없어도 된다.

### 3. `server-only`로 경계를 컴파일 단계에서 강제한다

②에서 "계층 규칙이 관례로만 지켜지고 컴파일러가 강제하지 않는다"고 남겼던 한계를 이번에 닫았다. `apps/web/lib/api-client.ts` 맨 위의 `import 'server-only'`가 클라이언트 컴포넌트에서 import되면 빌드를 실패시킨다. API 키가 브라우저 번들에 섞이는 사고를 막는다.

### 4. Base UI Select의 "선택 없음"은 `null`이다

`value={values.position || undefined}`로 두면 uncontrolled로 시작했다가 controlled로 바뀌어 React가 경고한다. `null`을 넘긴다.

## 검증 결과 (2026-08-06)

| 항목 | 결과 |
|---|---|
| `npm run typecheck` (3개 워크스페이스) | ✅ |
| `npm run lint` | ✅ |
| `npm run test` (core 단위) | ✅ 26개 |
| `npm run build` | ✅ api(prisma generate) + web(Next 빌드) |
| `npm run test:e2e` | ✅ **15개 — 테스트 코드 수정 없이 통과** |
| `apps/web`에 Prisma 참조 | 0건 |
| `packages/core`에 prisma/react/next 참조 | 0건 |
| `apps/api`에 react/next 참조 | 0건 |

E2E가 **수정 없이** 통과한 것이 이번 변경의 핵심 근거다. 화면 동작이 바뀌지 않았다는 뜻이다.

## 미해결 질문

1. Vercel 배포를 프로젝트 2개로 나눌 때 `apps/api`의 Root Directory 설정과 빌드 명령을 실측하지 않았다. 배포 시 확인한다.
2. `@hono/node-server/vercel` 어댑터는 Node 런타임에서 POST가 멈추는 이슈가 보고된 적이 있다. Vercel 무설정 배포(기본 export) 경로를 쓰므로 해당하지 않을 것으로 보나, 배포 후 POST를 실제로 확인한다.
3. 로컬 개발은 두 프로세스가 필요하다. 루트 스크립트로 묶되 포트 충돌 시 `API_PORT`로 조정한다.
