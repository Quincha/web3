import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DataSyncService } from '../services/DataSyncService';
import { storage } from '../services/storage';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

export interface HealthProfile {
  id: string;
  name: string;
  relation: 'principal' | 'familiar';
  avatar: string;          // emoji
  bloodType: string;
  allergies: string[];
  chronicConditions: string[];
  emergencyContacts: EmergencyContact[];
}

export interface DoseRecord {
  id: string;
  timestamp: string;       // ISO
  scheduledTime: string;   // e.g. "08:00"
}

export interface Medication {
  id: string;
  profile_id: string;
  name: string;
  dose: string;
  frequency: string;
  schedule: string[];      // ["08:00", "16:00"]
  stockTotal: number;
  stockRemaining: number;
  doseHistory: DoseRecord[];
  color: string;           // CSS color accent for the card
  notes: string;
}

export interface Appointment {
  id: string;
  profile_id: string;
  specialty: string;
  professional: string;
  clinic: string;
  dateTime: string;        // ISO
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  gcalEventId?: string;    // Evento sincronizado en Google Calendar
}

export interface ClinicalRecord {
  id: string;
  profile_id: string;
  date: string;            // ISO date
  title: string;
  diagnosis: string;
  professional: string;
  clinic: string;
  attachments: string[];   // Simulated filenames
}

// ─────────────────────────────────────────────
// CONTEXT INTERFACE
// ─────────────────────────────────────────────

interface HealthContextType {
  // Profiles
  profiles: HealthProfile[];
  activeProfileId: string;
  activeProfile: HealthProfile | undefined;
  setActiveProfile: (id: string) => void;
  addProfile: (profile: Omit<HealthProfile, 'id'>) => void;
  updateProfile: (id: string, updates: Partial<HealthProfile>) => void;
  deleteProfile: (id: string) => void;

  // Medications
  medications: Medication[];
  getMedications: () => Medication[];
  addMedication: (med: Omit<Medication, 'id' | 'profile_id' | 'doseHistory'>) => void;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  deleteMedication: (id: string) => void;
  markDoseAdministered: (medicationId: string, scheduledTime?: string) => void;
  getTodayDoses: () => { medication: Medication; scheduledTime: string; taken: boolean }[];

  // Appointments
  appointments: Appointment[];
  getAppointments: () => Appointment[];
  addAppointment: (appt: Omit<Appointment, 'id' | 'profile_id'>) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  getUpcomingAppointments: (days?: number) => Appointment[];

  // Clinical Records
  clinicalRecords: ClinicalRecord[];
  getClinicalRecords: () => ClinicalRecord[];
  addClinicalRecord: (record: Omit<ClinicalRecord, 'id' | 'profile_id'>) => void;
  deleteClinicalRecord: (id: string) => void;
}

// ─────────────────────────────────────────────
// CACHE HELPERS
// ─────────────────────────────────────────────

const CACHE_KEY = 'quincha_health_data_v2';

interface HealthCacheData {
  profiles: HealthProfile[];
  medications: Medication[];
  appointments: Appointment[];
  clinicalRecords: ClinicalRecord[];
}

function loadFromCache(): HealthCacheData {
  try {
    const raw = storage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    profiles: [],
    medications: [],
    appointments: [],
    clinicalRecords: []
  };
}

