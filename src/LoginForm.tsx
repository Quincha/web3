import { useState, useRef, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { useTransition } from './context/TransitionContext';
import './LoginForm.css';

export default function LoginForm() {
  const { startLoginTransition } = useTransition();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reveal form after logo animation finishes shrinking (approx 4.5s)
    gsap.fromTo(formRef.current, 
      { opacity: 0, y: 30 }, 
      { opacity: 1, y: 0, duration: 1, delay: 4.5, ease: 'power3.out' }
    );
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Verificando credenciales...');
    
    // Smoothly fade out the login form container before displaying transition manager
    gsap.to(formRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.5,
      ease: 'power3.in',
      onComplete: () => {
        startLoginTransition(() => {
          setLoading(false);
        });
      }
    });
  };

  return (
    <div className="login-card" ref={formRef}>
      <form onSubmit={handleLogin} className="login-form">
        
        {/* Usuario */}
        <div className="field-container">
          <label className="field-label">USUARIO</label>
          <div className="input-wrapper">
            <div className="icon-container">
              <User size={18} />
            </div>
            <div className="input-divider"></div>
            <input type="text" placeholder="Usuario o correo electrónico" required />
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
              placeholder="Contraseña" 
              required 
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

        {/* Options Row */}
        <div className="form-options">
          <label className="checkbox-container">
            <input type="checkbox" />
            <span className="custom-checkbox"></span>
            Recordarme
          </label>
          <a href="#" className="forgot-link">¿Olvidaste tu contraseña?</a>
        </div>

        {/* Submit Button */}
        <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
          {loading ? (
            <div className="auth-status">
              <span>{status}</span>
            </div>
          ) : (
            <>
              <span className="btn-text">INICIAR SESIÓN</span>
              <ArrowRight className="btn-icon" size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
