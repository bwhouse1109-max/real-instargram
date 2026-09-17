# 인스타그램 카드뉴스 자동 업로드

GitHub Actions + Meta Graph API로 카드뉴스(캐러셀, 최대 10장)를 인스타그램에 자동 게시하는 최소 구성입니다.

## 1. 저장소 만들기

이 폴더 전체를 새 GitHub 저장소에 푸시하세요. **저장소는 반드시 Public이어야 합니다** — Graph API가 이미지를 가져올 때 `raw.githubusercontent.com` 공개 URL로 접근하기 때문입니다. (비공개로 하고 싶다면 이미지만 별도의 공개 호스팅에 올리는 방식으로 바꿔야 합니다.)

```bash
cd ig-auto-publish
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/<본인계정>/<저장소이름>.git
git push -u origin main
```

## 2. 필요한 값 두 가지 준비

이미 개발자 앱 등록을 마치셨다고 하셨으니, 아래 두 값만 발급받으시면 됩니다.

**IG_USER_ID** (인스타그램 비즈니스 계정 ID, 숫자 — @아이디 아님)
그래프 API 탐색기(Graph API Explorer)에서 `GET /me/accounts`로 연결된 페이스북 페이지 ID를 확인한 뒤, `GET /{page-id}?fields=instagram_business_account`로 조회하면 나옵니다.

**IG_ACCESS_TOKEN**
`instagram_basic`, `instagram_content_publish`, `pages_read_engagement` 권한이 포함된 토큰이 필요합니다. 자동화용이라 만료가 잦은 단기 토큰 대신, 비즈니스 설정(Business Settings)에서 발급하는 **시스템 사용자(System User) 토큰**을 추천드립니다 — 만료 기한이 없어서 매번 갱신할 필요가 없습니다.

## 3. GitHub 저장소에 시크릿 등록

저장소 → Settings → Secrets and variables → Actions → New repository secret 에서 아래 두 개를 등록합니다.

- `IG_USER_ID`
- `IG_ACCESS_TOKEN`

(이 값들은 절대 코드나 파일에 직접 적지 마세요. 반드시 시크릿으로만 등록하세요.)

## 4. 게시물 올리기

새 카드뉴스가 나올 때마다:

1. `assets/<날짜-주제>/` 폴더를 만들고 `slide_01.png` ~ `slide_10.png`(최대 10장), `caption.txt`(캡션+해시태그)를 넣습니다.
2. `git add`, `commit`, `push` 로 GitHub에 올립니다.
3. GitHub 저장소 → Actions 탭 → **Publish Instagram Carousel** → **Run workflow** 클릭 → 폴더 이름(예: `gold-2026-09-18`) 입력 → 실행.
4. 몇 초~수십 초 후 인스타그램에 캐러셀 게시물로 올라갑니다.

지금 이 폴더에는 예시로 `assets/gold-2026-09-18/`에 이번에 만든 금값 카드뉴스 10장 + 캡션이 이미 들어있습니다.

## 참고

- 캐러셀은 최대 10장까지 지원합니다.
- 이미지가 저장소에 푸시되어 있어야만(공개 URL로 열려야만) 게시가 됩니다 — 로컬에만 있는 파일은 인식하지 못합니다.
- 매일 정해진 시간에 자동으로 올리고 싶으시면(예: 매일 오전 9시), `.github/workflows/publish.yml`에 `schedule` 트리거를 추가하고, 그날 올릴 폴더를 미리 정해두는 규칙(예: 날짜 폴더명 규칙)을 만들면 됩니다. 필요하시면 그 부분도 만들어드릴게요.
