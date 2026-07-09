import React from 'react'

interface SkeletonProps {
  className?: string
  circle?: boolean
  bright?: boolean
}

export function Skeleton({ className = '', circle = false, bright = false }: SkeletonProps) {
  return (
    <div
      className={`${
        bright ? 'shimmer-skeleton-bright' : 'shimmer-skeleton'
      } rounded-md ${circle ? 'rounded-full' : ''} ${className}`}
    />
  )
}

interface SkeletonTextProps {
  lines?: number
  className?: string
  bright?: boolean
}

export function SkeletonText({ lines = 3, className = '', bright = false }: SkeletonTextProps) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => {
        const widths = ['w-full', 'w-[95%]', 'w-[88%]', 'w-[92%]', 'w-[75%]']
        const w = widths[idx % widths.length]
        return <Skeleton key={idx} bright={bright} className={`h-3 ${w}`} />
      })}
    </div>
  )
}

interface SkeletonCardProps {
  className?: string
  children?: React.ReactNode
}

export function SkeletonCard({ className = '', children }: SkeletonCardProps) {
  return (
    <div className={`bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-5 relative overflow-hidden shadow-[4px_4px_0_rgba(0,0,0,1)] ${className}`}>
      <div className="absolute inset-2 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />
      <div className="relative z-10 space-y-3.5">
        {children || (
          <>
            <div className="flex items-center gap-3">
              <Skeleton circle bright className="w-10 h-10" />
              <div className="space-y-2 flex-1">
                <Skeleton bright className="h-4 w-1/3" />
                <Skeleton bright className="h-3 w-1/2" />
              </div>
            </div>
            <SkeletonText bright lines={3} />
          </>
        )}
      </div>
    </div>
  )
}

