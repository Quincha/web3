import React, { createContext, useContext, useState, useCallback } from 'react';
import { SyncQueueService } from '../services/SyncQueueService';

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

const CLIENTS_KEY = 'quincha_clients';

function isoNow(): string { return new Date().toISOString(); }
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli_1',
    name: 'Roberto Gómez',
    company: 'Constructora GALTEC',
    email: 'roberto@galtec.com',
    phone: '+56 9 1234 5678',
    color: '#3B82F6', // Blue
    archived: false,
    createdAt: isoNow()
  },
  {
    id: 'cli_2',
    name: 'Ana Martínez',
    company: 'EcoVertical',
    email: 'ana@ecovertical.cl',
    phone: '+56 9 8765 4321',
    color: '#10B981', // Emerald
    archived: false,
    createdAt: isoNow()
  }
];

function loadClients(): Client[] {
  try {
    const raw = localStorage.getItem(CLIENTS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_CLIENTS;
  } catch { return INITIAL_CLIENTS; }
}

function saveClients(clients: Client[]): void {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

// ─────────────────────────────────────────────
// CONTEXT + PROVIDER
// ─────────────────────────────────────────────

const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

export const ClientsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>(() => loadClients());

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
