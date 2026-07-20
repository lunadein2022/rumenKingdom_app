import { useMemo, useState } from 'react'
import { Bell, CheckCheck, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BackButton } from '../../components/BackButton'
import { Pagination, usePaginatedList } from '../../components/Pagination'
import { useNotificationCenter } from './notificationContext'

export function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, notificationsEnabled, unreadCount, markRead, markAllRead } = useNotificationCenter()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const visible = useMemo(() => filter === 'unread' ? notifications.filter((item) => !item.read) : notifications, [filter, notifications])
  const pagination = usePaginatedList(visible, filter)

  return <div className="notifications-page">
    <BackButton fallback="/" label="돌아가기"/>
    <section className="panel glass-panel notifications-hero">
      <div><span className="eyebrow">ROYAL NOTICES</span><h2><Bell size={22}/> 전체 알림</h2><p>중요한 소식과 오늘 확인할 일을 한곳에서 살펴보세요.</p></div>
      <div className="notifications-summary"><b>{unreadCount}</b><span>미확인 알림</span></div>
    </section>
    <section className="panel glass-panel notifications-panel">
      <div className="notifications-tools">
        <div><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>전체 {notifications.length}</button><button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>미확인 {unreadCount}</button></div>
        {unreadCount > 0 && <button className="notifications-read-all" onClick={markAllRead}><CheckCheck size={15}/> 모두 읽음</button>}
      </div>
      {!notificationsEnabled ? <p className="notifications-empty">왕좌의 방에서 앱 내부 알림이 꺼져 있습니다.</p> : visible.length ? <div className="notifications-list">{pagination.visibleItems.map((item) => <button key={item.id} className={item.read ? 'read' : 'unread'} onClick={() => { markRead(item); navigate(item.path) }}>
        <i aria-hidden="true"/>
        <span className="notifications-copy"><b>{item.title}</b>{item.summary && <small> · {item.summary}</small>}</span>
        <time>{new Date(item.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
        <ChevronRight size={15}/>
      </button>)}</div> : <p className="notifications-empty">{filter === 'unread' ? '확인할 새 알림이 없습니다.' : '아직 도착한 알림이 없습니다.'}</p>}
      {notificationsEnabled && <Pagination page={pagination.page} totalItems={pagination.totalItems} onPageChange={pagination.setPage} label={filter === 'unread' ? '미확인 알림' : '전체 알림'}/>}
    </section>
  </div>
}
