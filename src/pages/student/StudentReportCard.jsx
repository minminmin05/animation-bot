import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const StudentReportCard = () => {
  const { profileData } = useAuth()
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(null)
  const [selectedSemester, setSelectedSemester] = useState(null)
  const [academicYears, setAcademicYears] = useState([])
  const [semesters, setSemesters] = useState([])
  const [semesterGrades, setSemesterGrades] = useState([])
  const [gpa, setGpa] = useState(0)
  const [classRank, setClassRank] = useState(null)
  const [attendance, setAttendance] = useState({ present: 0, absent: 0, late: 0, excused: 0 })

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      // Get student record
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', profileData?.id || '')
        .single()

      if (!studentData) {
        setLoading(false)
        return
      }

      // Fetch academic years
      const { data: yearsData } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false })

      if (yearsData) {
        setAcademicYears(yearsData)
        const currentYear = yearsData.find(y => y.is_current) || yearsData[0]
        setSelectedYear(currentYear)

        if (currentYear) {
          await fetchYearData(currentYear.id, studentData.id)
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchYearData = async (yearId, studentId) => {
    try {
      // Fetch semesters for this year
      const { data: semestersData } = await supabase
        .from('semesters')
        .select('*')
        .eq('academic_year_id', yearId)
        .order('sequence', { ascending: true })

      if (semestersData) {
        setSemesters(semestersData)
        const currentSemester = semestersData.find(s => s.is_current) || semestersData[0]
        setSelectedSemester(currentSemester)

        if (currentSemester) {
          await fetchSemesterGrades(yearId, currentSemester.id, studentId)
        } else {
          // If no semesters, fetch year-wide grades
          await fetchSemesterGrades(yearId, null, studentId)
        }
      }
    } catch (error) {
      console.error('Error fetching year data:', error)
    }
  }

  const fetchSemesterGrades = async (yearId, semesterId, studentId) => {
    try {
      // Fetch semester grades
      const { data: gradesData } = await supabase
        .from('semester_grades')
        .select(`
          *,
          class_sections (
            id,
            name,
            code,
            teachers (name),
            grade_levels (name)
          )
        `)
        .eq('student_id', studentId)
        .eq('academic_year_id', yearId)
        .eq(semesterId ? 'semester_id' : 'semester_id', semesterId ? semesterId : null)

      if (gradesData) {
        setSemesterGrades(gradesData)

        // Calculate GPA
        const totalPoints = gradesData.reduce((sum, g) => sum + (g.grade_points || 0) * (g.credits_earned || 1), 0)
        const totalCredits = gradesData.reduce((sum, g) => sum + (g.credits_earned || 1), 0)
        setGpa(totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00')

        // Get class rank from first grade
        if (gradesData.length > 0) {
          setClassRank({
            rank: gradesData[0].class_rank,
            size: gradesData[0].class_size
          })
        }
      }

      // Fetch attendance
      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('student_id', studentId)
        .eq('academic_year_id', yearId)
        .eq(semesterId ? 'semester_id' : 'semester_id', semesterId ? semesterId : null)

      if (attendanceData) {
        const counts = { present: 0, absent: 0, late: 0, excused: 0 }
        attendanceData.forEach(a => {
          if (counts[a.status] !== undefined) {
            counts[a.status]++
          }
        })
        setAttendance(counts)
      }
    } catch (error) {
      console.error('Error fetching semester grades:', error)
    }
  }

  const handleYearChange = async (yearId) => {
    const year = academicYears.find(y => y.id === yearId)
    setSelectedYear(year)

    // Get student ID
    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', profileData?.id || '')
      .single()

    if (year && studentData) {
      await fetchYearData(year.id, studentData.id)
    }
  }

  const handleSemesterChange = async (semesterId) => {
    setSelectedSemester(semesters.find(s => s.id === semesterId))

    // Get student ID
    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', profileData?.id || '')
      .single()

    if (selectedYear && studentData) {
      await fetchSemesterGrades(selectedYear.id, semesterId, studentData.id)
    }
  }

  const getGradeColor = (grade) => {
    if (!grade) return 'bg-gray-100 text-gray-700'
    if (grade.startsWith('A') || grade.startsWith('4')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (grade.startsWith('B') || grade.startsWith('3')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    if (grade.startsWith('C') || grade.startsWith('2')) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    if (grade.startsWith('D') || grade.startsWith('1')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }

  const printReportCard = () => {
    window.print()
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">รายงานผลการศึกษา</h1>
          <p className="text-gray-500 dark:text-gray-400">ผลการเรียนและสถิติการเข้าเรียน</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedYear?.id || ''}
            onChange={(e) => handleYearChange(e.target.value)}
            className="input-field w-auto"
          >
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>{year.name}</option>
            ))}
          </select>

          <select
            value={selectedSemester?.id || 'all'}
            onChange={(e) => handleSemesterChange(e.target.value === 'all' ? null : e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">ทั้งปีการศึกษา</option>
            {semesters.map((sem) => (
              <option key={sem.id} value={sem.id}>{sem.name}</option>
            ))}
          </select>

          <button onClick={printReportCard} className="btn-secondary">
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            พิมพ์
          </button>
        </div>
      </div>

      {/* Report Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden print:shadow-none print:border-black">
        {/* Student Info */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white print:from-white print:to-white print:text-black print:border-b print:border-black">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">รายงานผลการศึกษา</h2>
              <p className="text-blue-100 print:text-gray-600">Student Report Card</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{selectedYear?.name || '-'}</p>
              <p className="text-blue-100 print:text-gray-600">
                {selectedSemester ? selectedSemester.name : 'ทั้งปีการศึกษา'}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-lg font-semibold">{profileData?.name || 'นักเรียน'}</p>
            <p className="text-blue-100 print:text-gray-600 text-sm">
              เลขประจำตัว: {profileData?.student_id || '-'}
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-gray-200 dark:border-gray-700 print:border-black">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg print:bg-white print:border print:border-black">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 print:text-black">{gpa}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black">เกรดเฉลี่ย (GPA)</p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg print:bg-white print:border print:border-black">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 print:text-black">
              {classRank ? `${classRank.rank}/${classRank.size}` : '-'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black">อันดับชั้น</p>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg print:bg-white print:border print:border-black">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 print:text-black">{semesterGrades.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black">วิชาทั้งหมด</p>
          </div>
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg print:bg-white print:border print:border-black">
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 print:text-black">
              {attendance.present + attendance.late}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black">มาเรียน</p>
          </div>
        </div>

        {/* Grades Table */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 print:text-black">ผลการเรียน</h3>

          {semesterGrades.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg print:bg-white print:border print:border-black">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-gray-500 dark:text-gray-400 print:text-black">ยังไม่มีผลการเรียน</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 print:bg-gray-100">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400 print:text-black">วิชา</th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400 print:text-black">ระดับชั้น</th>
                    <th className="text-center p-4 font-medium text-gray-600 dark:text-gray-400 print:text-black">หน่วยกิต</th>
                    <th className="text-center p-4 font-medium text-gray-600 dark:text-gray-400 print:text-black">คะแนน</th>
                    <th className="text-center p-4 font-medium text-gray-600 dark:text-gray-400 print:text-black">เกรด</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterGrades.map((grade) => (
                    <tr key={grade.id} className="border-t border-gray-100 dark:border-gray-700 print:border-black">
                      <td className="p-4">
                        <p className="font-medium text-gray-900 dark:text-white print:text-black">
                          {grade.class_sections?.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 print:text-black">
                          ครู้: {grade.class_sections?.teachers?.name || '-'}
                        </p>
                      </td>
                      <td className="p-4 text-gray-600 dark:text-gray-400 print:text-black">
                        {grade.class_sections?.grade_levels?.name || '-'}
                      </td>
                      <td className="p-4 text-center text-gray-600 dark:text-gray-400 print:text-black">
                        {grade.credits_earned || 1}
                      </td>
                      <td className="p-4 text-center text-gray-900 dark:text-white print:text-black">
                        {grade.final_percentage ? grade.final_percentage.toFixed(1) : '-'}%
                      </td>
                      <td className="p-4 text-center">
                        {grade.letter_grade ? (
                          <span className={`px-3 py-1 rounded-lg font-bold ${getGradeColor(grade.letter_grade)}`}>
                            {grade.letter_grade}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Attendance Summary */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 print:border-black">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 print:text-black">สรุปการเข้าเรียน</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg print:bg-white print:border print:border-black">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 print:text-black">{attendance.present}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black">มาเรียน</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg print:bg-white print:border print:border-black">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 print:text-black">{attendance.late}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black">มาสาย</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg print:bg-white print:border print:border-black">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 print:text-black">{attendance.excused}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black">ลางาน</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg print:bg-white print:border print:border-black">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 print:text-black">{attendance.absent}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black">ขาดเรียน</p>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Comments */}
        {semesterGrades.some(g => g.teacher_comments) && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 print:border-black">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 print:text-black">ความคิดเห็นของครู</h3>
            <div className="space-y-3">
              {semesterGrades.filter(g => g.teacher_comments).map((grade) => (
                <div key={grade.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg print:bg-white print:border print:border-black">
                  <p className="font-medium text-gray-900 dark:text-white print:text-black">
                    {grade.class_sections?.name}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 print:text-black mt-1">
                    {grade.teacher_comments}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 print:border-black">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black mb-8">ลงชื่อครูที่ปรึกษา</p>
              <div className="border-b border-gray-400 dark:border-gray-600 print:border-black"></div>
              <p className="text-sm text-gray-500 dark:text-gray-500 print:text-black mt-2">วันที่ ....../....../......</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black mb-8">ลงชื่อผู้ปกครอง</p>
              <div className="border-b border-gray-400 dark:border-gray-600 print:border-black"></div>
              <p className="text-sm text-gray-500 dark:text-gray-500 print:text-black mt-2">วันที่ ....../....../......</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentReportCard
