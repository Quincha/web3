import React, { useState, useEffect } from 'react';
import { Thermometer, ChevronRight, Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, Loader2 } from 'lucide-react';
import { tokens } from '../../theme/tokens';

// WMO Weather interpretation codes (https://open-meteo.com/en/docs)
const getWeatherDetails = (code: number) => {
  if (code === 0) return { label: 'Despejado', icon: Sun, color: '#FBBF24' };
  if (code === 1) return { label: 'Mayormente despejado', icon: CloudSun, color: '#FBBF24' };
  if (code === 2) return { label: 'Parcialmente nublado', icon: CloudSun, color: '#94A3B8' };
  if (code === 3) return { label: 'Nublado', icon: Cloud, color: '#94A3B8' };
  if (code === 45 || code === 48) return { label: 'Niebla', icon: Cloud, color: '#94A3B8' };
  if (code >= 51 && code <= 57) return { label: 'Llovizna', icon: CloudRain, color: '#60A5FA' };
  if (code >= 61 && code <= 67) return { label: 'Lluvia', icon: CloudRain, color: '#3B82F6' };
  if (code >= 71 && code <= 77) return { label: 'Nieve', icon: CloudSnow, color: '#E2E8F0' };
  if (code >= 80 && code <= 82) return { label: 'Chubascos', icon: CloudRain, color: '#3B82F6' };
  if (code >= 85 && code <= 86) return { label: 'Chubascos de nieve', icon: CloudSnow, color: '#E2E8F0' };
  if (code >= 95 && code <= 99) return { label: 'Tormenta', icon: CloudLightning, color: '#A78BFA' };
  return { label: 'Desconocido', icon: Sun, color: '#FBBF24' };
};

const getShortDate = (dateString: string) => {
  const date = new Date(dateString + 'T12:00:00Z'); // force midday UTC to avoid timezone shift
  const dayIndex = date.getUTCDay();
  const dayOfMonth = date.getUTCDate();
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return `${days[dayIndex]} ${dayOfMonth}`;
};

const getRainInsight = (weather: any) => {
  if (!weather || !weather.hourly || !weather.current) return null;
  
  const currentHourStr = weather.current.time.substring(0, 13) + ':00';
  const currentHourIndex = weather.hourly.time.findIndex((t: string) => t === currentHourStr);
  if (currentHourIndex === -1) return null;

  const upcomingHours = 24;
  let rainStartsAt = -1;
  let rainStopsAt = -1;
  let currentlyRaining = false;
  
  const isRainingCode = (code: number, prob: number) => 
    prob > 40 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);

  const currentProb = weather.hourly.precipitation_probability[currentHourIndex];
  const currentCode = weather.hourly.weather_code[currentHourIndex];
  
  if (isRainingCode(currentCode, currentProb)) {
    currentlyRaining = true;
  }
  
  if (currentlyRaining) {
    for (let i = currentHourIndex + 1; i < currentHourIndex + upcomingHours && i < weather.hourly.time.length; i++) {
      if (!isRainingCode(weather.hourly.weather_code[i], weather.hourly.precipitation_probability[i])) {
        rainStopsAt = i;
        break;
      }
    }
  } else {
    for (let i = currentHourIndex + 1; i < currentHourIndex + upcomingHours && i < weather.hourly.time.length; i++) {
      if (isRainingCode(weather.hourly.weather_code[i], weather.hourly.precipitation_probability[i])) {
        rainStartsAt = i;
        break;
      }
    }
  }
  
  if (currentlyRaining) {
    if (rainStopsAt !== -1) {
      const date = new Date(weather.hourly.time[rainStopsAt] + ':00Z');
      // Fix timezone offset for display
      date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
      const timeStr = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      return `LA LLUVIA PARARÁ A LAS ${timeStr} APROX.`;
    } else {
      return `LLUVIA CONTINUA POR LAS PRÓXIMAS 24 HORAS.`;
    }
  } else {
    if (rainStartsAt !== -1) {
      const date = new Date(weather.hourly.time[rainStartsAt] + ':00Z');
      date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
      const timeStr = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      const prob = weather.hourly.precipitation_probability[rainStartsAt];
      return `SE AVECINA LLUVIA A LAS ${timeStr} APROX. (PROBABILIDAD: ${prob}%)`;
    } else {
      return `ESTAMOS LIBRES DE LLUVIA POR LAS PRÓXIMAS 24 HORAS.`;
    }
  }
};

export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Lat/Lon for Los Angeles, Chile
        const lat = -37.4697;
        const lon = -72.3536;
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&hourly=weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        setWeather(data);
        setError(false);
      } catch (err) {
        console.error('Failed to fetch weather:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    // Refresh every 30 minutes
    const intervalId = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="premium-card-hover" style={{ 
        background: 'rgba(15, 23, 42, 0.3)', 
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(56, 189, 248, 0.15)',
        borderRadius: '16px', 
        padding: '16px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.08em' }}>TIEMPO Y PRONÓSTICO</div>
          <ChevronRight size={14} color="rgba(255,255,255,0.4)" />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: '150px' }}>
            <Loader2 className="animate-spin" color={tokens.colors.accent.cyan} />
          </div>
        ) : error || !weather ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
            No se pudo cargar el clima.
          </div>
        ) : (
          <>
            {/* Temp */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <Thermometer size={32} color={tokens.colors.accent.cyan} style={{ filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))'}} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                  {Math.round(weather.current.temperature_2m)}°C
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Los Ángeles, Chile</div>
              </div>
              {React.createElement(getWeatherDetails(weather.current.weather_code).icon, {
                size: 24,
                color: getWeatherDetails(weather.current.weather_code).color,
                style: { marginLeft: 'auto' }
              })}
            </div>

            {/* 5-Day Forecast Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(5, 1fr)', 
              gap: '8px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              padding: '12px 0',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              {weather.daily.time.slice(0, 5).map((date: string, index: number) => {
                const details = getWeatherDetails(weather.daily.weather_code[index]);
                const Icon = details.icon;
                return (
                  <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ fontSize: '9px', color: '#fff', fontWeight: 600 }}>{getShortDate(date)}</div>
                    <Icon size={16} color={details.color} />
                    <div style={{ fontSize: '9px', color: '#fff', fontWeight: 700 }}>
                      {Math.round(weather.daily.temperature_2m_max[index])}°<span style={{color: 'rgba(255,255,255,0.5)'}}>/{Math.round(weather.daily.temperature_2m_min[index])}°C</span>
                    </div>
                    <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      {details.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Weather Insights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '10px', color: tokens.colors.accent.cyan, fontWeight: 500, lineHeight: 1.4, background: 'rgba(56, 189, 248, 0.05)', padding: '10px', borderRadius: '8px' }}>
                ACTUALMENTE: {getWeatherDetails(weather.current.weather_code).label.toUpperCase()}.
              </div>
              
              {getRainInsight(weather) && (
                <div style={{ fontSize: '10px', color: 'rgba(56, 189, 248, 0.8)', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1.4, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '8px 10px' }}>
                  {getRainInsight(weather)}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
