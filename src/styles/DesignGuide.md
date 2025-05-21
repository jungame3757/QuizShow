# 콰직 디자인 가이드라인

이 문서는 '콰직' 프로젝트의 디자인 가이드라인을 제공합니다. 다른 페이지에 일관된 디자인을 적용할 때 참고하세요.

## 1. 색상 팔레트

### 기본 색상
- **콰직 브랜드 색상**: `#783ae8` (모든 '콰직' 텍스트와 주요 제목에 사용)
- **배경 그라데이션**: `from-[#F8F7FF] via-[#F3F1FF] to-[#F0EEFF]` (기본 페이지 배경)

### 호스트 페이지 색상 (퀴즈 만들기 테마)
- **기본 색상**: 보라색-인디고 계열
- **버튼 그라데이션**: `from-purple-600 to-indigo-600`
- **아이콘 색상**: `text-purple-600`
- **카드 테두리**: `border-2 solid #8B5CF6`
- **카드 그림자**: `boxShadow: '0 3px 0 rgba(98, 58, 162, 0.5)'`

### 참가자 페이지 색상 (참여하기 테마)
- **기본 색상**: 청록색-청색 계열
- **버튼 그라데이션**: `from-teal-500 to-teal-400`
- **아이콘 색상**: `text-teal-600`
- **카드 테두리**: `border-2 solid #0D9488` (teal-600)
- **카드 그림자**: `boxShadow: '0 3px 0 rgba(20, 184, 166, 0.5)'` (teal-500)

## 2. 컴포넌트 스타일 가이드

### 로고와 서비스명
```jsx
<Link to="/" aria-label="홈으로 이동" className="flex items-center gap-2">
  <img 
    src="/assets/logo/logo-light.svg" 
    alt="콰직 로고" 
    className="h-8 mr-2" 
  />
  <span className="text-xl sm:text-2xl font-bold text-[#783ae8] flex items-center gap-2">
    콰직
  </span>
</Link>
```

### 버튼 스타일

#### 호스트 페이지용 버튼 (퀴즈 만들기)
```jsx
<Button 
  variant="primary" 
  size="large"
  className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl px-8 py-3"
  style={{
    boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
    border: '2px solid #000',
    borderRadius: '12px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
  }}
  onMouseOver={(e) => {
    e.currentTarget.style.transform = 'translateY(-3px)';
    e.currentTarget.style.boxShadow = '0 6px 0 rgba(0,0,0,0.8)';
  }}
  onMouseOut={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
  }}
>
  퀴즈 만들기 시작하기
</Button>
```

#### 참가자 페이지용 버튼 (코드로 참여하기)
```jsx
<Button 
  variant="secondary" 
  size="large"
  className="bg-gradient-to-r from-teal-500 to-teal-400 rounded-xl px-8 py-3"
  style={{
    boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
    border: '2px solid #000',
    borderRadius: '12px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
  }}
  onMouseOver={(e) => {
    e.currentTarget.style.transform = 'translateY(-3px)';
    e.currentTarget.style.boxShadow = '0 6px 0 rgba(0,0,0,0.8)';
  }}
  onMouseOut={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
  }}
>
  코드로 참여하기
</Button>
```

### 카드 스타일

#### 호스트 페이지용 카드 (퀴즈 관련 기능)
```jsx
<div 
  className="bg-white p-7 relative overflow-hidden transform transition-all duration-300 hover:-translate-y-2" 
  style={{
    boxShadow: '0 3px 0 rgba(98, 58, 162, 0.5)',
    border: '2px solid #8B5CF6',
    borderRadius: '16px',
    background: 'linear-gradient(to bottom right, #fff, #fafaff)',
    transition: 'all 0.3s ease',
  }}
  onMouseOver={(e) => {
    e.currentTarget.style.boxShadow = '0 8px 0 rgba(98, 58, 162, 0.5)';
  }}
  onMouseOut={(e) => {
    e.currentTarget.style.boxShadow = '0 3px 0 rgba(98, 58, 162, 0.5)';
  }}
>
  <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center mb-5" style={{ border: '2px solid #8B5CF6' }}>
    {/* 아이콘 */}
  </div>
  <h3 className="text-xl font-bold text-purple-800 mb-3">제목</h3>
  <p className="text-gray-600 mb-4">내용</p>
  <div className="absolute -bottom-3 -right-3 w-16 h-16 bg-purple-100 rounded-full opacity-40"></div>
</div>
```

