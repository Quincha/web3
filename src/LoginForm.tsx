import { useState, useRef, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import { useTransition } from './context/TransitionContext';
import { Api, ApiError } from './services/ApiClient';
import { DataSyncService } from './services/DataSyncService';
import './LoginForm.css';

export default function LoginForm() {
  const { startLoginTransition } = useTransition();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const [name, setName] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if the system needs first-time installation
    Api.health()
      .then((h) => setSetupRequired(h.setupRequired))
      .catch(() => setSetupRequired(false));
  }, []);

  useEffect(() => {
    // Reveal form after logo animation finishes shrinking (approx 4.5s)
    gsap.fromTo(formRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, delay: 2.25, ease: 'power3.out' }
    );
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatus(setupRequired ? 'Instalando sistema...' : 'Verificando credenciales...');

    try {
      if (setupRequired) {
        const res = await Api.install(username.trim(), password, name.trim() || 'Administrador');
        window.dispatchEvent(new Event('quincha-auth'));
        // Installed: now use the returned token to open the dashboard
        gsap.to(formRef.current, {
          opacity: 0, y: -20, duration: 0.25, ease: 'power3.in',
          onComplete: () => startLoginTransition(() => setLoading(false)),
        });
        void res;
      } else {
        await Api.login(username.trim(), password);
        // Baja los datos del servidor (si los hay) antes de entrar al dashboard.
        await DataSyncService.reconcile().catch(() => {});
        window.dispatchEvent(new Event('quincha-auth'));
        gsap.to(formRef.current, {
          opacity: 0, y: -20, duration: 0.25, ease: 'power3.in',
          onComplete: () => startLoginTransition(() => setLoading(false)),
        });
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al conectar con el servidor';
      setError(message);
      setStatus('');
      setLoading(false);
    }
  };

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
