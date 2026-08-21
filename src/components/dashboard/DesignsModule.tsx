import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Upload, Image as ImageIcon, FileCode2, Loader2, AlertTriangle, CheckCircle2,
  Grid3x3, Download, Trash2, LayoutGrid, Palette,
} from 'lucide-react';
import { Api, ApiError } from '../../services/ApiClient';
import type { SavedDesign } from '../../services/ApiClient';

interface DesignMeta {
  name: string;
  format: string;
  stitches: number;
  colorCount: number;
  colors: { hex: string }[];
}

interface PreviewData {
  dataUrl: string;
  width: number;
  height: number;
}

const ACCEPT = '.jef,.dst,.pes,application/octet-stream';
const GALLERY_SIZE = 240;

export const DesignsModule: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [meta, setMeta] = useState<DesignMeta | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Galería de diseños guardados (persistidos en el servidor).
  const [gallery, setGallery] = useState<SavedDesign[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<SavedDesign | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<PreviewData | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadGallery = useCallback(async () => {
    setGalleryLoading(true);
    try {
      const res = await Api.designList();
      const designs = res.designs || [];
      setGallery(designs);
      // Carga los thumbnails "bordado" de cada diseño.
      const thumbMap: Record<string, string> = {};
      await Promise.all(designs.map(async (d) => {
        try {
          const pv = await Api.designGet(d.id, GALLERY_SIZE, 'bordado');
          thumbMap[d.id] = pv.dataUrl;
        } catch {
          /* thumbnail opcional */
        }
      }));
      setThumbs(thumbMap);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar la galería');
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const pick = () => inputRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setMeta(null);
    setPreview(null);
    setSelected(null);
    setSelectedPreview(null);
    setLoading(true);
    try {
      const m = await Api.designMeta(file);
      setMeta(m);
      const p = await Api.designPreview(file, 640, 'bordado');
      setPreview(p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al procesar el diseño');
    } finally {
      setLoading(false);
    }
  };

  const saveCurrent = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setBusyId('_upload');
    setError(null);
    try {
      const res = await Api.designSave(file);
      setMeta({
        name: res.design.name,
        format: res.design.format,
        stitches: res.design.stitches,
        colorCount: res.design.colorCount ?? res.design.colors?.length ?? 0,
        colors: res.design.colors ?? [],
      });
      setPreview(res.preview);
      setSelected(res.design);
      setSelectedPreview(res.preview);
      await loadGallery();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar el diseño');
    } finally {
      setBusyId(null);
    }
  };

  const viewDesign = async (d: SavedDesign) => {
    setError(null);
    setSelected(d);
    setSelectedPreview(null);
    setBusyId(d.id);
    try {
      const pv = await Api.designGet(d.id, 640, 'bordado');
      setSelectedPreview(pv);
      setThumbs(prev => ({ ...prev, [d.id]: pv.dataUrl }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al ver el diseño');
    } finally {
      setBusyId(null);
    }
  };

  const downloadDesign = async (d: SavedDesign) => {
    setBusyId(d.id);
    setError(null);
    try {
      await Api.designDownload(d.id, d.name);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al descargar');
    } finally {
      setBusyId(null);
    }
  };

  const deleteDesign = async (d: SavedDesign) => {
    if (!window.confirm(`¿Eliminar el diseño "${d.name}"?`)) return;
    setBusyId(d.id);
    setError(null);
    try {
      await Api.designDelete(d.id);
      setGallery(prev => prev.filter(x => x.id !== d.id));
      if (selected?.id === d.id) {
        setSelected(null);
        setSelectedPreview(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al eliminar');
    } finally {
      setBusyId(null);
    }
  };

  const dropProps = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      handleFile(e.dataTransfer.files?.[0]);
    },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="module-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px 0' }}>Diseños de Bordado</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
            Sube un diseño JEF, DST o PES para guardarlo en tu galería, verlo como quedaría bordado y descargarlo
          </p>
        </div>
        <button className="primary-btn" style={{ background: 'var(--accent-green)', color: 'var(--bg-primary)' }} onClick={pick}>
          <Upload size={16} /> Seleccionar archivo
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* Drop zone */}
      <div
        {...dropProps}
        style={{
          border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '16px',
          padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
          background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s',
        }}
        onClick={pick}
      >
        {loading ? (
          <Loader2 size={40} className="spin" style={{ color: 'var(--accent-green)', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        ) : (
          <FileCode2 size={40} style={{ color: 'var(--text-subtle)', margin: '0 auto 12px' }} />
        )}
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>
          {loading ? 'Procesando diseño…' : 'Arrastrá tu archivo aquí o hacé clic'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '4px' }}>
          Formatos soportados: .jef, .dst, .pes
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '10px', padding: '12px 16px', color: '#FCA5A5', fontSize: '13px'
        }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Preview + metadata */}
      {preview && meta && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
            <div className="widget-header-row" style={{ marginBottom: '12px' }}>
              <ImageIcon size={16} color="#10B981" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Vista previa</h3>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '12px' }}>
              <img
                src={preview.dataUrl}
                alt="Vista previa del diseño"
                style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '8px', imageRendering: 'pixelated' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button
                className="primary-btn"
                style={{ background: 'var(--accent-green)', color: 'var(--bg-primary)', fontSize: '13px', padding: '8px 16px' }}
                onClick={saveCurrent}
                disabled={busyId === '_upload'}
              >
                {busyId === '_upload' ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                Guardar en mi galería
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
              <div className="widget-header-row" style={{ marginBottom: '12px' }}>
                <Grid3x3 size={16} color="#10B981" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Metadatos</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  ['Archivo', meta.name],
                  ['Formato', meta.format],
                  ['Puntadas', meta.stitches.toLocaleString('es-CL')],
                  ['Cambios de color', String(meta.colorCount)],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-subtle)' }}>{label}</span>
                    <span style={{ color: 'white', fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: 'white' }}>Paleta de colores</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {meta.colors.slice(0, 12).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: c.hex, border: '1px solid rgba(255,255,255,0.2)' }} />
                    <span style={{ color: 'var(--text-subtle)' }}>Color {i + 1}</span>
                    <span style={{ color: 'white', fontFamily: 'monospace', marginLeft: 'auto' }}>{c.hex}</span>
                  </div>
                ))}
                {meta.colors.length > 12 && (
                  <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
                    +{meta.colors.length - 12} colores más
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista ampliada de un diseño guardado */}
      {selected && selectedPreview && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
          <div className="widget-header-row" style={{ marginBottom: '12px' }}>
            <Palette size={16} color="#10B981" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Diseño seleccionado — {selected.name}</h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '12px' }}>
            <img
              src={selectedPreview.dataUrl}
              alt={`Vista bordado de ${selected.name}`}
              style={{ maxWidth: '100%', maxHeight: '480px', borderRadius: '8px', imageRendering: 'pixelated' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button
              className="secondary-btn"
              style={{ fontSize: '13px', padding: '8px 16px' }}
              onClick={() => downloadDesign(selected)}
              disabled={busyId === selected.id}
            >
              {busyId === selected.id ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
              Descargar {selected.format}
            </button>
            <button
              className="secondary-btn"
              style={{ fontSize: '13px', padding: '8px 16px', color: '#FCA5A5', borderColor: 'rgba(239,68,68,0.4)' }}
              onClick={() => deleteDesign(selected)}
              disabled={busyId === selected.id}
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Galería de diseños guardados */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
        <div className="widget-header-row" style={{ marginBottom: '12px' }}>
          <LayoutGrid size={16} color="#10B981" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Mi galería de bordados</h3>
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-subtle)' }}>
            {gallery.length} diseño{gallery.length !== 1 ? 's' : ''} guardado{gallery.length !== 1 ? 's' : ''}
          </span>
        </div>

        {galleryLoading && gallery.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', padding: '24px', color: 'var(--text-subtle)', fontSize: '13px' }}>
            <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> Cargando galería…
          </div>
        ) : gallery.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: '13px', padding: '20px' }}>
            <CheckCircle2 size={16} /> Aún no tienes diseños guardados. Sube uno y presiona "Guardar en mi galería".
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
            {gallery.map(d => (
              <div
                key={d.id}
                onClick={() => viewDesign(d)}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: 'rgba(0,0,0,0.2)',
                  outline: selected?.id === d.id ? '2px solid var(--accent-green)' : 'none',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(22,240,181,0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <div style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
                  {thumbs[d.id] ? (
                    <img src={thumbs[d.id]} alt={d.name} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px', imageRendering: 'pixelated' }} />
                  ) : (
                    <Loader2 size={20} className="spin" style={{ color: 'var(--text-subtle)', animation: 'spin 1s linear infinite' }} />
                  )}
                </div>
                <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.name}>
                    {d.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                      {d.format} · {d.stitches.toLocaleString('es-CL')} pts
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                    <button
                      className="secondary-btn"
                      style={{ flex: 1, fontSize: '11px', padding: '6px 8px' }}
                      onClick={(e) => { e.stopPropagation(); downloadDesign(d); }}
                      disabled={busyId === d.id}
                    >
                      {busyId === d.id ? <Loader2 size={12} className="spin" /> : <Download size={12} />} Descargar
                    </button>
                    <button
                      className="secondary-btn"
                      style={{ fontSize: '11px', padding: '6px 8px', color: '#FCA5A5', borderColor: 'rgba(239,68,68,0.4)' }}
                      onClick={(e) => { e.stopPropagation(); deleteDesign(d); }}
                      disabled={busyId === d.id}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignsModule;