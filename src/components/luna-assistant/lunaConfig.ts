/**
 * Luna (Moon Knowledge Spirit) Assistant Configuration
 * Animation states, transitions, and visual parameters
 */

export type LunaState = 'idle' | 'listening' | 'thinking' | 'talking' | 'reaction'
export type ReactionType = 'happy' | 'success' | 'confused' | 'apology' | 'greeting'
export type QualityLevel = 'high' | 'medium' | 'low'

export interface LunaAnimationConfig {
  // Float animation
  floatAmplitude: number
  floatSpeed: number
  floatPhaseOffset: number

  // Rotation
  rotationAmount: number
  rotationSpeed: number

  // Glow
  glowIntensity: number
  glowPulseSpeed: number

  // Orbit ring
  orbitRingSpeed: number
  orbitRingTilt: number
  orbitRingRadius: number

  // Particles
  particleCount: number
  particleSpeed: number
  particleOrbitRadius: number

  // Eye
  eyeSize: number
  blinkInterval: number
  blinkDuration: number

  // Mouth
  mouthOpenAmount: number
  mouthSmoothness: number

  // Transition
  transitionDuration: number
  transitionEasing: string
}

export const QUALITY_PRESETS: Record<QualityLevel, Partial<LunaAnimationConfig>> = {
  high: {
    particleCount: 20,
    glowIntensity: 1,
    orbitRingRadius: 1,
    floatAmplitude: 1,
  },
  medium: {
    particleCount: 10,
    glowIntensity: 0.7,
    orbitRingRadius: 0.8,
    floatAmplitude: 0.8,
  },
  low: {
    particleCount: 0,
    glowIntensity: 0.5,
    orbitRingRadius: 0.6,
    floatAmplitude: 0.5,
  },
}

export const STATE_CONFIGS: Record<LunaState, Partial<LunaAnimationConfig>> = {
  idle: {
    floatAmplitude: 8,
    floatSpeed: 0.001,
    rotationAmount: 3,
    rotationSpeed: 0.0005,
    glowIntensity: 0.6,
    glowPulseSpeed: 0.002,
    orbitRingSpeed: 0.001,
    blinkInterval: 3000,
  },
  listening: {
    floatAmplitude: 4,
    floatSpeed: 0.002,
    rotationAmount: 8,
    rotationSpeed: 0.001,
    glowIntensity: 0.8,
    glowPulseSpeed: 0.003,
    orbitRingSpeed: 0.003,
    blinkInterval: 4000,
  },
  thinking: {
    floatAmplitude: 12,
    floatSpeed: 0.0005,
    rotationAmount: 5,
    rotationSpeed: 0.002,
    glowIntensity: 0.9,
    glowPulseSpeed: 0.001,
    orbitRingSpeed: 0.004,
    blinkInterval: 5000,
  },
  talking: {
    floatAmplitude: 6,
    floatSpeed: 0.0015,
    rotationAmount: 4,
    rotationSpeed: 0.001,
    glowIntensity: 1,
    glowPulseSpeed: 0.004,
    orbitRingSpeed: 0.002,
    blinkInterval: 3500,
  },
  reaction: {
    floatAmplitude: 15,
    floatSpeed: 0.003,
    rotationAmount: 10,
    rotationSpeed: 0.002,
    glowIntensity: 1.2,
    glowPulseSpeed: 0.005,
    orbitRingSpeed: 0.005,
    blinkInterval: 2000,
  },
}

export const REACTION_CONFIGS: Record<ReactionType, {
  duration: number
  colors: { primary: string; glow: string }
  extraAnimations?: string[]
}> = {
  happy: {
    duration: 1500,
    colors: { primary: '#FFD700', glow: '#FFF8DC' },
  },
  success: {
    duration: 1200,
    colors: { primary: '#7DD3FC', glow: '#E0F2FE' },
  },
  confused: {
    duration: 2000,
    colors: { primary: '#FCD34D', glow: '#FEF3C7' },
  },
  apology: {
    duration: 1800,
    colors: { primary: '#FDA4AF', glow: '#FEE2E2' },
  },
  greeting: {
    duration: 2000,
    colors: { primary: '#C4B5FD', glow: '#EDE9FE' },
  },
}

// Moon colors for different states
export const LUNA_COLORS = {
  primary: '#E8E4F0',
  secondary: '#C4B5FD',
  accent: '#A78BFA',
  glow: '#E9D5FF',
  shadow: '#4C1D95',
  orbitRing: '#DDD6FE',
} as const

// Viseme definitions for talking state
export const VISEMES = {
  closed: 0,
  slightlyOpen: 0.3,
  halfOpen: 0.6,
  fullyOpen: 1,
} as const
