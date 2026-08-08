import React, { useState } from 'react';
import { ArrowLeft, User, Shield, LayoutDashboard, Settings, Moon, Sun, Sparkles, Check } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import type { Theme } from '../../context/ThemeContext';
import { PermissionService } from '../../services/PermissionService';
import type { Role } from '../../services/PermissionService';
import { WidgetRegistry } from '../../widgets/WidgetRegistry';
import { getProfile } from '../../services/ApiClient';

export const AjustesModule: React.FC = () => {
  const { userConfig, updateConfig, isSyncing } = useUser();
  const { setTheme } = useTheme();

  const isSuperAdmin = getProfile()?.role === 'super-admin';
  const [nameDraft, setNameDraft] = useState(userConfig.userName);
  const [saved, setSaved] = useState(false);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);

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
    const updated = userConfig.widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    updateConfig({ widgets: updated });
  };

  const themeOptions: { id: Theme; label: string; icon: React.ReactNode }[] = [
    { id: 'dark', label: 'Modo Oscuro', icon: <Moon size={16} /> },
    { id: 'light', label: 'Modo Claro', icon: <Sun size={16} /> },
    { id: 'mixed', label: 'Modo Mixto', icon: <Sparkles size={16} /> },
  ];

  return (
    <div className="module-container fade-in" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
          {[...userConfig.widgets]
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
    </div>
  );
};

export default AjustesModule;