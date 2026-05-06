/**
 * Student Status Character Animation Configuration
 * 15 States with motion, color, speed, and intensity parameters
 */

export const emotionStates = {
  positive: {
    name: 'positive',
    displayName: 'เชิงบวก',
    description: 'มีพฤติกรรมดี กำลังเติบโตอย่างดี',
    colors: {
      primary: '#7d9a7c',
      bg: 'bg-sage/10',
      text: 'text-sage',
      border: 'border-sage/30'
    },
    motion: {
      type: 'smooth_bouncy',
      defaultIntensity: 0.6,
      duration: 0.8,
      ease: 'easeOut'
    },
    facial: {
      eyebrow: 'neutral_raised',
      eyes: 'open_happy',
      mouth: 'smile_gentle',
      blush: true
    },
    posture: {
      head: 'upright',
      shoulders: 'relaxed',
      arm: 'holding_bag'
    }
  },

  improving: {
    name: 'improving',
    displayName: 'กำลังพัฒนา',
    description: 'มีแนวโน้มดีขึ้น กำลังปรับปรุงตัวเอง',
    colors: {
      primary: '#3b82f6',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200'
    },
    motion: {
      type: 'gradual_rise',
      defaultIntensity: 0.5,
      duration: 0.6,
      ease: 'easeOutCubic'
    },
    facial: {
      eyebrow: 'slight_raise',
      eyes: 'looking_forward_hopeful',
      mouth: 'small_smile',
      blush: false
    },
    posture: {
      head: 'slight_forward_tilt',
      shoulders: 'back',
      arm: 'one_raised_slightly'
    }
  },

  excellent: {
    name: 'excellent',
    displayName: 'ยอดเยี่ยม',
    description: 'ผลงานดีเยี่ยม สุดยอด',
    colors: {
      primary: '#e07a5f',
      bg: 'bg-accent/10',
      text: 'text-accent',
      border: 'border-accent/30'
    },
    motion: {
      type: 'celebratory',
      defaultIntensity: 0.9,
      duration: 1.0,
      ease: 'easeOutElastic'
    },
    facial: {
      eyebrow: 'raised_high',
      eyes: 'sparkling',
      mouth: 'big_smile_teeth',
      blush: true
    },
    posture: {
      head: 'tilted_back',
      shoulders: 'back_proud',
      arm: 'victory_pose'
    }
  },

  neutral: {
    name: 'neutral',
    displayName: 'ปกติ',
    description: 'สถานะปกติ ไม่มีประเด็นพิเศษ',
    colors: {
      primary: '#6b7280',
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      border: 'border-gray-200'
    },
    motion: {
      type: 'idle',
      defaultIntensity: 0.1,
      duration: 2.0,
      ease: 'linear'
    },
    facial: {
      eyebrow: 'neutral',
      eyes: 'looking_straight',
      mouth: 'closed',
      blush: false
    },
    posture: {
      head: 'level',
      shoulders: 'level',
      arm: 'sides'
    }
  },

  informative: {
    name: 'informative',
    displayName: 'แจ้งเตือน',
    description: 'แจ้งเตือนข้อมูลทั่วไป',
    colors: {
      primary: '#6366f1',
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-200'
    },
    motion: {
      type: 'gentle_informative',
      defaultIntensity: 0.4,
      duration: 1.2,
      ease: 'easeInOut'
    },
    facial: {
      eyebrow: 'slight_furrow',
      eyes: 'focused',
      mouth: 'small_open_speaking',
      blush: false
    },
    posture: {
      head: 'slight_turn',
      shoulders: 'level',
      arm: 'pointing_forward'
    }
  },

  stable: {
    name: 'stable',
    displayName: 'มั่นคง',
    description: 'ผลงานคงที่ ไม่ผันผวน',
    colors: {
      primary: '#14b8a6',
      bg: 'bg-teal-50',
      text: 'text-teal-600',
      border: 'border-teal-200'
    },
    motion: {
      type: 'steady',
      defaultIntensity: 0.2,
      duration: 1.5,
      ease: 'linear'
    },
    facial: {
      eyebrow: 'neutral',
      eyes: 'confident',
      mouth: 'gentle_smile',
      blush: false
    },
    posture: {
      head: 'upright',
      shoulders: 'square',
      arm: 'crossed_chest'
    }
  },

  warning: {
    name: 'warning',
    displayName: 'คำเตือน',
    description: 'มีเครื่องหมายเตือน ต้องระวัง',
    colors: {
      primary: '#f4a261',
      bg: 'bg-gold/10',
      text: 'text-gold',
      border: 'border-gold/30'
    },
    motion: {
      type: 'hesitant',
      defaultIntensity: 0.5,
      duration: 0.5,
      ease: 'easeInOut'
    },
    facial: {
      eyebrow: 'furrowed',
      eyes: 'concerned',
      mouth: 'slight_frown',
      blush: false
    },
    posture: {
      head: 'slight_tilt',
      shoulders: 'one_shrugged',
      arm: 'hand_on_shoulder'
    }
  },

  declining: {
    name: 'declining',
    displayName: 'ลดลง',
    description: 'ผลงานแย่ลง กำลังลดลง',
    colors: {
      primary: '#f97316',
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      border: 'border-orange-200'
    },
    motion: {
      type: 'slow_heavy',
      defaultIntensity: 0.6,
      duration: 1.0,
      ease: 'easeIn'
    },
    facial: {
      eyebrow: 'sad_drooped',
      eyes: 'looking_down',
      mouth: 'frown',
      blush: false
    },
    posture: {
      head: 'bowed',
      shoulders: 'slumped',
      arm: 'hanging_loose'
    }
  },

  at_risk: {
    name: 'at_risk',
    displayName: 'เสี่ยง',
    description: 'มีความเสี่ยงสูง ต้องการความช่วยเหลือ',
    colors: {
      primary: '#ef4444',
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-200'
    },
    motion: {
      type: 'trembling',
      defaultIntensity: 0.7,
      duration: 0.3,
      ease: 'easeInOut'
    },
    facial: {
      eyebrow: 'worried_high',
      eyes: 'wide_worried',
      mouth: 'slight_open',
      blush: false
    },
    posture: {
      head: 'down_tense',
      shoulders: 'hunched_high',
      arm: 'clenched_fists'
    }
  },

  critical: {
    name: 'critical',
    displayName: 'วิกฤติ',
    description: 'สถานการณ์วิกฤติ ต้องดำเนินการทันที',
    colors: {
      primary: '#ff6b6b',
      bg: 'bg-coral/10',
      text: 'text-coral',
      border: 'border-coral'
    },
    motion: {
      type: 'panicked',
      defaultIntensity: 1.0,
      duration: 0.15,
      ease: 'linear'
    },
    facial: {
      eyebrow: 'panicked_high',
      eyes: 'wide_tearful',
      mouth: 'wide_open',
      blush: false
    },
    posture: {
      head: 'bowed_low',
      shoulders: 'raised_tense',
      arm: 'covering_face'
    }
  },

  urgent: {
    name: 'urgent',
    displayName: 'เร่งด่วน',
    description: 'ต้องการความสนใจทันที',
    colors: {
      primary: '#dc2626',
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-300'
    },
    motion: {
      type: 'urgent',
      defaultIntensity: 0.8,
      duration: 0.2,
      ease: 'easeOut'
    },
    facial: {
      eyebrow: 'furrowed_intense',
      eyes: 'wide_urgent',
      mouth: 'firm_line',
      blush: false
    },
    posture: {
      head: 'forward_lean',
      shoulders: 'forward',
      arm: 'pointing_urgent'
    }
  },

  needs_attention: {
    name: 'needs_attention',
    displayName: 'ต้องการความสนใจ',
    description: 'ต้องการความช่วยเหลือ/ความสนใจ',
    colors: {
      primary: '#a855f7',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-200'
    },
    motion: {
      type: 'inquisitive',
      defaultIntensity: 0.5,
      duration: 0.7,
      ease: 'easeInOut'
    },
    facial: {
      eyebrow: 'one_raised',
      eyes: 'looking_curious',
      mouth: 'small_open',
      blush: false
    },
    posture: {
      head: 'turned',
      shoulders: 'one_raised',
      arm: 'hand_raised_question'
    }
  },

  insufficient_data: {
    name: 'insufficient_data',
    displayName: 'ข้อมูลไม่เพียงพอ',
    description: 'ไม่มีข้อมูลเพียงพอในการประเมิน',
    colors: {
      primary: '#9ca3af',
      bg: 'bg-gray-50',
      text: 'text-gray-500',
      border: 'border-gray-200'
    },
    motion: {
      type: 'questioning',
      defaultIntensity: 0.4,
      duration: 0.9,
      ease: 'easeInOut'
    },
    facial: {
      eyebrow: 'furrowed_apart',
      eyes: 'looking_confused',
      mouth: 'flat_confused',
      blush: false
    },
    posture: {
      head: 'tilted_question',
      shoulders: 'uneven',
      arm: 'scratching_head'
    }
  },

  anomaly: {
    name: 'anomaly',
    displayName: 'ผิดปกติ',
    description: 'มีบางอย่างผิดปกติ นอกเหนือจากที่คาด',
    colors: {
      primary: '#ec4899',
      bg: 'bg-pink-50',
      text: 'text-pink-600',
      border: 'border-pink-200'
    },
    motion: {
      type: 'confused',
      defaultIntensity: 0.6,
      duration: 1.2,
      ease: 'easeOutBack'
    },
    facial: {
      eyebrow: 'asymmetric_figure8',
      eyes: 'looking_sideways',
      mouth: 'crooked',
      blush: false
    },
    posture: {
      head: 'tilted_45deg',
      shoulders: 'shrugged_both',
      arm: 'both_raised_palms'
    }
  },

  inconsistent: {
    name: 'inconsistent',
    displayName: 'ไม่สม่ำเสมอ',
    description: 'ผลงานไม่สม่ำเสมอ ผันผวน',
    colors: {
      primary: '#d97706',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-200'
    },
    motion: {
      type: 'unpredictable',
      defaultIntensity: 0.5,
      duration: 0.4,
      ease: 'easeInOutQuad'
    },
    facial: {
      eyebrow: 'asymmetric_one_up_one_down',
      eyes: 'looking_away',
      mouth: 'half_smile_half_frown',
      blush: false
    },
    posture: {
      head: 'tilted_irregular',
      shoulders: 'uneven_high_low',
      arm: 'one_in_pocket_one_out'
    }
  }
}

