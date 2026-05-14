/**
 * Animation Showcase - Entry Page
 * Displays both gallery and preview components
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import AnimationGallery from './AnimationGallery'
import AnimationPreview from './AnimationPreview'
import { BookOpen } from 'lucide-react'

const AnimationShowcase = () => {
  const [selectedState, setSelectedState] = useState('positive')
  const [showPreview, setShowPreview] = useState(false)

  const handleStateClick = (stateName) => {
    setSelectedState(stateName)
    setShowPreview(true)
    // Scroll to preview
    setTimeout(() => {
      document.getElementById('preview-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }, 100)
  }

  return (
    <div className="min-h-screen bg-cream bg-dots p-4 lg:p-8">
      {/* Header */}
      <motion.div
        className="max-w-7xl mx-auto mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-navy rounded-2xl flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-navy">
              น้อน้อย - ตัวละครแสดงสถานะนักเรียน
            </h1>
            <p className="text-text-secondary mt-1">
              Student Status Character Animation Showcase
            </p>
          </div>
        </div>

        <p className="text-text-muted max-w-2xl">
          ระบบแอนิเมชันตัวละครสำหรับแสดง 15 สถานะของนักเรียน ออกแบบด้วยสไตล์ Modern Cartoon
          ที่เป็นมิตรและเหมาะสำหรับใช้ในโรงเรียน
        </p>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gallery - Takes 2 columns */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <AnimationGallery onStateClick={handleStateClick} />
        </motion.div>

        {/* Preview Sidebar */}
        <motion.div
          className="lg:col-span-1"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div id="preview-section" className="sticky top-4">
            <AnimationPreview />
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        className="max-w-7xl mx-auto mt-12 text-center text-sm text-text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <p>
          Animation Showcase • Built with Framer Motion • Lumaid Design System
        </p>
      </motion.footer>
    </div>
  )
}

export default AnimationShowcase
