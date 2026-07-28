import React, { useState } from 'react';
import { FileText, Folder, Plus, Link2, Paperclip, Upload, HardDrive, Trash2 } from 'lucide-react';
import { useHealth } from '../../context/HealthContext';
import { useTasks } from '../../context/TasksContext';

interface DocumentRecord {
  id: string;
  name: string;
  fileSize: string;
  mimeType: string;
  uploadedAt: string;
  tags: string[];
  linkedTo: {
    type: 'health_profile' | 'project' | 'none';
    id: string;
    label: string;
  };
  storageUrl: string;
}

export const DocumentsModule: React.FC = () => {
  const { profiles } = useHealth();
  const { projects } = useTasks();

  const [documents, setDocuments] = useState<DocumentRecord[]>([
    {
      id: 'doc_1',
      name: 'receta_losartan_2026.pdf',
      fileSize: '450 KB',
      mimeType: 'application/pdf',
      uploadedAt: '24/07/2026',
      tags: ['salud', 'receta'],
      linkedTo: { type: 'health_profile', id: 'profile_me', label: 'Mi Ficha' },
      storageUrl: 'https://s3.amazonaws.com/quincha-systems/uploads/receta_losartan.pdf'
    },
    {
      id: 'doc_2',
      name: 'hba1c_mom_julio.pdf',
      fileSize: '1.2 MB',
      mimeType: 'application/pdf',
      uploadedAt: '20/07/2026',
      tags: ['examen', 'diabetes'],
      linkedTo: { type: 'health_profile', id: 'profile_mom', label: 'Mamá' },
      storageUrl: 'https://s3.amazonaws.com/quincha-systems/uploads/hba1c_mom.pdf'
    },
    {
      id: 'doc_3',
      name: 'contrato_desarrollo_signed.pdf',
      fileSize: '2.4 MB',
      mimeType: 'application/pdf',
      uploadedAt: '15/07/2026',
      tags: ['proyecto', 'contrato'],
      linkedTo: { type: 'project', id: 'proj_quincha', label: 'QuinchaDoro' },
      storageUrl: 'https://s3.amazonaws.com/quincha-systems/uploads/contrato_signed.pdf'
    }
  ]);

  const [name, setName] = useState('');
  const [linkType, setLinkType] = useState<'health_profile' | 'project' | 'none'>('none');
  const [linkId, setLinkId] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDelete = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsUploading(true);

    setTimeout(() => {
      let label = 'General';
      if (linkType === 'health_profile') {
        label = profiles.find(p => p.id === linkId)?.name || 'Perfil Familiar';
      } else if (linkType === 'project') {
        label = projects.find(p => p.id === linkId)?.name || 'Proyecto';
      }

      const newDoc: DocumentRecord = {
        id: `doc_${Date.now()}`,
        name: name.endsWith('.pdf') ? name : `${name}.pdf`,
        fileSize: '320 KB',
        mimeType: 'application/pdf',
        uploadedAt: new Date().toLocaleDateString(),
        tags: [linkType !== 'none' ? 'linked' : 'general'],
        linkedTo: { type: linkType, id: linkId, label },
        storageUrl: `https://s3.amazonaws.com/quincha-systems/uploads/${Date.now()}_${name}`
      };

      setDocuments(prev => [newDoc, ...prev]);
      setName('');
      setLinkType('none');
      setLinkId('');
      setIsUploading(false);
      setShowAddForm(false);
    }, 1200);
  };

  return (
    <div className="documents-module-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div className="module-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Documentos & Archivos</h2>
          <p className="module-subtitle">Almacenamiento S3 con vinculación polimórfica</p>
        </div>
        <button className="action-green-btn" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={14} /> Subir Documento
        </button>
      </div>

      {showAddForm && (
        <div className="add-task-form-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px' }}>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="field-container">
              <label className="field-label">Nombre del Documento</label>
              <input
                type="text"
                className="setup-text-input"
                placeholder="Ej: examen_sangre_2026..."
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="field-container">
                <label className="field-label">Vincular a Entidad</label>
                <select
                  className="task-form-select"
                  value={linkType}
                  onChange={e => {
                    setLinkType(e.target.value as any);
                    setLinkId('');
                  }}
                >
                  <option value="none">Sin vinculación (Almacén General)</option>
                  <option value="health_profile">Perfil de Salud (Paciente)</option>
                  <option value="project">Proyecto / Cliente</option>
                </select>
              </div>

              {linkType !== 'none' && (
                <div className="field-container">
                  <label className="field-label">Seleccionar Destino</label>
                  <select
                    className="task-form-select"
                    value={linkId}
                    onChange={e => setLinkId(e.target.value)}
                    required
                  >
                    <option value="">-- Elige una opción --</option>
                    {linkType === 'health_profile' && profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    {linkType === 'project' && projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="task-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="outline-action-btn" onClick={() => setShowAddForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="action-green-btn" disabled={isUploading}>
                <Upload size={14} style={{ marginRight: '4px' }} />
                {isUploading ? 'Subiendo...' : 'Subir'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Docs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {documents.map(doc => (
          <div
            key={doc.id}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '6px', color: '#3B82F6' }}>
                <FileText size={20} />
              </div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }} title={doc.name}>
                  {doc.name}
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                  {doc.fileSize} · {doc.uploadedAt}
                </span>
              </div>
            </div>

            {doc.linkedTo.type !== 'none' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  color: doc.linkedTo.type === 'health_profile' ? '#EF4444' : '#10B981',
                  background: doc.linkedTo.type === 'health_profile' ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  alignSelf: 'flex-start'
                }}
              >
                <Link2 size={12} />
                <span>Vinculado: <strong>{doc.linkedTo.label}</strong></span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <a
                href={doc.storageUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.78rem', color: 'var(--accent-green)', textDecoration: 'none', fontWeight: 600 }}
              >
                Abrir en S3 →
              </a>
              <button
                onClick={() => handleDelete(doc.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}
                title="Eliminar"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
export default DocumentsModule;