/**
 * Animation presets for framer-motion
 */
export const getAnimationPreset = (state, intensity = 0.5) => {
  const config = emotionStates[state]
  if (!config) return null

  const i = intensity
  const { motion } = config

  switch (motion.type) {
    case 'smooth_bouncy':
      return {
        initial: { scale: 0.9, opacity: 0 },
        animate: {
          scale: [0.9, 1 + i * 0.05, 1],
          opacity: 1,
          y: [0, -i * 8, 0]
        },
        transition: { duration: motion.duration, ease: motion.ease, repeat: Infinity, repeatDelay: 1 }
      }

    case 'gradual_rise':
      return {
        initial: { scale: 0.95, opacity: 0, y: 10 },
        animate: {
          scale: 1,
          opacity: 1,
          y: 0
        },
        transition: { duration: motion.duration, ease: motion.ease }
      }

    case 'celebratory':
      return {
        initial: { scale: 0, rotate: -10, opacity: 0 },
        animate: {
          scale: [0, 1 + i * 0.15, 1],
          rotate: [-10, i * 10, 0],
          y: [0, -i * 12, 0]
        },
        transition: { duration: motion.duration, ease: motion.ease }
      }

    case 'idle':
      return {
        animate: {
          y: [0, -1, 0]
        },
        transition: { duration: motion.duration, ease: 'easeInOut', repeat: Infinity }
      }

    case 'gentle_informative':
      return {
        animate: {
          rotate: [0, -3, 3, -3, 0],
          x: [0, 2, 0]
        },
        transition: { duration: motion.duration, ease: motion.ease, repeat: Infinity }
      }

    case 'steady':
      return {
        animate: {
          scale: [1, 1.01, 1]
        },
        transition: { duration: motion.duration, ease: 'easeInOut', repeat: Infinity }
      }

    case 'hesitant':
      return {
        animate: {
          x: [0, -3, 3, -3, 0],
          rotate: [0, -2, 2, -2, 0]
        },
        transition: { duration: motion.duration, ease: motion.ease, repeat: Infinity }
      }

    case 'slow_heavy':
      return {
        animate: {
          y: [0, i * 5, 0],
          scale: [1, 0.98, 1]
        },
        transition: { duration: motion.duration, ease: motion.ease, repeat: Infinity }
      }

    case 'trembling':
      return {
        animate: {
          x: [0, -i * 2, i * 2, -i * 2, i * 2, 0],
          y: [0, i * 1, 0, i * 1, 0],
          scale: [1, 1 + i * 0.02, 1]
        },
        transition: { duration: motion.duration, ease: motion.ease, repeat: Infinity }
      }

    case 'panicked':
      return {
        animate: {
          x: [0, -i * 4, i * 4, -i * 4, i * 4, 0],
          y: [0, i * 2, -i * 2, i * 2, 0],
          scale: [1, 1.05, 0.98, 1.03, 1],
          rotate: [0, -3, 3, -2, 0]
        },
        transition: { duration: motion.duration, ease: motion.ease, repeat: Infinity }
      }

    case 'urgent':
      return {
        animate: {
          x: [0, i * 6, 0],
          y: [0, -i * 2, 0],
          rotate: [0, i * 3, 0]
        },
        transition: { duration: motion.duration, ease: motion.ease, repeat: Infinity }
      }

    case 'inquisitive':
      return {
        animate: {
          rotate: [0, -8, 8, -8, 0],
          y: [0, -i * 3, 0]
        },
        transition: { duration: motion.duration, ease: motion.ease, repeat: Infinity }
      }

    case 'questioning':
      return {
        animate: {
          rotate: [0, 5, -5, 0],
          y: [0, -i * 2, 0],
          x: [0, i * 2, 0]
        },
        transition: { duration: motion.duration, ease: motion.ease, repeat: Infinity }
      }

    case 'confused':
      return {
        animate: {
          rotate: [0, -15, 15, -15, 0],
          x: [0, i * 3, 0]
        },
        transition: { duration: motion.duration, ease: motion.ease, repeat: Infinity }
      }

    case 'unpredictable':
      return {
        animate: {
          rotate: [-2, 2, -2, 3, -3, 0],
          x: [0, i * 4, -i * 2, i * 3, 0],
          y: [0, -i * 2, i * 1, 0]
        },
        transition: { duration: motion.duration, ease: motion.ease, repeat: Infinity }
      }

    default:
      return {
        animate: { scale: 1 },
        transition: { duration: 0.3 }
      }
  }
}

