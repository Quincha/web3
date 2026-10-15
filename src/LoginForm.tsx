import { useState, useRef, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, Loader2, ArrowLeft, HelpCircle } from 'lucide-react';
import gsap from 'gsap';
import { useTransition } from './context/TransitionContext';
import { Api, ApiError } from './services/ApiClient';
import { DataSyncService } from './services/DataSyncService';
import './LoginForm.css';

type Mode = 'login' | 'recovery';

export default function LoginForm() {
  const { startLoginTransition } = useTransition();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const [name, setName] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  // Recovery state
  const [recoveryStep, setRecoveryStep] = useState<'username' | 'questions'>('username');
  const [recoveryQuestions, setRecoveryQuestions] = useState<{ id: number; question: string }[]>([]);
  const [recoveryAnswers, setRecoveryAnswers] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryDone, setRecoveryDone] = useState(false);

  useEffect(() => {
    Api.health()
      .then((h) => setSetupRequired(h.setupRequired))
      .catch(() => setSetupRequired(false));
  }, []);

  useEffect(() => {
    gsap.fromTo(formRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, delay: 2.25, ease: 'power3.out' }
    );
  }, []);

  const enterDashboard = () => {
    window.dispatchEvent(new Event('quincha-auth'));
    gsap.to(formRef.current, {
      opacity: 0, y: -20, duration: 0.25, ease: 'power3.in',
      onComplete: () => startLoginTransition(() => setLoading(false)),
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatus(setupRequired ? 'Instalando sistema...' : 'Verificando credenciales...');

    try {
      if (setupRequired) {
        await Api.install(username.trim(), password, name.trim() || 'Administrador');
        enterDashboard();
      } else {
        await Api.login(username.trim(), password);
        await DataSyncService.reconcile().catch(() => {});
        enterDashboard();
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al conectar con el servidor';
      setError(message);
      setStatus('');
      setLoading(false);
    }
  };

  const handleFetchQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await Api.getSecurityQuestions(username.trim());
      setRecoveryQuestions(res.questions);
      setRecoveryAnswers(res.questions.map(() => ''));
      setRecoveryStep('questions');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al conectar con el servidor';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await Api.forgotPassword(username.trim(), recoveryAnswers, newPassword);
      setRecoveryDone(true);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al conectar con el servidor';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = () => {
    setMode('login');
    setRecoveryStep('username');
    setRecoveryQuestions([]);
    setRecoveryAnswers([]);
    setNewPassword('');
    setRecoveryDone(false);
    setError('');
  };

  // ── Recovery view ──────────────────────────────────────────
  if (mode === 'recovery') {
    return (
      <div className="login-card" ref={formRef}>
        <form onSubmit={recoveryStep === 'username' ? handleFetchQuestions : handleRecover} className="login-form">
          {recoveryDone ? (
            <>
              <div className="auth-status" style={{ color: '#16F0B5', fontSize: '13px', textAlign: 'center', marginBottom: '12px' }}>
                Contraseña actualizada correctamente.
              </div>
              <button type="button" className="submit-btn" onClick={backToLogin}>
                <span className="btn-text">VOLVER AL LOGIN</span>
                <ArrowRight className="btn-icon" size={18} />
              </button>
            </>
          ) : (
            <>
              <div className="auth-status" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textAlign: 'center', marginBottom: '8px' }}>
                {recoveryStep === 'username'
                  ? 'Ingresá tu usuario para recuperar tu contraseña.'
                  : 'Respondé tus preguntas de seguridad.'}
              </div>

              {recoveryStep === 'username' ? (
                <div className="field-container">
                  <label className="field-label">USUARIO</label>
                  <div className="input-wrapper">
                    <div className="icon-container"><User size={18} /></div>
                    <div className="input-divider"></div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Tu usuario"
                      required
                    />
                  </div>
                </div>
              ) : (
                <>
                  {recoveryQuestions.map((q, i) => (
                    <div className="field-container" key={q.id}>
                      <label className="field-label">{q.question.toUpperCase()}</label>
                      <div className="input-wrapper">
                        <div className="icon-container"><HelpCircle size={18} /></div>
                        <div className="input-divider"></div>
                        <input
                          type="text"
                          value={recoveryAnswers[i] || ''}
                          onChange={(e) => {
                            const next = [...recoveryAnswers];
                            next[i] = e.target.value;
                            setRecoveryAnswers(next);
                          }}
                          placeholder="Tu respuesta"
                          required
                        />
                      </div>
                    </div>
                  ))}
                  <div className="field-container">
                    <label className="field-label">NUEVA CONTRASEÑA</label>
                    <div className="input-wrapper">
                      <div className="icon-container"><Lock size={18} /></div>
                      <div className="input-divider"></div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        required
                        minLength={8}
                      />
                      <button type="button" className="password-toggle" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="auth-status" style={{ color: '#FF5F73', fontSize: '12px', textAlign: 'center', marginTop: '4px' }}>
                  {error}
                </div>
              )}

              <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
                {loading ? (
                  <div className="auth-status">
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 8, verticalAlign: 'middle' }} />
                    <span>Verificando...</span>
                  </div>
                ) : (
                  <>
                    <span className="btn-text">{recoveryStep === 'username' ? 'CONTINUAR' : 'RESTABLECER'}</span>
                    <ArrowRight className="btn-icon" size={18} />
                  </>
                )}
              </button>

              <button type="button" onClick={backToLogin} style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: '12px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, margin: '4px auto 0',
              }}>
                <ArrowLeft size={14} /> Volver a iniciar sesión
              </button>
            </>
          )}
        </form>
      </div>
    );
  }

  // ── Login view ─────────────────────────────────────────────
  return (
    <div className="login-card" ref={formRef}>
      <form onSubmit={handleLogin} className="login-form">
        {setupRequired && (
          <div className="auth-status" style={{ color: '#F59E0B', fontSize: '12px', textAlign: 'center', marginBottom: '8px' }}>
            Primera instalación: creá el administrador del sistema.
          </div>
        )}

        {/* Nombre (solo instalación) */}
        {setupRequired && (
          <div className="field-container">
            <label className="field-label">NOMBRE</label>
            <div className="input-wrapper">
              <div className="icon-container"><User size={18} /></div>
              <div className="input-divider"></div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre o empresa"
              />
            </div>
          </div>
        )}

        {/* Usuario */}
        <div className="field-container">
          <label className="field-label">USUARIO</label>
          <div className="input-wrapper">
            <div className="icon-container">
              <User size={18} />
            </div>
            <div className="input-divider"></div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario o correo electrónico"
              required
            />
          </div>
        </div>

        {/* Contraseña */}
        <div className="field-container">
          <label className="field-label">CONTRASEÑA</label>
          <div className="input-wrapper">
            <div className="icon-container">
              <Lock size={18} />
            </div>
            <div className="input-divider"></div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              required
              minLength={setupRequired ? 8 : undefined}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {!setupRequired && (
          <button
            type="button"
            onClick={() => { setMode('recovery'); setError(''); }}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: '12px',
              cursor: 'pointer', textAlign: 'right', padding: 0, marginBottom: '4px',
            }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}

        {error && (
          <div className="auth-status" style={{ color: '#FF5F73', fontSize: '12px', textAlign: 'center', marginTop: '4px' }}>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
          {loading ? (
            <div className="auth-status">
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 8, verticalAlign: 'middle' }} />
              <span>{status}</span>
            </div>
          ) : (
            <>
              <span className="btn-text">{setupRequired ? 'INSTALAR Y ENTRAR' : 'INICIAR SESIÓN'}</span>
              <ArrowRight className="btn-icon" size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
