import React, { createContext, useContext, useState, useCallback } from 'react';

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
// MOCK DATA
// ─────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0];

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

function pastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

const INITIAL_PROFILES: HealthProfile[] = [
  {
    id: 'profile_me',
    name: 'Mi Ficha',
    relation: 'principal',
    avatar: '🧑',
    bloodType: 'O+',
    allergies: ['Penicilina', 'Polen'],
    chronicConditions: ['Hipertensión leve'],
    emergencyContacts: [
      { id: 'ec_1', name: 'Ana Quinchahual', relation: 'Esposa', phone: '+56 9 8765 4321' }
    ]
  },
  {
    id: 'profile_mom',
    name: 'Mamá',
    relation: 'familiar',
    avatar: '👩',
    bloodType: 'A+',
    allergies: [],
    chronicConditions: ['Diabetes tipo 2', 'Hipotiroidismo'],
    emergencyContacts: [
      { id: 'ec_2', name: 'Daniel Quinchahual', relation: 'Hijo', phone: '+56 9 1234 5678' }
    ]
  },
  {
    id: 'profile_dad',
    name: 'Papá',
    relation: 'familiar',
    avatar: '👨',
    bloodType: 'B+',
    allergies: ['Aspirina', 'Ibuprofeno'],
    chronicConditions: ['Hipertensión', 'Arritmia cardíaca'],
    emergencyContacts: [
      { id: 'ec_3', name: 'Daniel Quinchahual', relation: 'Hijo', phone: '+56 9 1234 5678' }
    ]
  }
];

const INITIAL_MEDICATIONS: Medication[] = [
  // Mi Ficha
  {
    id: 'med_1', profile_id: 'profile_me',
    name: 'Vitamina D3', dose: '2000 UI', frequency: '1 vez al día',
    schedule: ['08:00'], stockTotal: 30, stockRemaining: 25,
    doseHistory: [], color: '#F59E0B', notes: 'Tomar con el desayuno'
  },
  {
    id: 'med_2', profile_id: 'profile_me',
    name: 'Losartán', dose: '50mg', frequency: '2 veces al día',
    schedule: ['08:00', '20:00'], stockTotal: 60, stockRemaining: 48,
    doseHistory: [], color: '#3B82F6', notes: 'Antihipertensivo'
  },
  // Mamá
  {
    id: 'med_3', profile_id: 'profile_mom',
    name: 'Metformina', dose: '850mg', frequency: '2 veces al día',
    schedule: ['08:00', '20:00'], stockTotal: 60, stockRemaining: 20,
    doseHistory: [], color: '#10B981', notes: 'Tomar con comida para evitar náuseas'
  },
  {
    id: 'med_4', profile_id: 'profile_mom',
    name: 'Atorvastatina', dose: '20mg', frequency: '1 vez al día',
    schedule: ['21:00'], stockTotal: 30, stockRemaining: 12,
    doseHistory: [], color: '#8B5CF6', notes: 'Tomar en la noche'
  },
  {
    id: 'med_5', profile_id: 'profile_mom',
    name: 'Levotiroxina', dose: '50mcg', frequency: '1 vez al día (ayunas)',
    schedule: ['07:00'], stockTotal: 30, stockRemaining: 18,
    doseHistory: [], color: '#EC4899', notes: 'En ayunas, 30min antes del desayuno'
  },
  // Papá
  {
    id: 'med_6', profile_id: 'profile_dad',
    name: 'Enalapril', dose: '10mg', frequency: '1 vez al día',
    schedule: ['08:00'], stockTotal: 30, stockRemaining: 10,
    doseHistory: [], color: '#EF4444', notes: '⚠️ Stock bajo — renovar pronto'
  },
  {
    id: 'med_7', profile_id: 'profile_dad',
    name: 'Bisoprolol', dose: '5mg', frequency: '1 vez al día',
    schedule: ['08:00'], stockTotal: 30, stockRemaining: 8,
    doseHistory: [], color: '#F97316', notes: 'Para arritmia. No suspender sin aviso médico'
  }
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'appt_1', profile_id: 'profile_me',
    specialty: 'Cardiología', professional: 'Dr. Rodrigo Pérez',
    clinic: 'Clínica Bío-Bío', dateTime: futureDate(16),
    notes: 'Traer resultados de exámenes de sangre', status: 'scheduled'
  },
  {
    id: 'appt_2', profile_id: 'profile_me',
    specialty: 'Oftalmología', professional: 'Dra. Carmen López',
    clinic: 'Centro Médico Sur', dateTime: futureDate(35),
    notes: 'Control anual de vista', status: 'scheduled'
  },
  {
    id: 'appt_3', profile_id: 'profile_mom',
    specialty: 'Endocrinología', professional: 'Dra. Patricia Vega',
    clinic: 'Hospital Regional', dateTime: futureDate(5),
    notes: 'Control HbA1c trimestral', status: 'scheduled'
  },
  {
    id: 'appt_4', profile_id: 'profile_mom',
    specialty: 'Medicina General', professional: 'Dr. Juan Castro',
    clinic: 'Consultorio Centro', dateTime: futureDate(2),
    notes: 'Control de tiroides', status: 'scheduled'
  },
  {
    id: 'appt_5', profile_id: 'profile_dad',
    specialty: 'Cardiología', professional: 'Dr. Miguel Fuentes',
    clinic: 'Clínica Bío-Bío', dateTime: futureDate(1),
    notes: 'Urgente — control de arritmia y tensión', status: 'scheduled'
  }
];

