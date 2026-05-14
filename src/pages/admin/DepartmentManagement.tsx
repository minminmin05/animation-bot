import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Users, AlertCircle, Building2, Loader2 } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import departmentService, {
  DepartmentWithCount,
  Department
} from '@/integrations/supabase/department-service'

// ========================================
// TYPES
// ========================================

interface DepartmentFormData {
  name: string
}

interface TeacherInDepartment {
  id: string
  name: string
  subject: string
  email: string
}

// ========================================
// CONSTANTS
// ========================================

const EMPTY_FORM_DATA: DepartmentFormData = {
  name: ''
}

// ========================================
// COMPONENTS
// ========================================

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse" />
        </div>
      </div>
    ))}
  </div>
)

const EmptyState = ({ onAddDepartment }: { onAddDepartment: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
      <Building2 className="w-10 h-10 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No departments found</h3>
    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
      Get started by adding your first department to organize teachers.
    </p>
    <Button onClick={onAddDepartment}>
      <Plus className="w-4 h-4 mr-2" />
      Add Department
    </Button>
  </div>
)

// ========================================
// DEPARTMENT FORM DIALOG
// ========================================

interface DepartmentFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: DepartmentFormData) => Promise<void>
  department?: DepartmentWithCount | null
  loading?: boolean
}

const DepartmentFormDialog = ({
  isOpen,
  onClose,
  onSubmit,
  department,
  loading
}: DepartmentFormDialogProps) => {
  const [formData, setFormData] = useState<DepartmentFormData>(EMPTY_FORM_DATA)
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (department) {
      setFormData({ name: department.name })
    } else {
      setFormData(EMPTY_FORM_DATA)
    }
    setValidationError(null)
  }, [department, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!formData.name.trim()) {
      setValidationError('Department name is required')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(formData)
      setFormData(EMPTY_FORM_DATA)
      setValidationError(null)
      onClose()
    } catch (error: any) {
      console.error('Error submitting form:', error)
      throw error
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{department ? 'Edit Department' : 'Add Department'}</DialogTitle>
          <DialogDescription>
            {department
              ? 'Update the department name below.'
              : 'Enter the details for the new department.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Department Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value })
                setValidationError(null)
              }}
              placeholder="e.g., STEM, Humanities, Arts"
              required
              autoFocus
              className={validationError ? 'border-red-500' : ''}
              disabled={submitting}
            />
            {validationError && (
              <p className="text-sm text-red-500">{validationError}</p>
            )}
            <p className="text-xs text-gray-500">
              Use a clear, descriptive name for the department.
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formData.name.trim()}
              className="min-w-[140px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                department ? 'Update Department' : 'Create Department'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ========================================
// DEPARTMENT DETAIL DIALOG
// ========================================

interface DepartmentDetailDialogProps {
  department: DepartmentWithCount | null
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
}