#### 참가자 페이지용 카드 (퀴즈 참여 관련)
```jsx
<div 
  className="bg-white p-7 relative overflow-hidden transform transition-all duration-300 hover:-translate-y-2" 
  style={{
    boxShadow: '0 3px 0 rgba(20, 184, 166, 0.5)',
    border: '2px solid #0D9488',
    borderRadius: '16px',
    background: 'linear-gradient(to bottom right, #fff, #f0fffc)',
    transition: 'all 0.3s ease',
  }}
  onMouseOver={(e) => {
    e.currentTarget.style.boxShadow = '0 8px 0 rgba(20, 184, 166, 0.5)';
  }}
  onMouseOut={(e) => {
    e.currentTarget.style.boxShadow = '0 3px 0 rgba(20, 184, 166, 0.5)';
  }}
>
  <div className="w-14 h-14 rounded-xl bg-teal-100 flex items-center justify-center mb-5" style={{ border: '2px solid #0D9488' }}>
    {/* 아이콘 */}
  </div>
  <h3 className="text-xl font-bold text-teal-800 mb-3">제목</h3>
  <p className="text-gray-600 mb-4">내용</p>
  <div className="absolute -bottom-3 -right-3 w-16 h-16 bg-teal-100 rounded-full opacity-40"></div>
</div>
```

### 헤더와 섹션 제목
```jsx
<h2 className="text-3xl font-bold text-center mb-12 text-[#783ae8]">
  섹션 제목
</h2>
```

### 프레임 (섹션 컨테이너)
```jsx
<div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-10 rounded-3xl" style={{
  border: '1px solid rgba(139, 92, 246, 0.3)', 
  boxShadow: '0 3px 0 rgba(139, 92, 246, 0.15)'
}}>
  <h2 className="text-2xl font-bold text-center mb-10 text-[#783ae8]">
    섹션 제목
  </h2>
  {/* 내용 */}
</div>
```

### 사용자 프로필 버튼
```jsx
<Link 
  to="/profile" 
  className="bg-purple-600 text-white px-4 py-2 rounded-full hover:bg-purple-700 transition-colors flex items-center gap-2"
  style={{
    boxShadow: '0 2px 0 #000',
    border: '1px solid #000',
    transition: 'all 0.2s ease',
  }}
  onMouseOver={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 4px 0 #000';
  }}
  onMouseOut={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 2px 0 #000';
  }}
>
  <User size={18} className="text-white" />
  <span className="font-medium">사용자명</span>
  <Settings size={16} />
</Link>
```

## 3. 페이지 별 적용 가이드

### 호스트 페이지
- 보라색-인디고 계열 테마 사용
- 아이콘 색상은 purple-600 또는 indigo-600 사용
- 배경 그라데이션: `from-[#F8F7FF] via-[#F3F1FF] to-[#F0EEFF]`
- 버튼은 보라색-인디고 그라데이션 사용

### 참가자 페이지
- 청록색-청색 계열 테마 사용
- 아이콘 색상은 teal-500 또는 cyan-500 사용
- 배경 그라데이션: `from-[#F0FFFD] via-[#E6FFFC] to-[#E0FFFA]`
- 버튼은 청록색-청색 그라데이션 사용

## 4. 주의사항

1. **가장 중요**: 페이지의 레이아웃, 간격, 패딩, 글꼴 크기, 구성요소는 모바일 등 환경에 맞춰놓은 상태이므로 이 상태를 유지하며 스타일(색상, 그라데이션, 테두리, 그림자 등)만 변경할 것
2. 기존 페이지의 간격 및 글꼴 크기는 유지
3. SBAggroB 글꼴은 사용하지 않음
4. 모바일 호환성을 위해 다음 클래스 활용:
   - `flex-col sm:flex-row`
   - `text-sm sm:text-base md:text-lg lg:text-xl`
   - `w-full max-w-6xl mx-auto`

## 5. 활용 예시

### 호스트 페이지 예시
```jsx
<div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F8F7FF] via-[#F3F1FF] to-[#F0EEFF]">
  <div className="px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto">
    {/* 헤더 컴포넌트 */}
    <div className="py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-[#783ae8]">퀴즈 관리</h1>
      <p className="text-gray-600">퀴즈를 생성하고 관리하세요</p>
    </div>
    
    {/* 컨텐츠 영역 */}
    <main className="py-6">
      {/* 카드 컴포넌트들 */}
    </main>
  </div>
</div>
```

### 참가자 페이지 예시
```jsx
<div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F0FFFD] via-[#E6FFFC] to-[#E0FFFA]">
  <div className="px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto">
    {/* 헤더 컴포넌트 */}
    <div className="py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-[#783ae8]">퀴즈 참여</h1>
      <p className="text-gray-600">코드를 입력하고 퀴즈에 참여하세요</p>
    </div>
    
    {/* 컨텐츠 영역 */}
    <main className="py-6">
      {/* 카드 컴포넌트들 */}
    </main>
  </div>
</div>
``` 