# Phase 3 웹 출시 준비

## 목표

루멘왕국 웹을 데스크톱·모바일 브라우저에서 안정적으로 실행하고 홈 화면에 설치할 수 있는 PWA로 배포한다. 웹 업데이트는 사용자가 안전하게 적용하며, 로그인·AI·Supabase API 응답은 서비스워커 캐시에 저장하지 않는다.

## 구현 범위

- UTF-8 웹앱 manifest와 512px/180px 설치 아이콘
- 홈 화면 설치 안내와 일정·리타 바로가기
- 동일 출처의 정적 화면 자산만 저장하는 서비스워커
- 페이지 진입은 network-first, 오프라인에서는 저장된 앱 셸 사용
- `/.netlify/functions/`와 Authorization 요청 캐시 제외
- 새 배포 감지 후 사용자 선택으로 서비스워커 교체·새로고침
- 오프라인 상태 안내
- iPhone/iPad 홈 화면 실행용 Apple 메타데이터
- 서비스워커 비캐시 및 기본 보안 응답 헤더

## 캐시 원칙

서비스워커는 앱 실행에 필요한 HTML, CSS, JavaScript, 이미지와 글꼴만 저장한다. Supabase는 다른 출처이므로 캐시하지 않으며 Netlify Function, Authorization 헤더가 있는 요청, POST·PATCH·DELETE 요청도 처리하지 않는다. 따라서 계정 데이터와 AI 응답은 브라우저 Cache Storage에 들어가지 않는다.

## 배포 확인

1. Netlify 배포 후 `/manifest.webmanifest`와 `/sw.js`가 200인지 확인
2. Chrome DevTools Application에서 manifest 오류가 없는지 확인
3. 설치 후 `/calendar`, `/rita` 바로가기 확인
4. 새 커밋 배포 후 업데이트 안내와 새로고침 확인
5. 한 번 온라인 접속한 뒤 오프라인 새로고침 시 앱 셸 진입 확인
6. 오프라인 저장 시 기존 롤백 안내가 정상 표시되는지 확인

## 다음 단계

Phase 4에서는 이 공통 Supabase 계약을 사용하는 iOS SwiftUI 앱과 WidgetKit 타깃을 시작한다.
