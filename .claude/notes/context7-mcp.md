# Context7 MCP

Context7은 라이브러리/API 문서를 최신 원문 기준으로 조회하는 기본 문서 MCP다.

## 기본 설정

- Claude Code 프로젝트 설정: 루트 `.mcp.json`
- 실행 방식: `npx -y @upstash/context7-mcp`
- 전제 조건: 현재 환경에서 `node`, `npm`, `npx`가 실행 가능해야 한다.
- 확인 명령: `claude mcp list`
- Claude Code 세션 확인: `/mcp`

## 사용 기준

- 라이브러리/API 사용법, 코드 생성, 설정 절차, 버전별 문서가 필요한 작업에서 사용한다.
- 프로젝트 내부 규칙, 도메인 정책, 비밀값, 로컬 DB 사실은 기존 SSOT와 실제 코드를 우선한다.
- Context7 결과도 외부 문서이므로 보안/정확성 검토 없이 그대로 확정하지 않는다.

## API key

- 템플릿에는 평문 API key를 넣지 않는다.
- Context7 API key는 높은 rate limit이 필요할 때 개인 환경에서 설정한다.
- key가 필요한 환경이면 로컬 scope로 `claude mcp add --scope local context7 -- npx -y @upstash/context7-mcp --api-key <KEY>` 또는 공식 `npx ctx7 setup --claude` 흐름을 사용한다.

## Node/npm

- 이 템플릿은 Node/npm을 자동 설치하지 않는다.
- 하네스 적용 시 `node --version`, `npm --version`, `npx --version`을 확인한다.
- 셋 중 하나라도 없으면 Context7 MCP는 미작동으로 보고 Node.js 설치를 별도 선행 작업으로 남긴다.
