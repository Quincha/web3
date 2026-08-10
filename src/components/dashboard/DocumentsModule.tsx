import React, { useState } from 'react';
import { FileText,  Plus, Link2,  Upload,  Trash2, BookOpen, Search } from 'lucide-react';
import { Card } from '../ui/Card';
import { LibraryView } from '../documents/LibraryView';
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

  const [activeTab, setActiveTab] = useState<'todos' | 'documentos' | 'libros'>('todos');
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState<'Todos' | 'PDF' | 'EPUB'>('Todos');

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
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px 0' }}>Documentos y Archivos</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Gestiona tus archivos y libros digitales</p>
        </div>
        <button className="primary-btn" style={{ background: 'var(--accent-green)', color: 'var(--bg-primary)' }} onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={16} /> Subir documento
        </button>
      </div>

      {/* Tabs Segmented Control */}
      <div style={{ display: 'flex', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '4px' }}>
          {(['todos', 'documentos', 'libros'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 24px', borderRadius: '8px',
                border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s',
                background: activeTab === t ? 'var(--bg-card)' : 'transparent',
                color: activeTab === t ? (t === 'libros' ? 'var(--accent-green)' : 'var(--text-primary)') : 'var(--text-secondary)',
                boxShadow: activeTab === t ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                position: 'relative'
              }}
            >
              {t === 'documentos' && <FileText size={16} />}
              {t === 'libros' && <BookOpen size={16} />}
              <span style={{ textTransform: 'capitalize' }}>{t}</span>
              {activeTab === t && (
                <div style={{ position: 'absolute', bottom: -4, left: '20%', right: '20%', height: 2, background: t === 'libros' ? 'var(--accent-green)' : 'var(--text-primary)', borderRadius: 2 }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Global Search & Filters */}
      <div style={{ display: 'flex', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', flex: 1, maxWidth: '600px' }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            className="premium-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en todos los documentos y libros..."
            style={{ paddingLeft: '36px', background: 'var(--bg-card)' }}
          />
        </div>
        <select 
          className="premium-select" 
          style={{ width: '150px', background: 'var(--bg-card)' }}
          value={formatFilter}
          onChange={e => setFormatFilter(e.target.value as any)}
        >
          <option value="Todos">Todos los formatos</option>
          <option value="PDF">Solo PDF</option>
          <option value="EPUB">Solo EPUB</option>
        </select>
        <select 
          className="premium-select" 
          style={{ width: '150px', background: 'var(--bg-card)' }}
        >
          <option value="recent">Más recientes</option>
          <option value="alpha">A-Z</option>
        </select>
      </div>

      {(activeTab === 'todos' || activeTab === 'documentos') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>



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

      {/* Docs Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Todos tus documentos</h3>
          <span style={{ background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {documents.length} archivos
          </span>
        </div>
        {activeTab === 'todos' && (
          <button onClick={() => setActiveTab('documentos')} style={{ background: 'none', border: 'none', color: 'var(--accent-green)', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Ver todos →
          </button>
        )}
      </div>

      {/* Docs Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '16px'
      }}>
        {documents
          .filter(doc => doc.name.toLowerCase().includes(search.toLowerCase()))
          .filter(doc => formatFilter === 'Todos' || doc.name.toLowerCase().includes(formatFilter.toLowerCase()))
          .slice(0, activeTab === 'todos' ? 4 : undefined)
          .map(doc => (
          <Card
            key={doc.id}
            padding="md"
            className="premium-card-hover"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              minWidth: activeTab === 'todos' ? '300px' : 'auto',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ 
                padding: '12px', 
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))', 
                border: '1px solid rgba(139, 92, 246, 0.2)', 
                borderRadius: '12px', 
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.05)'
              }}>
                <FileText size={24} />
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.name}>
                  {doc.name}
                </h4>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  {doc.fileSize} • {doc.uploadedAt}
                </span>
              </div>
            </div>

            {doc.linkedTo.type !== 'none' && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: doc.linkedTo.type === 'health_profile' ? 'var(--accent-red)' : 'var(--accent-green)',
                  background: doc.linkedTo.type === 'health_profile' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(52, 211, 153, 0.1)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  alignSelf: 'flex-start'
                }}
              >
                <Link2 size={14} />
                <span>{doc.linkedTo.label}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '12px', marginTop: '4px' }}>
              <a
                href={doc.storageUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '13px', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--accent-primary)'}
              >
                Abrir archivo →
              </a>
              <button
                onClick={() => handleDelete(doc.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      </div>
      )}

      {(activeTab === 'todos' || activeTab === 'libros') && (
        <LibraryView previewMode={activeTab === 'todos'} onSeeAll={() => setActiveTab('libros')} searchTerm={search} formatFilter={formatFilter} />
      )}

    </div>
  );
};
export default DocumentsModule;
