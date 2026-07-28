import React from 'react';
import { Heart, Pill, Calendar, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useHealth } from '../context/HealthContext';
import { WidgetRegistry } from './WidgetRegistry';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getDaysUntil(isoDateTime: string): number {
  const now = new Date();
  const target = new Date(isoDateTime);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function navigate(view: string) {
  window.dispatchEvent(new CustomEvent('change-view', { detail: view }));
}

// ─────────────────────────────────────────────
// WIDGET 1: Next Medication (size: small)
// ─────────────────────────────────────────────

const NextMedicationWidget: React.FC = () => {
  const { getTodayDoses, markDoseAdministered, activeProfile } = useHealth();
  const doses = getTodayDoses();
  const pending = doses.filter(d => !d.taken);
  const taken = doses.filter(d => d.taken);

  return (
    <div className="health-widget-card">
      <div className="widget-header-row" style={{ marginBottom: '12px' }}>
        <div className="title-with-badge">
          <Pill size={16} className="brand-accent-text" style={{ color: '#10B981' }} />
          <h3>Medicamentos</h3>
          {pending.length > 0 && (
            <span className="badge" style={{ background: '#EF4444' }}>{pending.length}</span>
          )}
        </div>
        <button className="toolbar-icon-btn" onClick={() => navigate('health')} title="Ver módulo de salud">
          <ExternalLink size={14} />
        </button>
      </div>

      {/* Profile indicator */}
      <div className="widget-profile-indicator">
        <span className="profile-avatar-sm">{activeProfile?.avatar}</span>
        <span className="profile-name-sm">{activeProfile?.name}</span>
      </div>

      {doses.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', textAlign: 'center', padding: '12px 0' }}>
          Sin dosis programadas hoy.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
          {/* Pending doses */}
          {pending.slice(0, 4).map(({ medication, scheduledTime }) => (
            <div
              key={`${medication.id}-${scheduledTime}`}
              className="widget-dose-row"
            >
              <div
                className="widget-dose-dot"
                style={{ backgroundColor: medication.color }}
              />
              <div className="widget-dose-info">
                <span className="widget-dose-name">{medication.name}</span>
                <span className="widget-dose-time">{scheduledTime} — {medication.dose}</span>
              </div>
              <button
                className="widget-dose-mark-btn"
                onClick={() => markDoseAdministered(medication.id, scheduledTime)}
                title="Marcar como tomada"
              >
                <CheckCircle2 size={14} />
              </button>
            </div>
          ))}

          {/* Taken doses (muted) */}
          {taken.slice(0, 2).map(({ medication, scheduledTime }) => (
            <div
              key={`${medication.id}-${scheduledTime}-done`}
              className="widget-dose-row dose-done"
            >
              <CheckCircle2 size={13} style={{ color: '#10B981', flexShrink: 0 }} />
              <span className="widget-dose-name-done">{medication.name}</span>
              <span className="widget-dose-time-done">{scheduledTime}</span>
            </div>
          ))}

          {pending.length > 4 && (
            <button className="text-btn" onClick={() => navigate('health')} style={{ fontSize: '0.78rem', marginTop: '4px' }}>
              +{pending.length - 4} más pendientes →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// WIDGET 2: Health Summary (size: medium)
// ─────────────────────────────────────────────

const HealthSummaryWidget: React.FC = () => {
  const {
    activeProfile, getMedications, getUpcomingAppointments
  } = useHealth();

  const medications = getMedications();
  const upcomingAppts = getUpcomingAppointments(14);
  const criticalMeds = medications.filter(m => {
    const pct = m.stockRemaining / m.stockTotal;
    return pct <= 0.2;
  });

  return (
    <div className="health-widget-card">
      <div className="widget-header-row" style={{ marginBottom: '12px' }}>
        <div className="title-with-badge">
          <Heart size={16} style={{ color: '#EF4444' }} />
          <h3>Resumen de Salud</h3>
          {criticalMeds.length > 0 && (
            <span className="badge" style={{ background: '#EF4444' }}>⚠</span>
          )}
        </div>
        <button className="toolbar-icon-btn" onClick={() => navigate('health')} title="Ver módulo de salud">
          <ExternalLink size={14} />
        </button>
      </div>

      {/* Active Profile */}
      {activeProfile && (
        <div className="health-summary-profile">
          <span className="health-summary-avatar">{activeProfile.avatar}</span>
          <div className="health-summary-profile-info">
            <span className="health-summary-name">{activeProfile.name}</span>
            <div className="health-summary-tags">
              <span className="blood-badge-sm">{activeProfile.bloodType}</span>
              {activeProfile.allergies.length > 0 && (
                <span className="allergy-badge-sm">
                  <AlertTriangle size={10} /> {activeProfile.allergies[0]}
                  {activeProfile.allergies.length > 1 && ` +${activeProfile.allergies.length - 1}`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Critical stock alert */}
      {criticalMeds.length > 0 && (
        <div className="health-critical-alert">
          <AlertTriangle size={13} />
          <span>
            Stock crítico: {criticalMeds.map(m => m.name).join(', ')}
          </span>
        </div>
      )}

      {/* Upcoming appointments */}
      <div style={{ marginTop: '14px' }}>
        <span className="widget-section-label">Próximas Citas</span>
        {upcomingAppts.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '6px' }}>
            Sin citas en los próximos 14 días.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {upcomingAppts.slice(0, 3).map(appt => {
              const days = getDaysUntil(appt.dateTime);
              return (
                <div key={appt.id} className="health-appt-widget-row">
                  <Calendar size={13} style={{ color: '#3B82F6', flexShrink: 0 }} />
                  <div className="health-appt-widget-info">
                    <span className="health-appt-specialty">{appt.specialty}</span>
                    <span className="health-appt-professional">{appt.professional}</span>
                  </div>
                  <span className={`proximity-badge-sm ${days <= 1 ? 'badge-urgent' : days <= 7 ? 'badge-soon' : 'badge-normal'}`}>
                    {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days}d`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        className="text-btn"
        onClick={() => navigate('health')}
        style={{ marginTop: '14px', fontSize: '0.8rem' }}
      >
        Abrir módulo de Salud →
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────
// REGISTER BOTH WIDGETS
// ─────────────────────────────────────────────

WidgetRegistry.register({
  id: 'health-meds',
  name: 'Medicamentos del Día',
  description: 'Dosis pendientes y completadas del perfil activo.',
  defaultSize: 'small',
  component: NextMedicationWidget,
});

WidgetRegistry.register({
  id: 'health-summary',
  name: 'Resumen de Salud',
  description: 'Estado del perfil activo, alertas de stock y próximas citas.',
  defaultSize: 'medium',
  component: HealthSummaryWidget,
});

export { NextMedicationWidget, HealthSummaryWidget };
export default NextMedicationWidget;
