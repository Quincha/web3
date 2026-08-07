import React, { useState } from 'react';
import {
  Heart, Plus, Pill, Calendar, FileText, User,
  // @ts-expect-error unused
  ChevronRight, AlertTriangle, CheckCircle2,
  Phone, Trash2, Clock, Paperclip, Stethoscope
} from 'lucide-react';
import { useHealth } from '../../context/HealthContext';
import type { Medication, Appointment } from '../../context/HealthContext';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getDaysUntil(isoDateTime: string): number {
  const now = new Date();
  const target = new Date(isoDateTime);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getProximityBadge(days: number): { label: string; className: string } {
  if (days <= 0) return { label: 'Hoy', className: 'badge-urgent' };
  if (days === 1) return { label: 'Mañana', className: 'badge-warning' };
  if (days <= 7) return { label: `${days} días`, className: 'badge-soon' };
  return { label: `${days} días`, className: 'badge-normal' };
}

function getStockLevel(med: Medication): 'critical' | 'low' | 'ok' {
  const pct = med.stockRemaining / med.stockTotal;
  if (pct <= 0.2) return 'critical';
  if (pct <= 0.4) return 'low';
  return 'ok';
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

// --- TAB: Ficha General ---
const FichaTab: React.FC = () => {
  const { activeProfile } = useHealth();
  if (!activeProfile) return null;

  return (
    <div className="health-tab-content">
      {/* Vital Info Grid */}
      <div className="health-info-grid">
        <div className="health-info-card">
          <span className="info-card-label">Tipo de Sangre</span>
          <span className="info-card-value blood-type">{activeProfile.bloodType}</span>
        </div>
        <div className="health-info-card">
          <span className="info-card-label">Alergias</span>
          <div className="health-pills-row">
            {activeProfile.allergies.length === 0
              ? <span className="no-data-text">Sin alergias registradas</span>
              : activeProfile.allergies.map(a => (
                  <span key={a} className="allergy-pill">
                    <AlertTriangle size={11} /> {a}
                  </span>
                ))
            }
          </div>
        </div>
        <div className="health-info-card">
          <span className="info-card-label">Condiciones Crónicas</span>
          <div className="health-pills-row">
            {activeProfile.chronicConditions.length === 0
              ? <span className="no-data-text">Sin condiciones registradas</span>
              : activeProfile.chronicConditions.map(c => (
                  <span key={c} className="chronic-pill">{c}</span>
                ))
            }
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="health-section-card">
        <h4 className="section-card-title">
          <Phone size={15} />
          Contactos de Emergencia
        </h4>
        {activeProfile.emergencyContacts.length === 0 ? (
          <p className="no-data-text">Sin contactos registrados.</p>
        ) : (
          <div className="emergency-contacts-list">
            {activeProfile.emergencyContacts.map(ec => (
              <div key={ec.id} className="emergency-contact-row">
                <div className="ec-avatar">{ec.name.charAt(0)}</div>
                <div className="ec-info">
                  <span className="ec-name">{ec.name}</span>
                  <span className="ec-relation">{ec.relation}</span>
                </div>
                <a href={`tel:${ec.phone}`} className="ec-phone-btn">
                  <Phone size={13} />
                  {ec.phone}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- TAB: Medicamentos ---
const MedicamentosTab: React.FC = () => {
  const { getMedications, markDoseAdministered, getTodayDoses, deleteMedication } = useHealth();
  const medications = getMedications();
  const todayDoses = getTodayDoses();

  return (
    <div className="health-tab-content">
      {/* Today's doses summary */}
      {todayDoses.length > 0 && (
        <div className="health-section-card">
          <h4 className="section-card-title">
            <Clock size={15} />
            Dosis de Hoy
          </h4>
          <div className="today-doses-list">
            {todayDoses.map(({ medication, scheduledTime, taken }) => (
              <div
                key={`${medication.id}-${scheduledTime}`}
                className={`dose-row ${taken ? 'dose-taken' : ''}`}
              >
                <div
                  className="dose-color-dot"
                  style={{ backgroundColor: medication.color }}
                />
                <div className="dose-info">
                  <span className="dose-med-name">{medication.name}</span>
                  <span className="dose-time">{scheduledTime} — {medication.dose}</span>
                </div>
                {taken ? (
                  <span className="dose-taken-badge">
                    <CheckCircle2 size={14} />
                    Tomada
                  </span>
                ) : (
                  <button
                    className="dose-mark-btn"
                    onClick={() => markDoseAdministered(medication.id, scheduledTime)}
                    title="Marcar como tomada"
                  >
                    <CheckCircle2 size={14} />
                    Marcar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medication Cards */}
      {medications.length === 0 ? (
        <div className="health-empty-state">
          <Pill size={32} />
          <p>Sin medicamentos registrados para este perfil.</p>
        </div>
      ) : (
        <div className="med-cards-grid">
          {medications.map(med => {
            const stockPct = (med.stockRemaining / med.stockTotal) * 100;
            const level = getStockLevel(med);

            return (
              <div key={med.id} className={`med-card stock-${level}`}>
                {/* Color accent stripe */}
                <div className="med-card-stripe" style={{ backgroundColor: med.color }} />

                <div className="med-card-body">
                  <div className="med-card-header">
                    <div>
                      <h4 className="med-name">{med.name}</h4>
                      <span className="med-dose-label">{med.dose} · {med.frequency}</span>
                    </div>
                    <button
                      className="med-delete-btn"
                      onClick={() => deleteMedication(med.id)}
                      title="Eliminar medicamento"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Schedule pills */}
                  <div className="med-schedule-row">
                    {med.schedule.map(t => (
                      <span key={t} className="schedule-pill">
                        <Clock size={10} /> {t}
                      </span>
                    ))}
                  </div>

                  {/* Stock progress bar */}
                  <div className="stock-bar-section">
                    <div className="stock-bar-labels">
                      <span className="stock-text">Stock</span>
                      <span className={`stock-count stock-${level}`}>
                        {level === 'critical' && <AlertTriangle size={11} />}
                        {med.stockRemaining} / {med.stockTotal}
                      </span>
                    </div>
                    <div className="stock-bar-track">
                      <div
                        className={`stock-bar-fill stock-fill-${level}`}
                        style={{ width: `${stockPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  {med.notes && (
                    <p className="med-notes">{med.notes}</p>
                  )}

                  {/* Quick dose button */}
                  <button
                    className="quick-dose-btn"
                    onClick={() => markDoseAdministered(med.id)}
                  >
                    <CheckCircle2 size={14} />
                    Registrar dosis
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- TAB: Citas ---
const CitasTab: React.FC = () => {
  const { getAppointments, deleteAppointment, updateAppointment } = useHealth();
  const appointments = getAppointments();
  const upcoming = appointments.filter(a => a.status === 'scheduled');
  const past = appointments.filter(a => a.status !== 'scheduled');

  const AppointmentCard = ({ appt }: { appt: Appointment }) => {
    const days = getDaysUntil(appt.dateTime);
    const badge = getProximityBadge(days);

    return (
      <div className={`appt-card ${appt.status}`}>
        <div className="appt-left">
          <div className="appt-icon-wrap">
            <Stethoscope size={16} />
          </div>
        </div>
        <div className="appt-body">
          <div className="appt-header-row">
            <h4 className="appt-specialty">{appt.specialty}</h4>
            {appt.status === 'scheduled' && (
              <span className={`proximity-badge ${badge.className}`}>{badge.label}</span>
            )}
          </div>
          <p className="appt-professional">{appt.professional}</p>
          <p className="appt-clinic">{appt.clinic}</p>
          <p className="appt-datetime">{formatDateTime(appt.dateTime)}</p>
          {appt.notes && <p className="appt-notes">{appt.notes}</p>}
        </div>
        <div className="appt-actions">
          {appt.status === 'scheduled' && (
            <button
              className="appt-complete-btn"
              onClick={() => updateAppointment(appt.id, { status: 'completed' })}
              title="Marcar como completada"
            >
              <CheckCircle2 size={14} />
            </button>
          )}
          <button
            className="appt-delete-btn"
            onClick={() => deleteAppointment(appt.id)}
            title="Eliminar"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="health-tab-content">
      {upcoming.length === 0 && past.length === 0 ? (
        <div className="health-empty-state">
          <Calendar size={32} />
          <p>Sin citas registradas para este perfil.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="health-section-card">
              <h4 className="section-card-title">
                <Calendar size={15} />
                Próximas Citas
              </h4>
              <div className="appt-list">
                {upcoming.map(a => <AppointmentCard key={a.id} appt={a} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div className="health-section-card">
              <h4 className="section-card-title" style={{ opacity: 0.6 }}>
                <Calendar size={15} />
                Historial de Citas
              </h4>
              <div className="appt-list appt-list-past">
                {past.map(a => <AppointmentCard key={a.id} appt={a} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// --- TAB: Historial Clínico ---
const HistorialTab: React.FC = () => {
  const { getClinicalRecords, deleteClinicalRecord } = useHealth();
  const records = getClinicalRecords();

  return (
    <div className="health-tab-content">
      {records.length === 0 ? (
        <div className="health-empty-state">
          <FileText size={32} />
          <p>Sin registros clínicos para este perfil.</p>
        </div>
      ) : (
        <div className="clinical-timeline">
          {records.map((rec, idx) => (
            <div key={rec.id} className="clinical-record-item">
              {/* Timeline line */}
              <div className="timeline-track">
                <div className="timeline-dot" />
                {idx < records.length - 1 && <div className="timeline-line" />}
              </div>

              <div className="clinical-record-card">
                <div className="cr-header">
                  <div>
                    <h4 className="cr-title">{rec.title}</h4>
                    <span className="cr-date">{formatDate(rec.date)}</span>
                  </div>
                  <button
                    className="appt-delete-btn"
                    onClick={() => deleteClinicalRecord(rec.id)}
                    title="Eliminar registro"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <p className="cr-diagnosis">{rec.diagnosis}</p>

                <div className="cr-meta-row">
                  <span className="cr-meta-item">
                    <Stethoscope size={12} /> {rec.professional}
                  </span>
                  <span className="cr-meta-item">📍 {rec.clinic}</span>
                </div>

                {rec.attachments.length > 0 && (
                  <div className="cr-attachments">
                    {rec.attachments.map(f => (
                      <span key={f} className="cr-attachment-pill">
                        <Paperclip size={10} /> {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN MODULE
// ─────────────────────────────────────────────

type HealthTab = 'ficha' | 'medicamentos' | 'citas' | 'historial';

const TABS: { id: HealthTab; label: string; icon: React.ReactNode }[] = [
  { id: 'ficha',        label: 'Ficha General',     icon: <User size={15} /> },
  { id: 'medicamentos', label: 'Medicamentos',       icon: <Pill size={15} /> },
  { id: 'citas',        label: 'Citas & Agenda',     icon: <Calendar size={15} /> },
  { id: 'historial',   label: 'Historial Clínico',  icon: <FileText size={15} /> },
];

export const HealthModule: React.FC = () => {
  const {
    profiles, activeProfileId, setActiveProfile, activeProfile,
    getMedications, getUpcomingAppointments
  } = useHealth();

  const [activeTab, setActiveTab] = useState<HealthTab>('ficha');

  const medications = getMedications();
  const criticalMeds = medications.filter(m => getStockLevel(m) === 'critical');
  const upcomingAppts = getUpcomingAppointments(7);

  return (
    <div className="health-module-container">

      {/* ── MODULE HEADER ─────────────────── */}
      <div className="health-module-header">
        <div className="health-title-block">
          <div className="health-icon-wrapper">
            <Heart size={20} />
          </div>
          <div>
            <h2>Salud & Cuidado Familiar</h2>
            <p className="module-subtitle">Gestión integral de perfiles de salud</p>
          </div>
        </div>

        {/* Alert summary */}
        {(criticalMeds.length > 0 || upcomingAppts.length > 0) && (
          <div className="health-alert-row">
            {criticalMeds.length > 0 && (
              <div className="health-alert-chip chip-critical">
                <AlertTriangle size={13} />
                {criticalMeds.length} medicamento{criticalMeds.length > 1 ? 's' : ''} con stock crítico
              </div>
            )}
            {upcomingAppts.length > 0 && (
              <div className="health-alert-chip chip-info">
                <Calendar size={13} />
                {upcomingAppts.length} cita{upcomingAppts.length > 1 ? 's' : ''} próxima{upcomingAppts.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── PROFILE SELECTOR ──────────────── */}
      <div className="profile-selector-bar">
        {profiles.map(profile => (
          <button
            key={profile.id}
            className={`profile-selector-pill ${activeProfileId === profile.id ? 'active' : ''}`}
            onClick={() => setActiveProfile(profile.id)}
          >
            <span className="profile-pill-avatar">{profile.avatar}</span>
            <span className="profile-pill-name">{profile.name}</span>
            {profile.relation === 'principal' && (
              <span className="profile-pill-badge">Principal</span>
            )}
          </button>
        ))}
        <button className="profile-selector-pill profile-add-btn">
          <Plus size={14} />
          <span>Añadir</span>
        </button>
      </div>

      {/* ── PROFILE QUICK STATS ───────────── */}
      {activeProfile && (
        <div className="profile-stats-strip">
          <div className="profile-stat-item">
            <span className="stat-label">Sangre</span>
            <span className="stat-value blood-badge">{activeProfile.bloodType}</span>
          </div>
          <div className="stat-divider" />
          <div className="profile-stat-item">
            <span className="stat-label">Alergias</span>
            <span className="stat-value">
              {activeProfile.allergies.length === 0
                ? <span className="stat-ok">Ninguna</span>
                : <span className="stat-warning">{activeProfile.allergies.join(', ')}</span>
              }
            </span>
          </div>
          <div className="stat-divider" />
          <div className="profile-stat-item">
            <span className="stat-label">Medicamentos activos</span>
            <span className="stat-value">{medications.length}</span>
          </div>
          <div className="stat-divider" />
          <div className="profile-stat-item">
            <span className="stat-label">Próxima cita</span>
            <span className="stat-value">
              {upcomingAppts.length > 0
                ? <>{getDaysUntil(upcomingAppts[0].dateTime)} días — {upcomingAppts[0].specialty}</>
                : <span className="stat-ok">Sin citas próximas</span>
              }
            </span>
          </div>
        </div>
      )}

      {/* ── TABS ──────────────────────────── */}
      <div className="health-tabs-header">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`health-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.id === 'medicamentos' && criticalMeds.length > 0 && (
              <span className="tab-alert-dot" />
            )}
            {tab.id === 'citas' && upcomingAppts.length > 0 && (
              <span className="tab-alert-dot tab-alert-info" />
            )}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ───────────────────── */}
      <div className="health-tab-panel">
        {activeTab === 'ficha'        && <FichaTab />}
        {activeTab === 'medicamentos' && <MedicamentosTab />}
        {activeTab === 'citas'        && <CitasTab />}
        {activeTab === 'historial'    && <HistorialTab />}
      </div>
    </div>
  );
};
