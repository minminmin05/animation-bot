import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const scheduleData = [
  { day: 'Monday', periods: [
    { time: '8:00 - 9:00', subject: 'Mathematics', room: 'Room 101', teacher: 'Mr. Smith' },
    { time: '9:00 - 10:00', subject: 'English', room: 'Room 205', teacher: 'Ms. Johnson' },
    { time: '10:00 - 10:15', subject: 'Break', room: '', teacher: '' },
    { time: '10:15 - 11:15', subject: 'Science', room: 'Lab 3', teacher: 'Dr. Brown' },
    { time: '11:15 - 12:15', subject: 'History', room: 'Room 302', teacher: 'Mr. Davis' },
  ]},
  { day: 'Tuesday', periods: [
    { time: '8:00 - 9:00', subject: 'Physics', room: 'Lab 1', teacher: 'Dr. Wilson' },
    { time: '9:00 - 10:00', subject: 'Mathematics', room: 'Room 101', teacher: 'Mr. Smith' },
    { time: '10:00 - 10:15', subject: 'Break', room: '', teacher: '' },
    { time: '10:15 - 11:15', subject: 'English', room: 'Room 205', teacher: 'Ms. Johnson' },
    { time: '11:15 - 12:15', subject: 'Art', room: 'Art Room', teacher: 'Ms. Garcia' },
  ]},
  { day: 'Wednesday', periods: [
    { time: '8:00 - 9:00', subject: 'Chemistry', room: 'Lab 2', teacher: 'Dr. Lee' },
    { time: '9:00 - 10:00', subject: 'Geography', room: 'Room 401', teacher: 'Ms. Taylor' },
    { time: '10:00 - 10:15', subject: 'Break', room: '', teacher: '' },
    { time: '10:15 - 11:15', subject: 'Mathematics', room: 'Room 101', teacher: 'Mr. Smith' },
    { time: '11:15 - 12:15', subject: 'Physical Ed', room: 'Gym', teacher: 'Coach Miller' },
  ]},
  { day: 'Thursday', periods: [
    { time: '8:00 - 9:00', subject: 'English', room: 'Room 205', teacher: 'Ms. Johnson' },
    { time: '9:00 - 10:00', subject: 'Biology', room: 'Lab 4', teacher: 'Dr. Clark' },
    { time: '10:00 - 10:15', subject: 'Break', room: '', teacher: '' },
    { time: '10:15 - 11:15', subject: 'History', room: 'Room 302', teacher: 'Mr. Davis' },
    { time: '11:15 - 12:15', subject: 'Music', room: 'Music Room', teacher: 'Mr. White' },
  ]},
  { day: 'Friday', periods: [
    { time: '8:00 - 9:00', subject: 'Mathematics', room: 'Room 101', teacher: 'Mr. Smith' },
    { time: '9:00 - 10:00', subject: 'Computer Science', room: 'Lab 5', teacher: 'Ms. Chen' },
    { time: '10:00 - 10:15', subject: 'Break', room: '', teacher: '' },
    { time: '10:15 - 11:15', subject: 'Science', room: 'Lab 3', teacher: 'Dr. Brown' },
    { time: '11:15 - 12:15', subject: 'Library', room: 'Library', teacher: 'Ms. Adams' },
  ]},
]

const subjectColors = {
  'Mathematics': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'English': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Science': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'History': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Physics': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Chemistry': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Biology': 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
  'Break': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
}

const StudentSchedule = () => {
  const { profileData } = useAuth()
  const [selectedDay, setSelectedDay] = useState('Monday')

  const currentDayData = scheduleData.find(d => d.day === selectedDay)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Schedule</h1>
        <p className="text-gray-500 dark:text-gray-400">Class {profileData?.class || 'N/A'} • Grade {profileData?.grade_level || 'N/A'}</p>
      </div>

      {/* Day Selector */}
      <div className="flex flex-wrap gap-2">
        {scheduleData.map((day) => (
          <button
            key={day.day}
            onClick={() => setSelectedDay(day.day)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedDay === day.day
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {day.day}
          </button>
        ))}
      </div>

      {/* Schedule Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedDay}'s Schedule</h2>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {currentDayData?.periods.map((period, index) => (
            <div
              key={index}
              className={`p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                period.subject === 'Break' ? 'bg-gray-50 dark:bg-gray-700/30' : ''
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-24 text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {period.time}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${period.subject === 'Break' ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                      {period.subject}
                    </h3>
                    {period.subject !== 'Break' && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${subjectColors[period.subject] || 'bg-gray-100 text-gray-700'}`}>
                        {period.room}
                      </span>
                    )}
                  </div>
                  {period.teacher && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{period.teacher}</p>
                  )}
                </div>
              </div>
              {period.room && period.subject !== 'Break' && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="hidden sm:inline">Room: </span>{period.room}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Weekly Overview</h3>
        <div className="grid grid-cols-5 gap-2">
          {scheduleData.map((day) => (
            <div key={day.day} className="text-center">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{day.day.slice(0, 3)}</div>
              <div className="space-y-1">
                {day.periods.slice(0, 4).map((period, i) => (
                  <div
                    key={i}
                    className={`h-8 rounded text-xs flex items-center justify-center ${
                      period.subject === 'Break'
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                        : subjectColors[period.subject] || 'bg-blue-100 text-blue-700'
                    }`}
                    title={period.subject}
                  >
                    {period.subject !== 'Break' ? period.subject.slice(0, 3).toUpperCase() : 'BRK'}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default StudentSchedule
