---
name: verify
description: 하네스 적용/수정 뒤 JSON, frontmatter, 경로, stale 참조를 외부 패키지 없이 검증한다. 7개 기본 skill과 3개 기본 agent가 올바른 자리에 있는지 확인한다.
---

# verify

이 skill은 하네스 적용/수정/평가 뒤 결과가 실제로 쓸 수 있는 상태인지 확인하는 데 쓴다.
검증 전용이며 파일을 만들거나 수정하지 않는다.

## 사용 시점

- `CLAUDE.md`, `.claude/`를 생성/수정한 뒤
- 템플릿 경로, skill, agent, settings 예시를 바꾼 뒤
- 적용 결과에 stale 참조가 있는지 확인해야 할 때
- 최종 보고 전에 실행한 검증과 미검증 항목을 정리해야 할 때

## 검증 항목

1. JSON 파싱
   - `.claude/settings.local.json.example`
   - `.mcp.json`
   - 실제 프로젝트에 `.claude/settings.json`이 있으면 해당 파일
2. Frontmatter
   - `.claude/agents/*.md`의 `name`, `description`
   - `.claude/skills/*/SKILL.md`의 `name`, `description`
   - 파일 생성/수정 workflow skill의 `disable-model-invocation: true`:
     - `.claude/skills/pdr/SKILL.md`
     - `.claude/skills/skill-craft/SKILL.md`
     - `.claude/skills/docs-organize/SKILL.md`
     - `.claude/skills/code-to-docs/SKILL.md`
3. Context7 MCP
   - 루트 `.mcp.json`의 `mcpServers.context7`
   - `command = "npx"`와 `args = ["-y", "@upstash/context7-mcp"]`
   - `node`, `npm`, `npx`가 현재 환경에서 실행 가능한지 확인
   - 평문 API key가 없는지 확인
4. 기본 agent 3개 존재 (그리고 그 외 폐기 agent가 없음)
   - 존재: `.claude/agents/explorer.md`, `coder.md`, `reviewer.md`
   - 없어야 함: `.claude/agents/documenter.md`
5. 기본 skill 7개 존재 (그리고 폐기 skill이 없음)
   - 존재: `ask`, `pdr`, `skill-craft`, `docs-organize`, `code-to-docs`, `verify`, `handoff`
   - 없어야 함: `.claude/skills/docs-sync/`, `.claude/skills/documenter/`, `.claude/skills/adapt/`(최종 repo에서)
6. docs 라우터
   - `docs/README.md` 존재
   - 폐기된 skill/agent 경로가 라우터에 남아 있지 않음
7. skill discovery 산출물
   - `docs/skill-recommendations.md`가 있으면 검색 source, 채택/보류 이유, 최종 생성 경로가 있는지 확인
   - 외부 후보 비교나 프로젝트 전용 custom skill 채택/보류가 없고 기본 7개 skill + 기본 권장 `skill-creator`만 있으면 해당 문서 부재를 PASS로 본다
   - 외부 `SKILL.md` raw copy로 보이는 긴 원문 복제가 없는지 확인
   - 기본 7개 외 custom skill은 반복 절차와 검증 기준을 가진 프로젝트 전용 skill인지 확인
8. PDR 위치
   - `pdr`로 작성된 문서는 `docs/design-reviews/` 또는 프로젝트 기존 ADR/RFC 디렉터리에 있는지 확인
   - 하네스 적용/설정/skill 선택/기본 예시 복사만 있으면 PDR 문서 부재를 PASS로 본다
   - 하네스 결정이 PDR 문서 자리에 잘못 들어가지 않았는지 확인 (하네스 결정은 `.claude/notes/harness-decisions.md`)
9. 중복/충돌 확인
   - `.claude/commands/`와 `.claude/skills/` 사이에 같은 이름 중복이 없는지
10. stale 참조 확인
    - 존재하지 않는 템플릿 경로
    - 폐기된 이름(`docs-sync`, `documenter`, `harness-pdr.md`)이 본문에 남아 있는지
    - 다른 CLI 도구 전용 설정 구조가 잘못 섞인 문구
    - `adapt`가 최종 프로젝트 기본 skill로 설명된 경우

## 실행 원칙

- `rg`, PowerShell, Python 표준 라이브러리처럼 추가 설치가 필요 없는 도구만 사용한다.
- 검증 중 발견한 문제를 자동 수정하지 않는다.
- 실행하지 못한 검증은 실패처럼 꾸미지 말고 "미검증"으로 분리한다.
- 빌드/테스트 명령은 프로젝트 문서에 명시되어 있거나 사용자가 승인한 경우에만 실행한다.

## 출력 형식

```text
## 검증 결과

- JSON: PASS / FAIL / 미검증
- Frontmatter: PASS / FAIL / 미검증
- disable-model-invocation: PASS / FAIL / 미검증
- Context7 MCP: PASS / FAIL / 미검증
- 기본 agent 3개: PASS / FAIL / 미검증
- 기본 skill 7개: PASS / FAIL / 미검증
- docs 라우터: PASS / FAIL / 미검증
- Skill discovery: PASS / FAIL / 미검증
- PDR 위치: PASS / FAIL / 미검증
- 중복/충돌: PASS / FAIL / 미검증
- stale 참조: PASS / FAIL / 미검증
- 빌드/테스트: PASS / FAIL / 미실행

## 문제
- <파일/경로>: <문제와 근거>

## 미검증
- <실행하지 못한 항목과 이유>
```
