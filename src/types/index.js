/**
 * School Management System Types
 *
 * Central type definitions for the entire application
 */

// ============================================
// USER & AUTH TYPES
// ============================================

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} email - User email
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {'admin'|'teacher'|'student'|'parent'|'staff'} role - User role
 * @property {string|null} avatar - Profile picture URL
 * @property {string} createdAt - Account creation date
 * @property {string} updatedAt - Last update date
 */

/**
 * @typedef {Object} AuthSession
 * @property {string} token - Authentication token
 * @property {User} user - User data
 * @property {string} expiresAt - Token expiration time
 */

// ============================================
// STUDENT TYPES
// ============================================

/**
 * @typedef {Object} Student
 * @property {string} id - Student ID
 * @property {string} studentId - School student ID
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string|null} middleName - Middle name
 * @property {Date|string} dateOfBirth - Date of birth
 * @property {'M'|'F'|'O'} gender - Gender
 * @property {string} address - Home address
 * @property {string} phone - Contact phone
 * @property {string|null} email - Email address
 * @property {string} classId - Current class ID
 * @property {string} gradeLevel - Grade level
 * @property {'active'|'inactive'|'graduated'|'withdrawn'|'suspended'} status - Enrollment status
 * @property {string|null} photo - Profile photo URL
 * @property {Object} parentInfo - Parent/guardian information
 * @property {string} enrollmentDate - Date enrolled
 * @property {string} createdAt - Record creation date
 */

/**
 * @typedef {Object} StudentGrade
 * @property {string} id - Grade record ID
 * @property {string} studentId - Student ID
 * @property {string} subjectId - Subject ID
 * @property {string} classId - Class ID
 * @property {string} term - Academic term
 * @property {string} academicYear - Academic year
 * @property {number} score - Numeric score
 * @property {string} letterGrade - Letter grade
 * @property {number} gpa - GPA value
 * @property {string|null} teacherId - Grading teacher ID
 * @property {string} gradedAt - Date graded
 */

/**
 * @typedef {Object} StudentAttendance
 * @property {string} id - Attendance record ID
 * @property {string} studentId - Student ID
 * @property {string} classId - Class ID
 * @property {string} date - Attendance date
 * @property {'present'|'absent'|'late'|'excused'} status - Attendance status
 * @property {string|null} remarks - Additional remarks
 * @property {string|null} markedBy - User who marked attendance
 */

// ============================================
// TEACHER TYPES
// ============================================

/**
 * @typedef {Object} Teacher
 * @property {string} id - Teacher ID
 * @property {string} employeeId - Employee ID
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string|null} middleName - Middle name
 * @property {Date|string} dateOfBirth - Date of birth
 * @property {'M'|'F'|'O'} gender - Gender
 * @property {string} email - Email address
 * @property {string} phone - Contact phone
 * @property {string} address - Home address
 * @property {string} departmentId - Department ID
 * @property {string|null} photo - Profile photo URL
 * @property {string} position - Job position
 * @property {Date|string} hireDate - Date hired
 * @property {'active'|'inactive'|'on_leave'} status - Employment status
 * @property {Array<string>} qualifications - Academic qualifications
 * @property {Array<string>} subjects - Subjects qualified to teach
 * @property {string} createdAt - Record creation date
 */

/**
 * @typedef {Object} TeacherAssignment
 * @property {string} id - Assignment ID
 * @property {string} teacherId - Teacher ID
 * @property {string} classId - Class ID
 * @property {string} subjectId - Subject ID
 * @property {string} academicYear - Academic year
 * @property {string} term - Academic term
 * @property {boolean} isPrimary - Is primary teacher for subject
 */

// ============================================
// PARENT TYPES
// ============================================

/**
 * @typedef {Object} Parent
 * @property {string} id - Parent ID
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string} email - Email address
 * @property {string} phone - Contact phone
 * @property {'father'|'mother'|'guardian'|'other'} relationship - Relationship to student
 * @property {string|null} photo - Profile photo URL
 * @property {boolean} primaryContact - Is primary emergency contact
 * @property {boolean} allowsSMS - Consent for SMS notifications
 * @property {boolean} allowsEmail - Consent for email notifications
 * @property {Array<string>} studentIds - Linked student IDs
 * @property {string} createdAt - Record creation date
 */

// ============================================
// CLASS TYPES
// ============================================

/**
 * @typedef {Object} Class
 * @property {string} id - Class ID
 * @property {string} name - Class name
 * @property {string} gradeLevel - Grade level (e.g., "1", "2", "10")
 * @property {string} section - Section (e.g., "A", "B", "Morning")
 * @property {string} academicYear - Academic year
 * @property {string|null} roomNumber - Room number
 * @property {string|null} homeroomTeacherId - Homeroom teacher ID
 * @property {number} capacity - Maximum students
 * @property {number} enrolledCount - Current enrollment
 * @property {Array<string>} subjectIds - Assigned subjects
 * @property {string|null} scheduleId - Class schedule ID
 * @property {'active'|'inactive'} status - Class status
 */

