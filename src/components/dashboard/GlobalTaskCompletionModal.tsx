import React, { useState, useEffect } from 'react';
import { CheckCircle2, DollarSign, PenTool, X } from 'lucide-react';
import { useTasks } from '../../context/TasksContext';
import { useFinance } from '../../context/FinanceContext';
import { useClients } from '../../context/ClientsContext';
import { tokens } from '../../theme/tokens';
import { Button } from '../ui/Button';

export const GlobalTaskCompletionModal: React.FC = () => {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [observation, setObservation] = useState('');
  
  const { tasks, completeTask } = useTasks();
  const { addDeuda } = useFinance();
  const { getClientById } = useClients();

  const task = tasks.find(t => t.id === taskId);
  const client = task?.client_id ? getClientById(task.client_id) : null;

  useEffect(() => {
    const handleRequest = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.taskId) {
        setTaskId(customEvent.detail.taskId);
        setObservation('');
      }
    };

    window.addEventListener('request-task-completion', handleRequest);
    return () => window.removeEventListener('request-task-completion', handleRequest);
  }, []);

  if (!taskId || !task) return null;

  const isBillableAndPriced = task.isBillable && (task.price || 0) > 0;

  const handleConfirm = () => {
    // 1. Complete Task
    completeTask(task.id);
    
    // 2. Add Observation to Bujo (if any)
    const logText = observation.trim() 
      ? `✅ Tarea completada: "${task.title}". Nota: ${observation.trim()}`
      : `✅ Tarea completada: "${task.title}"`;
      
    window.dispatchEvent(new CustomEvent('bujo-add-entry', {
      detail: { content: logText, type: 'task' }
    }));

    // 3. Register Finance Deuda
    if (isBillableAndPriced) {
      addDeuda({
        type: 'Por Cobrar',
        entityId: client?.id || 'sin_cliente',
        entityName: client?.name || 'Cliente sin registrar',
        amount: task.price || 0,
        paidAmount: 0,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 days
        status: 'Pendiente',
        priority: 'Alta',
        projectId: task.project_id || undefined,
        tags: ['Facturable', 'Automático']
      });
    }

    setTaskId(null);
  };

  return (
    <>
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
        onClick={() => setTaskId(null)}
      >
        <div 
          onClick={e => e.stopPropagation()}
          style={{
            background: 'linear-gradient(145deg, rgba(20, 24, 39, 1) 0%, rgba(10, 12, 16, 1) 100%)',
            border: `1px solid rgba(255,255,255,0.1)`, 
            boxShadow: '0 20px 40px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.05)',
            borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '480px',
            animation: 'zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '24px' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '50%', 
              background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <CheckCircle2 size={24} color={tokens.colors.accent.green} />
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'white', margin: '0 0 8px 0', lineHeight: 1.2 }}>
                ¿Terminaste esta tarea?
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: 0, lineHeight: 1.4 }}>
                {task.title}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '8px' }}>
              <PenTool size={14} /> Observación o nota de cierre (opcional)
            </label>
            <textarea 
              autoFocus
              value={observation}
              onChange={e => setObservation(e.target.value)}
              placeholder="¿Algún detalle importante sobre cómo finalizó?"
              rows={3}
              style={{
                width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '14px', outline: 'none', resize: 'vertical'
              }}
            />
          </div>

          {isBillableAndPriced && (
            <div style={{ 
              background: 'rgba(16, 185, 129, 0.1)', border: `1px solid rgba(16, 185, 129, 0.3)`,
              borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px',
              marginBottom: '24px'
            }}>
              <DollarSign size={20} color={tokens.colors.accent.green} style={{ marginTop: '2px' }} />
              <div>
                <h4 style={{ color: tokens.colors.accent.green, fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0' }}>
                  Pendiente de Cobro (${task.price?.toLocaleString()})
                </h4>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: 0, lineHeight: 1.4 }}>
                  Al confirmar, se creará automáticamente una cuenta por cobrar en el módulo de Finanzas a nombre de <strong>{client?.name || 'Cliente sin registrar'}</strong>.
                </p>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setTaskId(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              style={{ background: tokens.colors.accent.green, color: '#000', fontWeight: 600 }}
            >
              Sí, marcar como completada
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
