import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Shield, LayoutDashboard, Settings, Moon, Sun, Sparkles, Check, CalendarDays, Link2, Unlink, Loader2, KeyRound, Database, HelpCircle, Users, RotateCcw } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import type { Theme } from '../../context/ThemeContext';
import { PermissionService } from '../../services/PermissionService';
import type { Role } from '../../services/PermissionService';
import { WidgetRegistry } from '../../widgets/WidgetRegistry';
import { getProfile, Api } from '../../services/ApiClient';
import { loadDemoData } from '../../services/demoSeed';

export const AjustesModule: React.FC = () => {
  const { userConfig, updateConfig, isSyncing } = useUser();
  const { setTheme } = useTheme();

  const isSuperAdmin = getProfile()?.role === 'super-admin';
  const [nameDraft, setNameDraft] = useState(userConfig.userName);
  const [saved, setSaved] = useState(false);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);

  // Seguridad (cambio de contraseña)
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNext, setPwNext] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Preguntas de seguridad
  const [secQuestions, setSecQuestions] = useState<{ question: string; answer: string }[]>([
    { question: '', answer: '' },
    { question: '', answer: '' },
  ]);
  const [secBusy, setSecBusy] = useState(false);
  const [secMsg, setSecMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Gestión de usuarios (super-admin)
  const [users, setUsers] = useState<{ id: number; username: string; role: string; name: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: number; username: string } | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('q_token') || ''}` },
      });
      const data = await res.json();
      if (data.ok) setUsers(data.users);
    } catch { /* noop */ } finally { setUsersLoading(false); }
  };

  useEffect(() => { if (isSuperAdmin) loadUsers(); }, [isSuperAdmin]);

  const handleSaveSecurityQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (secQuestions.some(q => !q.question.trim() || !q.answer.trim())) return;
    setSecBusy(true);
    setSecMsg(null);
    try {
      await Api.saveSecurityQuestions(secQuestions);
      setSecMsg({ ok: true, text: 'Preguntas guardadas ✓' });
    } catch (err) {
      setSecMsg({ ok: false, text: err instanceof Error ? err.message : 'No se pudieron guardar' });
    } finally { setSecBusy(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || resetPassword.length < 8) return;
    setResetBusy(true);
    setResetMsg(null);
    try {
      await Api.adminResetPassword(resetTarget.id, resetPassword);
      setResetMsg({ ok: true, text: `Contraseña de "${resetTarget.username}" actualizada ✓` });
      setResetTarget(null);
      setResetPassword('');
    } catch (err) {
      setResetMsg({ ok: false, text: err instanceof Error ? err.message : 'No se pudo resetear' });
    } finally { setResetBusy(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwCurrent || !pwNext) return;
    setPwBusy(true);
    setPwMsg(null);
    try {
      await Api.changePassword(pwCurrent, pwNext);
      setPwMsg({ ok: true, text: 'Contraseña actualizada ✓' });
      setPwCurrent('');
      setPwNext('');
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : 'No se pudo cambiar la contraseña' });
    } finally {
      setPwBusy(false);
    }
  };

  // Google Calendar
  const [gcalStatus, setGcalStatus] = useState<{ configured: boolean; connected: boolean; calName: string | null } | null>(null);
  const [gcalLoading, setGcalLoading] = useState(true);
  const [gcalConnectError, setGcalConnectError] = useState('');

  const loadGcal = async () => {
    setGcalLoading(true);
    try {
      const s = await Api.gcalStatus();
      setGcalStatus(s);
    } catch {
      setGcalStatus(null);
    } finally {
      setGcalLoading(false);
    }
  };

  useEffect(() => { loadGcal(); }, []);

  const connectGcal = async () => {
    try {
      const { url } = await Api.gcalAuthUrl();
      window.location.href = url;
    } catch {
      setGcalConnectError('No se pudo iniciar la conexión. Intenta de nuevo.');
    }
  };

  const disconnectGcal = async () => {
    await Api.gcalDisconnect();
    await loadGcal();
  };

  const roles = PermissionService.getRoles();

  const toDashboard = () => {
    window.dispatchEvent(new CustomEvent('change-view', { detail: 'dashboard' }));
    window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: 'dashboard' }));
  };

  const saveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameDraft.trim()) return;
    updateConfig({ userName: nameDraft.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const setThemeSelect = (theme: Theme) => {
    updateConfig({ theme });
    setTheme(theme);
  };

  const setRole = (role: Role) => {
    setPendingRole(role);
  };

  const confirmRole = () => {
    if (pendingRole) updateConfig({ userRole: pendingRole });
    setPendingRole(null);
  };

  const toggleWidget = (id: string) => {
    const list = Array.isArray(userConfig.widgets) ? userConfig.widgets : [];
    const updated = list.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    updateConfig({ widgets: updated });
  };

  const loadDemo = () => {
    const ok = window.confirm(
      'Se reemplazarán los datos locales por información de prueba en todos los módulos (tareas, finanzas, salud, calendario, mensajes, registro, banda). ¿Continuar?'
    );
    if (ok) loadDemoData();
  };

  const themeOptions: { id: Theme; label: string; icon: React.ReactNode }[] = [
    { id: 'dark', label: 'Modo Oscuro', icon: <Moon size={16} /> },
    { id: 'light', label: 'Modo Claro', icon: <Sun size={16} /> },
    { id: 'mixed', label: 'Modo Mixto', icon: <Sparkles size={16} /> },
  ];

  return (
    <div className="module-container fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Settings size={28} color="#16F0B5" />
            Ajustes
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0' }}>
            Perfil, apariencia, rol y widgets de tu sistema
            {isSyncing && <span style={{ marginLeft: '10px', color: '#38BDF8', fontSize: '12px' }}>Sincronizando...</span>}
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

      {/* Perfil */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <User size={16} color="#38BDF8" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Perfil</h3>
        </div>
        <form onSubmit={saveName} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px', color: 'white', fontSize: '14px' }}
          />
          <button type="submit" style={{ background: '#16F0B5', color: '#111', borderRadius: '10px', padding: '10px 16px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
            {saved ? 'Guardado ✓' : 'Guardar'}
          </button>
        </form>
        <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--text-subtle)' }}>Tu rol actual: <strong style={{ color: '#38BDF8' }}>{roles.find(r => r.id === userConfig.userRole)?.label}</strong></p>
      </section>

      {/* Seguridad */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <KeyRound size={16} color="#F87171" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Seguridad</h3>
        </div>
        <form onSubmit={changePassword} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-subtle)', marginBottom: '6px' }}>Contraseña actual</label>
            <input
              type="password"
              value={pwCurrent}
              onChange={e => setPwCurrent(e.target.value)}
              autoComplete="current-password"
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px', color: 'white', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-subtle)', marginBottom: '6px' }}>Nueva contraseña (mín. 8)</label>
            <input
              type="password"
              value={pwNext}
              onChange={e => setPwNext(e.target.value)}
              autoComplete="new-password"
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px', color: 'white', fontSize: '14px' }}
            />
          </div>
          <button
            type="submit"
            disabled={pwBusy}
            style={{
              background: '#F87171', color: 'white', borderRadius: '10px', padding: '10px 16px',
              border: 'none', cursor: pwBusy ? 'default' : 'pointer', fontSize: '13px', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '6px', opacity: pwBusy ? 0.6 : 1
            }}
          >
            {pwBusy ? <Loader2 size={14} className="sync-spinner" /> : <KeyRound size={14} />}
            {pwBusy ? 'Guardando...' : 'Cambiar'}
          </button>
        </form>
        {pwMsg && (
          <p style={{ margin: '12px 0 0', fontSize: '12px', color: pwMsg.ok ? '#16F0B5' : '#F87171' }}>{pwMsg.text}</p>
        )}
      </section>

      {/* Preguntas de seguridad */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <HelpCircle size={16} color="#F59E0B" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Preguntas de seguridad</h3>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-subtle)' }}>
          Configurá 2-3 preguntas para poder recuperar tu contraseña desde la pantalla de inicio si la olvidás.
        </p>
        <form onSubmit={handleSaveSecurityQuestions} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {secQuestions.map((sq, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input
                type="text"
                value={sq.question}
                onChange={e => {
                  const next = [...secQuestions];
                  next[i] = { ...next[i], question: e.target.value };
                  setSecQuestions(next);
                }}
                placeholder={`Pregunta ${i + 1} (ej: ¿Nombre de tu primera mascota?)`}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px', color: 'white', fontSize: '13px' }}
              />
              <input
                type="text"
                value={sq.answer}
                onChange={e => {
                  const next = [...secQuestions];
                  next[i] = { ...next[i], answer: e.target.value };
                  setSecQuestions(next);
                }}
                placeholder="Respuesta"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px', color: 'white', fontSize: '13px' }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setSecQuestions([...secQuestions, { question: '', answer: '' }])}
              disabled={secQuestions.length >= 3}
              style={{
                background: 'rgba(255,255,255,0.06)', color: 'var(--text-subtle)', border: '1px solid var(--border-color)',
                borderRadius: '10px', padding: '8px 14px', cursor: secQuestions.length >= 3 ? 'default' : 'pointer',
                fontSize: '12px', fontWeight: 600, opacity: secQuestions.length >= 3 ? 0.4 : 1
              }}
            >
              + Agregar pregunta
            </button>
            <button
              type="submit"
              disabled={secBusy || secQuestions.some(q => !q.question.trim() || !q.answer.trim())}
              style={{
                background: '#F59E0B', color: '#111', borderRadius: '10px', padding: '10px 16px',
                border: 'none', cursor: secBusy ? 'default' : 'pointer', fontSize: '13px', fontWeight: 700,
                opacity: secBusy ? 0.6 : 1, marginLeft: 'auto'
              }}
            >
              {secBusy ? 'Guardando...' : 'Guardar preguntas'}
            </button>
          </div>
        </form>
        {secMsg && (
          <p style={{ margin: '12px 0 0', fontSize: '12px', color: secMsg.ok ? '#16F0B5' : '#F87171' }}>{secMsg.text}</p>
        )}
      </section>

      {/* Apariencia */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sun size={16} color="#F59E0B" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Apariencia</h3>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {themeOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setThemeSelect(opt.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px',
                background: userConfig.theme === opt.id ? 'rgba(22,240,181,0.12)' : 'rgba(255,255,255,0.04)',
                border: userConfig.theme === opt.id ? '1px solid rgba(22,240,181,0.35)' : '1px solid var(--border-color)',
                color: userConfig.theme === opt.id ? '#16F0B5' : 'var(--text-subtle)',
                borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600
              }}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Google Calendar */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <CalendarDays size={16} color="#4285F4" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Google Calendar</h3>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-subtle)' }}>
          Conecta tu Google Calendar para ver tus reuniones en el calendario del sistema. La conexión se maneja desde aquí.
        </p>

        {gcalLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-subtle)', fontSize: '13px' }}>
            <Loader2 size={16} className="sync-spinner" /> Consultando estado...
          </div>
        ) : gcalStatus ? (
          gcalStatus.connected ? (
            <div style={{ background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.25)', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px #34D399' }} />
                <div>
                  <div style={{ fontSize: '13px', color: 'white', fontWeight: 600 }}>Conectado</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{gcalStatus.calName || 'Calendario primario'}</div>
                </div>
              </div>
              <button onClick={disconnectGcal} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Unlink size={14} /> Desconectar
              </button>
            </div>
          ) : gcalStatus.configured ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
              <button onClick={connectGcal} style={{ background: '#4285F4', color: 'white', borderRadius: '10px', padding: '10px 16px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link2 size={14} /> Conectar Google Calendar
              </button>
              {gcalConnectError && (
                <span style={{ fontSize: '12px', color: '#F87171' }}>{gcalConnectError}</span>
              )}
            </div>
          ) : (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', padding: '14px', fontSize: '13px', color: '#FBBF24', lineHeight: 1.6 }}>
              El servidor aún no tiene configuradas las credenciales de Google (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).
              Pídele al administrador que las configure para habilitar la conexión.
            </div>
          )
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>No se pudo consultar el estado del servidor.</div>
        )}
      </section>

      {/* Rol — solo visible para super-admins */}
      {isSuperAdmin && (
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Shield size={16} color="#8B5CF6" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Rol de usuario</h3>
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#F59E0B' }}>Solo el super-admin puede gestionar roles</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
          {roles.map(r => {
            const active = userConfig.userRole === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                style={{
                  padding: '12px 14px', textAlign: 'left',
                  background: active ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                  border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--border-color)',
                  color: active ? '#A78BFA' : 'var(--text-subtle)',
                  borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                {r.label}
                {active && <Check size={14} style={{ color: '#A78BFA' }} />}
              </button>
            );
          })}
        </div>
      </section>
      )}

      {/* Gestión de usuarios — solo super-admin */}
      {isSuperAdmin && (
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Users size={16} color="#38BDF8" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Gestión de usuarios</h3>
        </div>
        {usersLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-subtle)', fontSize: '13px' }}>
            <Loader2 size={16} className="sync-spinner" /> Cargando usuarios...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {users.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: 'white', fontWeight: 600 }}>{u.name || u.username}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{u.username} · {u.role}</div>
                </div>
                <button
                  onClick={() => { setResetTarget({ id: u.id, username: u.username }); setResetMsg(null); }}
                  style={{
                    background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.25)',
                    borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <RotateCcw size={12} /> Resetear
                </button>
              </div>
            ))}
          </div>
        )}
        {resetMsg && (
          <p style={{ margin: '12px 0 0', fontSize: '12px', color: resetMsg.ok ? '#16F0B5' : '#F87171' }}>{resetMsg.text}</p>
        )}
      </section>
      )}

      {/* Modal reset password */}
      {resetTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <RotateCcw size={20} color="#F87171" />
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>Resetear contraseña</h3>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-subtle)', lineHeight: 1.5 }}>
              Nueva contraseña para <strong style={{ color: 'white' }}>{resetTarget.username}</strong> (mín. 8 caracteres).
            </p>
            <form onSubmit={handleResetPassword}>
              <input
                type="text"
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                placeholder="Nueva contraseña"
                minLength={8}
                required
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px', color: 'white', fontSize: '14px', marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setResetTarget(null)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-subtle)', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={resetBusy || resetPassword.length < 8} style={{ background: '#F87171', color: 'white', borderRadius: '10px', padding: '10px 20px', border: 'none', cursor: resetBusy ? 'default' : 'pointer', fontSize: '13px', fontWeight: 700, opacity: resetBusy ? 0.6 : 1 }}>
                  {resetBusy ? 'Guardando...' : 'Resetear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {pendingRole && (() => {
        const currentLabel = roles.find(r => r.id === userConfig.userRole)?.label || userConfig.userRole;
        const targetLabel = roles.find(r => r.id === pendingRole)?.label || pendingRole;
        const isSame = pendingRole === userConfig.userRole;
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px',
              padding: '24px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Shield size={20} color="#8B5CF6" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>Confirmar cambio de rol</h3>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-subtle)', lineHeight: 1.5 }}>
                {isSame
                  ? `Ya tienes asignado el rol "${targetLabel}".`
                  : <>Estás a punto de cambiar tu rol de <strong style={{ color: 'white' }}>{currentLabel}</strong> a <strong style={{ color: '#A78BFA' }}>{targetLabel}</strong>. Esto cambiará los permisos de la plataforma.</>}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  onClick={() => setPendingRole(null)}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-subtle)', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                {!isSame && (
                  <button
                    onClick={confirmRole}
                    style={{ background: '#8B5CF6', color: 'white', borderRadius: '10px', padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
                  >
                    Confirmar
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Widgets */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <LayoutDashboard size={16} color="#10B981" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Widgets del Dashboard</h3>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-subtle)' }}>
          Muestra u oculta los módulos que aparecen en tu página de inicio.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
          {[...(Array.isArray(userConfig.widgets) ? userConfig.widgets : [])]
            .sort((a, b) => a.order - b.order)
            .map(w => {
              const meta = WidgetRegistry.get(w.id);
              return (
                <button
                  key={w.id}
                  onClick={() => toggleWidget(w.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '12px 14px',
                    background: w.visible ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                    border: w.visible ? '1px solid var(--border-color)' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px', cursor: 'pointer'
                  }}
                >
                  <div style={{ textAlign: 'left', minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: 'white', fontWeight: 600 }}>{meta?.name || w.id}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {meta?.description || w.id}
                    </div>
                  </div>
                  <span style={{
                    width: '34px', height: '20px', borderRadius: '12px', flexShrink: 0,
                    background: w.visible ? '#16F0B5' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s'
                  }}>
                    <span style={{
                      position: 'absolute', top: '2px', left: w.visible ? 16 : 2, width: '16px', height: '16px', borderRadius: '50%',
                      background: '#111', transition: 'left 0.2s'
                    }} />
                  </span>
                </button>
              );
            })}
        </div>
      </section>

      {/* Datos de demostración */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Database size={16} color="#3ACDFF" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Datos de demostración</h3>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-subtle)' }}>
          Carga información de ejemplo en todas las secciones: tareas, proyectos, hábitos, finanzas, salud,
          bullet journal, mensajes, clientes, metas, compras, pomodoro, banda y registro de auditorías.
        </p>
        <button
          onClick={loadDemo}
          style={{
            background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Cargar datos de prueba
        </button>
      </section>
    </div>
  );
};

export default AjustesModule;