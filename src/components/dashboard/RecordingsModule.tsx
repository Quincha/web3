import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, Upload, FileText, Plus, Trash2, Download, Users,
  ArrowLeft, StickyNote, UserPlus, Loader2, Music, ChevronRight,
  Sparkles, Pencil, Subtitles, ListChecks, Trophy,
} from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { tokens } from '../../theme/tokens';
import { Card } from '../ui/Card';
import {
  RecordingsApi,
  type RecordingGroup, type RecordingMember, type TimelineItem,
  type RecordingTranscript, type RecordingAiItem, type QuizQuestion, type QuizResultRow,
} from '../../services/RecordingsApi';
import { subscribeRecordings } from '../../services/recordingsPush';

const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const AUDIO_ACCEPT = 'audio/webm,audio/ogg,audio/mpeg,audio/wav,audio/mp4';
const DOC_ACCEPT = 'application/pdf,image/png,image/jpeg';

// Algunos navegadores/SO no rellenan file.type para webm y otros contenedores.
const MIME_BY_EXT: Record<string, string> = {
  '.webm': 'audio/webm', '.ogg': 'audio/ogg', '.opus': 'audio/ogg',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
  '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
};

function inferMime(file: File, kind: 'audio' | 'document'): string {
  if (file.type) return file.type;
  const dot = file.name.lastIndexOf('.');
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  return MIME_BY_EXT[ext] || (kind === 'audio' ? 'audio/webm' : 'application/octet-stream');
}

// Chrome tipa .webm como video/webm aunque el archivo sea solo audio.
function normalizeMime(mime: string, kind: 'audio' | 'document'): string {
  if (kind === 'audio' && mime.startsWith('video/')) return mime.replace('video/', 'audio/');
  return mime;
}

const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtDur = (ms: number | null | undefined) => {
  if (!ms && ms !== 0) return '';
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

const fmtTime = (ts: number) => new Date(ts).toLocaleString('es-CL', {
  day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
});

const roleLabel: Record<string, string> = { owner: 'Propietario', editor: 'Editor', viewer: 'Solo lectura' };

// ---------------------------------------------------------------------------
// Reproductor de audio: <audio> no puede enviar headers, así que el blob se
// baja autenticado bajo demanda y se reproduce desde un objectURL.
// ---------------------------------------------------------------------------
const AudioPlayer: React.FC<{ assetId: string }> = ({ assetId }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const blob = await RecordingsApi.fetchAssetBlob(assetId);
      const objectUrl = URL.createObjectURL(blob);
      urlRef.current = objectUrl;
      setUrl(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el audio');
    } finally {
      setLoading(false);
    }
  };

  if (url) return <audio controls src={url} style={{ width: '100%', marginTop: 8 }} />;
  return (
    <button
      onClick={load}
      disabled={loading}
      style={{
        marginTop: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        color: tokens.colors.text.primary, borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
        fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6,
      }}
    >
      {loading ? <Loader2 size={14} className="recordings-spin" /> : '▶'}
      {loading ? 'Cargando…' : 'Reproducir'}
      {error && <span style={{ color: tokens.colors.accent.danger, marginLeft: 8 }}>{error}</span>}
    </button>
  );
};

