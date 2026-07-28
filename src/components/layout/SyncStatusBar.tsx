import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, CloudLightning, RefreshCw, CheckCircle } from 'lucide-react';
import { SyncQueueService } from '../../services/SyncQueueService';
import type { SyncStatus } from '../../services/SyncQueueService';

export const SyncStatusBar: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus>(SyncQueueService.getStatus());

  useEffect(() => {
    // Subscribe to status updates from SyncQueueService
    const unsubscribe = SyncQueueService.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 500,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-secondary)',
        transition: 'all 0.2s ease'
      }}
    >
      {status.isOnline ? (
        <>
          {status.isSyncing ? (
            <>
              <RefreshCw size={12} className="spin-animation" style={{ color: 'var(--accent-green)' }} />
              <span>Sincronizando...</span>
            </>
          ) : status.pendingCount > 0 ? (
            <>
              <CloudLightning size={12} style={{ color: '#F59E0B' }} />
              <span>{status.pendingCount} cambios locales</span>
            </>
          ) : (
            <>
              <CheckCircle size={12} style={{ color: 'var(--accent-green)' }} />
              <span>Sincronizado</span>
            </>
          )}
          <Wifi size={12} style={{ color: 'var(--accent-green)', marginLeft: '4px' }} />
        </>
      ) : (
        <>
          <WifiOff size={12} style={{ color: '#EF4444' }} />
          <span>Trabajando offline ({status.pendingCount} pendientes)</span>
        </>
      )}

      {/* Embedded spinning CSS keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        .spin-animation {
          animation: spin 1.2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};
