import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'
import { motion } from 'framer-motion'
import { 
  BookOpen, 
  Users, 
  FileText, 
  Clock, 
  ChevronRight,
  PlusCircle,
  BarChart2,
  CheckCircle,
  MessageSquare
} from 'lucide-react'

const TeacherDashboard = () => {
  const { profileData } = useAuth()
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profileData?.id) {
      fetchData()
    }
  }, [profileData?.id])

  const fetchData = async () => {
    if (!profileData?.id) return
    try {
      setLoading(true)
      // Fetch teacher's classes
      const { data: classesData } = await supabase
        .from('classes')
        .select(`
          *,
          student_enrollments (
            students (*)
          )
        `)
        .eq('teacher_id', profileData?.id)

      if (classesData) {
        setClasses(classesData)
        // Collect all students
        const allStudents = classesData.flatMap(c =>
          c.student_enrollments?.map(se => se.students).filter(Boolean) || []
        )
        setStudents(allStudents)
      }

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*')
        .eq('teacher_id', profileData?.id)
        .order('due_date', { ascending: true })

      if (assignmentsData) setAssignments(assignmentsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !profileData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Spinner size="large" />
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  }

  return (
    <motion.div 
      className="space-y-8 p-4 lg:p-8 max-w-7xl mx-auto"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Welcome Hero Section */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 rounded-3xl p-8 sm:p-10 text-white shadow-xl"
      >
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-48 h-48 bg-pink-500 opacity-20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl sm:text-4xl font-extrabold tracking-tight"
          >
            Welcome back, {profileData?.name || 'Teacher'}! 👋
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-2 text-indigo-100 text-lg flex items-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            {profileData?.subject || 'Teacher'} • {profileData?.department || 'Department'}
          </motion.p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Classes', value: classes.length, icon: BookOpen, color: 'from-blue-500 to-cyan-400', shadow: 'shadow-blue-500/20' },
          { title: 'Total Students', value: students.length, icon: Users, color: 'from-emerald-500 to-teal-400', shadow: 'shadow-emerald-500/20' },
          { title: 'Active Assignments', value: assignments.length, icon: FileText, color: 'from-violet-500 to-purple-400', shadow: 'shadow-violet-500/20' },
          { title: 'Pending Tasks', value: '12', icon: Clock, color: 'from-amber-500 to-orange-400', shadow: 'shadow-amber-500/20' },
        ].map((stat, idx) => (
          <motion.div 
            key={idx}
            variants={itemVariants}
            whileHover={{ y: -5, scale: 1.02 }}
            className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg ${stat.shadow} border border-gray-100 dark:border-gray-700 relative overflow-hidden group`}
          >
            <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-10 rounded-full group-hover:scale-150 transition-transform duration-500`}></div>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-inner`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upcoming Assignments (Takes up 2 columns on lg) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              Upcoming Deadlines
            </h2>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 group">
              View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="p-6 flex-1">
            {assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-gray-400">
                <FileText className="w-12 h-12 mb-3 opacity-20" />
                <p>No upcoming assignments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.slice(0, 5).map((assignment) => {
                  const dueDate = new Date(assignment.due_date)
                  const isOverdue = dueDate < new Date()
                  return (
                    <motion.div 
                      whileHover={{ x: 5 }}
                      key={assignment.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 hover:bg-indigo-50 dark:bg-gray-700/30 dark:hover:bg-indigo-900/20 rounded-2xl transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                    >
                      <div className="flex items-center gap-4 mb-3 sm:mb-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{assignment.title}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{classes.find(c => c.id === assignment.class_id)?.name || 'Class'}</p>
                        </div>
                      </div>
                      <div className={`self-start sm:self-center px-4 py-1.5 rounded-full text-sm font-medium ${
                        isOverdue
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions & Classes Sidebar */}
        <div className="space-y-8">
          
          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: PlusCircle, label: 'New Task', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { icon: BarChart2, label: 'Grades', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { icon: CheckCircle, label: 'Attendance', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                { icon: MessageSquare, label: 'Message', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' }
              ].map((action, idx) => (
                <motion.button 
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`${action.bg} p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors`}
                >
                  <action.icon className={`w-6 h-6 ${action.color}`} />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* My Classes */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">My Classes</h2>
            </div>
            <div className="p-5">
              {classes.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No classes</p>
              ) : (
                <div className="space-y-4">
                  {classes.slice(0, 4).map((cls) => (
                    <div key={cls.id} className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-10 rounded-full bg-indigo-500 group-hover:bg-indigo-400 transition-colors"></div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{cls.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {cls.student_enrollments?.length || 0} students
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  )
}

export default TeacherDashboard
