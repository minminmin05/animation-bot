import React from 'react'

export const Skeleton = ({ className, variant = 'default' }) => {
  const baseClass = 'animate-pulse bg-cream-dark rounded'

  const variants = {
    default: baseClass,
    card: `${baseClass} rounded-2xl`,
    text: `${baseClass} h-4 w-3/4`,
    title: `${baseClass} h-6 w-1/2`,
    button: `${baseClass} h-10 w-24 rounded-xl`,
    avatar: `${baseClass} h-10 w-10 rounded-full`,
    circle: `${baseClass} rounded-full`,
  }

  return <div className={variants[variant] || className} />
}

export const CardSkeleton = () => (
  <div className="card p-6">
    <div className="flex items-center gap-4 mb-4">
      <Skeleton variant="circle" className="w-12 h-12" />
      <div className="flex-1">
        <Skeleton variant="text" className="mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  </div>
)

export const StatCardSkeleton = () => (
  <div className="stat-card">
    <div className="flex items-start justify-between">
      <div className="w-12 h-12 bg-cream-dark/50 rounded-xl"></div>
    </div>
    <Skeleton className="h-4 w-20 mt-4" />
    <Skeleton className="h-8 w-16 mt-1" />
  </div>
)

export const TableRowSkeleton = () => (
  <div className="flex items-center gap-4 p-4 bg-cream/50 rounded-xl">
    <Skeleton variant="circle" className="w-10 h-10" />
    <div className="flex-1">
      <Skeleton className="h-4 w-32 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
    <Skeleton className="h-6 w-16 rounded-full" />
  </div>
)

export const TableSkeleton = ({ rows = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <TableRowSkeleton key={i} />
    ))}
  </div>
)

export default Skeleton
