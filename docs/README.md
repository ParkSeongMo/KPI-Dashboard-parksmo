# Docs

이 폴더는 프로젝트 문서의 진입점이다.

2026-08-06 기준 **설계 6단계 확정, 화면 4개 구현 완료, 프론트/백엔드 분리 완료.** 모노레포 구조다(`packages/core` · `apps/api` · `apps/web`).

## 문서 라우팅

### 작업 기준
- 프로젝트 개요 → `../README.md`
- 작업 진입점 → `../CLAUDE.md`
- **도메인 규칙·계산식 → [design-reviews/kpi-domain-model.md](design-reviews/kpi-domain-model.md)** (SSOT)
- **빌드/테스트 명령 → `../CLAUDE.md`의 Build/Test 절**. 상세는 [design-reviews/stack-and-structure.md](design-reviews/stack-and-structure.md). 2026-08-06 기준 전부 실행 통과
- 프로젝트 규칙 → 아직 없음. 코드가 생긴 뒤 `/docs-organize`로 `rules.md` 생성
- 리뷰 기준 → 아직 없음. 리뷰 기준이 굳어진 뒤 `/docs-organize`로 `review-checklist.md` 생성

### 구조 이해
- 화면 시안 → `image/` (아래 참조)
- **디렉터리 구조·계층 규칙 → [design-reviews/stack-and-structure.md](design-reviews/stack-and-structure.md)**
- **모노레포 배치·API 계약 → [design-reviews/frontend-backend-split.md](design-reviews/frontend-backend-split.md)**
- 프로젝트 맵 → 아직 없음. 코드 도입 후 `/code-to-docs`로 `project-map.md` 생성
- 모듈별 문서 → `modules/`(생성한 경우)
- API 개요 → `api/`(생성한 경우)

### 결정 기록
- 설계 리뷰(PDR) → `design-reviews/`
  - [kpi-domain-model.md](design-reviews/kpi-domain-model.md) — ① 도메인 모델·계산 규칙 (확정). 달성률/가중점수/종합 달성률 계산식, 배지 구간, 가중치 100% 규칙
  - [stack-and-structure.md](design-reviews/stack-and-structure.md) — ② 스택·디렉터리 구조·실행 명령 (확정). Vercel + Neon + Next.js + Prisma
  - [server-action-contract.md](design-reviews/server-action-contract.md) — ③ Server Action 계약 (확정). 액션 시그니처, zod 스키마, 에러 코드, 조회 계약, 소프트 삭제
  - [screen-behavior.md](design-reviews/screen-behavior.md) — ④ 화면별 동작·검증 (확정). 목록 정렬, 상호작용, 빈 상태·오류, 접근성
  - [auth-demo-scope.md](design-reviews/auth-demo-scope.md) — ⑤ 인증 범위 (확정). **데모 전제로 인증 없음.** Vercel Deployment Protection + 가상 데이터만 사용
  - [frontend-backend-split.md](design-reviews/frontend-backend-split.md) — ⑥ 프론트/백엔드 분리 (확정). 모노레포, Hono API, BFF, API 계약
- 하네스 결정 → `../.claude/notes/harness-decisions.md`

### Skill / MCP
- skill 추천 결과 → [skill-recommendations.md](skill-recommendations.md) — 프로젝트 전용 skill 후보 4건 전부 **보류**. 생성 트리거는 스캐폴딩 완료
- Context7 MCP → `../.claude/notes/context7-mcp.md`

## 화면 시안

`image/`의 PNG 4장이 구현의 기준이 된 원본이다. 아래 설명은 시안에서 **읽은 내용만** 적은 것이다. 여기서 도출한 결정은 `design-reviews/`의 6개 문서에 확정되어 있다.

| 파일 | 화면 | 시안에서 확인한 요소 |
|---|---|---|
| [목록.png](image/목록.png) | KPI 목록 | 부서명·팀·이름 텍스트 필터, 직책·기준 기간 셀렉트, 초기화/검색 버튼, `총 12건`, 표(이름·부서명·팀·직책·기준 기간·종합 달성률·상세보기), 달성률 옆 `양호`(초록)/`우려`(주황)/`미달`(빨강) 배지, 페이지네이션(`총 12건`, 1·2 페이지), 우상단 `KPI 등록` |
| [등록.png](image/등록.png) | KPI 등록 | 사원 정보(아이디·이름·부서명·팀 입력, 직책·기준연도·기준분기 셀렉트, `*` 필수), KPI 항목 반복 블록(평가영역·항목·측정지표·목표치·목표개수·달성개수·가중치(%)), `+ 항목 추가`, 항목별 삭제, 같은 평가영역 항목을 인접 배치하면 상세에서 묶여 표시된다는 안내문, 하단 고정 바에 `현재 합계 0%` + 가중치 합 100% 안내, 취소/저장 |
| [상세.png](image/상세.png) | KPI 상세 | `목록으로` 링크, 수정/삭제 버튼, 사원 정보 읽기 전용, 종합 달성률 큰 숫자(`90.0%` + `양호`), 평가영역별 비중 도넛 차트(예: 개발 70% / 품질 30%), KPI 항목 표(평가영역·항목·측정지표·목표치·목표개수·달성개수·가중치·달성률·가중점수) |
| [수정.png](image/수정.png) | KPI 수정 | 등록과 동일한 폼에 기존 값 채워짐, 항목 순서 이동(↑↓)과 삭제, 하단 고정 바에 `현재 합계: 80%`와 가중치 합이 100%가 아니라는 경고 |

위 시안에서 도출한 도메인 규칙은 [design-reviews/kpi-domain-model.md](design-reviews/kpi-domain-model.md)에 **확정**되어 있다. 계산식·배지 구간·가중치 100% 규칙·기준 기간 단위는 그 문서가 SSOT다. 여기서 중복 서술하지 않는다.

시안과 확정 설계가 어긋나는 지점 하나:

- 등록/수정 하단 바 문구 `미달분은 달성률에 반영되지 않습니다`는 가중치 합 100% **저장 차단**으로 결정했으므로 도달할 수 없는 안내다. `저장하려면 가중치 합이 100%여야 합니다 (현재 N%)`로 바꾼다. 근거는 PDR의 「가중치 합 100% — 저장 차단」 절.

## 운영 원칙

- 하네스 적용 결과에는 이 `docs/README.md`를 항상 둔다.
- 기존 문서가 충분하면 새 문서를 늘리지 말고 이 파일에서 기존 경로를 연결한다.
- 기준이 부족할 때만 `/docs-organize` 또는 `/code-to-docs`로 필요한 문서를 만든다.
- 신규 기능/화면/API/모듈 또는 큰 동작 변경 전에는 `/pdr`로 `design-reviews/<slug>.md`를 짧게 남긴다. 하네스 적용/설정/skill 선택/기본 예시 복사는 PDR 대상이 아니다.
- `/skill-craft`로 custom skill을 만들면 결과는 `.claude/skills/<name>/SKILL.md`에 둔다. `skill-recommendations.md`는 외부 후보를 실제 비교했거나 프로젝트 전용 custom skill 채택/보류 근거가 필요할 때만 만든다. 기본 7개 skill과 기본 권장 `skill-creator` 복사만 있으면 만들지 않는다.
- 같은 주제는 한 문서에 모으고, stale/보류 문서는 라우터에서 명시한다.
- 프로젝트 규칙·배포 방식·테스트 기준·리뷰 기준이 불명확하면 문서로 단정하지 말고 사용자에게 질문한다.
- 문서를 만들거나 수정할 때는 SSOT 충돌, 모호 표현, 실행 가능성을 확인한다.