/**
 * @typedef {Object} Subject
 * @property {string} id - Subject ID
 * @property {string} code - Subject code
 * @property {string} name - Subject name
 * @property {string|null} description - Subject description
 * @property {string} departmentId - Department ID
 * @property {number} credits - Credit hours
 * @property {Array<string>} gradeLevels - Applicable grade levels
 * @property {boolean} isCore - Is core subject
 * @property {boolean} isElective - Is elective subject
 */

// ============================================
// ACADEMIC TYPES
// ============================================

/**
 * @typedef {Object} AcademicYear
 * @property {string} id - Academic year ID
 * @property {string} name - Year name (e.g., "2024-2025")
 * @property {Date|string} startDate - Start date
 * @property {Date|string} endDate - End date
 * @property {Array<Term>} terms - Terms in this year
 * @property {'current'|'upcoming'|'past'} status - Year status
 */

/**
 * @typedef {Object} Term
 * @property {string} id - Term ID
 * @property {string} name - Term name (e.g., "First Term", "Second Term")
 * @property {string} academicYearId - Parent academic year ID
 * @property {Date|string} startDate - Start date
 * @property {Date|string} endDate - End date
 * @property {number} order - Term order (1, 2, 3)
 * @property {boolean} isActive - Is currently active
 */

/**
 * @typedef {Object} GradeScale
 * @property {string} letter - Letter grade (A, B, C, etc.)
 * @property {number} min - Minimum score
 * @property {number} max - Maximum score
 * @property {number} gpa - GPA value
 */

// ============================================
// FACILITY TYPES
// ============================================

/**
 * @typedef {Object} Building
 * @property {string} id - Building ID
 * @property {string} name - Building name
 * @property {string} code - Building code
 * @property {number} floors - Number of floors
 * @property {Array<Room>} rooms - Rooms in building
 */

/**
 * @typedef {Object} Room
 * @property {string} id - Room ID
 * @property {string} name - Room name
 * @property {string} number - Room number
 * @property {string} buildingId - Parent building ID
 * @property {number} floor - Floor number
 * @property {number} capacity - Room capacity
 * @property {'classroom'|'lab'|'office'|'library'|'auditorium'|'other'} type - Room type
 * @property {Array<string>} amenities - Available amenities
 */

// ============================================
// SCHEDULE TYPES
 * ============================================

/**
 * @typedef {Object} Schedule
 * @property {string} id - Schedule ID
 * @property {string} classId - Class ID
 * @property {string} academicYear - Academic year
 * @property {string} term - Term
 * @property {Array<ScheduleItem>} items - Schedule items
 */

/**
 * @typedef {Object} ScheduleItem
 * @property {string} id - Item ID
 * @property {string} subjectId - Subject ID
 * @property {string} teacherId - Teacher ID
 * @property {string} roomId - Room ID
 * @property {number} dayOfWeek - Day (0=Sunday, 1=Monday, etc.)
 * @property {string} startTime - Start time (HH:mm)
 * @property {string} endTime - End time (HH:mm)
 */

// ============================================
// ANNOUNCEMENT TYPES
// ============================================

/**
 * @typedef {Object} Announcement
 * @property {string} id - Announcement ID
 * @property {string} title - Announcement title
 * @property {string} content - Announcement content
 * @property {'info'|'warning'|'success'|'error'} type - Announcement type
 * @property {Array<string>} targetRoles - Target roles (admin, teacher, student, parent)
 * @property {Array<string>} targetClasses - Target class IDs (optional)
 * @property {boolean} isPriority - Is priority announcement
 * @property {Date|string} publishDate - Publication date
 * @property {Date|string|null} expiryDate - Expiry date
 * @property {string} authorId - Author user ID
 */

// Export as a const for documentation
export const Types = {
  User: 'User object with authentication data',
  AuthSession: 'Authentication session with token and user',
  Student: 'Student record with enrollment details',
  StudentGrade: 'Student grade record',
  StudentAttendance: 'Student attendance record',
  Teacher: 'Teacher record with employment details',
  TeacherAssignment: 'Teacher class assignment',
  Parent: 'Parent/guardian record',
  Class: 'Class record with enrollment',
  Subject: 'Subject/course record',
  AcademicYear: 'Academic year configuration',
  Term: 'Term within academic year',
  GradeScale: 'Grade to GPA mapping',
  Building: 'School building',
  Room: 'Room within building',
  Schedule: 'Class schedule',
  ScheduleItem: 'Individual schedule item',
  Announcement: 'School announcement',
}

export default Types
