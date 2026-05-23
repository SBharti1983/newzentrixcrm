import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check, ExternalLink, Info, AlertTriangle, CheckCircle2, MessageSquare, UserPlus, Calendar } from 'lucide-react';

interface NotificationDropdownProps {
    onClose: () => void;
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef(null);

    const fetchNotifications = useCallback(async () => {
        // Generate mock data inside the function to avoid impure render
        const mockNotifications = [
            {
                id: '1',
                title: 'New Lead Assigned',
                message: 'A new lead "John Doe" has been assigned to you.',
                type: 'lead',
                is_read: false,
                created_at: dateUtils.getNow().toISOString()
            },
            {
                id: '2',
                title: 'Site Visit Scheduled',
                message: 'Site visit for "Silver Oaks" project is scheduled for tomorrow at 10 AM.',
                type: 'task',
                is_read: false,
                created_at: (() => { const d = dateUtils.getNow(); d.setTime(d.getTime() - 3600000); return d.toISOString(); })()
            },
            {
                id: '3',
                title: 'Payment Received',
                message: 'Booking #BK-902 payment of ₹5,00,000 has been verified.',
                type: 'success',
                is_read: true,
                created_at: (() => { const d = dateUtils.getNow(); d.setTime(d.getTime() - 86400000); return d.toISOString(); })()
            }
        ];

        try {
            // For now, use mock
            setTimeout(() => {
                setNotifications(mockNotifications);
                setLoading(false);
            }, 500);
        } catch (err) {
            console.error('Fetch notifications error:', err);
            setNotifications(mockNotifications);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        
        // Handle click outside to close
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [fetchNotifications, onClose]);

    const markAsRead = async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        // await fetch(`/api/system-notifications/${id}/read`, { method: 'PATCH' });
    };

    const markAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        // await fetch('/api/system-notifications/read-all', { method: 'PATCH' });
    };

