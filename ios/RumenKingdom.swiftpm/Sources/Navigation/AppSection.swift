import SwiftUI

/// Mirrors `pagePaths` / `navigation` / `pageCopy` in `src/app/navigation.ts`.
/// `isPrimaryTab` matches the web split: the top nav bar only lists six
/// sections, while Rita and the Throne Room are separate header shortcuts —
/// on iPhone those two show as toolbar buttons instead of tab items.
enum AppSection: String, CaseIterable, Identifiable {
    case lobby, office, calendar, library, diary, garden, rita, throne

    var id: String { rawValue }

    var isPrimaryTab: Bool {
        switch self {
        case .rita, .throne: return false
        default: return true
        }
    }

    var label: String {
        switch self {
        case .lobby: return "로비"
        case .office: return "집무실"
        case .calendar: return "왕실 일정표"
        case .library: return "왕국 도서관"
        case .diary: return "공주의 침실"
        case .garden: return "루멘 비밀정원"
        case .rita: return "리타"
        case .throne: return "왕좌의 방"
        }
    }

    var eyebrow: String {
        switch self {
        case .lobby: return "ROYAL LOBBY"
        case .office: return "ROYAL OFFICE"
        case .calendar: return "ROYAL CALENDAR"
        case .library: return "KINGDOM ARCHIVE"
        case .diary: return "PRINCESS CHAMBER"
        case .garden: return "SECRET GARDEN"
        case .rita: return "ROYAL MAID"
        case .throne: return "THRONE ROOM"
        }
    }

    var pageDescription: String {
        switch self {
        case .lobby: return "오늘의 일정과 퀘스트를 한눈에 살펴보세요."
        case .office: return "메인 퀘스트의 흐름과 이번 주 업무를 관리합니다."
        case .calendar: return "공주의 하루를 계획하고, 중요한 일정을 한눈에 확인하세요."
        case .library: return "루멘왕국의 모든 기록이 보관되는 곳입니다."
        case .diary: return "오늘의 마음과 기억을 조용히 기록해 보세요."
        case .garden: return "잠시 숨을 고르고, 고요한 빛 속에서 쉬어가세요."
        case .rita: return "일정과 퀘스트부터 메모까지 무엇이든 말씀해 주세요."
        case .throne: return "공주의 계정과 왕국의 연결 상태를 관리합니다."
        }
    }

    var systemImage: String {
        switch self {
        case .lobby: return "house.fill"
        case .office: return "checklist"
        case .calendar: return "calendar"
        case .library: return "books.vertical.fill"
        case .diary: return "book.closed.fill"
        case .garden: return "leaf.fill"
        case .rita: return "sparkles"
        case .throne: return "crown.fill"
        }
    }
}
