import React, { useState } from 'react';
import { Mail, ArrowLeft, Send, Check, Bell, UserPlus, Inbox } from 'lucide-react';
import { useMessages } from '../../context/MessagesContext';
import type { Notification } from '../../context/MessagesContext';

const NOTIF_COLORS: Record<Notification['type'], { color: string; bg: string }> = {
  danger: { color: '#F43F5E', bg: 'rgba(244,63,94,0.12)' },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  info: { color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
  success: { color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
};

export const MessagesModule: React.FC = () => {
  const { messages, notifications, unreadMessages, markMessageRead, addMessage, markNotificationRead } = useMessages();
  const [tab, setTab] = useState<'mensajes' | 'notificaciones'>('mensajes');
  const [draft, setDraft] = useState('');
  const [showCompose, setShowCompose] = useState(false);

  const toDashboard = () => {
    window.dispatchEvent(new CustomEvent('change-view', { detail: 'dashboard' }));
    window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: 'dashboard' }));
  };

  const navigate = (view?: string) => {
    if (!view) return;
    window.dispatchEvent(new CustomEvent('change-view', { detail: view }));
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    addMessage(draft.trim());
    setDraft('');
    setShowCompose(false);
  };

  return (
    <div className="module-container fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Mail size={28} color="#16F0B5" />
            Mensajes
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0' }}>
            Bandeja de entrada y notificaciones del sistema
          </p>
        </div>
        <button
          onClick={toDashboard}
          style={{
            background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px', padding: '10px 18px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }}
        >
          <ArrowLeft size={16} /> Dashboard
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {([
          { id: 'mensajes', label: 'Mensajes', count: unreadMessages, icon: <Inbox size={15} /> },
          { id: 'notificaciones', label: 'Notificaciones', count: notifications.length, icon: <Bell size={15} /> },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: tab === t.id ? 'rgba(22,240,181,0.12)' : 'rgba(255,255,255,0.04)',
              border: tab === t.id ? '1px solid rgba(22,240,181,0.3)' : '1px solid rgba(255,255,255,0.08)',
              color: tab === t.id ? '#16F0B5' : 'rgba(255,255,255,0.7)',
              borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
            }}
          >
            {t.icon} {t.label}
            {t.count > 0 && (
              <span style={{
                background: tab === t.id ? '#16F0B5' : '#3B82F6', color: '#111', fontSize: '10px', fontWeight: 700,
                width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{t.count}</span>
            )}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {tab === 'mensajes' && (
          <button
            onClick={() => setShowCompose(!showCompose)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(22,240,181,0.15)', color: '#16F0B5', border: '1px solid rgba(22,240,181,0.3)',
              borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
            }}
          >
            <UserPlus size={15} /> Nueva conversación
          </button>
        )}
      </div>

      {tab === 'mensajes' ? (
        <>
          {showCompose && (
            <form onSubmit={sendMessage} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Escribe el mensaje para un cliente o contacto..."
                rows={3}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', color: 'white', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowCompose(false)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-subtle)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
                <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#16F0B5', color: '#111', borderRadius: '8px', padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                  <Send size={14} /> Enviar
                </button>
              </div>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>
                No hay conversaciones en tu bandeja.
              </div>
            ) : messages.map(m => (
              <div
                key={m.id}
                onClick={() => markMessageRead(m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  background: m.unread ? 'rgba(22,240,181,0.05)' : 'rgba(255,255,255,0.03)',
                  border: m.unread ? '1px solid rgba(22,240,181,0.15)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(56,189,248,0.15)', color: '#38BDF8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700
                }}>
                  {m.sender.slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', fontSize: '14px', fontWeight: m.unread ? 700 : 500 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {m.sender}
                      {m.unread && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16F0B5' }} />}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-subtle)', fontWeight: 400 }}>{m.time}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 600 }}>{m.company}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-subtle)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.text}</div>
                </div>
                {!m.unread && <Check size={16} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => notifications.forEach(n => markNotificationRead(n.id))}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              Marcar todas como leídas
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {notifications.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>
                No hay notificaciones sin leer.
              </div>
            ) : notifications.map(n => {
              const color = NOTIF_COLORS[n.type];
              return (
                <div
                  key={n.id}
                  onClick={() => { markNotificationRead(n.id); navigate(n.view); }}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', cursor: n.view ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{n.time}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'white', fontWeight: 700 }}>{n.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-subtle)', lineHeight: 1.4 }}>{n.desc}</div>
                  {n.view && <div style={{ fontSize: '11px', color: '#16F0B5', fontWeight: 600 }}>Ir a {n.view} →</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default MessagesModule;