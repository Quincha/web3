import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Plus, BookOpen, X, Upload } from 'lucide-react';

interface BookRecord {
  id: string;
  title: string;
  author: string;
  format: 'PDF' | 'EPUB';
  coverUrl?: string;
  fileUrl: string;
  addedAt: string;
  progress: number;
}

// Helper to generate a random gradient for books without cover
const generateGradient = (id: string) => {
  const colors = [
    ['#3B82F6', '#8B5CF6'], // Blue to Purple
    ['#10B981', '#3B82F6'], // Green to Blue
    ['#F59E0B', '#EF4444'], // Yellow to Red
    ['#8B5CF6', '#EC4899'], // Purple to Pink
    ['#14B8A6', '#3B82F6'], // Teal to Blue
  ];
  // Simple hash
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pair = colors[hash % colors.length];
  return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
};

export const LibraryView: React.FC<{ previewMode?: boolean; onSeeAll?: () => void; searchTerm?: string; formatFilter?: 'Todos' | 'PDF' | 'EPUB' }> = ({ previewMode, onSeeAll, searchTerm = '', formatFilter = 'Todos' }) => {
  const [books, setBooks] = useState<BookRecord[]>([
    {
      id: 'bk_1',
      title: 'Hábitos Atómicos',
      author: 'James Clear',
      format: 'EPUB',
      addedAt: '10/08/2026',
      fileUrl: '#',
      coverUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=300&auto=format&fit=crop',
      progress: 65
    },
    {
      id: 'bk_2',
      title: 'Diseño Web Moderno',
      author: 'UI/UX Master',
      format: 'PDF',
      addedAt: '05/08/2026',
      fileUrl: '#',
      progress: 12
    },
    {
      id: 'bk_3',
      title: 'Sapiens: De animales a dioses',
      author: 'Yuval Noah Harari',
      format: 'EPUB',
      addedAt: '12/08/2026',
      fileUrl: '#',
      coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=300&auto=format&fit=crop',
      progress: 40
    },
    {
      id: 'bk_4',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      format: 'PDF',
      addedAt: '01/08/2026',
      fileUrl: '#',
      progress: 100
    },
    {
      id: 'bk_5',
      title: '1984',
      author: 'George Orwell',
      format: 'EPUB',
      addedAt: '20/07/2026',
      fileUrl: '#',
      coverUrl: 'https://images.unsplash.com/photo-1629196914561-39655866fa04?q=80&w=300&auto=format&fit=crop',
      progress: 8
    },
    {
      id: 'bk_6',
      title: 'El Principito',
      author: 'Antoine de Saint-Exupéry',
      format: 'EPUB',
      addedAt: '15/07/2026',
      fileUrl: '#',
      progress: 0
    },
    {
      id: 'bk_7',
      title: 'Aprende React Desde Cero',
      author: 'Midudev',
      format: 'PDF',
      addedAt: '25/06/2026',
      fileUrl: '#',
      coverUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=300&auto=format&fit=crop',
      progress: 25
    },
    {
      id: 'bk_8',
      title: 'La Psicología del Dinero',
      author: 'Morgan Housel',
      format: 'EPUB',
      addedAt: '10/06/2026',
      fileUrl: '#',
      progress: 90
    },
    {
      id: 'bk_9',
      title: 'Introducción a Machine Learning',
      author: 'Sebastian Raschka',
      format: 'PDF',
      addedAt: '05/06/2026',
      fileUrl: '#',
      progress: 55
    },
    {
      id: 'bk_10',
      title: 'Dune',
      author: 'Frank Herbert',
      format: 'EPUB',
      addedAt: '01/06/2026',
      fileUrl: '#',
      coverUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=300&auto=format&fit=crop',
      progress: 78
    },
    {
      id: 'bk_11',
      title: 'El Señor de los Anillos',
      author: 'J.R.R. Tolkien',
      format: 'PDF',
      addedAt: '20/05/2026',
      fileUrl: '#',
      progress: 20
    }
  ]);
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [form, setForm] = useState({ title: '', author: '', format: 'PDF' as 'PDF'|'EPUB', coverUrl: '' });

  const filteredBooks = books.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || b.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFormat = formatFilter === 'Todos' || b.format === formatFilter;
    return matchesSearch && matchesFormat;
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setIsUploading(true);

    setTimeout(() => {
      setBooks(prev => [{
        id: `bk_${Date.now()}`,
        title: form.title,
        author: form.author || 'Desconocido',
        format: form.format,
        coverUrl: form.coverUrl || undefined,
        fileUrl: '#',
        addedAt: new Date().toLocaleDateString(),
        progress: 0
      }, ...prev]);
      setForm({ title: '', author: '', format: 'PDF', coverUrl: '' });
      setIsUploading(false);
      setShowModal(false);
    }, 800);
  };

  const handleDelete = (id: string, title: string) => {
    if(window.confirm(`¿Seguro que quieres eliminar el libro "${title}"?`)) {
      setBooks(prev => prev.filter(b => b.id !== id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header (Only if previewMode) */}
      {previewMode && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Biblioteca de Libros</h3>
            <span style={{ background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {books.length} libros
            </span>
          </div>
          <button onClick={onSeeAll} style={{ background: 'none', border: 'none', color: 'var(--accent-green)', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Ver todos →
          </button>
        </div>
      )}

      {/* Gallery Grid */}
      {filteredBooks.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <BookOpen size={48} color="var(--text-tertiary)" style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-secondary)' }}>No se encontraron libros</h3>
          <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: '14px' }}>
            Ajusta los filtros de búsqueda o sube un nuevo libro a tu colección.
          </p>
        </Card>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
          gap: '24px',
          alignItems: 'start'
        }}>
          {filteredBooks.slice(0, previewMode ? 5 : undefined).map(book => (
            <Card key={book.id} padding="none" className="premium-card-hover" style={{ 
              display: 'flex', flexDirection: 'column', gap: '0', 
              background: 'var(--bg-card)', border: '1px solid var(--border-color)' 
            }}>
              
              {/* Cover Aspect Ratio 2:3 */}
              <div 
                className="book-cover-wrapper"
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '2/3',
                  borderTopLeftRadius: '12px',
                  borderTopRightRadius: '12px',
                  overflow: 'hidden',
                  background: book.coverUrl ? `url(${book.coverUrl}) center/cover no-repeat` : generateGradient(book.id),
                  cursor: 'pointer'
                }}
              >
                {/* Fallback Text if no cover */}
                {!book.coverUrl && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    padding: '20px', display: 'flex', flexDirection: 'column', 
                    justifyContent: 'center', alignItems: 'center', textAlign: 'center',
                    background: 'rgba(0,0,0,0.2)'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                      {book.title}
                    </h4>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '8px' }}>
                      {book.author}
                    </span>
                  </div>
                )}
                
                {/* Delete button (only on hover via css or simple button) */}
                <button onClick={(e) => { e.stopPropagation(); handleDelete(book.id, book.title); }} className="book-delete-btn" style={{
                  position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s'
                }}>
                  <X size={14} />
                </button>
              </div>

              {/* Info section below cover */}
              <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={book.title}>
                    {book.title}
                  </h4>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {book.author}
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ height: '4px', background: 'var(--border-light)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${book.progress}%`, background: 'var(--accent-green)', borderRadius: '2px' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {book.progress}%
                  </div>
                </div>

                {/* Continue reading button */}
                <button 
                  onClick={() => window.open(book.fileUrl, '_blank')}
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                    width: '100%', padding: '10px', borderRadius: '8px',
                    border: '1px solid rgba(22, 240, 181, 0.3)', background: 'transparent',
                    color: 'var(--accent-green)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(22, 240, 181, 0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <BookOpen size={14} /> Continuar leyendo
                </button>
              </div>
            </Card>
          ))}
          
          {/* Add Book Placeholder Card */}
          <Card 
            padding="none" 
            onClick={() => setShowModal(true)}
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px',
              background: 'transparent', border: '2px dashed var(--border-light)', cursor: 'pointer',
              height: '100%', minHeight: '380px', transition: 'border-color 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-green)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
          >
            <div style={{ position: 'relative' }}>
              <BookOpen size={48} color="var(--accent-green)" />
              <div style={{ position: 'absolute', bottom: -4, right: -4, background: 'var(--bg-primary)', borderRadius: '50%', padding: '2px' }}>
                <Plus size={20} color="var(--accent-green)" />
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Agregar libro</h4>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>PDF, EPUB o MOBI<br/>hasta 50 MB</span>
            </div>
            <button 
              style={{ 
                padding: '8px 24px', borderRadius: '8px', border: '1px solid var(--border-light)', 
                background: 'transparent', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600,
                marginTop: '8px'
              }}
            >
              Agregar
            </button>
          </Card>
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="finance-modal-overlay">
          <div onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <form onSubmit={handleUpload} className="finance-modal-card">
            <div className="finance-modal-header">
              <h3 className="finance-modal-title">Subir Libro</h3>
              <button type="button" onClick={() => setShowModal(false)} className="finance-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="finance-form-group">
              <label className="finance-form-label">Título del Libro *</label>
              <input
                className="premium-input"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: El Principito"
                required
              />
            </div>

            <div className="finance-form-group">
              <label className="finance-form-label">Autor</label>
              <input
                className="premium-input"
                value={form.author}
                onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                placeholder="Ej: Antoine de Saint-Exupéry"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="finance-form-group" style={{ flex: 1 }}>
                <label className="finance-form-label">Formato</label>
                <select
                  className="premium-select"
                  value={form.format}
                  onChange={e => setForm(f => ({ ...f, format: e.target.value as 'PDF'|'EPUB' }))}
                >
                  <option value="PDF">PDF</option>
                  <option value="EPUB">EPUB</option>
                </select>
              </div>
            </div>

            <div className="finance-form-group">
              <label className="finance-form-label">URL de Portada (Opcional)</label>
              <input
                className="premium-input"
                value={form.coverUrl}
                onChange={e => setForm(f => ({ ...f, coverUrl: e.target.value }))}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                Si lo dejas vacío, se generará una portada abstracta automáticamente.
              </span>
            </div>

            <div className="finance-form-group">
              <label className="finance-form-label">Archivo de Libro</label>
              <div style={{ 
                border: '1px dashed var(--border-light)', borderRadius: '8px', padding: '24px', 
                textAlign: 'center', cursor: 'pointer', background: 'var(--bg-secondary)',
                transition: 'background 0.2s ease'
              }}>
                <Upload size={24} color="var(--text-tertiary)" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Haz clic o arrastra tu archivo aquí</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Solo .pdf o .epub</div>
              </div>
            </div>

            <button type="submit" className="primary-btn" style={{ width: '100%', marginTop: '8px' }} disabled={isUploading}>
              {isUploading ? 'Subiendo...' : 'Añadir a la Biblioteca'}
            </button>
          </form>
        </div>
      )}
      
      {/* CSS para los hovers que no se pueden hacer inline fácilmente */}
      <style>{`
        .book-cover-wrapper:hover .book-delete-btn {
          opacity: 1 !important;
        }
        .book-delete-btn:hover {
          background: var(--accent-red) !important;
        }
      `}</style>
    </div>
  );
};
