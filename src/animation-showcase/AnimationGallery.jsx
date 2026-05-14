/**
 * AnimationGallery - Grid display of all emotion states
 * Hover interaction for enhanced preview
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import EmotionCharacter from './EmotionCharacter'
import { emotionStates } from './emotionConfig'

const AnimationGallery = ({ onStateClick }) => {
  const [hoveredState, setHoveredState] = useState(null)

  return (
    <div className="w-full">
      {/* Gallery Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-display font-semibold text-navy">
            แกลเลอรีสถานะทั้งหมด
          </h3>
          <p className="text-sm text-text-muted">
            15 สถานะ • คลิกเพื่อดูรายละเอียด
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {Object.values(emotionStates).map((state, index) => (
          <motion.div
            key={state.name}
            className="card group cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.03 }}
            onClick={() => onStateClick?.(state.name)}
            onHoverStart={() => setHoveredState(state.name)}
            onHoverEnd={() => setHoveredState(null)}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="p-4">
              {/* Character Preview */}
              <div className="flex justify-center mb-3">
                <EmotionCharacter
                  state={state.name}
                  intensity={hoveredState === state.name ? 1 : 0.5}
                  size="md"
                />
              </div>

              {/* State Info */}
              <div className="text-center">
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border-2 mb-2 ${state.bg} ${state.text} ${state.border}`}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: state.colors.primary }}
                  />
                  {state.displayName}
                </div>

                {/* Description - Show on Hover */}
                <motion.p
                  className="text-xs text-text-muted h-8 overflow-hidden"
                  initial={{ height: 32 }}
                  animate={{
                    height: hoveredState === state.name ? 'auto' : 32,
                    opacity: hoveredState === state.name ? 1 : 0.7
                  }}
                >
                  {state.description}
                </motion.p>

                {/* English Name */}
                <p className="text-[10px] text-text-muted/60 mt-1">
                  {state.name}
                </p>
              </div>
            </div>

            {/* Hover Border Effect */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl"
              style={{ backgroundColor: state.colors.primary }}
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 p-3 bg-cream/50 rounded-xl">
        <p className="text-xs text-text-muted text-center">
          <span className="font-medium text-navy">เคล็ดลับ:</span>{' '}
          เมื่อวางเมาส์เหนือการ์ด แอนิเมชันจะแสดงเต็มความเข้ม
        </p>
      </div>
    </div>
  )
}

export default AnimationGallery
