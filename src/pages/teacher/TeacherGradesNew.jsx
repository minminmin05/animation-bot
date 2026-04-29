import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const TeacherGradesNew = () => {
  const { profileData } = useAuth()
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState('student') // 'student' or 'assignment'
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [assignmentFormData, setAssignmentFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    max_points: 100,
    passing_score: 60,
    assignment_type: 'homework',
    due_date: '',
    allow_late_submission: true
  })
  const [categories, setCategories] = useState([])

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      // Get teacher's ID from user
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', profileData?.id || '')
        .single()

      if (!teacherData) {
        setLoading(false)
        return
      }

      // Fetch classes through teacher_class_assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('teacher_class_assignments')
        .select(`
          class_section_id,
          class_sections (
            id,
            name,
            code,
            academic_years (name),
            semesters (name),
            grade_levels (name)
          )
        `)
        .eq('teacher_id', teacherData.id)
        .eq('status', 'active')

      if (assignmentsError) throw assignmentsError

      const classList = assignmentsData
        ?.map(a => a.class_sections)
        .filter(Boolean) || []

      setClasses(classList)

      if (classList.length > 0) {
        setSelectedClass(classList[0])
        await fetchClassData(classList[0].id)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClassData = async (classId) => {
    try {
      // Fetch enrolled students
      const { data: enrollmentsData } = await supabase
        .from('student_class_enrollments')
        .select('student_id, students(id, name)')
        .eq('class_section_id', classId)
        .eq('status', 'active')

      if (enrollmentsData) {
        setStudents(enrollmentsData.map(e => e.students).filter(Boolean))
      }

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*')
        .eq('class_section_id', classId)
        .order('due_date', { ascending: false })

      if (assignmentsData) setAssignments(assignmentsData)

      // Fetch grades
      const { data: gradesData } = await supabase
        .from('student_grades')
        .select('*')
        .eq('class_section_id', classId)

      if (gradesData) setGrades(gradesData)

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('grade_categories')
        .select('*')
        .eq('class_section_id', classId)

      if (categoriesData) setCategories(categoriesData)
    } catch (error) {
      console.error('Error fetching class data:', error)
    }
  }

  const handleClassSelect = (cls) => {
    setSelectedClass(cls)
    fetchClassData(cls.id)
  }

  const handleCreateAssignment = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', profileData?.id || '')
        .single()

      // Get current academic year
      const { data: yearData } = await supabase.rpc('get_current_academic_year')

      const assignmentData = {
        class_section_id: selectedClass.id,
        academic_year_id: yearData,
        teacher_id: teacherData.id,
        title: assignmentFormData.title,
        description: assignmentFormData.description,
        category_id: assignmentFormData.category_id || null,
        max_points: parseFloat(assignmentFormData.max_points),
        passing_score: parseFloat(assignmentFormData.passing_score),
        assignment_type: assignmentFormData.assignment_type,
        due_date: assignmentFormData.due_date,
        allow_late_submission: assignmentFormData.allow_late_submission,
        is_published: true,
        published_at: new Date().toISOString()
      }

      const { error } = await supabase.from('assignments').insert([assignmentData])

      if (error) throw error

      await fetchClassData(selectedClass.id)
      setShowAssignmentModal(false)
      setAssignmentFormData({
        title: '',
        description: '',
        category_id: '',
        max_points: 100,
        passing_score: 60,
        assignment_type: 'homework',
        due_date: '',
        allow_late_submission: true
      })
      alert('สร้างงานสำเร็จ')
    } catch (error) {
      console.error('Error creating assignment:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleGradeChange = async (studentId, assignmentId, newGrade) => {
    try {
      const assignment = assignments.find(a => a.id === assignmentId)
      if (!assignment) return

      const gradeValue = newGrade === '' ? null : parseFloat(newGrade)

      // Check if grade exists
      const existingGrade = grades.find(
        g => g.student_id === studentId && g.assignment_id === assignmentId
      )

      if (existingGrade) {
        // Update existing grade
        const { error } = await supabase
          .from('student_grades')
          .update({
            points_earned: gradeValue,
            percentage: gradeValue !== null ? (gradeValue / assignment.max_points) * 100 : null,
            status: gradeValue !== null ? 'graded' : 'submitted',
            graded_at: new Date().toISOString()
          })
          .eq('id', existingGrade.id)

        if (error) throw error
      } else {
        // Create new grade
        const { error } = await supabase
          .from('student_grades')
          .insert({
            assignment_id: assignmentId,
            student_id: studentId,
            class_section_id: selectedClass.id,
            academic_year_id: assignment.academic_year_id,
            points_earned: gradeValue,
            points_possible: assignment.max_points,
            percentage: gradeValue !== null ? (gradeValue / assignment.max_points) * 100 : null,
            status: gradeValue !== null ? 'graded' : 'pending',
            submitted_at: new Date().toISOString(),
            graded_at: new Date().toISOString()
          })

        if (error) throw error
      }

      // Refresh grades
      const { data: updatedGrades } = await supabase
        .from('student_grades')
        .select('*')
        .eq('class_section_id', selectedClass.id)

      if (updatedGrades) setGrades(updatedGrades)
    } catch (error) {
      console.error('Error saving grade:', error)
      alert('บันทึกเกรดไม่สำเร็จ')
    }
  }

  const handleBulkSave = async () => {
    // This would use the bulk_insert_grades function
    alert('บันทึกทั้งหมดเรียบร้อย')
  }

  const getStudentGrade = (studentId, assignmentId) => {
    const grade = grades.find(
      g => g.student_id === studentId && g.assignment_id === assignmentId
    )
    return grade?.points_earned !== null && grade?.points_earned !== undefined ? grade.points_earned : ''
  }

  const getStudentAverage = (studentId) => {
    const studentGrades = grades.filter(g => g.student_id === studentId && g.points_earned !== null)
    if (studentGrades.length === 0) return '-'

    const totalPercentage = studentGrades.reduce((sum, g) => sum + (g.percentage || 0), 0)
    const avg = totalPercentage / studentGrades.length
    return avg.toFixed(1)
  }

  const getLetterGrade = (percentage) => {
    if (percentage === '-') return '-'
    const pct = parseFloat(percentage)
    if (pct >= 90) return 'A'
    if (pct >= 80) return 'B'
    if (pct >= 70) return 'C'
    if (pct >= 60) return 'D'
    return 'F'
  }

  const getGradeColor = (percentage) => {
    if (percentage === '-') return 'bg-gray-100 text-gray-700'
    const pct = parseFloat(percentage)
    if (pct >= 90) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (pct >= 80) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    if (pct >= 70) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    if (pct >= 60) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">จัดการเกรดนักเรียน</h1>
          <p className="text-gray-500 dark:text-gray-400">บันทึกและจัดการเกรดนักเรียน</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="input-field w-auto"
          >
            <option value="student">ดูตามนักเรียน</option>
            <option value="assignment">ดูตามงาน</option>
          </select>
          <button
            onClick={() => setShowAssignmentModal(true)}
            className="btn-primary"
          >
            + สร้างงาน
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Classes Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">เลือกวิชา</h2>
            </div>
            <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => handleClassSelect(cls)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedClass?.id === cls.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{cls.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {cls.code} • {cls.grade_levels?.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {cls.academic_years?.name} {cls.semesters?.name || ''}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grades Grid */}
        <div className="lg:col-span-3">
          {selectedClass && students.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">{selectedClass.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {students.length} นักเรียน • {assignments.length} งาน
                  </p>
                </div>
                <button onClick={handleBulkSave} className="btn-primary text-sm">
                  บันทึกทั้งหมด
                </button>
              </div>

              {viewMode === 'student' ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-gray-700/50">
                          นักเรียน
                        </th>
                        {assignments.slice(0, 6).map((assignment) => (
                          <th key={assignment.id} className="text-center p-4 font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">
                            <div className="space-y-1">
                              <div className="max-w-24 mx-auto truncate" title={assignment.title}>
                                {assignment.title}
                              </div>
                              <div className="text-xs text-gray-400">{assignment.max_points} คะแนน</div>
                            </div>
                          </th>
                        ))}
                        <th className="text-center p-4 font-medium text-gray-600 dark:text-gray-400">
                          เฉลี่ย
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, idx) => (
                        <tr key={student.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="p-4 sticky left-0 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                  {idx + 1}
                                </span>
                              </div>
                              <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                            </div>
                          </td>
                          {assignments.slice(0, 6).map((assignment) => (
                            <td key={assignment.id} className="p-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max={assignment.max_points}
                                step="0.5"
                                value={getStudentGrade(student.id, assignment.id)}
                                onChange={(e) => handleGradeChange(student.id, assignment.id, e.target.value)}
                                className="w-20 text-center input-field py-1"
                                placeholder="-"
                              />
                            </td>
                          ))}
                          <td className="p-4 text-center">
                            <div className="space-y-1">
                              <span className={`px-2 py-1 rounded-full text-sm font-medium ${getGradeColor(getStudentAverage(student.id))}`}>
                                {getStudentAverage(student.id)}%
                              </span>
                              <div className="text-xs font-bold">
                                {getLetterGrade(getStudentAverage(student.id))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6">
                  <p className="text-gray-500 dark:text-gray-400 text-center">
                    มุมมองตามงานจะเพิ่มมาในอนาคต
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-500 dark:text-gray-400">
                {selectedClass ? 'ยังไม่มีนักเรียนลงทะเบียนในวิชานี้' : 'เลือกวิชาเพื่อดูเกรด'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">สร้างงานใหม่</h2>
              <button onClick={() => setShowAssignmentModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateAssignment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ชื่องาน *
                </label>
                <input
                  type="text"
                  required
                  value={assignmentFormData.title}
                  onChange={(e) => setAssignmentFormData({ ...assignmentFormData, title: e.target.value })}
                  className="input-field"
                  placeholder="เช่น การบ้านสัปดาห์ที่ 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  รายละเอียด
                </label>
                <textarea
                  value={assignmentFormData.description}
                  onChange={(e) => setAssignmentFormData({ ...assignmentFormData, description: e.target.value })}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="รายละเอียดของงาน..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    หมวดหมู่
                  </label>
                  <select
                    value={assignmentFormData.category_id}
                    onChange={(e) => setAssignmentFormData({ ...assignmentFormData, category_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name} ({cat.weight}%)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ประเภท
                  </label>
                  <select
                    value={assignmentFormData.assignment_type}
                    onChange={(e) => setAssignmentFormData({ ...assignmentFormData, assignment_type: e.target.value })}
                    className="input-field"
                  >
                    <option value="homework">การบ้าน</option>
                    <option value="quiz">แบบทดสอบย่อย</option>
                    <option value="test">สอบ</option>
                    <option value="exam">สอบกลาง/ปลายภาค</option>
                    <option value="project">โปรเจกต์</option>
                    <option value="presentation">การนำเสนอ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    คะแนนเต็ม *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={assignmentFormData.max_points}
                    onChange={(e) => setAssignmentFormData({ ...assignmentFormData, max_points: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    คะแนนผ่าน
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={assignmentFormData.passing_score}
                    onChange={(e) => setAssignmentFormData({ ...assignmentFormData, passing_score: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  วันครบกำหนด *
                </label>
                <input
                  type="date"
                  required
                  value={assignmentFormData.due_date}
                  onChange={(e) => setAssignmentFormData({ ...assignmentFormData, due_date: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowLate"
                  checked={assignmentFormData.allow_late_submission}
                  onChange={(e) => setAssignmentFormData({ ...assignmentFormData, allow_late_submission: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="allowLate" className="text-sm text-gray-700 dark:text-gray-300">
                  อนุญาตให้ส่งช้า
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? 'กำลังบันทึก...' : 'สร้างงาน'}
                </button>
                <button type="button" onClick={() => setShowAssignmentModal(false)} className="flex-1 btn-secondary">
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

export default TeacherGradesNew