export const RecordingsModule: React.FC = () => {
  const { username } = useUser();

  const [groups, setGroups] = useState<RecordingGroup[]>([]);
  const [selected, setSelected] = useState<RecordingGroup | null>(null);
  const [members, setMembers] = useState<RecordingMember[]>([]);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [note, setNote] = useState('');
  const [memberUsername, setMemberUsername] = useState('');
  const [memberRole, setMemberRole] = useState<'editor' | 'viewer'>('editor');

  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);

  // IA (F2): transcripciones por asset, resumen del grupo y jobs activos
  const [transcripts, setTranscripts] = useState<Record<string, RecordingTranscript | null>>({});
  const [openTranscripts, setOpenTranscripts] = useState<Record<string, boolean>>({});
  const [editingTranscript, setEditingTranscript] = useState<string | null>(null);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [summary, setSummary] = useState<RecordingAiItem | null>(null);
  const [activeJobs, setActiveJobs] = useState<Record<string, { type: string; assetId?: string }>>({});

  // Cuestionario (F3)
  const [quiz, setQuiz] = useState<RecordingAiItem | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [myQuizResult, setMyQuizResult] = useState<{ score: number; total: number } | null>(null);
  const [quizHistory, setQuizHistory] = useState<QuizResultRow[]>([]);

  const recRef = useRef<{ rec: MediaRecorder; stream: MediaStream; startedAt: number } | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const canEdit = selected?.role === 'owner' || selected?.role === 'editor';
  const isOwner = selected?.role === 'owner';

  // ---------------------------------------------------------------- loaders
  const refreshGroups = useCallback(async () => {
    const { groups: list } = await RecordingsApi.listGroups();
    setGroups(list);
    return list;
  }, []);

  const refreshGroupView = useCallback(async (groupId: string) => {
    const [tl, mb, aiSummary, aiQuiz] = await Promise.all([
      RecordingsApi.timeline(groupId),
      RecordingsApi.listMembers(groupId),
      RecordingsApi.listAi(groupId, 'summary'),
      RecordingsApi.listAi(groupId, 'quiz'),
    ]);
    setItems(tl.items);
    setMembers(mb.members);
    setSummary(aiSummary.items[0] || null);
    const latestQuiz = aiQuiz.items[0] || null;
    setQuiz(latestQuiz);
    if (latestQuiz) {
      const hist = await RecordingsApi.listQuizResults(latestQuiz.id);
      setQuizHistory(hist.results);
    } else {
      setQuizHistory([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshGroups();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshGroups]);

  // Tiempo real: SSE (web) / polling (Tauri) → refresca lo que corresponda
  useEffect(() => {
    return subscribeRecordings((payload) => {
      if (payload.type === 'group' && payload.action === 'deleted' && selected && payload.groupId === selected.id) {
        setSelected(null);
        setMembers([]);
        setItems([]);
        void refreshGroups();
        return;
      }
      if (selected && payload.groupId === selected.id) {
        if (payload.type === 'transcript' && payload.action === 'ready' && payload.assetId) {
          const assetId = String(payload.assetId);
          void RecordingsApi.getTranscript(assetId).then(({ transcript }) => {
            setTranscripts((prev) => ({ ...prev, [assetId]: transcript }));
          }).catch(() => { /* temporal */ });
        }
        if (payload.type === 'ai' || payload.type === 'job') {
          void refreshGroupView(selected.id).catch(() => { /* temporal */ });
        }
        void refreshGroupView(selected.id).catch(() => { /* temporal */ });
      }
      void refreshGroups().catch(() => { /* temporal */ });
    });
  }, [selected, refreshGroups, refreshGroupView]);

  // Jobs de IA: consulta estado cada 1,5 s hasta done/failed
  useEffect(() => {
    const jobIds = Object.keys(activeJobs);
    if (jobIds.length === 0) return;
    const timer = setInterval(() => {
      void (async () => {
        for (const jobId of jobIds) {
          try {
            const { job } = await RecordingsApi.getJob(jobId);
            if (job.status !== 'done' && job.status !== 'failed') continue;
            const meta = activeJobs[jobId];
            setActiveJobs((prev) => { const next = { ...prev }; delete next[jobId]; return next; });
            if (job.status === 'failed') {
              setError(job.error || 'La tarea de IA falló');
            } else if (meta?.type === 'transcribe' && meta.assetId) {
              const { transcript } = await RecordingsApi.getTranscript(meta.assetId);
              setTranscripts((prev) => ({ ...prev, [meta.assetId as string]: transcript }));
              setOpenTranscripts((prev) => ({ ...prev, [meta.assetId as string]: true }));
            } else if (meta?.type === 'summarize' && selected) {
              const ai = await RecordingsApi.listAi(selected.id, 'summary');
              setSummary(ai.items[0] || null);
            } else if (meta?.type === 'quiz' && selected) {
              await refreshGroupView(selected.id).catch(() => { /* temporal */ });
            }
          } catch {
            /* reintenta en el siguiente tick */
          }
        }
      })();
    }, 1500);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJobs]);

  // ---------------------------------------------------------------- acciones
  const fail = (err: unknown) => setError(err instanceof Error ? err.message : 'Error inesperado');

  const openGroup = (g: RecordingGroup) => {
    setSelected(g);
    setError(null);
    void refreshGroupView(g.id).catch(fail);
  };

  const backToGroups = () => {
    setSelected(null);
    setItems([]);
    setMembers([]);
    setError(null);
  };

  const createGroup = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { group } = await RecordingsApi.createGroup(newName.trim(), newDesc.trim());
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      await refreshGroups();
      openGroup({ ...group, role: 'owner' });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const removeGroup = async () => {
    if (!selected) return;
    if (!window.confirm(`¿Eliminar el grupo "${selected.name}" y todo su contenido?`)) return;
    setBusy(true);
    try {
      await RecordingsApi.deleteGroup(selected.id);
      backToGroups();
      await refreshGroups();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const addMember = async () => {
    if (!selected || !memberUsername.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await RecordingsApi.addMember(selected.id, memberUsername.trim(), memberRole);
      setMemberUsername('');
      await refreshGroupView(selected.id);
      await refreshGroups();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (userId: number) => {
    if (!selected) return;
    setBusy(true);
    try {
      await RecordingsApi.removeMember(selected.id, userId);
      await refreshGroupView(selected.id);
      await refreshGroups();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!selected || !note.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await RecordingsApi.addContribution(selected.id, note.trim());
      setNote('');
      await refreshGroupView(selected.id);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (item: TimelineItem) => {
    if (!selected) return;
    if (!window.confirm('¿Eliminar este elemento?')) return;
    setBusy(true);
    try {
      if (item.type === 'asset') await RecordingsApi.deleteAsset(item.id);
      else await RecordingsApi.deleteContribution(item.id);
      await refreshGroupView(selected.id);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  // ------------------------------------------------------------ IA (F2)
  const toggleTranscript = async (assetId: string) => {
    const isOpen = !openTranscripts[assetId];
    setOpenTranscripts((prev) => ({ ...prev, [assetId]: isOpen }));
    if (isOpen && transcripts[assetId] === undefined) {
      try {
        const { transcript } = await RecordingsApi.getTranscript(assetId);
        setTranscripts((prev) => ({ ...prev, [assetId]: transcript }));
      } catch (err) {
        fail(err);
      }
    }
  };

  const requestAiTranscript = async (assetId: string) => {
    setError(null);
    try {
      const { jobId } = await RecordingsApi.requestTranscript(assetId);
      setActiveJobs((prev) => ({ ...prev, [jobId]: { type: 'transcribe', assetId } }));
      setOpenTranscripts((prev) => ({ ...prev, [assetId]: true }));
      setTranscripts((prev) => (assetId in prev ? prev : { ...prev, [assetId]: null }));
    } catch (err) {
      fail(err);
    }
  };

  const startEditTranscript = (assetId: string) => {
    setEditingTranscript(assetId);
    setTranscriptDraft(transcripts[assetId]?.text || '');
    setOpenTranscripts((prev) => ({ ...prev, [assetId]: true }));
  };

  const saveManualTranscript = async (assetId: string) => {
    if (!transcriptDraft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { transcript } = await RecordingsApi.saveTranscript(assetId, transcriptDraft.trim());
      setTranscripts((prev) => ({ ...prev, [assetId]: transcript }));
      setEditingTranscript(null);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const requestAiSummary = async () => {
    if (!selected) return;
    setError(null);
    try {
      const { jobId } = await RecordingsApi.requestSummary(selected.id);
      setActiveJobs((prev) => ({ ...prev, [jobId]: { type: 'summarize' } }));
    } catch (err) {
      fail(err);
    }
  };

  const hasTranscribeJob = (assetId: string) =>
    Object.values(activeJobs).some((j) => j.type === 'transcribe' && j.assetId === assetId);
  const hasSummaryJob = Object.values(activeJobs).some((j) => j.type === 'summarize');
  const hasQuizJob = Object.values(activeJobs).some((j) => j.type === 'quiz');

  const quizQuestions: QuizQuestion[] = Array.isArray(quiz?.payload.questions)
    ? (quiz?.payload.questions as QuizQuestion[])
    : [];

  // Un cuestionario nuevo reinicia el intento local
  useEffect(() => {
    setQuizAnswers({});
    setMyQuizResult(null);
  }, [quiz?.id]);

  const requestAiQuiz = async () => {
    if (!selected) return;
    setError(null);
    try {
      const { jobId } = await RecordingsApi.requestQuiz(selected.id);
      setActiveJobs((prev) => ({ ...prev, [jobId]: { type: 'quiz' } }));
    } catch (err) {
      fail(err);
    }
  };

  const submitQuiz = async () => {
    if (!quiz || quizQuestions.length === 0) return;
    const answers = quizQuestions.map((_, i) => quizAnswers[i]);
    if (answers.some((a) => a === undefined)) return;
    setBusy(true);
    setError(null);
    try {
      const { result } = await RecordingsApi.submitQuizResults(quiz.id, answers);
      setMyQuizResult({ score: result.score, total: result.total });
      const hist = await RecordingsApi.listQuizResults(quiz.id);
      setQuizHistory(hist.results);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const quizComplete = quizQuestions.every((_, i) => quizAnswers[i] !== undefined);

  const uploadBlob = async (blob: Blob, meta: { filename: string; mime: string; kind: 'audio' | 'document'; durationMs?: number }) => {
    if (!selected) return;
    if (blob.size > MAX_ASSET_BYTES) {
      setError('El archivo supera el límite de 25 MB');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await RecordingsApi.uploadAsset(selected.id, blob, meta);
      await refreshGroupView(selected.id);
      await refreshGroups();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = (kind: 'audio' | 'document') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selected) return;
    void uploadBlob(file, { filename: file.name, mime: normalizeMime(inferMime(file, kind), kind), kind });
  };

  // ---------------------------------------------------------------- recorder
  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : undefined;
      const rec = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];
      const startedAt = Date.now();
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const durationMs = Date.now() - startedAt;
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        void uploadBlob(blob, { filename: `grabacion-${stamp}.webm`, mime: 'audio/webm', kind: 'audio', durationMs });
      };
      rec.start();
      recRef.current = { rec, stream, startedAt };
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds(Math.floor((Date.now() - startedAt) / 1000)), 500);
    } catch {
      setError('No se pudo acceder al micrófono. Revisa los permisos del navegador (icono de candado en la barra de direcciones).');
    }
  };

  const stopRecording = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    recRef.current = null;
    setRecording(false);
    try { rec.rec.stop(); } catch { /* ya detenido */ }
  };

  useEffect(() => () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    const rec = recRef.current;
    if (rec) {
      try { rec.rec.stop(); } catch { /* ya detenido */ }
      rec.stream.getTracks().forEach((t) => t.stop());
    }
  }, []);

  // ---------------------------------------------------------------- render
  const header = (title: string, subtitle: string, onBack?: () => void) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onBack && (
          <button onClick={onBack} title="Volver" style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
            color: 'white', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <ArrowLeft size={18} />
          </button>
        )}
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Mic size={26} color={tokens.colors.accent.primary} />
            {title}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '6px 0 0 0', fontSize: 14 }}>{subtitle}</p>
        </div>
      </div>
    </div>
  );

  const errorBanner = error && (
    <div style={{
      background: 'rgba(255,95,115,0.12)', border: '1px solid rgba(255,95,115,0.4)', color: '#FFB4BE',
      borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 14,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    }}>
      <span>{error}</span>
      <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#FFB4BE', cursor: 'pointer', fontSize: 16 }}>✕</button>
    </div>
  );

  if (loading) {
    return (
      <div className="module-container fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Loader2 size={32} color={tokens.colors.accent.primary} className="recordings-spin" />
      </div>
    );
  }

  // ---------------------------------------------------------- vista: grupos
  if (!selected) {
    return (
      <div className="module-container fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {header('Grabaciones Colaborativas', 'Grupos de audio, notas y documentos compartidos')}
        {errorBanner}

        {showCreate ? (
          <Card padding="md" style={{ marginBottom: 24 }}>
            <h3 style={{ color: 'white', margin: '0 0 12px 0', fontSize: 16 }}>Nuevo grupo</h3>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del grupo (p. ej. Reunión semanal)"
              maxLength={120}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.3)', color: 'white', marginBottom: 10, fontSize: 14,
              }}
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Descripción (opcional)"
              rows={2}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.3)', color: 'white', marginBottom: 14, fontSize: 14, resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={createGroup}
                disabled={busy || !newName.trim()}
                style={{
                  background: tokens.colors.accent.primary, color: '#000', border: 'none', borderRadius: 10,
                  padding: '10px 20px', fontWeight: 600, cursor: busy || !newName.trim() ? 'default' : 'pointer', fontSize: 14,
                  opacity: busy || !newName.trim() ? 0.6 : 1,
                }}
              >
                {busy ? 'Creando…' : 'Crear grupo'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 14,
                }}
              >
                Cancelar
              </button>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                background: tokens.colors.accent.primary, color: '#000', border: 'none', borderRadius: 12,
                padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 20px ${tokens.colors.accent.primary}40`,
              }}
            >
              <Plus size={18} /> Nuevo grupo
            </button>
          </div>
        )}

        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'rgba(255,255,255,0.45)' }}>
            <Mic size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
            <p style={{ margin: 0 }}>Aún no hay grupos. Crea el primero para empezar a grabar con tu equipo.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {groups.map((g) => (
              <Card key={g.id} padding="md" onClick={() => openGroup(g)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: '0 0 4px 0' }}>{g.name}</h3>
                    {g.description && (
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: '0 0 8px 0' }}>{g.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: 14, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Users size={13} /> {g.memberCount ?? '—'}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Music size={13} /> {g.assetCount ?? 0}
                      </span>
                      <span>{fmtTime(g.updatedAt)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {g.role && (
                      <span style={{
                        background: g.role === 'owner' ? `${tokens.colors.accent.primary}20` : 'rgba(255,255,255,0.07)',
                        color: g.role === 'owner' ? tokens.colors.accent.primary : 'rgba(255,255,255,0.7)',
                        fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                      }}>
                        {roleLabel[g.role]}
                      </span>
                    )}
                    <ChevronRight size={18} color="rgba(255,255,255,0.35)" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------- vista: detalle
  return (
    <div className="module-container fade-in" style={{ height: '100%', display: 'flex', gap: 28, flexWrap: 'wrap' }}>
      {/* Columna izquierda: info + miembros */}
      <div style={{ flex: '1 1 300px', maxWidth: 360, display: 'flex', flexDirection: 'column', minWidth: 280 }}>
        {header(selected.name, selected.description || `Tu rol: ${roleLabel[selected.role || 'viewer']}`, backToGroups)}
        {errorBanner}

        <Card padding="md" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ color: 'white', margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} /> Miembros
            </h3>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{members.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map((m) => (
              <div key={m.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>
                    {m.name || m.username}
                    {m.username === username && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}> (tú)</span>}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{roleLabel[m.role]}</div>
                </div>
                {isOwner && m.username !== username && (
                  <button
                    onClick={() => removeMember(m.userId)}
                    title="Quitar del grupo"
                    style={{
                      background: 'none', border: 'none', color: tokens.colors.accent.danger, cursor: 'pointer',
                      padding: 4, display: 'flex',
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isOwner && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
              <input
                value={memberUsername}
                onChange={(e) => setMemberUsername(e.target.value)}
                placeholder="Usuario"
                style={{
                  flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white',
                }}
              />
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as 'editor' | 'viewer')}
                style={{
                  borderRadius: 8, fontSize: 13, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.3)', color: 'white', padding: '0 8px',
                }}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Lector</option>
              </select>
              <button
                onClick={addMember}
                disabled={busy || !memberUsername.trim()}
                title="Añadir miembro"
                style={{
                  background: tokens.colors.accent.primary, color: '#000', border: 'none', borderRadius: 8,
                  padding: '0 12px', cursor: busy || !memberUsername.trim() ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
                  display: 'flex', alignItems: 'center',
                }}
              >
                <UserPlus size={15} />
              </button>
            </div>
          )}
        </Card>

        {isOwner && (
          <button
            onClick={removeGroup}
            disabled={busy}
            style={{
              background: 'rgba(255,95,115,0.1)', border: '1px solid rgba(255,95,115,0.35)', color: tokens.colors.accent.danger,
              borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 13, display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Trash2 size={15} /> Eliminar grupo
          </button>
        )}
      </div>

      {/* Columna derecha: acciones + timeline */}
      <div style={{ flex: '2 1 420px', display: 'flex', flexDirection: 'column', minWidth: 300 }}>
        {summary && (
          <Card padding="md" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Sparkles size={16} color={tokens.colors.accent.primary} />
              <h3 style={{ color: 'white', margin: 0, fontSize: 15 }}>Resumen IA</h3>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginLeft: 'auto' }}>
                {fmtTime(summary.createdAt)} · {summary.model}
              </span>
            </div>
            <pre style={{
              color: 'rgba(255,255,255,0.85)', fontSize: 13.5, whiteSpace: 'pre-wrap',
              wordBreak: 'break-word', margin: 0, fontFamily: 'inherit', lineHeight: 1.55,
            }}>
              {summary.payload.markdown || '(sin contenido)'}
            </pre>
          </Card>
        )}

        {quiz && quizQuestions.length > 0 && (
          <Card padding="md" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <ListChecks size={16} color={tokens.colors.accent.cyan} />
              <h3 style={{ color: 'white', margin: 0, fontSize: 15 }}>Cuestionario IA</h3>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginLeft: 'auto' }}>
                {quizQuestions.length} preguntas · {fmtTime(quiz.createdAt)}
              </span>
            </div>

            {myQuizResult && (
              <div style={{
                background: `${tokens.colors.accent.primary}12`, border: `1px solid ${tokens.colors.accent.primary}40`,
                borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <Trophy size={18} color={tokens.colors.accent.primary} />
                <span style={{ color: tokens.colors.accent.primary, fontWeight: 600, fontSize: 14 }}>
                  Obtuviste {myQuizResult.score} de {myQuizResult.total}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                  ({Math.round((myQuizResult.score / Math.max(1, myQuizResult.total)) * 100)}%)
                </span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 14 }}>
              {quizQuestions.map((q, qi) => (
                <div key={qi}>
                  <p style={{ color: 'white', margin: '0 0 8px 0', fontSize: 14, fontWeight: 500 }}>
                    {qi + 1}. {q.question}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {q.options.map((opt, oi) => {
                      const selectedOpt = quizAnswers[qi] === oi;
                      const isCorrect = oi === q.answer;
                      const showResult = Boolean(myQuizResult);
                      let bg = 'rgba(255,255,255,0.03)';
                      let border = 'rgba(255,255,255,0.08)';
                      let color = 'rgba(255,255,255,0.8)';
                      if (showResult && isCorrect) {
                        bg = `${tokens.colors.accent.primary}14`; border = `${tokens.colors.accent.primary}66`; color = tokens.colors.accent.primary;
                      } else if (showResult && selectedOpt && !isCorrect) {
                        bg = `${tokens.colors.accent.danger}12`; border = `${tokens.colors.accent.danger}55`; color = tokens.colors.accent.danger;
                      } else if (selectedOpt) {
                        bg = 'rgba(58,205,255,0.1)'; border = `${tokens.colors.accent.cyan}66`; color = 'white';
                      }
                      return (
                        <label
                          key={oi}
                          style={{
                            background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 12px',
                            color, fontSize: 13.5, cursor: showResult ? 'default' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 10,
                          }}
                        >
                          <input
                            type="radio"
                            name={`quiz-${qi}`}
                            checked={selectedOpt}
                            disabled={showResult}
                            onChange={() => setQuizAnswers((prev) => ({ ...prev, [qi]: oi }))}
                          />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                  {myQuizResult && q.explanation && (
                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: '8px 0 0 0', fontSize: 12.5, fontStyle: 'italic' }}>
                      {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {!myQuizResult && (
              <button
                onClick={() => void submitQuiz()}
                disabled={busy || !quizComplete}
                style={{
                  background: tokens.colors.accent.cyan, color: '#000', border: 'none', borderRadius: 10,
                  padding: '10px 20px', fontSize: 14, fontWeight: 600,
                  cursor: quizComplete && !busy ? 'pointer' : 'default', opacity: quizComplete && !busy ? 1 : 0.5,
                }}
              >
                {busy ? 'Enviando…' : 'Enviar respuestas'}
              </button>
            )}

            {quizHistory.length > 0 && (
              <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
                <h4 style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 8px 0', fontSize: 13, fontWeight: 600 }}>
                  Resultados del equipo
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {quizHistory.map((r) => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                      <span style={{ color: 'rgba(255,255,255,0.85)', minWidth: 140 }}>
                        {r.name || r.username}
                        {r.username === username && <span style={{ color: 'rgba(255,255,255,0.4)' }}> (tú)</span>}
                      </span>
                      <span style={{
                        color: r.score >= r.total * 0.6 ? tokens.colors.accent.primary : tokens.colors.accent.warning,
                        fontWeight: 600,
                      }}>
                        {r.score}/{r.total}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginLeft: 'auto' }}>
                        {fmtTime(r.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {canEdit && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {recording ? (
              <button
                onClick={stopRecording}
                style={{
                  background: tokens.colors.accent.danger, color: 'white', border: 'none', borderRadius: 12,
                  padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span className="recordings-rec-dot" style={{ width: 10, height: 10, borderRadius: '50%', background: 'white' }} />
                Detener ({fmtDur(recSeconds * 1000)})
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={busy}
                style={{
                  background: `${tokens.colors.accent.danger}18`, color: tokens.colors.accent.danger,
                  border: `1px solid ${tokens.colors.accent.danger}55`, borderRadius: 12, padding: '12px 22px',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <Mic size={17} /> Grabar audio
              </button>
            )}

            <button
              onClick={() => audioInputRef.current?.click()}
              disabled={busy || recording}
              style={{
                background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '12px 18px', fontSize: 14, cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 8, opacity: recording ? 0.5 : 1,
              }}
            >
              <Upload size={16} /> Subir audio
            </button>
            <button
              onClick={() => docInputRef.current?.click()}
              disabled={busy || recording}
              style={{
                background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '12px 18px', fontSize: 14, cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 8, opacity: recording ? 0.5 : 1,
              }}
            >
              <FileText size={16} /> Subir documento
            </button>
            <button
              onClick={() => void requestAiSummary()}
              disabled={busy || recording || hasSummaryJob}
              title="Genera un resumen del grupo con IA (requiere GEMINI_API_KEY en el servidor)"
              style={{
                background: `${tokens.colors.accent.primary}14`, color: tokens.colors.accent.primary,
                border: `1px solid ${tokens.colors.accent.primary}44`, borderRadius: 12, padding: '12px 18px',
                fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                opacity: recording || hasSummaryJob ? 0.6 : 1,
              }}
            >
              {hasSummaryJob ? <Loader2 size={16} className="recordings-spin" /> : <Sparkles size={16} />}
              {hasSummaryJob ? 'Resumiendo…' : 'Resumen IA'}
            </button>
            <button
              onClick={() => void requestAiQuiz()}
              disabled={busy || recording || hasQuizJob}
              title="Genera un cuestionario de opción múltiple con IA (requiere GEMINI_API_KEY)"
              style={{
                background: 'rgba(58,205,255,0.1)', color: tokens.colors.accent.cyan,
                border: `1px solid ${tokens.colors.accent.cyan}44`, borderRadius: 12, padding: '12px 18px',
                fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                opacity: recording || hasQuizJob ? 0.6 : 1,
              }}
            >
              {hasQuizJob ? <Loader2 size={16} className="recordings-spin" /> : <ListChecks size={16} />}
              {hasQuizJob ? 'Generando…' : 'Cuestionario IA'}
            </button>

            <input ref={audioInputRef} type="file" accept={AUDIO_ACCEPT} hidden onChange={onPickFile('audio')} />
            <input ref={docInputRef} type="file" accept={DOC_ACCEPT} hidden onChange={onPickFile('document')} />
          </div>
        )}

        {canEdit && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void addNote(); } }}
              placeholder="Escribe una nota para el equipo…"
              style={{
                flex: 1, minWidth: 0, padding: '10px 14px', borderRadius: 10, fontSize: 14,
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white',
              }}
            />
            <button
              onClick={addNote}
              disabled={busy || !note.trim()}
              style={{
                background: tokens.colors.accent.primary, color: '#000', border: 'none', borderRadius: 10,
                padding: '0 18px', fontWeight: 600, cursor: note.trim() ? 'pointer' : 'default',
                opacity: note.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14,
              }}
            >
              <StickyNote size={15} /> Nota
            </button>
          </div>
        )}

        {/* Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 12px', color: 'rgba(255,255,255,0.4)' }}>
              <StickyNote size={32} style={{ opacity: 0.35, marginBottom: 8 }} />
              <p style={{ margin: 0 }}>Sin aportes todavía. Graba el primer audio o deja una nota.</p>
            </div>
          ) : (
            items.map((item) => {
              const mine = item.author.username === username;
              const canDelete = mine || isOwner;
              const tr = transcripts[item.id];
              return (
                <Card key={`${item.type}-${item.id}`} padding="md">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          background: item.type === 'asset' ? `${tokens.colors.accent.cyan}18` : `${tokens.colors.accent.primary}18`,
                          color: item.type === 'asset' ? tokens.colors.accent.cyan : tokens.colors.accent.primary,
                          borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                          {item.type === 'asset' ? (item.asset?.kind === 'document' ? <FileText size={11} /> : <Music size={11} />) : <StickyNote size={11} />}
                          {item.type === 'asset' ? (item.asset?.kind === 'document' ? 'Documento' : 'Audio') : 'Nota'}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 500 }}>{item.author.name || item.author.username}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{fmtTime(item.createdAt)}</span>
                      </div>

                      {item.type === 'contribution' && item.contribution && (
                        <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {item.contribution.body}
                        </p>
                      )}

                      {item.type === 'asset' && item.asset && (
                        <div>
                          <div style={{ color: 'white', fontSize: 14, fontWeight: 500, wordBreak: 'break-all' }}>
                            {item.asset.filename}
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>
                            {fmtBytes(item.asset.size)}{item.asset.durationMs != null && ` · ${fmtDur(item.asset.durationMs)}`}
                          </div>
                          {item.asset.kind === 'audio' && <AudioPlayer assetId={item.id} />}

                          {item.asset.kind === 'audio' && (
                            <div style={{ marginTop: 10 }}>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => void toggleTranscript(item.id)}
                                  style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.75)', borderRadius: 8, padding: '5px 12px',
                                    fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                                  }}
                                >
                                  <Subtitles size={13} />
                                  Transcripción
                                  {transcripts[item.id] ? ' ▾' : ' ▸'}
                                </button>
                                {canEdit && (
                                  <button
                                    onClick={() => void requestAiTranscript(item.id)}
                                    disabled={hasTranscribeJob(item.id)}
                                    title="Transcribe el audio con IA (o pégala a mano si no hay clave)"
                                    style={{
                                      background: `${tokens.colors.accent.primary}12`, border: `1px solid ${tokens.colors.accent.primary}40`,
                                      color: tokens.colors.accent.primary, borderRadius: 8, padding: '5px 12px',
                                      fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                                      opacity: hasTranscribeJob(item.id) ? 0.6 : 1,
                                    }}
                                  >
                                    {hasTranscribeJob(item.id)
                                      ? <Loader2 size={13} className="recordings-spin" />
                                      : <Sparkles size={13} />}
                                    {hasTranscribeJob(item.id) ? 'Transcribiendo…' : 'Transcribir con IA'}
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={() => startEditTranscript(item.id)}
                                    style={{
                                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                      color: 'rgba(255,255,255,0.75)', borderRadius: 8, padding: '5px 12px',
                                      fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                                    }}
                                  >
                                    <Pencil size={12} />
                                    {transcripts[item.id] ? 'Editar' : 'Pegar texto'}
                                  </button>
                                )}
                              </div>

                              {openTranscripts[item.id] && (
                                <div style={{ marginTop: 10 }}>
                                  {editingTranscript === item.id ? (
                                    <div>
                                      <textarea
                                        value={transcriptDraft}
                                        onChange={(e) => setTranscriptDraft(e.target.value)}
                                        rows={5}
                                        placeholder="Pega o escribe la transcripción del audio…"
                                        style={{
                                          width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13,
                                          border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.35)',
                                          color: 'white', resize: 'vertical', fontFamily: 'inherit',
                                        }}
                                      />
                                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                        <button
                                          onClick={() => void saveManualTranscript(item.id)}
                                          disabled={busy || !transcriptDraft.trim()}
                                          style={{
                                            background: tokens.colors.accent.primary, color: '#000', border: 'none',
                                            borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600,
                                            cursor: transcriptDraft.trim() ? 'pointer' : 'default', opacity: transcriptDraft.trim() ? 1 : 0.5,
                                          }}
                                        >
                                          Guardar
                                        </button>
                                        <button
                                          onClick={() => setEditingTranscript(null)}
                                          style={{
                                            background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer',
                                          }}
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : tr ? (
                                    <div style={{
                                      background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)',
                                      borderRadius: 10, padding: '12px 14px',
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <span style={{
                                          background: tr.source === 'gemini'
                                            ? `${tokens.colors.accent.primary}18` : 'rgba(255,255,255,0.08)',
                                          color: tr.source === 'gemini'
                                            ? tokens.colors.accent.primary : 'rgba(255,255,255,0.65)',
                                          fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '2px 8px',
                                        }}>
                                          {tr.source === 'gemini' ? 'IA' : 'Manual'}
                                        </span>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11.5 }}>
                                          {fmtTime(tr.createdAt)}
                                        </span>
                                      </div>
                                      <p style={{ color: 'rgba(255,255,255,0.88)', margin: 0, fontSize: 13.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
                                        {tr.text}
                                      </p>
                                    </div>
                                  ) : (
                                    <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: 13 }}>
                                      Sin transcripción todavía. Usa “Transcribir con IA” o pega el texto a mano.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {item.type === 'asset' && (
                        <button
                          onClick={() => void RecordingsApi.downloadAsset(item.id, item.asset?.filename || 'archivo')}
                          title="Descargar"
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: 4, display: 'flex' }}
                        >
                          <Download size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => void deleteItem(item)}
                          title="Eliminar"
                          style={{ background: 'none', border: 'none', color: tokens.colors.accent.danger, cursor: 'pointer', padding: 4, display: 'flex' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
