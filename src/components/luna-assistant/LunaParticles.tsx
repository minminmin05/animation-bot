/**
 * Luna Particle System - Premium Edition
 * Magical orbiting particles with glow effects
 */

import { motion } from 'framer-motion'
import { memo } from 'react'
import { LUNA_COLORS } from './lunaConfig'

interface LunaParticlesProps {
  count: number
  orbitRadius: number
  progress: number
  quality: 'high' | 'medium' | 'low'
  glowIntensity: number
  color?: string
  glowColor?: string
}

export const LunaParticles = memo(({
  count,
  orbitRadius,
  progress,
  quality,
  glowIntensity,
  color = LUNA_COLORS.accent,
  glowColor = LUNA_COLORS.glow,
}: LunaParticlesProps) => {
  if (quality === 'low' || count === 0) return null

  // Generate particles with varied properties
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2
    const radiusVariation = 0.85 + Math.sin(i * 0.7) * 0.25
    const size = quality === 'high' ? 2.5 + Math.sin(i * 1.3) * 1.5 : 2 + Math.sin(i) * 1
    const speedVariation = 0.7 + Math.cos(i * 0.5) * 0.4
    const phaseOffset = i * 0.3
    const verticalDrift = Math.sin(i * 0.9) * 8

    return {
      id: i,
      angle,
      radiusVariation,
      size,
      speedVariation,
      phaseOffset,
      verticalDrift,
    }
  })

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Premium glow filter for particles */}
        <filter id="particle-premium-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur1" />
          <feGaussianBlur stdDeviation="1" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Radial gradient for soft particles */}
        <radialGradient id="particle-soft-gradient">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="40%" stopColor={glowColor} stopOpacity="0.6" />
          <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
        </radialGradient>

        {/* Core gradient */}
        <radialGradient id="particle-core-gradient">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="50%" stopColor={color} stopOpacity="0.7" />
          <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {particles.map((particle) => {
        const time = progress * 0.001
        const animatedAngle = particle.angle + time * particle.speedVariation

        // Elliptical orbit for depth
        const x = Math.cos(animatedAngle) * orbitRadius * particle.radiusVariation
        const y = Math.sin(animatedAngle) * orbitRadius * particle.radiusVariation * 0.35

        // Add subtle vertical drift
        const driftY = y + Math.sin(time * 2 + particle.phaseOffset) * particle.verticalDrift * 0.3

        // Pulsing opacity
        const pulse = 0.3 + Math.sin(time * 3 + particle.phaseOffset) * 0.3 + glowIntensity * 0.4

        // Breathing size
        const breathingSize = particle.size * (0.8 + Math.sin(time * 2 + particle.phaseOffset) * 0.3)

        return (
          <motion.circle
            key={particle.id}
            cx="50%"
            cy="50%"
            r={breathingSize}
            fill="url(#particle-core-gradient)"
            style={{
              transformOrigin: 'center',
              filter: quality === 'high' ? 'url(#particle-premium-glow)' : undefined,
            }}
            initial={false}
            animate={{
              translateX: x,
              translateY: driftY,
              opacity: Math.min(1, pulse),
            }}
            transition={{
              duration: 0,
            }}
          />
        )
      })}
    </svg>
  )
})

LunaParticles.displayName = 'LunaParticles'

export default LunaParticles
