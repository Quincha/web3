import React, { useState } from 'react';
import {
  Heart, Plus, Pill, Calendar, FileText, User,
  AlertTriangle, CheckCircle2,
  Phone, Trash2, Clock, Paperclip, Stethoscope, X, Pencil
} from 'lucide-react';
import { useHealth } from '../../context/HealthContext';
import type { Medication, Appointment, EmergencyContact } from '../../context/HealthContext';
import { Api } from '../../services/ApiClient';

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
// SHARED FORM UI
// ─────────────────────────────────────────────

const fieldLabelStyle: React.CSSProperties = { fontSize: '13px', color: 'var(--text-secondary)' };

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-light)',
  borderRadius: '10px',
  padding: '10px 12px',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: '14px',
  width: '100%',
  boxSizing: 'border-box',
};

const FormField: React.FC<{ label: string; children: React.ReactNode; error?: string }> = ({ label, children, error }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <label style={fieldLabelStyle}>{label}</label>
    {children}
    {error && <span style={{ fontSize: '12px', color: 'var(--accent-red)' }}>{error}</span>}
  </div>
);

const HealthModal: React.FC<{
  title: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}> = ({ title, submitLabel, onClose, onSubmit, children }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div onClick={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
    <form
      onSubmit={onSubmit}
      style={{
        position: 'relative',
        width: '440px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: '85vh',
        overflowY: 'auto',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>{title}</h3>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
          <X size={18} />
        </button>
      </div>
      {children}
      <button
        type="submit"
        style={{
          background: 'var(--accent-green)',
          color: 'var(--bg-primary)',
          width: '100%',
          border: 'none',
          borderRadius: '10px',
          padding: '12px',
          fontSize: '14px',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        {submitLabel}
      </button>
    </form>
  </div>
);

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

// --- TAB: Ficha General ---
const FichaTab: React.FC = () => {
  const { activeProfile, updateProfile } = useHealth();
  const [editOpen, setEditOpen] = useState(false);
  const [bloodType, setBloodType] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [chronicText, setChronicText] = useState('');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);

  if (!activeProfile) return null;

  const openEdit = () => {
    setBloodType(activeProfile.bloodType);
    setAllergiesText(activeProfile.allergies.join(', '));
    setChronicText(activeProfile.chronicConditions.join(', '));
    setContacts(activeProfile.emergencyContacts);
    setEditOpen(true);
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(activeProfile.id, {
      bloodType,
      allergies: allergiesText.split(',').map(s => s.trim()).filter(Boolean),
      chronicConditions: chronicText.split(',').map(s => s.trim()).filter(Boolean),
      emergencyContacts: contacts.filter(c => c.name.trim() || c.phone.trim()),
    });
    setEditOpen(false);
  };

  const updateContact = (id: string, patch: Partial<EmergencyContact>) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const addContact = () => {
    setContacts(prev => [...prev, { id: `ec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, name: '', relation: '', phone: '' }]);
  };

  const removeContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="health-tab-content">
      <div className="health-tab-toolbar">
        <span className="health-tab-toolbar-title">
          <User size={13} /> Datos médicos de {activeProfile.name}
        </span>
        <button className="health-add-btn" onClick={openEdit}>
          <Pencil size={13} />
          Editar ficha
        </button>
      </div>

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

      {/* ── MODAL: EDITAR FICHA ───────────── */}
      {editOpen && (
        <HealthModal
          title="Editar Ficha"
          submitLabel="Guardar cambios"
          onClose={() => setEditOpen(false)}
          onSubmit={submitEdit}
        >
          <FormField label="Tipo de sangre">
            <select value={bloodType} onChange={e => setBloodType(e.target.value)} style={inputStyle}>
              <option value="No registrado">No registrado</option>
              <option value="O-">O-</option>
              <option value="O+">O+</option>
              <option value="A-">A-</option>
              <option value="A+">A+</option>
              <option value="B-">B-</option>
              <option value="B+">B+</option>
              <option value="AB-">AB-</option>
              <option value="AB+">AB+</option>
            </select>
          </FormField>

          <FormField label="Alergias (separadas por coma)">
            <input
              value={allergiesText}
              onChange={e => setAllergiesText(e.target.value)}
              placeholder="Ej: Penicilina, Polen, Frutos secos"
              style={inputStyle}
            />
          </FormField>

          <FormField label="Condiciones crónicas (separadas por coma)">
            <input
              value={chronicText}
              onChange={e => setChronicText(e.target.value)}
              placeholder="Ej: Hipertensión, Diabetes tipo 2"
              style={inputStyle}
            />
          </FormField>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={fieldLabelStyle}>Contactos de emergencia</label>
              <button type="button" className="health-add-btn" onClick={addContact} style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
                <Plus size={12} />
                Añadir contacto
              </button>
            </div>
            {contacts.map((c, idx) => (
              <div key={c.id} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <input
                    value={c.name}
                    onChange={e => updateContact(c.id, { name: e.target.value })}
                    placeholder="Nombre"
                    style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }}
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      value={c.relation}
                      onChange={e => updateContact(c.id, { relation: e.target.value })}
                      placeholder="Parentesco"
                      style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px', flex: 1 }}
                    />
                    <input
                      value={c.phone}
                      onChange={e => updateContact(c.id, { phone: e.target.value })}
                      placeholder="Teléfono"
                      style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px', flex: 1 }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeContact(c.id)}
                  title="Eliminar contacto"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer', padding: '6px', marginTop: idx === 0 ? '4px' : 0 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {contacts.length === 0 && (
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)', margin: 0 }}>Sin contactos. Usa "Añadir contacto".</p>
            )}
          </div>
        </HealthModal>
      )}
    </div>
  );
};

// --- TAB: Medicamentos ---
const MED_COLORS = ['#16F0B5', '#3B82F6', '#EF4444', '#F59E0B', '#FFA726', '#AB47BC', '#10B981', '#F97316'];

const MedicamentosTab: React.FC = () => {
  const { getMedications, addMedication, markDoseAdministered, getTodayDoses, deleteMedication } = useHealth();
  const medications = getMedications();
  const todayDoses = getTodayDoses();

  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    dose: '',
    frequency: 'Diario',
    scheduleTimeText: '',
    stockTotal: 10,
    stockRemaining: 10,
    color: MED_COLORS[0],
    notes: '',
  });

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { setError('Indica el nombre del medicamento.'); return; }
    const schedule = form.scheduleTimeText.split(',').map(s => s.trim().replace(/^\s*(\d{1,2})(?:[:.h])(\d{2})?$/, (_, h, m) => `${h.padStart(2, '0')}:${(m || '00')}`)).filter(Boolean);
    if (schedule.length === 0) { setError('Indica al menos un horario (ej: 08:00, 20:00).'); return; }
    const stockTotal = Math.max(1, form.stockTotal);
    addMedication({
      name,
      dose: form.dose.trim() || '1 dosis',
      frequency: form.frequency.trim() || 'Diario',
      schedule,
      stockTotal,
      stockRemaining: Math.min(Math.max(0, form.stockRemaining), stockTotal),
      color: form.color,
      notes: form.notes.trim(),
    });
    setAddOpen(false);
    setError('');
    setForm({ name: '', dose: '', frequency: 'Diario', scheduleTimeText: '', stockTotal: 10, stockRemaining: 10, color: MED_COLORS[0], notes: '' });
  };

  return (
    <div className="health-tab-content">
      <div className="health-tab-toolbar">
        <span className="health-tab-toolbar-title">
          <Pill size={13} /> Tratamientos activos
        </span>
        <button className="health-add-btn" onClick={() => { setError(''); setAddOpen(true); }}>
          <Plus size={13} />
          Añadir medicamento
        </button>
      </div>

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

      {/* ── MODAL: AÑADIR MEDICAMENTO ─────── */}
      {addOpen && (
        <HealthModal
          title="Añadir Medicamento"
          submitLabel="Guardar medicamento"
          onClose={() => setAddOpen(false)}
          onSubmit={submitAdd}
        >
          <FormField label="Nombre">
            <input
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError(''); }}
              placeholder="Ej: Losartán 50 mg"
              style={inputStyle}
              autoFocus
            />
          </FormField>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <FormField label="Dosis">
                <input
                  value={form.dose}
                  onChange={e => setForm(f => ({ ...f, dose: e.target.value }))}
                  placeholder="Ej: 1 comprimido"
                  style={inputStyle}
                />
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField label="Frecuencia">
                <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} style={inputStyle}>
                  <option>Diario</option>
                  <option>2 veces al día</option>
                  <option>Cada 8 horas</option>
                  <option>Cada 12 horas</option>
                  <option>Semanal</option>
                  <option>Según necesidad</option>
                </select>
              </FormField>
            </div>
          </div>

          <FormField label="Horarios (separados por coma)">
            <input
              value={form.scheduleTimeText}
              onChange={e => { setForm(f => ({ ...f, scheduleTimeText: e.target.value })); setError(''); }}
              placeholder="Ej: 08:00, 14:00, 20:00"
              style={inputStyle}
            />
          </FormField>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <FormField label="Stock total">
                <input
                  type="number"
                  min={1}
                  value={form.stockTotal}
                  onChange={e => setForm(f => ({ ...f, stockTotal: Number(e.target.value) || 0 }))}
                  style={inputStyle}
                />
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField label="Stock restante">
                <input
                  type="number"
                  min={0}
                  value={form.stockRemaining}
                  onChange={e => setForm(f => ({ ...f, stockRemaining: Number(e.target.value) || 0 }))}
                  style={inputStyle}
                />
              </FormField>
            </div>
          </div>

          <FormField label="Color identificador">
            <div className="med-color-swatches">
              {MED_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`med-color-swatch ${form.color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                />
              ))}
            </div>
          </FormField>

          <FormField label="Notas">
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Indicaciones, interacciones, etc."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </FormField>

          {error && (
            <div style={{ fontSize: '13px', color: 'var(--accent-red)', background: 'rgba(248, 113, 113, 0.08)', padding: '10px 12px', borderRadius: '8px' }}>
              {error}
            </div>
          )}
        </HealthModal>
      )}
    </div>
  );
};

// --- TAB: Citas ---
const CitasTab: React.FC = () => {
  const { getAppointments, addAppointment, deleteAppointment, updateAppointment, activeProfile } = useHealth();
  const appointments = getAppointments();
  const upcoming = appointments.filter(a => a.status === 'scheduled');
  const past = appointments.filter(a => a.status !== 'scheduled');

  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({
    specialty: '',
    professional: '',
    clinic: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    notes: '',
  });

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const specialty = form.specialty.trim();
    if (!specialty) { setError('Indica la especialidad.'); return; }
    if (!form.date) { setError('Indica la fecha.'); return; }
    const dateTime = `${form.date}T${form.time}:00`;

    // Intenta crear el evento en Google Calendar (si no hay conexión, la API
    // responde 503 y la cita se guarda solo localmente).
    setSyncing(true);
    let gcalEventId: string | undefined;
    try {
      const created = await Api.gcalCreateEvent({
        summary: `🩺 Cita: ${specialty}${activeProfile ? ` (${activeProfile.name})` : ''}`,
        start: dateTime,
        allDay: false,
        description: [
          form.professional.trim() && `Dr. ${form.professional.trim()}`,
          form.clinic.trim(),
          form.notes.trim(),
        ].filter(Boolean).join(' — '),
        location: form.clinic.trim() || undefined,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      gcalEventId = created.id;
    } catch (err) {
      console.error('No se pudo crear evento en Google:', err);
    } finally {
      setSyncing(false);
    }

    addAppointment({
      specialty,
      professional: form.professional.trim() || 'Sin especificar',
      clinic: form.clinic.trim() || 'Sin especificar',
      dateTime,
      notes: form.notes.trim(),
      status: 'scheduled',
      gcalEventId,
    });
    setAddOpen(false);
    setError('');
  };

  const handleDeleteAppointment = async (appt: Appointment) => {
    if (appt.gcalEventId) {
      try {
        await Api.gcalDeleteEvent(appt.gcalEventId);
      } catch (err) {
        console.error('No se pudo borrar el evento de Google:', err);
      }
    }
    deleteAppointment(appt.id);
  };

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {appt.gcalEventId && (
                <span
                  title="Sincronizada con Google Calendar"
                  style={{ fontSize: '9.5px', color: '#4285F4', background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.3)', padding: '1px 6px', borderRadius: '8px', fontWeight: 800 }}
                >
                  G
                </span>
              )}
              {appt.status === 'scheduled' && (
                <span className={`proximity-badge ${badge.className}`}>{badge.label}</span>
              )}
            </div>
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
            onClick={() => handleDeleteAppointment(appt)}
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
      <div className="health-tab-toolbar">
        <span className="health-tab-toolbar-title">
          <Calendar size={13} /> Agenda médica
        </span>
        <button className="health-add-btn" onClick={() => { setError(''); setAddOpen(true); }}>
          <Plus size={13} />
          Añadir cita
        </button>
      </div>

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

      {/* ── MODAL: AÑADIR CITA ────────────── */}
      {addOpen && (
        <HealthModal
          title="Añadir Cita"
          submitLabel={syncing ? 'Sincronizando…' : 'Guardar cita'}
          onClose={() => { if (!syncing) setAddOpen(false); }}
          onSubmit={submitAdd}
        >
          <FormField label="Especialidad">
            <input
              value={form.specialty}
              onChange={e => { setForm(f => ({ ...f, specialty: e.target.value })); setError(''); }}
              placeholder="Ej: Cardiología, Pediatría..."
              style={inputStyle}
              autoFocus
            />
          </FormField>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <FormField label="Profesional">
                <input
                  value={form.professional}
                  onChange={e => setForm(f => ({ ...f, professional: e.target.value }))}
                  placeholder="Ej: Pérez García"
                  style={inputStyle}
                />
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField label="Clínica / Centro">
                <input
                  value={form.clinic}
                  onChange={e => setForm(f => ({ ...f, clinic: e.target.value }))}
                  placeholder="Ej: Clínica Los Andes"
                  style={inputStyle}
                />
              </FormField>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <FormField label="Fecha">
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={inputStyle}
                />
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField label="Hora">
                <input
                  type="time"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  style={inputStyle}
                />
              </FormField>
            </div>
          </div>

          <FormField label="Notas">
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Motivo, indicaciones, ayuno..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </FormField>

          <p style={{ fontSize: '12px', color: 'var(--text-subtle)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#4285F4', background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.3)', padding: '1px 5px', borderRadius: '6px' }}>G</span>
            Se sincroniza automáticamente con Google Calendar si está conectado.
          </p>

          {error && (
            <div style={{ fontSize: '13px', color: 'var(--accent-red)', background: 'rgba(248, 113, 113, 0.08)', padding: '10px 12px', borderRadius: '8px' }}>
              {error}
            </div>
          )}
        </HealthModal>
      )}
    </div>
  );
};

// --- TAB: Historial Clínico ---
const HistorialTab: React.FC = () => {
  const { getClinicalRecords, addClinicalRecord, deleteClinicalRecord } = useHealth();
  const records = getClinicalRecords();

  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    title: '',
    diagnosis: '',
    professional: '',
    clinic: '',
  });

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) { setError('Indica el título del registro.'); return; }
    if (!form.date) { setError('Indica la fecha.'); return; }
    addClinicalRecord({
      date: form.date,
      title,
      diagnosis: form.diagnosis.trim(),
      professional: form.professional.trim() || 'Sin especificar',
      clinic: form.clinic.trim() || 'Sin especificar',
      attachments: [],
    });
    setAddOpen(false);
    setError('');
  };

  return (
    <div className="health-tab-content">
      <div className="health-tab-toolbar">
        <span className="health-tab-toolbar-title">
          <FileText size={13} /> Línea de tiempo
        </span>
        <button className="health-add-btn" onClick={() => { setError(''); setAddOpen(true); }}>
          <Plus size={13} />
          Añadir registro
        </button>
      </div>

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

      {/* ── MODAL: AÑADIR REGISTRO CLÍNICO ── */}
      {addOpen && (
        <HealthModal
          title="Añadir Registro Clínico"
          submitLabel="Guardar registro"
          onClose={() => setAddOpen(false)}
          onSubmit={submitAdd}
        >
          <FormField label="Título">
            <input
              value={form.title}
              onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setError(''); }}
              placeholder="Ej: Control general, Examen de sangre"
              style={inputStyle}
              autoFocus
            />
          </FormField>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <FormField label="Fecha">
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={inputStyle}
                />
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField label="Profesional">
                <input
                  value={form.professional}
                  onChange={e => setForm(f => ({ ...f, professional: e.target.value }))}
                  placeholder="Ej: Dra. Rojas"
                  style={inputStyle}
                />
              </FormField>
            </div>
          </div>

          <FormField label="Diagnóstico / Detalle">
            <textarea
              value={form.diagnosis}
              onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
              placeholder="Resultados, diagnóstico, indicaciones..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </FormField>

          <FormField label="Clínica / Centro">
            <input
              value={form.clinic}
              onChange={e => setForm(f => ({ ...f, clinic: e.target.value }))}
              placeholder="Ej: Hospital Clínico"
              style={inputStyle}
            />
          </FormField>

          {error && (
            <div style={{ fontSize: '13px', color: 'var(--accent-red)', background: 'rgba(248, 113, 113, 0.08)', padding: '10px 12px', borderRadius: '8px' }}>
              {error}
            </div>
          )}
        </HealthModal>
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
    getMedications, getUpcomingAppointments, addProfile
  } = useHealth();

  const [activeTab, setActiveTab] = useState<HealthTab>('ficha');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newProfile, setNewProfile] = useState({
    name: '',
    relation: 'familiar' as 'principal' | 'familiar',
    avatar: '👤',
    bloodType: 'No registrado',
  });
  const [addError, setAddError] = useState('');

  const medications = getMedications();
  const criticalMeds = medications.filter(m => getStockLevel(m) === 'critical');
  const upcomingAppts = getUpcomingAppointments(7);

  const openAddModal = () => {
    setNewProfile({
      name: '',
      relation: 'familiar' as 'principal' | 'familiar',
      avatar: '👤',
      bloodType: 'No registrado',
    });
    setAddError('');
    setAddModalOpen(true);
  };

  const submitNewProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfile.name.trim()) {
      setAddError('Indica el nombre del perfil.');
      return;
    }
    addProfile({
      name: newProfile.name.trim(),
      relation: newProfile.relation,
      avatar: newProfile.avatar,
      bloodType: newProfile.bloodType,
      allergies: [],
      chronicConditions: [],
      emergencyContacts: [],
    });
    setAddModalOpen(false);
  };

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
        <button className="profile-selector-pill profile-add-btn" onClick={openAddModal}>
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

      {/* ── MODAL: NUEVO PERFIL ───────────── */}
      {addModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setAddModalOpen(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <form
            onSubmit={submitNewProfile}
            style={{
              position: 'relative',
              width: '420px',
              maxWidth: 'calc(100vw - 32px)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>Nuevo Perfil de Salud</h3>
              <button type="button" onClick={() => setAddModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Nombre</label>
              <input
                value={newProfile.name}
                onChange={e => { setNewProfile(p => ({ ...p, name: e.target.value })); setAddError(''); }}
                placeholder="Ej: María, Hijo, Abuela..."
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Relación</label>
                <select
                  value={newProfile.relation}
                  onChange={e => setNewProfile(p => ({ ...p, relation: e.target.value as 'principal' | 'familiar' }))}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                >
                  <option value="familiar">Familiar</option>
                  <option value="principal">Principal</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Avatar</label>
                <select
                  value={newProfile.avatar}
                  onChange={e => setNewProfile(p => ({ ...p, avatar: e.target.value }))}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                >
                  <option value="👤">👤 Persona</option>
                  <option value="👨">👨 Hombre</option>
                  <option value="👩">👩 Mujer</option>
                  <option value="👦">👦 Niño</option>
                  <option value="👧">👧 Niña</option>
                  <option value="👶">👶 Bebé</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tipo de sangre</label>
              <select
                value={newProfile.bloodType}
                onChange={e => setNewProfile(p => ({ ...p, bloodType: e.target.value }))}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '14px'
                }}
              >
                <option value="No registrado">No registrado</option>
                <option value="O-">O-</option>
                <option value="O+">O+</option>
                <option value="A-">A-</option>
                <option value="A+">A+</option>
                <option value="B-">B-</option>
                <option value="B+">B+</option>
                <option value="AB-">AB-</option>
                <option value="AB+">AB+</option>
              </select>
            </div>

            {addError && (
              <div style={{ fontSize: '13px', color: 'var(--accent-red)', background: 'rgba(248, 113, 113, 0.08)', padding: '10px 12px', borderRadius: '8px' }}>
                {addError}
              </div>
            )}

            <button type="submit" className="primary-btn" style={{ background: 'var(--accent-green)', color: 'var(--bg-primary)', width: '100%' }}>
              Guardar Perfil
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
