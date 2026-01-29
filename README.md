# Prototype Antigravity

HR SaaS 평가 모듈 프로토타입입니다.

## 로컬 환경 설정

### 요구사항

- [Node.js](https://nodejs.org/) 18 이상 (LTS 권장)

### 설치 및 실행

1. **의존성 설치**

```bash
npm install
```

2. **로컬 서버 실행**

```bash
# 서버만 실행 (브라우저는 수동으로 열기)
npm start

# 서버 실행 + 브라우저 자동 열기
npm run dev
```

3. **브라우저에서 접속**

- http://localhost:8000

### 다른 방법으로 실행하기

Node.js가 없거나 npm 없이 실행하려면:

**Python 3**
```bash
cd evaluation-module
python3 -m http.server 8000
```

**npx (설치 없이 한 번만)**
```bash
npx http-server evaluation-module -p 8000 -o
```

## 프로젝트 구조

```
.
├── evaluation-module/   # 평가 결과 대시보드 (HTML/CSS/JS)
│   ├── index.html
│   ├── dashboard.html
│   ├── styles.css
│   ├── app.js
│   └── README.md
├── package.json
├── vercel.json
└── README.md
```

자세한 기능 설명은 [evaluation-module/README.md](evaluation-module/README.md)를 참고하세요.
