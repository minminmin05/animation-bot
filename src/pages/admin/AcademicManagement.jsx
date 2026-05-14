import { useEffect, useState } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const AcademicManagement = () => {
  const [activeTab, setActiveTab] = useState('years')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Academic Years State
  const [academicYears, setAcademicYears] = useState([])
  const [showYearModal, setShowYearModal] = useState(false)
  const [yearFormData, setYearFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    status: 'upcoming'
  })

  // Semesters State
  const [semesters, setSemesters] = useState([])
  const [showSemesterModal, setShowSemesterModal] = useState(false)
  const [semesterFormData, setSemesterFormData] = useState({
    academic_year_id: '',
    name: '',
    sequence: 1,
    start_date: '',
    end_date: '',
    status: 'upcoming'
  })

  // Grade Levels State
  const [gradeLevels, setGradeLevels] = useState([])
  const [showGradeModal, setShowGradeModal] = useState(false)
  const [gradeFormData, setGradeFormData] = useState({
    level: '',
    name: '',
    section: '',
    min_age: '',
    max_age: ''
  })

  // Current Status
  const [currentYear, setCurrentYear] = useState(null)
  const [currentSemester, setCurrentSemester] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [yearsResult, semestersResult, gradesResult, currentYearResult, currentSemResult] = await Promise.all([
        supabase.from('academic_years').select('*').order('start_date', { ascending: false }),
        supabase.from('semesters').select('*, academic_years(name)').order('academic_year_id', { ascending: false }),
        supabase.from('grade_levels').select('*').order('level', { ascending: true }),
        supabase.from('academic_years').select('*').eq('is_current', true).single(),
        supabase.from('semesters').select('*').eq('is_current', true).single()
      ])

      if (yearsResult.data) setAcademicYears(yearsResult.data)
      if (semestersResult.data) setSemesters(semestersResult.data)
      if (gradesResult.data) setGradeLevels(gradesResult.data)
      if (currentYearResult.data) setCurrentYear(currentYearResult.data)
      if (currentSemResult.data) setCurrentSemester(currentSemResult.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Academic Year Functions
  const handleCreateYear = async (e) => {
    e.preventDefault()

    // Validate dates
    if (!yearFormData.start_date || !yearFormData.end_date) {
      alert('กรุณากรอกวันที่เริ่มและวันที่สิ้นสุด')
      return
    }

    if (new Date(yearFormData.end_date) <= new Date(yearFormData.start_date)) {
      alert('วันที่สิ้นสุดต้องอยู่หลังวันที่เริ่ม')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase.from('academic_years').insert([{
        name: yearFormData.name,
        start_date: yearFormData.start_date,
        end_date: yearFormData.end_date,
        status: yearFormData.status
      }])

      if (error) throw error

      await fetchData()
      setShowYearModal(false)
      setYearFormData({ name: '', start_date: '', end_date: '', status: 'upcoming' })
      alert('ปีการศึกษาถูกสร้างเรียบร้อย')
    } catch (error) {
      console.error('Error creating year:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSetCurrentYear = async (yearId) => {
    try {
      const { error } = await supabase.rpc('set_current_academic_period', {
        p_academic_year_id: yearId,
        p_semester_id: null
      })

      if (error) throw error

      await fetchData()
      alert('ตั้งค่าปีการศึกษาปัจจุบันเรียบร้อย')
    } catch (error) {
      console.error('Error setting current year:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
    }
  }

  const handleDeleteYear = async (id) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบปีการศึกษานี้?')) return

    try {
      const { error } = await supabase.from('academic_years').delete().eq('id', id)
      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error deleting year:', error)
      alert('ไม่สามารถลบได้ - อาจมีข้อมูลอื่นเชื่อมโยงอยู่')
    }
  }

  // Semester Functions
  const handleCreateSemester = async (e) => {
    e.preventDefault()

    // Validate dates
    if (!semesterFormData.start_date || !semesterFormData.end_date) {
      alert('กรุณากรอกวันที่เริ่มและวันที่สิ้นสุด')
      return
    }

    if (new Date(semesterFormData.end_date) <= new Date(semesterFormData.start_date)) {
      alert('วันที่สิ้นสุดต้องอยู่หลังวันที่เริ่ม')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase.from('semesters').insert([{
        academic_year_id: semesterFormData.academic_year_id,
        name: semesterFormData.name,
        sequence: semesterFormData.sequence,
        start_date: semesterFormData.start_date,
        end_date: semesterFormData.end_date,
        status: semesterFormData.status
      }])

      if (error) throw error

      await fetchData()
      setShowSemesterModal(false)
      setSemesterFormData({
        academic_year_id: '',
        name: '',
        sequence: 1,
        start_date: '',
        end_date: '',
        status: 'upcoming'
      })
      alert('ภาคเรียนถูกสร้างเรียบร้อย')
    } catch (error) {
      console.error('Error creating semester:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSetCurrentSemester = async (semesterId) => {
    try {
      const { error } = await supabase.rpc('set_current_academic_period', {
        p_academic_year_id: null,
        p_semester_id: semesterId
      })

      if (error) throw error

      await fetchData()
      alert('ตั้งค่าภาคเรียนปัจจุบันเรียบร้อย')
    } catch (error) {
      console.error('Error setting current semester:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
    }
  }

  const handleDeleteSemester = async (id) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบภาคเรียนนี้?')) return

    try {
      const { error } = await supabase.from('semesters').delete().eq('id', id)
      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error deleting semester:', error)
      alert('ไม่สามารถลบได้ - อาจมีข้อมูลอื่นเชื่อมโยงอยู่')
    }
  }

  // Grade Level Functions
  const handleCreateGrade = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase.from('grade_levels').insert([{
        level: parseInt(gradeFormData.level),
        name: gradeFormData.name,
        section: gradeFormData.section || null,
        min_age: gradeFormData.min_age ? parseInt(gradeFormData.min_age) : null,
        max_age: gradeFormData.max_age ? parseInt(gradeFormData.max_age) : null
      }])

      if (error) throw error

      await fetchData()
      setShowGradeModal(false)
      setGradeFormData({ level: '', name: '', section: '', min_age: '', max_age: '' })
      alert('ระดับชั้นถูกสร้างเรียบร้อย')
    } catch (error) {
      console.error('Error creating grade:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGrade = async (id) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบระดับชั้นนี้?')) return

    try {
      const { error } = await supabase.from('grade_levels').delete().eq('id', id)
      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error deleting grade:', error)
      alert('ไม่สามารถลบได้ - อาจมีข้อมูลอื่นเชื่อมโยงอยู่')
    }
  }

  // Status Badge Component
  const StatusBadge = ({ status }) => {
    const styles = {
      upcoming: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
    const labels = {
      upcoming: '即将开始',
      active: '进行中',
      completed: '已完成',
      archived: '已归档'
    }
    const thaiLabels = {
      upcoming: 'รอเริ่ม',
      active: 'กำลังดำเนินการ',
      completed: 'เสร็จสิ้น',
      archived: 'ถูกเก็บถาวร'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.upcoming}`}>
        {thaiLabels[status] || status}
      </span>
    )
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">การตั้งค่าทางการศึกษา</h1>
          <p className="text-gray-500 dark:text-gray-400">จัดการปีการศึกษา ภาคเรียน และระดับชั้น</p>
        </div>
        {(currentYear || currentSemester) && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <span className="text-green-600 dark:text-green-400 text-sm font-medium">
              ปัจจุบัน: {currentYear?.name} {currentSemester ? `/ ${currentSemester.name}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-8">
          {[
            { id: 'years', label: 'ปีการศึกษา', icon: '📅' },
            { id: 'semesters', label: 'ภาคเรียน', icon: '📚' },
            { id: 'grades', label: 'ระดับชั้น', icon: '🎓' }
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

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        {/* Academic Years Tab */}
        {activeTab === 'years' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ปีการศึกษาทั้งหมด</h2>
              <button
                onClick={() => setShowYearModal(true)}
                className="btn-primary"
              >
                + เพิ่มปีการศึกษา
              </button>
            </div>

            {academicYears.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📅</div>
                <p className="text-gray-500 dark:text-gray-400">ยังไม่มีปีการศึกษา</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">ชื่อ</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">วันที่เริ่ม-สิ้นสุด</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">สถานะ</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {academicYears.map((year) => (
                      <tr key={year.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">{year.name}</span>
                            {year.is_current && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full">
                                ปัจจุบัน
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(year.start_date).toLocaleDateString('th-TH')} - {new Date(year.end_date).toLocaleDateString('th-TH')}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={year.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!year.is_current && (
                              <button
                                onClick={() => handleSetCurrentYear(year.id)}
                                className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 rounded"
                              >
                                ตั้งเป็นปัจจุบัน
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteYear(year.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Semesters Tab */}
        {activeTab === 'semesters' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ภาคเรียนทั้งหมด</h2>
              <button
                onClick={() => setShowSemesterModal(true)}
                className="btn-primary"
              >
                + เพิ่มภาคเรียน
              </button>
            </div>

            {semesters.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📚</div>
                <p className="text-gray-500 dark:text-gray-400">ยังไม่มีภาคเรียน</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">ชื่อ</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">ปีการศึกษา</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">วันที่เริ่ม-สิ้นสุด</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">สถานะ</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semesters.map((semester) => (
                      <tr key={semester.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">{semester.name}</span>
                            <span className="text-xs text-gray-500">({semester.sequence})</span>
                            {semester.is_current && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full">
                                ปัจจุบัน
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {semester.academic_years?.name || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(semester.start_date).toLocaleDateString('th-TH')} - {new Date(semester.end_date).toLocaleDateString('th-TH')}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={semester.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!semester.is_current && (
                              <button
                                onClick={() => handleSetCurrentSemester(semester.id)}
                                className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 rounded"
                              >
                                ตั้งเป็นปัจจุบัน
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSemester(semester.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Grade Levels Tab */}
        {activeTab === 'grades' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ระดับชั้นทั้งหมด</h2>
              <button
                onClick={() => setShowGradeModal(true)}
                className="btn-primary"
              >
                + เพิ่มระดับชั้น
              </button>
            </div>

            {gradeLevels.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🎓</div>
                <p className="text-gray-500 dark:text-gray-400">ยังไม่มีระดับชั้น</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {gradeLevels.map((grade) => (
                  <div
                    key={grade.id}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{grade.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">ระดับ {grade.level}</p>
                        {grade.section && (
                          <p className="text-xs text-gray-400 mt-1">หมู่เรียน: {grade.section}</p>
                        )}
                        {(grade.min_age || grade.max_age) && (
                          <p className="text-xs text-gray-400 mt-1">
                            อายุ: {grade.min_age || '-'} - {grade.max_age || '-'} ปี
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteGrade(grade.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Year Modal */}
      {showYearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">เพิ่มปีการศึกษา</h2>
              <button onClick={() => setShowYearModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateYear} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ชื่อปีการศึกษา
                </label>
                <input
                  type="text"
                  required
                  value={yearFormData.name}
                  onChange={(e) => setYearFormData({ ...yearFormData, name: e.target.value })}
                  className="input-field"
                  placeholder="เช่น 2024-2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  วันที่เริ่ม
                </label>
                <input
                  type="date"
                  required
                  value={yearFormData.start_date}
                  onChange={(e) => setYearFormData({ ...yearFormData, start_date: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  วันที่สิ้นสุด
                </label>
                <input
                  type="date"
                  required
                  value={yearFormData.end_date}
                  onChange={(e) => setYearFormData({ ...yearFormData, end_date: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  สถานะเริ่มต้น
                </label>
                <select
                  value={yearFormData.status}
                  onChange={(e) => setYearFormData({ ...yearFormData, status: e.target.value })}
                  className="input-field"
                >
                  <option value="upcoming">รอเริ่ม</option>
                  <option value="active">กำลังดำเนินการ</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                <button type="button" onClick={() => setShowYearModal(false)} className="flex-1 btn-secondary">
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Semester Modal */}
      {showSemesterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">เพิ่มภาคเรียน</h2>
              <button onClick={() => setShowSemesterModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateSemester} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ปีการศึกษา *
                </label>
                <select
                  required
                  value={semesterFormData.academic_year_id}
                  onChange={(e) => setSemesterFormData({ ...semesterFormData, academic_year_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">-- เลือกปีการศึกษา --</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>{year.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ชื่อภาคเรียน
                </label>
                <select
                  required
                  value={semesterFormData.name}
                  onChange={(e) => setSemesterFormData({ ...semesterFormData, name: e.target.value })}
                  className="input-field"
                >
                  <option value="">-- เลือก --</option>
                  <option value="ภาคเรียนที่ 1">ภาคเรียนที่ 1 (ต้น)</option>
                  <option value="ภาคเรียนที่ 2">ภาคเรียนที่ 2 (ปลาย)</option>
                  <option value="ฤดูร้อน">ภาคฤดูร้อน</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ลำดับ
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={semesterFormData.sequence}
                  onChange={(e) => setSemesterFormData({ ...semesterFormData, sequence: parseInt(e.target.value) })}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    วันที่เริ่ม
                  </label>
                  <input
                    type="date"
                    required
                    value={semesterFormData.start_date}
                    onChange={(e) => setSemesterFormData({ ...semesterFormData, start_date: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    วันที่สิ้นสุด
                  </label>
                  <input
                    type="date"
                    required
                    value={semesterFormData.end_date}
                    onChange={(e) => setSemesterFormData({ ...semesterFormData, end_date: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                <button type="button" onClick={() => setShowSemesterModal(false)} className="flex-1 btn-secondary">
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Grade Modal */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">เพิ่มระดับชั้น</h2>
              <button onClick={() => setShowGradeModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateGrade} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ระดับชั้น *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={gradeFormData.level}
                    onChange={(e) => setGradeFormData({ ...gradeFormData, level: e.target.value })}
                    className="input-field"
                    placeholder="เช่น 1, 2, 3..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ชื่อระดับชั้น *
                  </label>
                  <input
                    type="text"
                    required
                    value={gradeFormData.name}
                    onChange={(e) => setGradeFormData({ ...gradeFormData, name: e.target.value })}
                    className="input-field"
                    placeholder="เช่น ประถมศึกษาปีที่ 1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  หมู่เรียน (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={gradeFormData.section}
                  onChange={(e) => setGradeFormData({ ...gradeFormData, section: e.target.value })}
                  className="input-field"
                  placeholder="เช่น ก, ข, ค หรือ A, B, C"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    อายุต่ำสุด (ถ้ามี)
                  </label>
                  <input
                    type="number"
                    value={gradeFormData.min_age}
                    onChange={(e) => setGradeFormData({ ...gradeFormData, min_age: e.target.value })}
                    className="input-field"
                    placeholder="ปี"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    อายุสูงสุด (ถ้ามี)
                  </label>
                  <input
                    type="number"
                    value={gradeFormData.max_age}
                    onChange={(e) => setGradeFormData({ ...gradeFormData, max_age: e.target.value })}
                    className="input-field"
                    placeholder="ปี"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                <button type="button" onClick={() => setShowGradeModal(false)} className="flex-1 btn-secondary">
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

export default AcademicManagement