const INITIAL_CLINICAL_RECORDS: ClinicalRecord[] = [
  {
    id: 'cr_1', profile_id: 'profile_me',
    date: pastDate(180), title: 'Examen de sangre anual',
    diagnosis: 'Presión arterial elevada. Inicio de tratamiento con Losartán.',
    professional: 'Dr. Rodrigo Pérez', clinic: 'Clínica Bío-Bío',
    attachments: ['hemograma_2026.pdf', 'lipidograma_2026.pdf']
  },
  {
    id: 'cr_2', profile_id: 'profile_me',
    date: pastDate(90), title: 'Control Cardiológico',
    diagnosis: 'Presión controlada. Mantener tratamiento.',
    professional: 'Dr. Rodrigo Pérez', clinic: 'Clínica Bío-Bío',
    attachments: ['control_cardio_julio.pdf']
  },
  {
    id: 'cr_3', profile_id: 'profile_mom',
    date: pastDate(95), title: 'Control Endocrinológico',
    diagnosis: 'HbA1c en 7.2%. Ajuste de dosis de Metformina.',
    professional: 'Dra. Patricia Vega', clinic: 'Hospital Regional',
    attachments: ['hba1c_resultado.pdf']
  },
  {
    id: 'cr_4', profile_id: 'profile_dad',
    date: pastDate(45), title: 'Holter cardíaco 24h',
    diagnosis: 'Arritmia supraventricular confirmada. Inicio de Bisoprolol.',
    professional: 'Dr. Miguel Fuentes', clinic: 'Clínica Bío-Bío',
    attachments: ['holter_resultado.pdf', 'ecg_24h.pdf']
  }
];

// ─────────────────────────────────────────────
// CACHE HELPERS
// ─────────────────────────────────────────────

const CACHE_KEY = 'quincha_health_data';

interface HealthCacheData {
  profiles: HealthProfile[];
  medications: Medication[];
  appointments: Appointment[];
  clinicalRecords: ClinicalRecord[];
}

function loadFromCache(): HealthCacheData {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    profiles: INITIAL_PROFILES,
    medications: INITIAL_MEDICATIONS,
    appointments: INITIAL_APPOINTMENTS,
    clinicalRecords: INITIAL_CLINICAL_RECORDS
  };
}

function saveToCache(data: HealthCacheData) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

// ─────────────────────────────────────────────
// CONTEXT + PROVIDER
// ─────────────────────────────────────────────

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export const HealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cached = loadFromCache();

  const [profiles, setProfiles] = useState<HealthProfile[]>(cached.profiles);
  const [medications, setMedications] = useState<Medication[]>(cached.medications);
  const [appointments, setAppointments] = useState<Appointment[]>(cached.appointments);
  const [clinicalRecords, setClinicalRecords] = useState<ClinicalRecord[]>(cached.clinicalRecords);

  // Active profile resets to 'me' on app load (security: no persistence)
  const [activeProfileId, setActiveProfileId] = useState<string>('profile_me');

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