    const deleteNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        // await fetch(`/api/system-notifications/${id}`, { method: 'DELETE' });
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={16} color="var(--accent-emerald)" />;
            case 'warning': return <AlertTriangle size={16} color="var(--accent-amber)" />;
            case 'error': return <AlertTriangle size={16} color="var(--accent-rose)" />;
            case 'lead': return <UserPlus size={16} color="var(--accent-cyan)" />;
            case 'task': return <Calendar size={16} color="var(--accent-violet)" />;
            default: return <Info size={16} color="var(--navy-400)" />;
        }
    };

    const formatTime = (dateStr) => {
        const date = dateUtils.parseSafe(dateStr);
        if (!date) return 'Just now';
        const now = dateUtils.getNow();
        const diff = (now.getTime() - date.getTime()) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="notification-dropdown glass-card animate-fadeIn" ref={dropdownRef}>
            <div className="dropdown-header">
                <h3>Notifications</h3>
                <div className="header-actions">
                    <button onClick={markAllRead} className="action-link">Mark all as read</button>
                    <button onClick={onClose} className="close-icon"><X size={16} /></button>
                </div>
            </div>

            <div className="notification-list">
                {loading ? (
                    <div className="empty-state">Loading...</div>
                ) : notifications.length === 0 ? (
                    <div className="empty-state">
                        <Bell size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} className={`notification-item ${n.is_read ? '' : 'unread'}`}>
                            <div className="item-icon">
                                {getTypeIcon(n.type)}
                            </div>
                            <div className="item-content">
                                <div className="item-header">
                                    <span className="item-title">{n.title}</span>
                                    <span className="item-time">{formatTime(n.created_at)}</span>
                                </div>
                                <p className="item-message">{n.message}</p>
                                <div className="item-actions">
                                    {!n.is_read && (
                                        <button onClick={() => markAsRead(n.id)} className="btn-icon-sm" title="Mark as read">
                                            <Check size={12} />
                                        </button>
                                    )}
                                    <button onClick={() => deleteNotification(n.id)} className="btn-icon-sm" title="Remove">
                                        <X size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="dropdown-footer">
                <button className="view-all-btn">View All Activity</button>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .notification-dropdown {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    width: 400px;
                    max-width: calc(100vw - 32px);
                    max-height: 560px;
                    margin-top: 16px;
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(24px) saturate(180%);
                    -webkit-backdrop-filter: blur(24px) saturate(180%);
                    border-radius: 24px;
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 60px rgba(10, 22, 40, 0.15);
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    overflow: hidden;
                }
                .dropdown-header {
                    padding: 24px 28px;
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .dropdown-header h3 {
                    font-size: 1.1rem;
                    font-weight: 900;
                    color: var(--navy-900);
                    margin: 0;
                    letter-spacing: -0.01em;
                }
                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .action-link {
                    background: none;
                    border: none;
                    color: var(--accent-cyan-dark);
                    font-size: 0.75rem;
                    font-weight: 800;
                    cursor: pointer;
                    padding: 0;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .close-icon {
                    background: var(--slate-100);
                    border: none;
                    color: var(--text-muted);
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .close-icon:hover {
                    background: var(--slate-200);
                    color: var(--navy-900);
                }
                .notification-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px 12px;
                }
                .notification-item {
                    display: flex;
                    gap: 14px;
                    padding: 16px 20px;
                    border-radius: 16px;
                    transition: all 0.2s;
                    position: relative;
                    margin-bottom: 4px;
                    background: transparent;
                }
                .notification-item:hover {
                    background: white;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                }
                .notification-item.unread {
                    background: rgba(6, 182, 212, 0.04);
                }
                .notification-item.unread::before {
                    content: '';
                    position: absolute;
                    left: 8px;
                    top: 24px;
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--accent-cyan);
                    box-shadow: 0 0 8px var(--accent-cyan);
                }
                .item-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 14px;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                    border: 1px solid var(--border-light);
                }
                .item-content {
                    flex: 1;
                    min-width: 0;
                }
                .item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 4px;
                }
                .item-title {
                    font-size: 0.95rem;
                    font-weight: 800;
                    color: var(--navy-900);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .item-time {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    font-weight: 700;
                }
                .item-message {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin: 0;
                    line-height: 1.5;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    font-weight: 500;
                }
                .item-actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                    opacity: 0;
                    transform: translateY(4px);
                    transition: all 0.2s;
                }
                .notification-item:hover .item-actions {
                    opacity: 1;
                    transform: translateY(0);
                }
                .btn-icon-sm {
                   padding: 4px 10px;
                   border-radius: 8px;
                   border: 1px solid var(--border-light);
                   background: white;
                   display: flex;
                   align-items: center;
                   gap: 6px;
                   cursor: pointer;
                   color: var(--text-secondary);
                   font-size: 11px;
                   font-weight: 700;
                   transition: all 0.2s;
                }
                .btn-icon-sm:hover {
                    border-color: var(--accent-cyan);
                    color: var(--accent-cyan-dark);
                    background: var(--accent-cyan-light);
                }
                .dropdown-footer {
                    padding: 20px 28px;
                    background: rgba(255,255,255,0.4);
                }
                .view-all-btn {
                    width: 100%;
                    padding: 12px;
                    background: var(--navy-900);
                    border: none;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 800;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(10,22,40,0.1);
                }
                .view-all-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 16px rgba(10,22,40,0.15);
                }
                .empty-state {
                    padding: 60px 40px;
                    text-align: center;
                    color: var(--text-muted);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .empty-state p {
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: var(--navy-900);
                    margin: 12px 0 4px;
                }
                @media (max-width: 768px) {
                    .notification-dropdown {
                        position: fixed;
                        top: 70px;
                        left: 12px;
                        right: 12px;
                        width: auto;
                        max-width: none;
                        max-height: calc(100vh - 100px);
                        margin-top: 0;
                        border-radius: 20px;
                    }
                }
            `}} />
        </div>
    );
}
