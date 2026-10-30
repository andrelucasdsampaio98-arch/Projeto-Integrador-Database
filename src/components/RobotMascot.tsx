import React from 'react';

interface RobotMascotProps {
  className?: string;
  size?: number | string;
  glow?: boolean;
}

/**
 * RobotMascot: Um modelo exclusivo e simpático de robozinho com capacete arredondado,
 * fones auriculares com anéis cibernéticos, visor escuro com olhos digitais expressivos
 * (brilho alegre e amigável), sorriso de LED e antena com esfera luminosa.
 */
export function RobotMascot({ className = 'h-7 w-7', size, glow = true }: RobotMascotProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="Mascote Robozinho Comunica Acessível"
      role="img"
    >
      <defs>
        {/* Gradiente do Capacete */}
        <linearGradient id="robotHeadGrad" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        {/* Gradiente do Visor Digital Escuro */}
        <linearGradient id="robotVisorGrad" x1="18" y1="18" x2="46" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#090d16" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Gradiente dos Olhos Digitais Expressivos */}
        <linearGradient id="robotEyeGrad" x1="20" y1="23" x2="28" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Gradiente da Esfera da Antena e Detalhes Laranja */}
        <linearGradient id="robotOrangeAccent" x1="28" y1="4" x2="36" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>

        {/* Gradiente dos Fones Auriculares */}
        <linearGradient id="robotEarGrad" x1="6" y1="24" x2="14" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
      </defs>

      {/* Sombra suave inferior */}
      <ellipse cx="32" cy="60" rx="18" ry="3" fill="#000000" fillOpacity="0.15" />

      {/* Antena no Topo com Haste e Esfera Iluminada */}
      <path
        d="M32 15V8"
        stroke="#64748b"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Esfera da Antena */}
      <circle cx="32" cy="7" r="5" fill="url(#robotOrangeAccent)" stroke="#9a3412" strokeWidth="1" />
      <circle cx="30.5" cy="5.5" r="1.8" fill="#ffffff" fillOpacity="0.8" />

      {/* Fones Laterais Esquerdo e Direito (Orelhas do Robô) */}
      {/* Orelha Esquerda */}
      <rect x="7" y="24" width="7" height="16" rx="3.5" fill="url(#robotEarGrad)" stroke="#7c2d12" strokeWidth="1" />
      <circle cx="10.5" cy="32" r="2" fill="#fed7aa" />

      {/* Orelha Direita */}
      <rect x="50" y="24" width="7" height="16" rx="3.5" fill="url(#robotEarGrad)" stroke="#7c2d12" strokeWidth="1" />
      <circle cx="53.5" cy="32" r="2" fill="#fed7aa" />

      {/* Capacete Principal Arredondado (Cabeça Robótica) */}
      <rect
        x="12"
        y="14"
        width="40"
        height="35"
        rx="16"
        fill="url(#robotHeadGrad)"
        stroke="#94a3b8"
        strokeWidth="1.5"
      />

      {/* Brilho Superior do Capacete */}
      <path
        d="M20 17C24 15.5 38 15.5 44 17"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />

      {/* Visor Digital Frontal */}
      <rect
        x="17"
        y="21"
        width="30"
        height="22"
        rx="10"
        fill="url(#robotVisorGrad)"
        stroke="#334155"
        strokeWidth="1"
      />

      {/* Reflexo no Canto Superior do Visor */}
      <path
        d="M21 24C24 22.5 39 22.5 42 24"
        stroke="#475569"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.5"
      />

      {/* Olhos Digitais Expressivos e Alegres (Formato amigável tipo cápsula / arcos vivos) */}
      {/* Olho Esquerdo */}
      <g>
        <rect x="22" y="26" width="6.5" height="9" rx="3.25" fill="url(#robotEyeGrad)" />
        {/* Pupila com brilho */}
        <circle cx="24" cy="28" r="1.3" fill="#ffffff" />
        <circle cx="26" cy="32" r="0.8" fill="#bae6fd" />
      </g>

      {/* Olho Direito */}
      <g>
        <rect x="35.5" y="26" width="6.5" height="9" rx="3.25" fill="url(#robotEyeGrad)" />
        {/* Pupila com brilho */}
        <circle cx="37.5" cy="28" r="1.3" fill="#ffffff" />
        <circle cx="39.5" cy="32" r="0.8" fill="#bae6fd" />
      </g>

      {/* Bochechas Digitais Suaves (Blush LED) */}
      <ellipse cx="20.5" cy="35" rx="1.5" ry="0.8" fill="#fb923c" fillOpacity="0.7" />
      <ellipse cx="43.5" cy="35" rx="1.5" ry="0.8" fill="#fb923c" fillOpacity="0.7" />

      {/* Sorriso Digital LED em Arco Simpático */}
      <path
        d="M29 36C30 38 34 38 35 36"
        stroke="#38bdf8"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Pescoço / Base do Robô */}
      <rect x="25" y="49" width="14" height="4" rx="2" fill="#475569" />
      <rect x="27" y="50" width="10" height="2" rx="1" fill="#ea580c" />

      {/* Mini Emblema / Botão de Acessibilidade no Peito */}
      <path
        d="M20 53C20 51.5 44 51.5 44 53L48 59H16L20 53Z"
        fill="#334155"
        stroke="#475569"
        strokeWidth="1"
      />
      <circle cx="32" cy="56" r="1.8" fill="#fb923c" />
    </svg>
  );
}