export function GradingResultSkeleton() {
  return (
    <div className="w-full mt-8 space-y-8 text-left">
      {/* Score banner & Overview Feedback Skeleton */}
      <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-6 shadow-[4px_4px_0_rgba(0,0,0,1)] relative flex flex-col md:flex-row items-center gap-6">
        <div className="absolute inset-2 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />
        
        {/* Score badge skeleton - styled with a premium topper-amber border glow */}
        <div className="flex flex-col items-center justify-center p-4 bg-topper-black rounded-lg border-2 border-topper-amber/50 relative z-10 w-32 h-32 flex-shrink-0 shadow-[0_0_15px_rgba(245,166,35,0.15)]">
          <Skeleton bright className="h-3 w-16 mb-2" />
          <div className="flex items-baseline gap-1">
            <Skeleton bright className="h-10 w-12" />
            <Skeleton bright className="h-6 w-8" />
          </div>
          <Skeleton bright className="h-3 w-10 mt-2" />
        </div>

        {/* Speech bubble skeleton */}
        <div className="flex-1 w-full relative z-10">
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="bg-topper-black/40 border-2 border-topper-graphite rounded-lg p-4 relative">
            <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-topper-black/40 border-l border-t border-topper-graphite rotate-[-45deg] hidden md:block" />
            <SkeletonText bright lines={3} />
          </div>
        </div>
      </div>

      {/* Side-by-Side Sheet preview and Detailed breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Paper Image Preview Skeleton */}
        <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] relative flex flex-col min-h-[300px]">
          <div className="absolute inset-2 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />
          <div className="flex items-center gap-2 mb-3 border-b border-topper-graphite pb-2 relative z-10">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <div className="flex-1 flex items-center justify-center relative z-10">
            <Skeleton bright className="h-56 w-full max-w-[200px]" />
          </div>
        </div>

        {/* Accordions Skeletons */}
        <div className="space-y-3">
          {/* Detailed Rubrics Scorecard Skeleton */}
          <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-lg p-4 shadow-[2px_2px_0_rgba(0,0,0,1)] space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-topper-graphite/40">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="w-4 h-4" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2 border-b border-topper-graphite/20 last:border-b-0 pb-3 last:pb-0">
                  <div className="flex justify-between items-start">
                    <Skeleton bright className="h-3 w-1/2" />
                    <Skeleton bright className="h-5 w-12" />
                  </div>
                  <Skeleton bright className="h-2.5 w-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Diagram Check Card Skeleton */}
          <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-lg p-4 shadow-[2px_2px_0_rgba(0,0,0,1)] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <Skeleton className="w-4 h-4" />
          </div>

          {/* Text Transcription Card Skeleton */}
          <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-lg p-4 shadow-[2px_2px_0_rgba(0,0,0,1)] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-3.5 w-28" />
            </div>
            <Skeleton className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function StudyPlanSkeleton() {
  return (
    <div className="space-y-6 text-left w-full">
      {/* Header card skeleton */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-topper-graphite pb-4 gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-2/3" />
        </div>
        <Skeleton className="h-10 w-28 shadow-[3px_3px_0_#000]" />
      </div>

      {/* Progress metrics board skeleton */}
      <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-5 flex flex-col md:flex-row items-center gap-6 shadow-[4px_4px_0_#1a1a1a] relative">
        <div className="absolute inset-2 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />
        <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
          <Skeleton circle bright className="w-20 h-20 border-4 border-topper-amber/30" />
        </div>
        <div className="text-center md:text-left space-y-2 flex-1 relative z-10">
          <Skeleton bright className="h-4 w-1/3" />
          <Skeleton bright className="h-3 w-1/2" />
          <Skeleton bright className="h-2.5 w-2/3" />
        </div>
      </div>

      {/* Accordion Weeks List skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((week) => (
          <div key={week} className="bg-topper-charcoal/50 border border-topper-graphite/60 shadow-[3px_3px_0_rgba(0,0,0,0.2)] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-topper-graphite/40 bg-topper-charcoal/30">
              <div className="flex items-center gap-3">
                <Skeleton circle bright className="w-8 h-8" />
                <Skeleton bright className="h-4 w-48" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton bright className="h-5 w-16" />
                <Skeleton className="w-4 h-4" />
              </div>
            </div>
            {week === 1 && (
              <div className="p-4 space-y-3 bg-topper-black/10">
                {[1, 2].map((task) => (
                  <div key={task} className="p-3 border border-topper-graphite/40 bg-topper-charcoal/10 flex items-start gap-4 rounded-md">
                    <Skeleton bright className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton bright className="h-3.5 w-1/3" />
                      <Skeleton bright className="h-2.5 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ScribeResultSkeleton() {
  return (
    <div className="w-full mt-10 space-y-8 text-left">
      {/* Section Divider */}
      <div className="flex items-center gap-4 select-none">
        <div className="h-0.5 bg-topper-graphite flex-1" />
        <Skeleton className="h-4 w-24" />
        <div className="h-0.5 bg-topper-graphite flex-1" />
      </div>

      {/* Side-by-Side Interactive Diff Comparison Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Original Draft Panel */}
        <div className="bg-topper-charcoal border-2 border-red-500/30 rounded-xl p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] relative flex flex-col min-h-[220px]">
          <div className="absolute inset-2 border border-dashed border-red-500/10 pointer-events-none rounded-lg" />
          <div className="flex items-center gap-2 mb-3 border-b border-topper-graphite pb-2 relative z-10">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <Skeleton bright className="h-3.5 w-24" />
          </div>
          <SkeletonText bright lines={4} className="relative z-10 flex-1" />
        </div>

        {/* Polished Draft Panel */}
        <div className="bg-topper-charcoal border-2 border-green-500/30 rounded-xl p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] relative flex flex-col min-h-[220px]">
          <div className="absolute inset-2 border border-dashed border-green-500/10 pointer-events-none rounded-lg" />
          <div className="flex items-center gap-2 mb-3 border-b border-topper-graphite pb-2 relative z-10">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
            <Skeleton bright className="h-3.5 w-24" />
          </div>
          <SkeletonText bright lines={4} className="relative z-10 flex-1" />
        </div>
      </div>

      {/* Mascot / Overall Feedback Speech Skeleton */}
      <div className="w-full flex justify-center py-2">
        <div className="w-full max-w-lg bg-topper-charcoal border-2 border-topper-graphite rounded-lg p-4 relative shadow-[3px_3px_0_rgba(0,0,0,1)]">
          <div className="absolute inset-1.5 border border-dashed border-topper-graphite/40 rounded pointer-events-none" />
          <SkeletonText bright lines={2} className="relative z-10" />
        </div>
      </div>

      {/* Grammar Rule Explanations & Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Rules Explanations (Left, 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-topper-charcoal border-2 border-topper-graphite rounded-lg p-4 shadow-[2px_2px_0_rgba(0,0,0,1)] flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  <Skeleton bright className="h-5 w-16" />
                  <Skeleton bright className="h-3.5 w-24" />
                  <Skeleton bright className="w-3.5 h-3.5" />
                  <Skeleton bright className="h-3.5 w-24" />
                </div>
                <Skeleton className="w-4 h-4" />
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions List (Right, 1 col) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] relative space-y-3">
            <div className="absolute inset-2 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2 relative z-10">
                <Skeleton circle bright className="w-1.5 h-1.5 mt-1.5 flex-shrink-0" />
                <Skeleton bright className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ConceptDojoSkeleton() {
  return (
    <div className="w-full select-none">
      {/* Featured Video Layout Skeleton */}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center py-8 lg:py-12">
          {/* Left: Info */}
          <div className="flex flex-col justify-center space-y-4 text-left">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
            
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton circle className="w-1 h-1" />
              <Skeleton className="h-4 w-16" />
            </div>
            
            <SkeletonText lines={3} className="max-w-md" />
            
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-11 w-32 rounded-full" />
              <Skeleton className="h-11 w-32 rounded-full" />
            </div>
          </div>
          
          {/* Right: Video player shape with a premium neon-amber play button loader */}
          <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-2xl aspect-video w-full relative overflow-hidden shadow-[8px_8px_0_rgba(0,0,0,1)]">
            <div className="absolute inset-2 border border-dashed border-topper-graphite/40 rounded-xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Skeleton circle className="w-16 h-16 border-2 border-topper-amber/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,166,35,0.15)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Videos Grid list skeleton */}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-16 pb-12">
        <div className="h-0.5 bg-topper-graphite/50 mb-8" />
        <Skeleton className="h-4 w-48 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-4 shadow-[4px_4px_0_rgba(0,0,0,1)] space-y-3 relative">
              <div className="absolute inset-1.5 border border-dashed border-topper-graphite/20 pointer-events-none rounded-lg" />
              <div className="aspect-video w-full rounded-lg relative overflow-hidden bg-topper-black">
                <Skeleton bright className="w-full h-full" />
              </div>
              <Skeleton bright className="h-4 w-3/4" />
              <Skeleton bright className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TopicsPageSkeleton() {
  return (
    <div className="min-h-screen bg-topper-black text-topper-off-white overflow-hidden select-none">
      {/* Navigation header skeleton */}
      <nav className="border-b-2 border-topper-graphite px-6 py-4 md:px-12 flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </nav>

      {/* Main Content skeleton */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 space-y-12">
        {/* Owl speech bubble skeleton */}
        <div className="w-full max-w-lg bg-topper-charcoal border-2 border-topper-graphite rounded-lg p-4 relative shadow-[3px_3px_0_rgba(0,0,0,1)]">
          <div className="absolute inset-1.5 border border-dashed border-topper-graphite/40 rounded pointer-events-none" />
          <SkeletonText bright lines={2} className="relative z-10" />
        </div>

        {/* Section title & subtitle skeleton */}
        <div className="space-y-4 text-left">
          <Skeleton className="h-12 w-2/3 md:w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>

        {/* Network Visualization Container Skeleton with custom comic background grid */}
        <div 
          className="relative bg-topper-charcoal border-2 border-topper-graphite rounded-lg aspect-[16/10] max-w-4xl mx-auto flex items-center justify-center shadow-[6px_6px_0_rgba(0,0,0,0.5)]"
          style={{
            backgroundImage: 'radial-gradient(rgba(245, 166, 35, 0.05) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div className="absolute inset-2 border border-dashed border-topper-graphite/40 rounded-lg" />
          
          {/* Shimmering Center Node with amber neon outline */}
          <Skeleton circle className="w-14 h-14 z-10 border-2 border-topper-amber/50 shadow-[0_0_20px_rgba(245,166,35,0.25)]" />
          
          {/* Shimmering Outlying Nodes */}
          {[
            { top: '15%', left: '20%' },
            { top: '20%', left: '75%' },
            { top: '50%', left: '10%' },
            { top: '50%', left: '85%' },
            { top: '80%', left: '25%' },
            { top: '78%', left: '70%' },
          ].map((pos, idx) => (
            <div
              key={idx}
              className="absolute"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="flex flex-col items-center space-y-1">
                <Skeleton circle bright className="w-10 h-10 border-2 border-topper-graphite shadow-[2px_2px_0_rgba(0,0,0,0.3)]" />
                <Skeleton bright className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
