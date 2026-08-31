/**
 * components/common/BrandLogo.jsx — Componente Oficial del Logo e Identidad CASETECH.
 *
 * Incluye:
 * - BrandIcon: Icono geométrico de edificio en perspectiva isométrica con líneas verde neón sobre fondo azul marino.
 * - BrandTitle: Tipografía 'CASETECH' con gradiente dorado metálico de alta definición.
 * - BrandLogo: Combinación completa de Icono + Título + Subtítulo.
 */

import React from 'react';

/**
 * Icono geométrico oficial de CASETECH
 * Edificio isométrico con contorno verde neón y fondo azul profundo
 */
export function BrandIcon({ size = 48, className = '' }) {
  return (
    <div
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: `${Math.round(size * 0.28)}px`,
        backgroundColor: '#141d3b',
        boxShadow: '0 8px 20px -4px rgba(20, 29, 59, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
        border: '1.5px solid rgba(132, 204, 22, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '78%',
          height: '78%',
          filter: 'drop-shadow(0 0 4px rgba(163, 230, 53, 0.45))',
        }}
      >
        {/* Contorno perimetral / Alas laterales hexagonales */}
        <path
          d="M 24 38 L 14 44 L 14 66 L 24 72"
          stroke="#a3e635"
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 76 38 L 86 44 L 86 66 L 76 72"
          stroke="#a3e635"
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Base inferior del hexágono */}
        <path
          d="M 24 72 L 50 86 L 76 72"
          stroke="#a3e635"
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Techo superior del hexágono */}
        <path
          d="M 24 38 L 50 22 L 76 38"
          stroke="#a3e635"
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Edificio central - Cara Izquierda */}
        <path
          d="M 50 22 L 32 33 L 32 75 L 50 86 Z"
          fill="#162248"
          stroke="#a3e635"
          strokeWidth="3.8"
          strokeLinejoin="round"
        />

        {/* Edificio central - Cara Derecha */}
        <path
          d="M 50 22 L 68 33 L 68 75 L 50 86 Z"
          fill="#1b2a59"
          stroke="#a3e635"
          strokeWidth="3.8"
          strokeLinejoin="round"
        />

        {/* Línea divisoria central */}
        <line
          x1="50"
          y1="22"
          x2="50"
          y2="86"
          stroke="#a3e635"
          strokeWidth="3.8"
          strokeLinecap="round"
        />

        {/* Ventanas cuadradas en cara izquierda (Verde neón brillante) */}
        <rect x="38" y="42" width="4.5" height="4.5" fill="#bef264" rx="0.8" />
        <rect x="44" y="46" width="4.5" height="4.5" fill="#bef264" rx="0.8" />
        <rect x="38" y="54" width="4.5" height="4.5" fill="#bef264" rx="0.8" />
        <rect x="44" y="58" width="4.5" height="4.5" fill="#bef264" rx="0.8" />
        <rect x="38" y="66" width="4.5" height="4.5" fill="#bef264" rx="0.8" />

        {/* Ventanas cuadradas en cara derecha (Verde neón brillante) */}
        <rect x="53" y="38" width="4.5" height="4.5" fill="#bef264" rx="0.8" />
        <rect x="59" y="42" width="4.5" height="4.5" fill="#bef264" rx="0.8" />
        <rect x="53" y="50" width="4.5" height="4.5" fill="#bef264" rx="0.8" />
        <rect x="59" y="54" width="4.5" height="4.5" fill="#bef264" rx="0.8" />
        <rect x="53" y="62" width="4.5" height="4.5" fill="#bef264" rx="0.8" />
        <rect x="59" y="66" width="4.5" height="4.5" fill="#bef264" rx="0.8" />
      </svg>
    </div>
  );
}

/**
 * Título tipográfico oficial con gradiente dorado metálico
 */
export function BrandTitle({ size = '1.8rem', letterSpacing = '0.04em', className = '' }) {
  return (
    <span
      className={className}
      style={{
        fontSize: size,
        fontWeight: '900',
        letterSpacing: letterSpacing,
        fontFamily: "'Inter', 'Rajdhani', 'Montserrat', system-ui, -apple-system, sans-serif",
        background: 'linear-gradient(180deg, #fef08a 0%, #facc15 30%, #eab308 55%, #ca8a04 80%, #9a660a 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        display: 'inline-block',
        lineHeight: 1,
        filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4))',
      }}
    >
      CASETECH
    </span>
  );
}

/**
 * Componente combinado Logo + Título + Subtítulo
 */
export function BrandLogo({
  iconSize = 48,
  titleSize = '1.75rem',
  subtitle = 'Sistema de Producción',
  showSubtitle = true,
  className = '',
  style = {},
}) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.85rem',
        textDecoration: 'none',
        userSelect: 'none',
        ...style,
      }}
    >
      <BrandIcon size={iconSize} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <BrandTitle size={titleSize} />
        {showSubtitle && subtitle && (
          <span style={{
            fontSize: '0.72rem',
            color: '#94a3b8',
            fontWeight: '600',
            marginTop: '3px',
            letterSpacing: '0.02em',
          }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

export default BrandLogo;
