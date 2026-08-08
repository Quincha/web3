import React, { useState } from 'react';
import {    Send, CheckCircle2,  Laptop, Star } from 'lucide-react';
import './ClientPortal.css';
import { OfficialLogo } from '../ui/OfficialLogo';

interface ClientRequest {
  id: string;
  name: string;
  company: string;
  email: string;
  serviceType: string;
  description: string;
  budget: string;
  status: 'received' | 'reviewing' | 'progress' | 'completed';
  submittedAt: string;
}

export const ClientPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'request' | 'tracking' | 'portfolio'>('request');
  const [availability] = useState<'available' | 'limited' | 'busy'>('available');
  
  // Request Form States
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('desarrollo');
  const [desc, setDesc] = useState('');
  const [budget, setBudget] = useState('medium');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  // Tracking State
  const [searchId, setSearchId] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<ClientRequest | null>(null);

  const PORTFOLIO = [
    {
      title: 'Portal Bancario Premium',
      tech: 'Next.js · NestJS · PostgreSQL',
      desc: 'Rediseño completo de la experiencia cliente con transiciones fluidas de 60fps.',
      rating: 5
    },
    {
      title: 'E-commerce Engine',
      tech: 'React · Shopify Plus · Node.js',
      desc: 'Optimización de velocidad de carga de 4.2s a 0.8s para conversión móvil masiva.',
      rating: 5
    },
    {
      title: 'Dashboard de Operaciones',
      tech: 'Vite · GraphQL · Tailwind',
      desc: 'Sistema de administración y reportería en tiempo real para logística global.',
      rating: 5
    }
  ];

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reqId = `REQ-${Math.floor(100000 + Math.random() * 900000)}`;
    const newRequest: ClientRequest = {
      id: reqId,
      name,
      company,
      email,
      serviceType: service,
      description: desc,
      budget,
      status: 'received',
      submittedAt: new Date().toLocaleDateString()
    };

    // Store in localStorage cache
    const existing = localStorage.getItem('quincha_client_requests');
    const list = existing ? JSON.parse(existing) : [];
    list.push(newRequest);
    localStorage.setItem('quincha_client_requests', JSON.stringify(list));

    setSubmittedId(reqId);
    setName('');
    setCompany('');
    setEmail('');
    setDesc('');
  };

  const handleTrackSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const existing = localStorage.getItem('quincha_client_requests');
    const list: ClientRequest[] = existing ? JSON.parse(existing) : [];
    const found = list.find(r => r.id.toUpperCase() === searchId.trim().toUpperCase());
    
    if (found) {
      setTrackedOrder(found);
    } else {
      // Mock static tracking for demonstration if id doesn't exist
      setTrackedOrder({
        id: searchId.toUpperCase(),
        name: 'Cliente Demo',
        company: 'Demo Corp',
        email: 'demo@example.com',
        serviceType: 'desarrollo',
        description: 'Proyecto de software',
        budget: 'medium',
        status: 'progress',
        submittedAt: new Date().toLocaleDateString()
      });
    }
  };

  return (
    <div className="client-portal-root">
      {/* Navbar / Header */}
      <header className="client-portal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="brand-logo-q" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <OfficialLogo size={32} showGlow={true} />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.15em' }}>QUINCHA</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block', marginTop: '-2px' }}>PORTAL CLIENTES</span>
          </div>
        </div>

        {/* Availability Semaphore */}
        <div className="availability-badge-container">
          <div className={`availability-dot ${availability}`} />
          <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
            {availability === 'available' && 'Disponible para nuevos proyectos'}
            {availability === 'limited' && 'Capacidad de trabajo limitada'}
            {availability === 'busy' && 'No disponible temporalmente'}
          </span>
        </div>
      </header>

      {/* Hero Intro */}
      <section className="client-portal-hero">
        <h1>Transformamos ideas en <span className="brand-accent-text">interfaces de precisión.</span></h1>
        <p>Envía tu requerimiento técnico o haz seguimiento de tus desarrollos activos en tiempo real.</p>
      </section>

      {/* Main Tabs Navigation */}
      <div className="client-portal-tabs">
        <button className={`client-tab-btn ${activeTab === 'request' ? 'active' : ''}`} onClick={() => setActiveTab('request')}>
          <Send size={14} /> Solicitar Proyecto
        </button>
        <button className={`client-tab-btn ${activeTab === 'tracking' ? 'active' : ''}`} onClick={() => setActiveTab('tracking')}>
          <Laptop size={14} /> Seguimiento
        </button>
        <button className={`client-tab-btn ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}>
          <Star size={14} /> Portafolio & Casos
        </button>
      </div>

      {/* Tab Panels */}
      <main className="client-portal-main-panel">
        
        {/* TAB: REQUEST */}
        {activeTab === 'request' && (
          <div className="client-form-view">
            {submittedId ? (
              <div className="submitted-success-card">
                <CheckCircle2 size={38} style={{ color: 'var(--accent-green)' }} />
                <h3>¡Solicitud Recibida Exitosamente!</h3>
                <p>Tu solicitud ha sido registrada con el código de seguimiento:</p>
                <div className="tracking-code-bubble">{submittedId}</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Usa este código en la pestaña "Seguimiento" para ver el avance.</p>
                <button className="action-green-btn" style={{ marginTop: '16px' }} onClick={() => setSubmittedId(null)}>
                  Enviar otra solicitud
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="client-request-form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="field-container">
                    <label className="field-label">Nombre de Contacto</label>
                    <input type="text" className="setup-text-input" placeholder="Tu nombre" required value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="field-container">
                    <label className="field-label">Empresa / Organización</label>
                    <input type="text" className="setup-text-input" placeholder="Compañía" required value={company} onChange={e => setCompany(e.target.value)} />
                  </div>
                </div>

                <div className="field-container">
                  <label className="field-label">Correo Electrónico</label>
                  <input type="email" className="setup-text-input" placeholder="correo@empresa.com" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="field-container">
                    <label className="field-label">Tipo de Servicio</label>
                    <select className="task-form-select" value={service} onChange={e => setService(e.target.value)}>
                      <option value="desarrollo">Desarrollo Web / App</option>
                      <option value="diseño">Diseño UI/UX (Figma)</option>
                      <option value="consultoria">Consultoría Técnica</option>
                    </select>
                  </div>
                  <div className="field-container">
                    <label className="field-label">Presupuesto Estimado</label>
                    <select className="task-form-select" value={budget} onChange={e => setBudget(e.target.value)}>
                      <option value="low">Menor a $5k USD</option>
                      <option value="medium">$5k - $15k USD</option>
                      <option value="high">Mayor a $15k USD</option>
                    </select>
                  </div>
                </div>

                <div className="field-container">
                  <label className="field-label">Descripción del Proyecto</label>
                  <textarea
                    className="task-form-input task-form-textarea"
                    rows={4}
                    placeholder="Describe el alcance de tu proyecto, requerimientos principales, fechas estimadas..."
                    required
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                  />
                </div>

                <button type="submit" className="action-green-btn" style={{ width: '100%', height: '48px', justifyContent: 'center' }}>
                  <Send size={16} /> Enviar Solicitud de Proyecto
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB: TRACKING */}
        {activeTab === 'tracking' && (
          <div className="client-tracking-view">
            <form onSubmit={handleTrackSearch} className="tracking-search-form" style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <input
                type="text"
                className="setup-text-input"
                placeholder="Ingresa tu código de seguimiento (Ej: REQ-839401)..."
                required
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="action-green-btn" style={{ padding: '0 24px' }}>Buscar</button>
            </form>

            {trackedOrder ? (
              <div className="tracking-details-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Seguimiento de orden</span>
                    <h3 style={{ margin: 0 }}>{trackedOrder.id}</h3>
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: trackedOrder.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: trackedOrder.status === 'completed' ? 'var(--accent-green)' : '#3B82F6'
                  }}>
                    {trackedOrder.status === 'received' && 'Recibido'}
                    {trackedOrder.status === 'reviewing' && 'En Revisión'}
                    {trackedOrder.status === 'progress' && 'En Desarrollo'}
                    {trackedOrder.status === 'completed' && 'Entregado'}
                  </span>
                </div>

                {/* Progress Visual Timeline */}
                <div className="tracking-timeline-flow" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginTop: '32px', marginBottom: '24px', padding: '0 20px' }}>
                  <div style={{ position: 'absolute', top: '10px', left: '40px', right: '40px', height: '2px', background: 'var(--border-color)', zIndex: 1 }} />
                  
                  {['received', 'reviewing', 'progress', 'completed'].map((st, idx) => {
                    const statuses = ['received', 'reviewing', 'progress', 'completed'];
                    const currentIdx = statuses.indexOf(trackedOrder.status);
                    const isDone = idx <= currentIdx;

                    return (
                      <div key={st} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, position: 'relative' }}>
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: isDone ? 'var(--accent-green)' : 'var(--bg-card)',
                          border: `2px solid ${isDone ? 'var(--accent-green)' : 'var(--border-color)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFF',
                          fontSize: '0.7rem'
                        }}>
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: isDone ? 'var(--text-primary)' : 'var(--text-subtle)', marginTop: '8px' }}>
                          {st === 'received' && 'Recibido'}
                          {st === 'reviewing' && 'Revisión'}
                          {st === 'progress' && 'Desarrollo'}
                          {st === 'completed' && 'Entregado'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '0.85rem' }}>
                  <p><strong>Compañía:</strong> {trackedOrder.company}</p>
                  <p><strong>Servicio:</strong> {trackedOrder.serviceType.toUpperCase()}</p>
                  <p><strong>Fecha de Ingreso:</strong> {trackedOrder.submittedAt}</p>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-subtle)', fontSize: '0.9rem' }}>
                Ingresa tu código de orden para ver el estado en tiempo real.
              </div>
            )}
          </div>
        )}

        {/* TAB: PORTFOLIO */}
        {activeTab === 'portfolio' && (
          <div className="client-portfolio-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {PORTFOLIO.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '20px'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', fontWeight: 600, letterSpacing: '0.1em' }}>CASO DE ÉXITO</span>
                  <h3 style={{ margin: '4px 0 6px 0' }}>{item.title}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{item.desc}</p>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    {item.tech}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px' }}>
                  <div style={{ display: 'flex', gap: '2px', color: '#F59E0B', marginBottom: '4px' }}>
                    {[...Array(item.rating)].map((_, i) => <Star key={i} size={14} fill="#F59E0B" />)}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>Calificación</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Portal Footer */}
      <footer className="client-portal-footer" style={{ textAlign: 'center', marginTop: '48px', padding: '24px 0', borderTop: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
        © {new Date().getFullYear()} Quincha Systems. Todos los derechos reservados.
      </footer>
    </div>
  );
};
export default ClientPortal;
