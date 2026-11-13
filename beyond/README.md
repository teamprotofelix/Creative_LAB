# BEYOND — 가능성의 틈

**정답이 끝나는 곳, 가능성이 시작된다.**

GitHub Pages에 올리면 곧바로 작동하는, 의외의 연결과 질문을 탐험하는 인터랙티브 웹 실험입니다. HTML · CSS · Vanilla JavaScript · Canvas 2D · Web Audio만 사용했습니다. **서버, 빌드, 외부 CDN, API 키가 필요하지 않습니다.**

## 30초 배포 — GitHub Pages

1. GitHub에서 **Public Repository**를 새로 만듭니다. (예: `beyond`)
2. ZIP을 풀어서 **`index.html`을 포함한 파일·폴더 전체를 저장소의 최상위(root)에 업로드**합니다. ZIP 파일만 업로드하면 안 됩니다.
3. 저장소에서 **Settings → Pages → Build and deployment → Deploy from a branch**를 선택합니다.
4. `Branch: main`, `Folder: /(root)`로 지정한 뒤 **Save**합니다.
5. Pages가 게시한 주소를 엽니다. 일반적으로 `https://계정명.github.io/beyond/` 형식입니다.

사용자 정의 도메인은 GitHub Pages 설정의 Custom domain에서 연결할 수 있습니다. GitHub Pages 배포 여부 및 공개 범위는 저장소 설정과 요금제에 따라 달라질 수 있습니다.

## 파일 구성

```
index.html                 완성된 화면·접근성 마크업
assets/style.css           반응형 비주얼 디자인·모션
assets/engine.js           3D 매듭/입자/별자리의 순수 Canvas 렌더링
assets/app.js              발상 렌즈·문장 생성·기록·포스터 출력
favicon.svg                파비콘
manifest.webmanifest       설치형 웹앱 메타데이터
sw.js                      한 번 방문한 다음 오프라인 캐시
.nojekyll                  GitHub Pages에서 그대로 정적 파일로 서빙
README.md                  이 안내서
LICENSE                    MIT 라이선스
```

## 사이트에서 할 수 있는 일

- **3차원 리본 조형물**: 마우스 움직임에 반응하고, 조형물의 버튼이나 키보드 `B`를 누르면 균열/빛 입자 효과가 발생합니다. 자체 작성한 3D 좌표 변환·깊이 정렬 코드를 2D Canvas에 렌더링합니다.
- **다섯 관점 렌즈**: 주제를 입력한 뒤 반전, 삭제, 100배 증폭, 다른 분야의 결합, 미래에서 되돌아보기의 방식으로 새로운 질문을 생성합니다. *외부 생성형 AI가 아닌 큐레이션된 문장 템플릿 조합*입니다.
- **개념 별자리**: 두 개념을 선택해 낯선 질문을 만들고, 개인 노트에 저장하거나 포스터로 가져갑니다.
- **포스터 스튜디오**: 문장과 3가지 색상 테마를 바꿔가며 1080 × 1350 크기의 PNG 또는 편집 가능한 SVG를 즉석에서 저장합니다.
- **개인 필드 노트**: 저장한 질문은 `localStorage`에만 보관됩니다. JSON 파일로 내보내기와 전체 삭제를 제공합니다.
- **음향**: SOUND ON 버튼을 누르면 기기에서 짧은 신스음을 직접 만들어 재생합니다. 기본값은 OFF입니다.
- **오프라인**: HTTP(S)에서 최초 성공 방문 후 Service Worker가 핵심 파일을 캐시합니다.

## 개발자 메모

- GitHub Pages의 `/repo-name/` 하위 경로를 위해 리소스 주소는 상대 경로(`./`)입니다.
- HTML 파일을 더블클릭해도 기본 시각화/기능은 실행되지만 Service Worker는 로컬 파일(`file://`)에서 동작하지 않습니다. 오프라인 시험은 `python -m http.server 8000`처럼 로컬 HTTP 서버를 이용합니다.
- 콘텐츠 보안: `eval`, 외부 라이브러리, `fetch`, 외부 analytics, 쿠키, 환경변수, 비밀키는 포함하지 않았습니다. 사용자가 입력한 문장은 서버로 전달하지 않습니다. 자체 PNG/SVG/JSON 내보내기에서는 브라우저 내 Blob/Canvas API를 사용합니다.
- 파일명과 문장을 직접 변경해 브랜드화할 수 있습니다. 포스터 내 텍스트는 SVG XML escape를 적용합니다.
- 애니메이션 줄이기 설정(`prefers-reduced-motion`)을 지원합니다. 키보드 탐색 및 모바일 터치에 대응합니다.
- 브라우저에서 구형 Canvas/Web Audio 지원이 제한된 경우 일부 시각·음향 기능이 달라질 수 있습니다.

## 테스트 체크리스트

- 첫 화면 조형물 마우스 드래그 및 `BREAK THE RULE`
- 주제 입력, 렌즈 5개, 질문 새로고침, 질문 저장
- 별자리 노드 2개 선택, 충돌 질문 표시, 저장, 랜덤 충돌
- 포스터 테마 3개 선택, SVG/PNG 내려받기
- 브라우저 새로고침 후 필드 노트 유지, JSON 내보내기, 삭제
- PC/모바일 크기, 접근성 포커스, 소리 ON/OFF, `?` 도움말

## 라이선스

MIT. 디자인, 코딩, 기본 콘텐츠는 이 프로젝트에 맞춰 새로 작성되었습니다.
