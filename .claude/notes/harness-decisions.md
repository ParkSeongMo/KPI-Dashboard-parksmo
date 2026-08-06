# Harness Decisions

이 파일은 **하네스 자체**에 대한 결정만 짧게 기록한다. 제품/기능 설계 결정은 `/pdr`로 `docs/design-reviews/`에 남긴다(혼동하지 않는다).

## 사용 시점

- 기본 agent/skill 구성을 프로젝트에 맞게 바꿨다(예: skill 추가/제거, agent 폐기).
- Context7 외 MCP 추가, hooks 활성화 같은 인프라 변경을 했다.
- `CLAUDE.md` 진입점 구조나 SSOT 참조 방식을 바꿨다.

## 기록 형식

```markdown
## YYYY-MM-DD <한 줄 결정>

- 배경: <왜 결정했는가>
- 적용 범위: <변경한 파일 또는 구성>
- 대안 검토: <고려했다가 선택하지 않은 옵션과 이유>
- 영향: <영향받는 다른 skill/agent/문서>
- 미해결: <남은 질문 또는 없음>
```

기록할 결정이 없으면 이 파일은 비워둔다.

---

## 2026-08-05 코드 하네스 적용 — 스택 미정 상태로 골격만 세우고 skill-craft는 보류

- 배경: 이 저장소에 애플리케이션 코드와 빌드 파일이 0개다. 언어·프레임워크·패키지 매니저·테스트·DB·CI 신호가 없어 `skill-craft`가 프로젝트 파일 근거로 custom skill을 만들 수 없다. 도메인 자료는 `docs/image/`의 화면 시안 4장뿐이고 이는 스택 근거가 아니다.
- 적용 범위:
  - `template/template-claude/repo/`를 루트에 적용. `CLAUDE.md`, `.mcp.json`, `docs/README.md`, `.claude/{agents,skills,notes,settings.local.json.example}`.
  - `CLAUDE.md`의 빌드/테스트/린트는 `확인 필요 (스택 미정)`으로 두었다. 없는 문서 경로는 `아직 없음`으로 표기해 stale 참조를 만들지 않았다.
  - `template/examples/claude/skills/skill-creator/`를 `.claude/skills/skill-creator/`로 복사·적응했다. 파일 생성 workflow라 `disable-model-invocation: true`를 추가하고 `skill-craft`와의 역할 경계를 본문에 명시했다.
  - `.gitignore`를 새로 만들어 `.claude/settings.local.json`을 제외했다. `.example`만 커밋 대상이다.
  - `docs/image/`에 시안 4장을 두고 `docs/README.md`에서 라우팅했다.
- 대안 검토:
  - 시안만 보고 스택을 추정해 프론트엔드 skill을 미리 만드는 안 → 기각. 근거 없는 생성이고 `skill-craft`의 "단순히 프론트엔드가 있다는 이유로 domain skill을 만들지 않는다" 기준에 어긋난다.
  - `docs/rules.md`, `project-map.md`, `build-and-test.md`, `review-checklist.md`를 미리 생성 → 기각. 채울 사실이 없어 빈 문서만 늘어난다.
  - Context7 비활성 → 기각. `node` v24.5.0 / `npm` 11.5.1 / `npx` 11.5.1을 확인해 실행 전제가 충족된다.
- 영향:
  - `/skill-craft` 보류. 스택 확정 시 재실행 대상.
  - `/code-to-docs` 보류. 읽을 코드가 없다.
  - `docs/skill-recommendations.md` 미생성. 외부 후보 비교도, 프로젝트 전용 skill 채택/보류도 없다.
  - PDR 미생성. 하네스 적용은 PDR 대상이 아니다.
  - 빌드/테스트/린트 검증은 **미실행**. 실행할 명령이 존재하지 않는다.
- 미해결:
  - ~~스택 확정 시점과 선택~~ → 2026-08-05 해소. 아래 항목 참조.
  - `template/template-claude/repo/docs/image/`에 남아 있는 시안 4장 원본 제거 여부. 범용 템플릿에 특정 프로젝트 UI가 남아 있어 다음 적용에 따라간다. 템플릿 원본 수정은 이번 적용 작업과 분리해 별도로 확인받는다.

## 2026-08-05 스택 확정 반영 — CLAUDE.md Build/Test를 미검증 명령으로 채우고 skill-craft는 스캐폴딩까지 보류

- 배경: 사용자가 Vercel 호스팅 + Neon Postgres를 확정했고, 설계 ② 단계에서 Next.js App Router + Prisma + Tailwind/shadcn/ui + Recharts + Vitest/Playwright + npm으로 스택을 잠갔다. 근거는 `docs/design-reviews/stack-and-structure.md`.
- 적용 범위:
  - `CLAUDE.md` 「프로젝트 상태」를 스택 확정 상태로 갱신하고, 문서 라우팅에서 두 PDR을 SSOT로 지정했다.
  - `CLAUDE.md` 「Build / Test」를 실제 명령 표로 채웠다. **전부 미검증**임을 명시했다. `package.json`이 없어 실행해 본 적이 없다.
  - Neon의 pooled/direct URL 구분 주의를 `CLAUDE.md`에 넣었다. 가장 흔한 사고 지점이다.
  - `docs/README.md` 라우터를 ①② 확정 상태로 갱신했다.
- 대안 검토:
  - 스택이 정해졌으니 `/skill-craft`로 custom skill을 지금 생성하는 안 → **기각**. 스킬 절차의 핵심인 명령의 cwd·스크립트명·설정 파일 위치가 스캐폴딩 결과에 달려 있다. 지금 만들면 검증할 수 없는 명령이 박힌다. 후보와 보류 사유는 `docs/skill-recommendations.md`에 남겼다.
  - 패키지 버전을 지금 확정하는 안 → 기각. 지식 기준일(2026-05)이 오늘(2026-08-05)보다 앞서 있어 Context7 확인 후에 박는다.
- 영향:
  - `/skill-craft` 여전히 보류. 트리거는 스캐폴딩 완료(`package.json` + `prisma/schema.prisma` 존재).
  - `/code-to-docs` 여전히 보류. 읽을 코드가 없다.
  - `docs/skill-recommendations.md` **신규 생성**. 프로젝트 전용 skill 후보를 보류 판정했고 다음 세션에서 근거 추적이 필요하다.
  - 빌드/테스트 검증은 계속 **미실행**.
- 미해결:
  - Context7 MCP가 이번 세션에 로드되지 않았다. `.mcp.json`은 있으나 새 세션에서 `/mcp`로 확인한 뒤 버전 조사를 진행해야 한다.
  - Vercel Preview에 Neon 브랜치를 붙일지(마이그레이션을 빌드에 넣을지와 연동). `stack-and-structure.md`의 미해결 1번.