function saveToCache(data: HealthCacheData) {
  storage.setItem(CACHE_KEY, JSON.stringify(data));
  DataSyncService.markDirty('health');
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

const TODAY = new Date().toISOString().split('T')[0];

// Perfil por defecto: asegura que el módulo siempre tenga un perfil activo.
// Sin datos ficticios (los demás se crean con el botón "Añadir").
function defaultProfileIfEmpty(profiles: HealthProfile[]): HealthProfile[] {
  if (profiles.length > 0) return profiles;
  return [{
    id: 'profile_me',
    name: 'Mi Ficha',
    relation: 'principal',
    avatar: '🧑',
    bloodType: 'No registrado',
    allergies: [],
    chronicConditions: [],
    emergencyContacts: [],
  }];
}

// ─────────────────────────────────────────────
// CONTEXT + PROVIDER
// ─────────────────────────────────────────────

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export const HealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cached = loadFromCache();
  const initialProfiles = defaultProfileIfEmpty(cached.profiles);

  const [profiles, setProfiles] = useState<HealthProfile[]>(initialProfiles);
  const [medications, setMedications] = useState<Medication[]>(cached.medications);
  const [appointments, setAppointments] = useState<Appointment[]>(cached.appointments);
  const [clinicalRecords, setClinicalRecords] = useState<ClinicalRecord[]>(cached.clinicalRecords);

  // Active profile resets to 'me' on app load (security: no persistence)
  const [activeProfileId, setActiveProfileId] = useState<string>('profile_me');

  // Restaura datos bajados del servidor (pull) al cambiar de equipo.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { data?: HealthCacheData } | undefined;
      const data = detail?.data;
      if (!data || typeof data !== 'object') return;
      const profiles = Array.isArray(data.profiles) ? data.profiles : null;
      const medications = Array.isArray(data.medications) ? data.medications : null;
      const appointments = Array.isArray(data.appointments) ? data.appointments : null;
      const clinicalRecords = Array.isArray(data.clinicalRecords) ? data.clinicalRecords : null;
      if (!profiles && !medications && !appointments && !clinicalRecords) return;
      if (profiles) setProfiles(defaultProfileIfEmpty(profiles));
      if (medications) setMedications(medications);
      if (appointments) setAppointments(appointments);
      if (clinicalRecords) setClinicalRecords(clinicalRecords);
      saveToCache({
        profiles: profiles ?? [],
        medications: medications ?? [],
        appointments: appointments ?? [],
        clinicalRecords: clinicalRecords ?? [],
      });
    };
    window.addEventListener('quincha-restore:health', handler);
    return () => window.removeEventListener('quincha-restore:health', handler);
  }, []);

  // Helper: persist all state
  const persist = useCallback((
    p: HealthProfile[],
    m: Medication[],
    a: Appointment[],
    c: ClinicalRecord[]
  ) => {
    saveToCache({ profiles: p, medications: m, appointments: a, clinicalRecords: c });
  }, []);

  const activeProfile = profiles.find(p => p.id === activeProfileId);

  // ── PROFILES ──────────────────────────────

  const setActiveProfile = useCallback((id: string) => {
    setActiveProfileId(id);
  }, []);

  const addProfile = useCallback((profile: Omit<HealthProfile, 'id'>) => {
    setProfiles(prev => {
      const updated = [...prev, { ...profile, id: genId('profile') }];
      persist(updated, medications, appointments, clinicalRecords);
      return updated;
    });
  }, [medications, appointments, clinicalRecords, persist]);

  const updateProfile = useCallback((id: string, updates: Partial<HealthProfile>) => {
    setProfiles(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      persist(updated, medications, appointments, clinicalRecords);
      return updated;
    });
  }, [medications, appointments, clinicalRecords, persist]);

  const deleteProfile = useCallback((id: string) => {
    setProfiles(prev => {
      const updated = prev.filter(p => p.id !== id);
      persist(updated, medications, appointments, clinicalRecords);
      return updated;
    });
  }, [medications, appointments, clinicalRecords, persist]);

  // ── MEDICATIONS ───────────────────────────

  const getMedications = useCallback(() => {
    return medications.filter(m => m.profile_id === activeProfileId);
  }, [medications, activeProfileId]);

  const addMedication = useCallback((med: Omit<Medication, 'id' | 'profile_id' | 'doseHistory'>) => {
    setMedications(prev => {
      const updated = [...prev, {
        ...med,
        id: genId('med'),
        profile_id: activeProfileId,
        doseHistory: []
      }];
      persist(profiles, updated, appointments, clinicalRecords);
      return updated;
    });
  }, [activeProfileId, profiles, appointments, clinicalRecords, persist]);

  const updateMedication = useCallback((id: string, updates: Partial<Medication>) => {
    setMedications(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, ...updates } : m);
      persist(profiles, updated, appointments, clinicalRecords);
      return updated;
    });
  }, [profiles, appointments, clinicalRecords, persist]);

  const deleteMedication = useCallback((id: string) => {
    setMedications(prev => {
      const updated = prev.filter(m => m.id !== id);
      persist(profiles, updated, appointments, clinicalRecords);
      return updated;
    });
  }, [profiles, appointments, clinicalRecords, persist]);

  const markDoseAdministered = useCallback((medicationId: string, scheduledTime?: string) => {
    setMedications(prev => {
      const updated = prev.map(m => {
        if (m.id !== medicationId) return m;
        const newRecord: DoseRecord = {
          id: genId('dose'),
          timestamp: new Date().toISOString(),
          scheduledTime: scheduledTime || new Date().toTimeString().slice(0, 5)
        };
        return {
          ...m,
          stockRemaining: Math.max(0, m.stockRemaining - 1),
          doseHistory: [newRecord, ...m.doseHistory]
        };
      });
      persist(profiles, updated, appointments, clinicalRecords);
      return updated;
    });
  }, [profiles, appointments, clinicalRecords, persist]);

  const getTodayDoses = useCallback(() => {
    const todayMeds = medications.filter(m => m.profile_id === activeProfileId);
    const result: { medication: Medication; scheduledTime: string; taken: boolean }[] = [];

    todayMeds.forEach(med => {
      med.schedule.forEach(time => {
        // Check if dose was taken today at this scheduled time
        const taken = med.doseHistory.some(d => {
          const doseDate = d.timestamp.split('T')[0];
          return doseDate === TODAY && d.scheduledTime === time;
        });
        result.push({ medication: med, scheduledTime: time, taken });
      });
    });

    return result.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }, [medications, activeProfileId]);

  // ── APPOINTMENTS ──────────────────────────

  const getAppointments = useCallback(() => {
    return appointments
      .filter(a => a.profile_id === activeProfileId)
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [appointments, activeProfileId]);

  const addAppointment = useCallback((appt: Omit<Appointment, 'id' | 'profile_id'>) => {
    setAppointments(prev => {
      const updated = [...prev, { ...appt, id: genId('appt'), profile_id: activeProfileId }];
      persist(profiles, medications, updated, clinicalRecords);
      return updated;
    });
  }, [activeProfileId, profiles, medications, clinicalRecords, persist]);

  const updateAppointment = useCallback((id: string, updates: Partial<Appointment>) => {
    setAppointments(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, ...updates } : a);
      persist(profiles, medications, updated, clinicalRecords);
      return updated;
    });
  }, [profiles, medications, clinicalRecords, persist]);

  const deleteAppointment = useCallback((id: string) => {
    setAppointments(prev => {
      const updated = prev.filter(a => a.id !== id);
      persist(profiles, medications, updated, clinicalRecords);
      return updated;
    });
  }, [profiles, medications, clinicalRecords, persist]);

  const getUpcomingAppointments = useCallback((days = 30) => {
    const now = new Date();
    const limit = new Date();
    limit.setDate(now.getDate() + days);

    return appointments
      .filter(a => {
        if (a.profile_id !== activeProfileId) return false;
        if (a.status !== 'scheduled') return false;
        const d = new Date(a.dateTime);
        return d >= now && d <= limit;
      })
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [appointments, activeProfileId]);

  // ── CLINICAL RECORDS ──────────────────────

  const getClinicalRecords = useCallback(() => {
    return clinicalRecords
      .filter(r => r.profile_id === activeProfileId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [clinicalRecords, activeProfileId]);

  const addClinicalRecord = useCallback((record: Omit<ClinicalRecord, 'id' | 'profile_id'>) => {
    setClinicalRecords(prev => {
      const updated = [...prev, { ...record, id: genId('cr'), profile_id: activeProfileId }];
      persist(profiles, medications, appointments, updated);
      return updated;
    });
  }, [activeProfileId, profiles, medications, appointments, persist]);

  const deleteClinicalRecord = useCallback((id: string) => {
    setClinicalRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      persist(profiles, medications, appointments, updated);
      return updated;
    });
  }, [profiles, medications, appointments, persist]);

  // ─────────────────────────────────────────

  return (
    <HealthContext.Provider value={{
      profiles, activeProfileId, activeProfile, setActiveProfile,
      addProfile, updateProfile, deleteProfile,
      medications, getMedications, addMedication, updateMedication,
      deleteMedication, markDoseAdministered, getTodayDoses,
      appointments, getAppointments, addAppointment, updateAppointment,
      deleteAppointment, getUpcomingAppointments,
      clinicalRecords, getClinicalRecords, addClinicalRecord, deleteClinicalRecord
    }}>
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = () => {
  const ctx = useContext(HealthContext);
  if (!ctx) throw new Error('useHealth must be used within a HealthProvider');
  return ctx;
};
