import { useEffect, useState } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'
import { Edit2, Trash2, X, BookOpen, Plus, MapPin, Calendar, Award, Clock, User } from 'lucide-react'

const ClassCard = ({ cls, onEdit, onDelete }) => {
  return (
    <div className="card card-hover group">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <BookOpen size={22} className="text-accent" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-navy">{cls.name}</h3>
              <p className="text-sm text-text-muted">{cls.subject}</p>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(cls)}
              className="p-2 rounded-lg hover:bg-cream text-text-muted hover:text-accent transition-colors"
              title="Edit class"
            >
              <Edit2 size={16} strokeWidth={2} />
            </button>
            <button
              onClick={() => onDelete(cls.id)}
              className="p-2 rounded-lg hover:bg-coral/10 text-text-muted hover:text-coral transition-colors"
              title="Delete class"
            >
              <Trash2 size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted flex items-center gap-2">
              <User size={14} strokeWidth={2} />
              Teacher
            </span>
            <span className="font-medium text-navy">{cls.teachers?.name || 'Not assigned'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted flex items-center gap-2">
              <Award size={14} strokeWidth={2} />
              Grade
            </span>
            <span className="font-medium text-navy">{cls.grade_level}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Section</span>
            <span className="font-medium text-navy">{cls.section || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Credits</span>
            <span className="font-medium text-navy">{cls.credits || 1}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted flex items-center gap-2">
              <MapPin size={14} strokeWidth={2} />
              Room
            </span>
            <span className="font-medium text-navy">{cls.room_number || 'TBD'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted flex items-center gap-2">
              <Calendar size={14} strokeWidth={2} />
              Year
            </span>
            <span className="font-medium text-navy">{cls.academic_year}</span>
          </div>
          {cls.schedule && (
            <div className="flex items-start justify-between text-sm pt-2 border-t border-cream-dark/50">
              <span className="text-text-muted flex items-center gap-2">
                <Clock size={14} strokeWidth={2} />
                Schedule
              </span>
              <span className="font-medium text-navy text-right text-xs max-w-[60%]">{cls.schedule}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const ClassManagement = () => {
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    teacher_id: '',
    grade_level: '',
    section: '',
    academic_year: new Date().getFullYear().toString(),
    room_number: '',
    schedule: '',
    credits: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [classesResult, teachersResult] = await Promise.all([
        supabase.rpc('admin_get_classes_with_teachers'),
        supabase.from('teachers').select('*')
      ])

      if (classesResult.error) {
        console.error('Error fetching classes:', classesResult.error)
      } else if (classesResult.data) {
        const classesWithTeacher = classesResult.data.map(cls => ({
          ...cls,
          teachers: { name: cls.teacher_name }
        }))
        setClasses(classesWithTeacher)
      }

      if (teachersResult.error) {
        console.error('Error fetching teachers:', teachersResult.error)
      } else if (teachersResult.data) {
        setTeachers(teachersResult.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingClass(null)
    setFormData({
      name: '',
      subject: '',
      teacher_id: '',
      grade_level: '',
      section: '',
      academic_year: new Date().getFullYear().toString(),
      room_number: '',
      schedule: '',
      credits: ''
    })
    setShowModal(true)
  }

  const openEditModal = (cls) => {
    setEditingClass(cls)
    setFormData({
      name: cls.name || '',
      subject: cls.subject || '',
      teacher_id: cls.teacher_id || '',
      grade_level: cls.grade_level?.toString() || '',
      section: cls.section || '',
      academic_year: cls.academic_year || new Date().getFullYear().toString(),
      room_number: cls.room_number || '',
      schedule: cls.schedule || '',
      credits: cls.credits?.toString() || ''
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingClass(null)
    setFormData({
      name: '',
      subject: '',
      teacher_id: '',
      grade_level: '',
      section: '',
      academic_year: new Date().getFullYear().toString(),
      room_number: '',
      schedule: '',
      credits: ''
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.teacher_id) {
      alert('Please select a teacher')
      return
    }

    const classData = {
      name: formData.name,
      subject: formData.subject,
      teacher_id: formData.teacher_id,
      grade_level: parseInt(formData.grade_level, 10),
      section: formData.section || null,
      academic_year: formData.academic_year,
      room_number: formData.room_number || null,
      schedule: formData.schedule || null,
      credits: parseFloat(formData.credits) || 1.00
    }

    try {
      let error
      if (editingClass) {
        const result = await supabase
          .from('classes')
          .update(classData)
          .eq('id', editingClass.id)
        error = result.error
      } else {
        const result = await supabase
          .from('classes')
          .insert(classData)
        error = result.error
      }

      if (error) throw error

      await fetchData()
      closeModal()
    } catch (error) {
      console.error('Error saving class:', error)
      alert(`Failed to ${editingClass ? 'update' : 'create'} class: ${error.message}`)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this class?')) return

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)

      if (error) throw error
      setClasses(classes.filter(c => c.id !== id))
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('Failed to delete class')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">Class Management</h1>
          <p className="text-text-secondary mt-1">
            {classes.length} {classes.length === 1 ? 'class' : 'classes'} in the system
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Class
        </button>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        {classes.length === 0 ? (
          <div className="col-span-full card text-center p-12">
            <div className="w-16 h-16 bg-cream rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen size={32} className="text-text-muted" strokeWidth={2} />
            </div>
            <p className="text-text-secondary font-medium">No classes found</p>
            <p className="text-text-muted text-sm mt-2">Create your first class to get started!</p>
          </div>
        ) : (
          classes.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Create/Edit Class Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-navy/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-strong max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-cream-dark">
              <h2 className="text-xl font-display font-semibold text-navy">
                {editingClass ? 'Edit Class' : 'Create Class'}
              </h2>
              <button
                onClick={closeModal}
                className="text-text-muted hover:text-navy transition-colors"
              >
                <X size={24} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-2">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., 10A Mathematics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Mathematics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy mb-2">
                  Teacher *
                </label>
                <select
                  required
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">-- Select a teacher --</option>
                  {teachers.length === 0 ? (
                    <option disabled>No teachers available</option>
                  ) : (
                    teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                    ))
                  )}
                </select>
                {teachers.length === 0 && (
                  <p className="text-xs text-gold mt-1.5">Please add teachers first in User Management</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">
                    Grade Level *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={formData.grade_level}
                    onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">
                    Section
                  </label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="input-field"
                    placeholder="A, B, C..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">
                    Academic Year *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="input-field"
                    placeholder="2024-2025"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    className="input-field"
                    placeholder="101"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy mb-2">
                  Credits *
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="10"
                  step="0.5"
                  required
                  value={formData.credits}
                  onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                  className="input-field"
                  placeholder="1.0"
                />
                <p className="text-xs text-text-muted mt-1.5">Number of credits for this course (e.g., 1.0, 1.5, 2.0)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy mb-2">
                  Schedule (optional)
                </label>
                <textarea
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  className="input-field resize-none"
                  rows={2}
                  placeholder="e.g., Mon-Fri 9:00-10:00 AM"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 btn-primary">
                  {editingClass ? 'Update Class' : 'Create Class'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClassManagement
