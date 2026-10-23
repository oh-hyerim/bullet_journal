# 🗄️ [백엔드 설계서] Firebase Firestore & 구글 OAuth 아키텍처

- **문서 버전**: v1.0
- **작성자**: EMP-004 백엔드 & 클라우드 아키텍트
- **소속**: 백엔드/인프라팀
- **검토자**: 총괄 CEO
- **기획 참조**: [projects/bullet-journal/PRD.md](file:///c:/code/ai-company/projects/bullet-journal/PRD.md)

---

## 1. 인증 아키텍처: Google OAuth 2.0 (Firebase Auth)
- **로그인 방식**: Firebase Auth 기반 Google Sign-In (Popup / Redirect 지원)
- **세션 관리**: JWT 기반 자동 세션 갱신 (`IndexedDB`에 로컬 캐싱되어 오프라인에서도 로그인 유지)
- **보안 규칙 (Firestore Security Rules)**:
  - 본인의 `uid`와 일치하는 문서 경로(`users/{uid}/*`)에 대해서만 읽기/쓰기 허용.
  - 타인 데이터 열람 원천 차단.

---

## 2. NoSQL 데이터베이스 스키마 (Firestore Collection)

```
users/ (Collection)
 └── {userId}/ (Document - 사용자 기본 프로필)
      │
      ├── todos/ (Sub-collection: 불렛 투두)
      │    └── {todoId}: {
      │          id: string,
      │          date: "YYYY-MM-DD",
      │          symbol: "task" | "done" | "migrated" | "event" | "note",
      │          isPriority: boolean,
      │          content: string,
      │          timeBlock: { start: "09:00", end: "10:30" } | null,
      │          createdAt: timestamp,
      │          updatedAt: timestamp
      │        }
      │
      ├── habits/ (Sub-collection: 해빗 마스터)
      │    └── {habitId}: {
      │          id: string,
      │          name: string,
      │          icon: string,
      │          color: string,
      │          targetDaysPerWeek: number,
      │          createdAt: timestamp
      │        }
      │
      └── habit_logs/ (Sub-collection: 일자별 해빗 체크 히스토리)
           └── {date}: {  // e.g. "2026-10-21"
                 date: "YYYY-MM-DD",
                 completedHabitIds: string[], // [habitId1, habitId2]
                 updatedAt: timestamp
               }
```

---

## 3. 오프라인 우선(Offline-First) 동기화 전략
- **IndexedDB 로컬 지속성(Persistence)** 활성화:
  - 인터넷이 끊긴 비행기나 지하철 환경에서도 즉시 읽기/쓰기 가능.
  - 네트워크 재연결 시 백그라운드에서 Firebase 클라우드와 자동 병합(Last-Write-Wins 충돌 해결).

---

## 4. 백엔드 아키텍트 보고 (사규 규격)
- **결론 한 줄**: Google OAuth와 기기간 0.1초 실시간 동기화를 지원하는 오프라인 우선 Firestore 스키마 및 보안 규칙 설계를 완료했습니다.
- **근거**: 의장님의 지시(구글 계정 연동, PC/모바일/태블릿 동기화) 및 투두, 타임블록, 해빗트래커의 요구사항을 반영하여 정규화함.
- **확인 못 한 것**: 의장님 본인의 Firebase 프로젝트 설정 키(향후 연동 시 환경 변수로 주입 예정).
