import React, { useEffect, useMemo, useState } from 'react';
import { ScrollText, Plus, Search, Pencil, Trash2, ChevronDown, ChevronRight, Save, X, FileCheck2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { useUser } from '../../context/UserContext';
import {
  getAuditorias,
  agregarAuditoria,
  actualizarAuditoria,
  eliminarAuditoria,
  formatearFecha,
  TIPO_LABELS,
  TIPO_COLORS,
  type Auditoria,
} from '../../services/AuditoriaService';

const TIPOS = ['cambio', 'revision', 'seguridad', 'optimizacion', 'soporte', 'otro'];

interface FormState {
  titulo: string;
  resumen: string;
  detalle: string;
  tipo: string;
}

const EMPTY_FORM: FormState = { titulo: '', resumen: '', detalle: '', tipo: 'cambio' };

export const RegistroModule: React.FC = () => {
  const { hasPermission } = useUser();

  const canCreate = hasPermission('registro', 'create');
  const canEdit = hasPermission('registro', 'edit');
  const canDelete = hasPermission('registro', 'delete');

  const [auditorias, setAuditorias] = useState<Auditoria[]>(() => getAuditorias());
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Recarga cuando el DataSyncService baja datos del servidor (pull).
  useEffect(() => {
    const onRestore = () => setAuditorias(getAuditorias());
    window.addEventListener('quincha-restore:registro', onRestore);
    return () => window.removeEventListener('quincha-restore:registro', onRestore);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return auditorias
      .filter((a) => {
        if (tipoFilter !== 'todos' && a.tipo !== tipoFilter) return false;
        if (!q) return true;
        return (
          a.titulo.toLowerCase().includes(q) ||
          a.resumen.toLowerCase().includes(q) ||
          a.detalle.toLowerCase().includes(q) ||
          a.autor.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [auditorias, search, tipoFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (a: Auditoria) => {
    setEditingId(a.id);
    setForm({ titulo: a.titulo, resumen: a.resumen, detalle: a.detalle, tipo: a.tipo });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.resumen.trim()) return;
    if (editingId) {
      actualizarAuditoria(editingId, form);
    } else {
      agregarAuditoria(form);
    }
    setAuditorias(getAuditorias());
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('¿Eliminar esta auditoría del registro?')) return;
    eliminarAuditoria(id);
    setAuditorias(getAuditorias());
  };

  const toggleExpand = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="registro-module-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="module-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ScrollText size={24} color="var(--accent-green)" />
            Registro de Auditorías
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
            Historial de revisiones, cambios y trabajos realizados sobre el sistema
          </p>
        </div>
        {canCreate && (
          <button className="primary-btn" onClick={() => (showForm ? setShowForm(false) : openCreate())}>
            <Plus size={16} /> {showForm ? 'Cerrar' : 'Nueva auditoría'}
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="add-task-form-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '20px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '16px' }}>
              <div className="field-container">
                <label className="field-label">Título de la auditoría</label>
                <input
                  type="text"
                  className="premium-input"
                  placeholder="Ej: Revisión de seguridad de la autenticación"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  required
                />
              </div>
              <div className="field-container">
                <label className="field-label">Tipo</label>
                <select
                  className="premium-select"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-container">
              <label className="field-label">Resumen de los cambios</label>
              <input
                type="text"
                className="premium-input"
                placeholder="Qué se revisó / cambió en una frase"
                value={form.resumen}
                onChange={(e) => setForm({ ...form, resumen: e.target.value })}
                required
              />
            </div>

            <div className="field-container">
              <label className="field-label">Detalle (opcional)</label>
              <textarea
                className="premium-input"
                rows={4}
                placeholder="Archivos, módulos, decisiones y resultados relevantes..."
                value={form.detalle}
                onChange={(e) => setForm({ ...form, detalle: e.target.value })}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button type="button" className="secondary-btn" onClick={() => { setShowForm(false); setEditingId(null); }}>
                <X size={14} /> Cancelar
              </button>
              <button type="submit" className="primary-btn">
                <Save size={14} /> {editingId ? 'Guardar cambios' : 'Guardar auditoría'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', flex: 1, maxWidth: '560px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            className="premium-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, resumen, detalle o autor..."
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <select
          className="premium-select"
          style={{ width: '190px' }}
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
        >
          <option value="todos">Todos los tipos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>{TIPO_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FileCheck2 size={16} color="var(--accent-green)" />
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {auditorias.length} auditoría{auditorias.length !== 1 ? 's' : ''} registrada{auditorias.length !== 1 ? 's' : ''} en total
        </span>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          · {filtered.length} coinciden con el filtro
        </span>
      </div>

      {/* Audit list */}
      {filtered.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <ScrollText size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ margin: 0, fontSize: '15px' }}>No hay auditorías registradas.</p>
          {canCreate && (
            <p style={{ margin: '6px 0 0', fontSize: '13px' }}>
              Solicita una auditoría o usa "Nueva auditoría" para dejar constancia.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map((a) => {
            const { dia, hora } = formatearFecha(a.fecha);
            const color = TIPO_COLORS[a.tipo] || 'var(--text-muted)';
            const isExpanded = !!expanded[a.id];
            return (
              <Card
                key={a.id}
                padding="md"
                className="premium-card-hover"
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', minWidth: 0 }}>
                    <div style={{
                      padding: '10px',
                      background: 'rgba(0, 208, 132, 0.08)',
                      border: `1px solid ${color}`,
                      borderRadius: '10px',
                      color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <ScrollText size={20} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                          color, background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}`, padding: '2px 8px', borderRadius: '999px'
                        }}>
                          {TIPO_LABELS[a.tipo] || a.tipo}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {dia} · {hora} · por {a.autor}
                        </span>
                      </div>
                      <h4 style={{ margin: '6px 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {a.titulo}
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>{a.resumen}</p>
                    </div>
                  </div>

                  {(canEdit || canDelete) && (
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {canEdit && (
                        <button
                          onClick={() => openEdit(a)}
                          title="Editar"
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'color 0.2s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-cyan)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(a.id)}
                          title="Eliminar"
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'color 0.2s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-danger)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {a.detalle && (
                  <>
                    <button
                      onClick={() => toggleExpand(a.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent-green)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      {isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                    </button>
                    {isExpanded && (
                      <div style={{
                        background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '10px', padding: '14px 16px', fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6
                      }}>
                        {a.detalle}
                      </div>
                    )}
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RegistroModule;
