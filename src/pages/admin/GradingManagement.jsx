import { useEffect, useState } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const GradingManagement = () => {
  const [activeTab, setActiveTab] = useState('scales')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Grading Scales State
  const [gradingScales, setGradingScales] = useState([])
  const [selectedScale, setSelectedScale] = useState(null)
  const [letterGrades, setLetterGrades] = useState([])

  // Grade Categories State
  const [gradeCategories, setGradeCategories] = useState([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [categoryFormData, setCategoryFormData] = useState({
    class_section_id: '',
    name: '',
    weight: '',
    drop_lowest: 0,
    color: '#3B82F6'
  })

  // Classes for dropdown
  const [classes, setClasses] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [scalesResult, categoriesResult, classesResult] = await Promise.all([
        supabase.from('grading_scales').select('*').order('is_default', { ascending: false }),
        supabase.from('grade_categories').select('*, class_sections(name, code)').order('class_section_id, sequence'),
        supabase.from('class_sections').select('id, name, code').order('name')
      ])

      if (scalesResult.data) {
        setGradingScales(scalesResult.data)
        if (scalesResult.data.length > 0) {
          await fetchLetterGrades(scalesResult.data[0].id)
          setSelectedScale(scalesResult.data[0])
        }
      }
      if (categoriesResult.data) setGradeCategories(categoriesResult.data)
      if (classesResult.data) setClasses(classesResult.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLetterGrades = async (scaleId) => {
    try {
      const { data } = await supabase
        .from('grade_letter_definitions')
        .select('*')
        .eq('grading_scale_id', scaleId)
        .order('min_percentage', { ascending: false })

      if (data) setLetterGrades(data)
    } catch (error) {
      console.error('Error fetching letter grades:', error)
    }
  }

  const handleScaleChange = async (scaleId) => {
    const scale = gradingScales.find(s => s.id === scaleId)
    setSelectedScale(scale)
    await fetchLetterGrades(scaleId)
  }

  const handleSetDefaultScale = async (scaleId) => {
    try {
      // Unset all defaults
      await supabase.from('grading_scales').update({ is_default: false }).neq('id', scaleId)
      // Set new default
      await supabase.from('grading_scales').update({ is_default: true }).eq('id', scaleId)
      await fetchData()
      alert('ตั้งค่าเรียบร้อย')
    } catch (error) {
      console.error('Error setting default scale:', error)
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase.from('grade_categories').insert([{
        class_section_id: categoryFormData.class_section_id || null,
        name: categoryFormData.name,
        weight: parseFloat(categoryFormData.weight),
        drop_lowest: categoryFormData.drop_lowest,
        color: categoryFormData.color
      }])

      if (error) throw error

      await fetchData()
      setShowCategoryModal(false)
      setCategoryFormData({
        class_section_id: '',
        name: '',
        weight: '',
        drop_lowest: 0,
        color: '#3B82F6'
      })
      alert('สร้างหมวดหมู่เกรดสำเร็จ')
    } catch (error) {
      console.error('Error creating category:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (id) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่นี้?')) return

    try {
      const { error } = await supabase.from('grade_categories').delete().eq('id', id)
      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('ไม่สามารถลบได้ - อาจมีข้อมูลอื่นเชื่อมโยงอยู่')
    }
  }

  const getLetterGradeColor = (letter) => {
    if (letter.startsWith('A') || letter === '4') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    if (letter.startsWith('B') || letter === '3.5') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    if (letter.startsWith('C') || letter === '3') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    if (letter.startsWith('D') || letter === '2') return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    if (letter === 'F' || letter === '0') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    return 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">การตั้งค่าการให้เกรด</h1>
        <p className="text-gray-500 dark:text-gray-400">จัดการเกณฑ์การให้เกรดและหมวดหมู่งาน</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-8">
          {[
            { id: 'scales', label: 'เกณฑ์การให้เกรด', icon: '📊' },
            { id: 'categories', label: 'หมวดหมู่งาน', icon: '📁' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Grading Scales Tab */}
      {activeTab === 'scales' && (
        <div className="space-y-6">
          {/* Scale Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">เลือกเกณฑ์การให้เกรด</h2>
            <div className="flex flex-wrap gap-3">
              {gradingScales.map((scale) => (
                <button
                  key={scale.id}
                  onClick={() => handleScaleChange(scale.id)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    selectedScale?.id === scale.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{scale.name}</span>
                    {scale.is_default && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full">
                        ค่าเริ่มต้น
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{scale.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Letter Grade Table */}
          {selectedScale && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  ระดับคะแนน - {selectedScale.name}
                </h2>
                {!selectedScale.is_default && (
                  <button
                    onClick={() => handleSetDefaultScale(selectedScale.id)}
                    className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 rounded"
                  >
                    ตั้งเป็นค่าเริ่มต้น
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">เกรด</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">ชื่อ</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">ช่วงคะแนน</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">GPA</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">ผ่าน/ไม่ผ่าน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {letterGrades.map((grade) => (
                      <tr key={grade.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-lg font-bold ${getLetterGradeColor(grade.letter)}`}>
                            {grade.letter}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white">{grade.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {grade.min_percentage.toFixed(2)}% - {grade.max_percentage.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {grade.gpa_value?.toFixed(2) || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {grade.is_passing ? (
                            <span className="text-green-600 dark:text-green-400">✓ ผ่าน</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">✗ ไม่ผ่าน</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grade Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">หมวดหมู่งาน</h2>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="btn-primary"
            >
              + เพิ่มหมวดหมู่
            </button>
          </div>

          {gradeCategories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📁</div>
              <p className="text-gray-500 dark:text-gray-400">ยังไม่มีหมวดหมู่งาน</p>
            </div>
          ) : (
            <div className="space-y-4">
              {gradeCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: category.color || '#3B82F6' }}
                    />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{category.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {category.class_sections?.name || 'ทุกห้องเรียน'} • น้ำหนัก {category.weight}%
                        {category.drop_lowest > 0 && ` • ลบคะแนนต่ำสุด ${category.drop_lowest} ครั้ง`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">เพิ่มหมวดหมู่งาน</h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  วิชา/ห้องเรียน (ถ้ามี)
                </label>
                <select
                  value={categoryFormData.class_section_id}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, class_section_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">-- ทุกวิชา --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name} ({cls.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ชื่อหมวดหมู่ *
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="input-field"
                  placeholder="เช่น การบ้าน, สอบปลายภาค, โปรเจกต์"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    น้ำหนัก (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    value={categoryFormData.weight}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, weight: e.target.value })}
                    className="input-field"
                    placeholder="เช่น 20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ลบคะแนนต่ำสุด
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={categoryFormData.drop_lowest}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, drop_lowest: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  สี (สำหรับแสดงผล)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={categoryFormData.color}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">{categoryFormData.color}</span>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                <button type="button" onClick={() => setShowCategoryModal(false)} className="flex-1 btn-secondary">
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default GradingManagement
