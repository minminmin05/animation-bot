import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Mail, Phone, GraduationCap, Users, AlertCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/config/supabaseClient'
import departmentService, { Department } from '@/integrations/supabase/department-service'
// Uncomment for development debugging:
// import { TeacherManagementDebug } from './TeacherManagementDebug'

// ========================================
// TYPES
// ========================================

interface Teacher {
  id: string
  user_id: string
  name: string
  subject: string
  department: string | null
  department_id: string | null
  employee_id: string | null
  phone: string | null
  qualifications: string | null
  hire_date: string
  email: string
  full_name: string
  class_count: number
  created_at: string
}

interface TeacherFormData {
  name: string
  email: string
  subject: string
  department_id: string | undefined
  employee_id: string
  phone: string
  qualifications: string
  hire_date: string
}

interface ClassInfo {
  id: string
  name: string
  subject: string
  grade_level: number
  section: string
  academic_year: string
}

// ========================================
// CONSTANTS
// ========================================

// Department colors for badges - dynamically assigned based on department name hash
const getDepartmentColor = (deptName: string) => {
  const colors = [
    { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    { bg: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    { bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
    { bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
    { bg: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300' },
    { bg: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300' },
    { bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
    { bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  ]
  // Use simple hash of department name to pick consistent color
  const hash = deptName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length].bg
}

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
  'English Literature', 'History', 'Geography', 'Philosophy',
  'Art', 'Music', 'Drama', 'Physical Education',
  'Spanish', 'French', 'German', 'Mandarin'
] as const

const EMPTY_FORM_DATA: TeacherFormData = {
  name: '',
  email: '',
  subject: '',
  department_id: undefined,  // Use undefined instead of empty string
  employee_id: '',
  phone: '',
  qualifications: '',
  hire_date: new Date().toISOString().split('T')[0]
}

// ========================================
// COMPONENTS
// ========================================

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse" />
        </div>
      </div>
    ))}
  </div>
)

interface EmptyStateProps {
  onNavigateToUsers: () => void
}

const EmptyState = ({ onNavigateToUsers }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
      <GraduationCap className="w-10 h-10 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No teachers found</h3>
    <p className="text-gray-500 dark:text-gray-400 mb-2 max-w-sm">
      Get started by adding your first teacher to the system.
    </p>
    <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-sm">
      Teachers can be added from the User Management page
    </p>
    <Button onClick={onNavigateToUsers}>
      <ExternalLink className="w-4 h-4 mr-2" />
      Go to User Management
    </Button>
  </div>
)

const TeacherAvatar = ({ name }: { name: string }) => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
  ]
  const index = name.charCodeAt(0) % colors.length
  const bgColor = colors[index]

  return (
    <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center text-white font-medium text-sm`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

const DepartmentBadge = ({ department }: { department: string | null }) => {
  if (!department) return <Badge variant="outline">Unassigned</Badge>
  return <Badge className={getDepartmentColor(department)}>{department}</Badge>
}

// ========================================
// TEACHER DETAIL DRAWER
// ========================================

interface TeacherDetailDrawerProps {
  teacher: Teacher | null
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
}

const TeacherDetailDrawer = ({ teacher, isOpen, onClose, onEdit }: TeacherDetailDrawerProps) => {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (teacher?.id && isOpen) {
      fetchTeacherClasses()
    }
  }, [teacher?.id, isOpen])

  const fetchTeacherClasses = async () => {
    if (!teacher?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', teacher.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!teacher) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <TeacherAvatar name={teacher.name} />
            <div className="text-left">
              <div>{teacher.name}</div>
              <div className="text-sm font-normal text-gray-500">{teacher.email}</div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Teacher details and assigned classes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Employee ID</Label>
              <p className="text-sm font-medium">{teacher.employee_id || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Department</Label>
              <DepartmentBadge department={teacher.department} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Subject</Label>
              <p className="text-sm font-medium">{teacher.subject}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Hire Date</Label>
              <p className="text-sm font-medium">
                {new Date(teacher.hire_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <Label className="text-xs text-gray-500">Contact Information</Label>
            <div className="space-y-2">
              {teacher.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{teacher.email}</span>
                </div>
              )}
              {teacher.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{teacher.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Qualifications */}
          {teacher.qualifications && (
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Qualifications</Label>
              <p className="text-sm">{teacher.qualifications}</p>
            </div>
          )}

          {/* Classes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <Label>Assigned Classes ({classes.length})</Label>
            </div>
            {loading ? (
              <div className="text-sm text-gray-500">Loading classes...</div>
            ) : classes.length === 0 ? (
              <div className="text-sm text-gray-500 italic">No classes assigned</div>
            ) : (
              <div className="space-y-2">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{cls.name}</p>
                      <p className="text-xs text-gray-500">
                        Grade {cls.grade_level}{cls.section && ` - ${cls.section}`} • {cls.academic_year}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {cls.subject}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Teacher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ========================================
// TEACHER FORM DIALOG
// ========================================

interface TeacherFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TeacherFormData) => Promise<void>
  teacher?: Teacher | null
  loading?: boolean
}

const TeacherFormDialog = ({ isOpen, onClose, onSubmit, teacher, loading }: TeacherFormDialogProps) => {
  const [formData, setFormData] = useState<TeacherFormData>(EMPTY_FORM_DATA)
  const [submitting, setSubmitting] = useState(false)
  const [deptList, setDeptList] = useState<Department[]>([])
  const [loadingDepts, setLoadingDepts] = useState(false)

  // Fetch departments when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLoadingDepts(true)
      console.log('[TeacherForm] Fetching departments...')
      departmentService.getDepartments()
        .then((depts) => {
          console.log('[TeacherForm] Departments fetched:', depts)
          setDeptList(depts)
        })
        .catch((err) => {
          console.error('[TeacherForm] Error fetching departments:', err)
        })
        .finally(() => {
          setLoadingDepts(false)
        })
    }
  }, [isOpen])

  useEffect(() => {
    if (teacher) {
      console.log('[TeacherForm] Setting form data for teacher:', teacher.name)
      console.log('[TeacherForm] teacher.department_id:', teacher.department_id)
      console.log('[TeacherForm] teacher.department (text):', teacher.department)
      setFormData({
        name: teacher.name,
        email: teacher.email,
        subject: teacher.subject,
        department_id: teacher.department_id || 'unassigned',
        employee_id: teacher.employee_id || '',
        phone: teacher.phone || '',
        qualifications: teacher.qualifications || '',
        hire_date: teacher.hire_date.split('T')[0]
      })
    } else {
      setFormData(EMPTY_FORM_DATA)
    }
  }, [teacher, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject) {
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(formData)
      setFormData(EMPTY_FORM_DATA)
      onClose()
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto overflow-visible bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>Edit Teacher</DialogTitle>
          <DialogDescription>
            Update teacher information below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Dr. Sarah Johnson"
              required
              disabled={!!teacher}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="sarah.johnson@school.edu"
              required
              disabled={!!teacher}
            />
            {teacher && (
              <p className="text-xs text-gray-500">Email cannot be changed after account creation</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select
                value={formData.department_id}
                onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                disabled={loadingDepts}
              >
                <SelectTrigger id="department" className="w-full">
                  <SelectValue placeholder={loadingDepts ? "Loading departments..." : "Select department"} />
                </SelectTrigger>
                <SelectContent className="z-10">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {deptList.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-gray-500">
                      No departments available
                    </div>
                  ) : (
                    deptList.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {deptList.length === 0 && !loadingDepts && (
                <p className="text-xs text-amber-600">
                  No departments found. Add departments first.
                </p>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <Label htmlFor="subject">Subject *</Label>
              <Select
                value={formData.subject}
                onValueChange={(value) => setFormData({ ...formData, subject: value })}
                required
              >
                <SelectTrigger id="subject" className="w-full">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent className="z-10">
                  {SUBJECTS.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee ID</Label>
              <Input
                id="employee_id"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                placeholder="T001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hire_date">Hire Date *</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qualifications">Qualifications</Label>
            <Input
              id="qualifications"
              value={formData.qualifications}
              onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
              placeholder="Ph.D. Mathematics, MIT"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Update Teacher'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ========================================
// DELETE CONFIRMATION DIALOG
// ========================================

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  teacherName: string
  classCount: number
}

const DeleteConfirmDialog = ({ isOpen, onClose, onConfirm, teacherName, classCount }: DeleteConfirmDialogProps) => {
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Error deleting teacher:', error)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Teacher</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{teacherName}</strong>?
            {classCount > 0 && (
              <span className="block mt-2 text-amber-600 dark:text-amber-400">
                ⚠️ This teacher is assigned to {classCount} class{classCount > 1 ? 'es' : ''}.
                You should reassign classes before deleting.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Teacher'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ========================================
// MAIN PAGE COMPONENT
// ========================================

const TeacherManagement = () => {
  const navigate = useNavigate()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')

  // Dialog states
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)

  const { toast } = useToast()

  // ========================================
  // DATA FETCHING
  // ========================================

  const fetchTeachers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Use RPC function to get teachers with department names
      const { data, error } = await supabase
        .rpc('admin_get_teachers_with_emails')

      if (error) {
        console.error('Supabase query error:', error)
        throw error
      }

      // The RPC now returns department name from the join
      const teachersWithCounts = (data || []).map((teacher: any) => ({
        ...teacher,
        email: teacher.email || 'No email',
        full_name: teacher.full_name || teacher.name,
        class_count: Number(teacher.class_count) || 0,
        // department is now properly joined from departments table
        department: teacher.department || 'Unassigned'
      }))

      setTeachers(teachersWithCounts)
      setFilteredTeachers(teachersWithCounts)
    } catch (error: any) {
      console.error('Error fetching teachers:', error)
      setError(error.message || 'Failed to load teachers')
      toast({
        variant: 'destructive',
        title: 'Error Loading Teachers',
        description: error.message || 'Failed to load teachers. Please check console for details.',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchTeachers()
    fetchDepartments()
  }, [fetchTeachers])

  const fetchDepartments = async () => {
    try {
      const data = await departmentService.getDepartments()
      setDepartments(data)
    } catch (error: any) {
      console.error('Error fetching departments:', error)
    }
  }

  // ========================================
  // FILTERING
  // ========================================

  useEffect(() => {
    let filtered = teachers

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.email.toLowerCase().includes(query) ||
          t.employee_id?.toLowerCase().includes(query)
      )
    }

    // Department filter
    if (departmentFilter !== 'all') {
      if (departmentFilter === 'unassigned') {
        filtered = filtered.filter((t) => !t.department_id)
      } else {
        filtered = filtered.filter((t) => t.department_id === departmentFilter)
      }
    }

    // Subject filter
    if (subjectFilter !== 'all') {
      filtered = filtered.filter((t) => t.subject === subjectFilter)
    }

    setFilteredTeachers(filtered)
  }, [searchQuery, departmentFilter, subjectFilter, teachers])

  // ========================================
  // CRUD OPERATIONS
  // ========================================

  const handleUpdateTeacher = async (data: TeacherFormData) => {
    if (!selectedTeacher) return

    try {
      const { error } = await supabase
        .from('teachers')
        .update({
          name: data.name,
          subject: data.subject,
          department_id: data.department_id === 'unassigned' ? null : data.department_id,
          department: null, // Clear legacy department field
          employee_id: data.employee_id || null,
          phone: data.phone || null,
          qualifications: data.qualifications || null,
          hire_date: data.hire_date
        })
        .eq('id', selectedTeacher.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Teacher "${data.name}" has been updated.`
      })
      await fetchTeachers()
    } catch (error: any) {
      console.error('Error updating teacher:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update teacher. Please try again.'
      })
      throw error
    }
  }

  const handleDeleteTeacher = async () => {
    if (!selectedTeacher) return

    try {
      // Soft delete by updating users role or hard delete
      // Using hard delete for teachers table, cascade handles relations
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', selectedTeacher.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Teacher "${selectedTeacher.name}" has been deleted.`
      })
      await fetchTeachers()
    } catch (error: any) {
      console.error('Error deleting teacher:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete teacher. Please try again.'
      })
      throw error
    }
  }

  // ========================================
  // HANDLERS
  // ========================================

  const openAddDialog = () => {
    // Navigate to User Management page to add new teachers
    navigate('/admin/users')
  }

  const openEditDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setShowDetail(false)
    setShowForm(true)
  }

  const openDetailDrawer = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setShowDetail(true)
  }

  const openDeleteDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setShowDelete(true)
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-6 p-6">
      {/* Development Debug Component - Uncomment to enable */}
      {/* {import.meta.env.DEV && <TeacherManagementDebug />} */}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 dark:text-red-400">Error Loading Teachers</h3>
              <p className="text-red-700 dark:text-red-500 mt-1">{error}</p>
              <div className="mt-4">
                <Button variant="outline" onClick={fetchTeachers}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teacher Management</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {loading ? 'Loading...' : `${filteredTeachers.length} teacher${filteredTeachers.length !== 1 ? 's' : ''} in the system`}
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Teacher
        </Button>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Teachers are now managed from User Management
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {SUBJECTS.map((subject) => (
              <SelectItem key={subject} value={subject}>
                {subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : filteredTeachers.length === 0 ? (
        <EmptyState onNavigateToUsers={openAddDialog} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400 text-sm">Teacher</th>
                  <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400 text-sm">Department</th>
                  <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400 text-sm">Subject</th>
                  <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400 text-sm">Employee ID</th>
                  <th className="text-center p-4 font-medium text-gray-600 dark:text-gray-400 text-sm">Classes</th>
                  <th className="text-right p-4 font-medium text-gray-600 dark:text-gray-400 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => (
                  <tr
                    key={teacher.id}
                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => openDetailDrawer(teacher)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <TeacherAvatar name={teacher.name} />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{teacher.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{teacher.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <DepartmentBadge department={teacher.department} />
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{teacher.subject}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {teacher.employee_id || '—'}
                    </td>
                    <td className="p-4 text-center">
                      <Badge
                        variant={teacher.class_count > 0 ? 'default' : 'secondary'}
                        className="min-w-[40px]"
                      >
                        {teacher.class_count}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(teacher)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(teacher)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialogs - Only for editing existing teachers */}
      {selectedTeacher && (
        <TeacherFormDialog
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleUpdateTeacher}
          teacher={selectedTeacher}
        />
      )}

      <TeacherDetailDrawer
        teacher={selectedTeacher}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onEdit={() => {
          setShowDetail(false)
          setShowForm(true)
        }}
      />

      <DeleteConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDeleteTeacher}
        teacherName={selectedTeacher?.name || ''}
        classCount={selectedTeacher?.class_count || 0}
      />
    </div>
  )
}

export default TeacherManagement
