import './GridBackground.css';

export default function GridBackground() {
  return (
    <svg 
      className="grid-background" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 1920 1080" 
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="centerGradient" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#1A1D24" />
          <stop offset="100%" stopColor="#050505" />
        </radialGradient>
      </defs>

      {/* Fondo negro puro con un degradado radial sutil en el centro */}
      <rect width="100%" height="100%" fill="url(#centerGradient)" />
    </svg>
  );
}
