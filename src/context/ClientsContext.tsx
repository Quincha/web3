import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SyncQueueService } from '../services/SyncQueueService';
import { DataSyncService } from '../services/DataSyncService';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  color: string;
  archived: boolean;
  createdAt: string;
}

interface ClientsContextType {
  clients: Client[];
  
  // CRUD
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'archived'>) => string;
  updateClient: (id: string, updates: Partial<Client>) => void;
  archiveClient: (id: string) => void;
  
  // Queries
  getActiveClients: () => Client[];
  getClientById: (id: string) => Client | undefined;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const CLIENTS_KEY = 'quincha_clients_v2';

function isoNow(): string { return new Date().toISOString(); }
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

function loadClients(): Client[] {
  try {
    const raw = localStorage.getItem(CLIENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveClients(clients: Client[]): void {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  DataSyncService.markDirty('clients');
}

// ─────────────────────────────────────────────
// CONTEXT + PROVIDER
// ─────────────────────────────────────────────

const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

export const ClientsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>(() => loadClients());

  // Restaura datos bajados del servidor (pull) al cambiar de equipo.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { data?: { clients?: Client[] } } | undefined;
      const data = detail?.data;
      if (!data || !Array.isArray(data.clients)) return;
      setClients(data.clients);
      saveClients(data.clients);
    };
    window.addEventListener('quincha-restore:clients', handler);
    return () => window.removeEventListener('quincha-restore:clients', handler);
  }, []);

  const addClient = useCallback((clientData: Omit<Client, 'id' | 'createdAt' | 'archived'>) => {
    const id = genId('cli');
    const newClient: Client = {
      ...clientData,
      id,
      archived: false,
      createdAt: isoNow()
    };
    
    setClients(prev => {
      const updated = [newClient, ...prev];
      saveClients(updated);
      return updated;
    });
    
    SyncQueueService.enqueue('CREATE_CLIENT', { ...newClient });
    return id;
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      saveClients(updated);
      return updated;
    });
    SyncQueueService.enqueue('UPDATE_CLIENT', { id, ...updates });
  }, []);

  const archiveClient = useCallback((id: string) => {
    updateClient(id, { archived: true });
  }, [updateClient]);

  const getActiveClients = useCallback(() => {
    return clients.filter(c => !c.archived);
  }, [clients]);

  const getClientById = useCallback((id: string) => {
    return clients.find(c => c.id === id);
  }, [clients]);

  return (
    <ClientsContext.Provider value={{
      clients,
      addClient,
      updateClient,
      archiveClient,
      getActiveClients,
      getClientById
    }}>
      {children}
    </ClientsContext.Provider>
  );
};

export const useClients = () => {
  const context = useContext(ClientsContext);
  if (!context) {
    throw new Error('useClients must be used within a ClientsProvider');
  }
  return context;
};