const DepartmentDetailDialog = ({
  department,
  isOpen,
  onClose,
  onEdit
}: DepartmentDetailDialogProps) => {
  const [teachers, setTeachers] = useState<TeacherInDepartment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (department?.id && isOpen) {
      fetchTeachers()
    }
  }, [department?.id, isOpen])

  const fetchTeachers = async () => {
    if (!department?.id) return
    setLoading(true)
    try {
      const data = await departmentService.getTeachersByDepartment(department.id)
      setTeachers(data)
    } catch (error) {
      console.error('Error fetching teachers:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!department) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>{department.name}</div>
          </DialogTitle>
          <DialogDescription>
            Department details and assigned teachers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Department Name</Label>
              <p className="text-sm font-medium">{department.name}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Teachers Count</Label>
              <p className="text-sm font-medium">{department.teacher_count}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Created At</Label>
              <p className="text-sm font-medium">
                {new Date(department.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <Label>Assigned Teachers ({teachers.length})</Label>
            </div>
            {loading ? (
              <div className="text-sm text-gray-500">Loading teachers...</div>
            ) : teachers.length === 0 ? (
              <div className="text-sm text-gray-500 italic">No teachers assigned to this department</div>
            ) : (
              <div className="space-y-2">
                {teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{teacher.name}</p>
                      <p className="text-xs text-gray-500">{teacher.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {teacher.subject}
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
            Edit Department
          </Button>
        </DialogFooter>
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
  departmentName: string
  teacherCount: number
}

const DeleteConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  departmentName,
  teacherCount
}: DeleteConfirmDialogProps) => {
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Error deleting department:', error)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Department</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{departmentName}</strong>?
            {teacherCount > 0 && (
              <span className="block mt-2 text-amber-600 dark:text-amber-400">
                ⚠️ This department has {teacherCount} teacher{teacherCount > 1 ? 's' : ''} assigned.
                Their department will be set to unassigned.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Department'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ========================================
// MAIN PAGE COMPONENT
// ========================================

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState<DepartmentWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog states
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentWithCount | null>(null)

  const { toast } = useToast()

  // ========================================
  // DATA FETCHING
  // ========================================

  const fetchDepartments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await departmentService.getDepartmentsWithCount()
      setDepartments(data)
    } catch (error: any) {
      console.error('Error fetching departments:', error)
      setError(error.message || 'Failed to load departments')
    } finally {
      setLoading(false)
    }
  }, []) // Remove toast dependency to prevent infinite loops

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  // ========================================
  // FILTERING
  // ========================================

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ========================================
  // CRUD OPERATIONS
  // ========================================

  const handleCreateDepartment = async (data: DepartmentFormData) => {
    try {
      await departmentService.createDepartment(data.name)
      toast({
        title: 'Success',
        description: `Department "${data.name}" has been created.`
      })
      await fetchDepartments()
    } catch (error: any) {
      console.error('Error creating department:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create department. Please try again.'
      })
      throw error
    }
  }

  const handleUpdateDepartment = async (data: DepartmentFormData) => {
    if (!selectedDepartment) return

    try {
      await departmentService.updateDepartment(selectedDepartment.id, data.name)
      toast({
        title: 'Success',
        description: `Department has been updated to "${data.name}".`
      })
      await fetchDepartments()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update department. Please try again.'
      })
      throw error
    }
  }

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return

    try {
      const result = await departmentService.deleteDepartment(selectedDepartment.id)
      toast({
        title: 'Success',
        description: `Department "${selectedDepartment.name}" has been deleted.${
          result.teachersAffected > 0
            ? ` ${result.teachersAffected} teacher(s) unassigned.`
            : ''
        }`
      })
      await fetchDepartments()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete department. Please try again.'
      })
      throw error
    }
  }

  // ========================================
  // HANDLERS
  // ========================================

  const openAddDialog = () => {
    setSelectedDepartment(null)
    setShowForm(true)
  }

  const openEditDialog = (department: DepartmentWithCount) => {
    setSelectedDepartment(department)
    setShowDetail(false)
    setShowForm(true)
  }

  const openDetailDialog = (department: DepartmentWithCount) => {
    setSelectedDepartment(department)
    setShowDetail(true)
  }

  const openDeleteDialog = (department: DepartmentWithCount) => {
    setSelectedDepartment(department)
    setShowDelete(true)
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-6 p-6">
      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 dark:text-red-400">Error Loading Departments</h3>
              <p className="text-red-700 dark:text-red-500 mt-1">{error}</p>
              <div className="mt-4">
                <Button variant="outline" onClick={fetchDepartments}>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Department Management</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {loading ? 'Loading...' : `${departments.length} department${departments.length !== 1 ? 's' : ''} in the system`}
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Department
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Input
            placeholder="Search departments by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : filteredDepartments.length === 0 ? (
        searchQuery ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400">No departments match your search.</p>
          </div>
        ) : (
          <EmptyState onAddDepartment={openAddDialog} />
        )
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400 text-sm">Department</th>
                  <th className="text-center p-4 font-medium text-gray-600 dark:text-gray-400 text-sm">Teachers</th>
                  <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400 text-sm">Created At</th>
                  <th className="text-right p-4 font-medium text-gray-600 dark:text-gray-400 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept) => (
                  <tr
                    key={dept.id}
                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => openDetailDialog(dept)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white">{dept.name}</p>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Badge
                        variant={dept.teacher_count > 0 ? 'default' : 'secondary'}
                        className="min-w-[40px]"
                      >
                        {dept.teacher_count}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(dept.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(dept)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(dept)}
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

      {/* Dialogs */}
      <DepartmentFormDialog
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={selectedDepartment ? handleUpdateDepartment : handleCreateDepartment}
        department={selectedDepartment}
      />

      <DepartmentDetailDialog
        department={selectedDepartment}
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
        onConfirm={handleDeleteDepartment}
        departmentName={selectedDepartment?.name || ''}
        teacherCount={selectedDepartment?.teacher_count || 0}
      />
    </div>
  )
}

export default DepartmentManagement