/**
 * Get facial expression SVG paths based on state
 */
export const getFacialExpression = (state) => {
  const config = emotionStates[state]
  if (!config) return neutralExpression

  switch (config.facial.mouth) {
    case 'smile_gentle':
      return {
        mouth: 'M 25 35 Q 32 40 39 35',
        eyes: { left: 'M 20 28 Q 24 26 28 28', right: 'M 36 28 Q 40 26 44 28' },
        eyebrow: { left: 'M 18 22 L 28 24', right: 'M 36 24 L 46 22' }
      }
    case 'big_smile_teeth':
      return {
        mouth: 'M 22 35 Q 32 45 42 35 L 40 38 Q 32 42 24 38 Z',
        eyes: { left: 'M 20 26 Q 24 23 28 26', right: 'M 36 26 Q 40 23 44 26' },
        eyebrow: { left: 'M 16 20 L 28 22', right: 'M 36 22 L 48 20' }
      }
    case 'frown':
      return {
        mouth: 'M 25 38 Q 32 34 39 38',
        eyes: { left: 'M 20 28 Q 24 26 28 28', right: 'M 36 28 Q 40 26 44 28' },
        eyebrow: { left: 'M 18 20 L 28 24', right: 'M 36 24 L 46 20' }
      }
    case 'wide_open':
      return {
        mouth: 'M 28 35 L 28 42 L 36 42 L 36 35 Z',
        eyes: { left: 'M 18 26 A 6 6 0 1 1 30 26', right: 'M 34 26 A 6 6 0 1 1 46 26' },
        eyebrow: { left: 'M 14 18 L 28 16', right: 'M 36 16 L 50 18' }
      }
    case 'slight_frown':
      return {
        mouth: 'M 26 36 Q 32 34 38 36',
        eyes: { left: 'M 20 28 Q 24 27 28 28', right: 'M 36 28 Q 40 27 44 28' },
        eyebrow: { left: 'M 18 22 L 28 24', right: 'M 36 24 L 46 22' }
      }
    case 'small_open_speaking':
      return {
        mouth: 'M 28 36 Q 32 40 36 36',
        eyes: { left: 'M 20 28 Q 24 26 28 28', right: 'M 36 28 Q 40 26 44 28' },
        eyebrow: { left: 'M 18 23 L 28 23', right: 'M 36 23 L 46 23' }
      }
    case 'crooked':
      return {
        mouth: 'M 24 36 L 32 38 L 40 34',
        eyes: { left: 'M 20 28 Q 24 27 28 28', right: 'M 36 26 Q 40 29 44 26' },
        eyebrow: { left: 'M 18 20 L 28 24', right: 'M 36 22 L 46 20' }
      }
    case 'flat_confused':
      return {
        mouth: 'M 26 37 L 38 37',
        eyes: { left: 'M 20 28 Q 24 26 28 28', right: 'M 36 28 Q 40 26 44 28' },
        eyebrow: { left: 'M 16 22 L 28 20', right: 'M 36 20 L 48 22' }
      }
    case 'half_smile_half_frown':
      return {
        mouth: 'M 24 36 Q 28 38 32 36 Q 36 34 40 36',
        eyes: { left: 'M 20 28 Q 24 26 28 28', right: 'M 36 28 Q 40 27 44 28' },
        eyebrow: { left: 'M 18 22 L 28 24', right: 'M 36 24 L 46 22' }
      }
    case 'firm_line':
      return {
        mouth: 'M 26 37 L 38 37',
        eyes: { left: 'M 20 26 A 5 5 0 1 1 30 26', right: 'M 34 26 A 5 5 0 1 1 44 26' },
        eyebrow: { left: 'M 18 20 L 28 22', right: 'M 36 22 L 46 20' }
      }
    case 'small_smile':
      return {
        mouth: 'M 27 36 Q 32 38 37 36',
        eyes: { left: 'M 20 28 Q 24 27 28 28', right: 'M 36 28 Q 40 27 44 28' },
        eyebrow: { left: 'M 18 22 L 28 23', right: 'M 36 23 L 46 22' }
      }
    case 'gentle_smile':
      return {
        mouth: 'M 26 36 Q 32 38 38 36',
        eyes: { left: 'M 20 28 Q 24 27 28 28', right: 'M 36 28 Q 40 27 44 28' },
        eyebrow: { left: 'M 18 22 L 28 23', right: 'M 36 23 L 46 22' }
      }
    default:
      return neutralExpression
  }
}

const neutralExpression = {
  mouth: 'M 26 36 L 38 36',
  eyes: { left: 'M 20 28 Q 24 27 28 28', right: 'M 36 28 Q 40 27 44 28' },
  eyebrow: { left: 'M 18 22 L 28 22', right: 'M 36 22 L 46 22' }
}

export default emotionStates
