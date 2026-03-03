'use client'

// ============================================================
// BEFORE / AFTER COMPARISONS PAGE
// Visual progress documentation for clients & stakeholders
// Based on 04_FIELDSNAP_QUALITY.md spec
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline'

interface Photo {
  id: string
  url: string
  filename: string
  project_name?: string | null
  captured_at: string
}

interface Comparison {
  id?: string
  title: string
  before: Photo
  after: Photo
}

const STEPS = ['select-before', 'select-after', 'name'] as const
type Step = (typeof STEPS)[number]

export default function ComparisonsPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [comparisons, setComparisons] = useState<Comparison[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState<Step>('select-before')
  const [beforePhoto, setBeforePhoto] = useState<Photo | null>(null)
  const [afterPhoto, setAfterPhoto] = useState<Photo | null>(null)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeComparison, setActiveComparison] = useState<Comparison | null>(null)
  const [sliderPos, setSliderPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    setLoading(true)

    // Load photos
    const { data: photoData } = await supabase
      .from('media_assets')
      .select('id, url, filename, project_name, captured_at')
      .order('captured_at', { ascending: false })
      .limit(200)

    if (photoData) setPhotos(photoData)

    // Load saved comparisons (graceful if table doesn't exist)
    try {
      const { data: compData } = await supabase
        .from('photo_comparisons')
        .select(`
          id, title,
          before_photo:before_photo_id(id, url, filename, project_name, captured_at),
          after_photo:after_photo_id(id, url, filename, project_name, captured_at)
        `)
        .order('created_at', { ascending: false })
        .limit(30)

      if (compData) {
        setComparisons(compData
          .filter((c: any) => c.before_photo && c.after_photo)
          .map((c: any) => ({
            id: c.id,
            title: c.title,
            before: c.before_photo,
            after: c.after_photo,
          }))
        )
      }
    } catch {
      // photo_comparisons table may not exist yet — that's fine
    }

    setLoading(false)
  }

  function startCreating() {
    setCreating(true)
    setStep('select-before')
    setBeforePhoto(null)
    setAfterPhoto(null)
    setTitle('')
  }

  function cancel() {
    setCreating(false)
  }

  function selectBefore(photo: Photo) {
    setBeforePhoto(photo)
    setStep('select-after')
  }

  function selectAfter(photo: Photo) {
    setAfterPhoto(photo)
    setStep('name')
  }

  async function saveComparison() {
    if (!beforePhoto || !afterPhoto || !title.trim()) return
    setSaving(true)

    const supabase = createClient()
    const newComp: Comparison = {
      title: title.trim(),
      before: beforePhoto,
      after: afterPhoto,
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('photo_comparisons')
        .insert({
          before_photo_id: beforePhoto.id,
          after_photo_id: afterPhoto.id,
          title: title.trim(),
          created_by: user?.id,
        })
        .select('id')
        .single()

      if (data) newComp.id = data.id
    } catch {
      // Table may not exist yet — still add locally
    }

    setComparisons(prev => [newComp, ...prev])
    setCreating(false)
    setActiveComparison(newComp)
    setSliderPos(50)
    setSaving(false)
  }

  // Drag-to-scrub slider
  function handleSliderMouseMove(e: React.MouseEvent) {
    if (!dragging || !sliderRef.current) return
    const rect = sliderRef.current.getBoundingClientRect()
    const pos = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100))
    setSliderPos(pos)
  }

  function stepLabel(s: Step) {
    if (s === 'select-before') return '1  Select "Before" photo'
    if (s === 'select-after') return '2  Select "After" photo'
    return '3  Name & save'
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/fieldsnap"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Back to FieldSnap
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Before / After Comparisons</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Document progress visually — great for client reports and marketing
            </p>
          </div>
          <button
            onClick={startCreating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <PlusIcon className="h-4 w-4" />
            New Comparison
          </button>
        </div>

        {/* Active comparison viewer */}
        {activeComparison && (
          <div className="bg-white border rounded-xl shadow-sm mb-6 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">{activeComparison.title}</h2>
              <button
                onClick={() => setActiveComparison(null)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                ✕ Close
              </button>
            </div>

            {/* Slider viewer */}
            <div
              ref={sliderRef}
              className="relative select-none cursor-col-resize overflow-hidden"
              style={{ height: 420 }}
              onMouseDown={() => setDragging(true)}
              onMouseMove={handleSliderMouseMove}
              onMouseUp={() => setDragging(false)}
              onMouseLeave={() => setDragging(false)}
            >
              {/* After (full width background) */}
              <img
                src={activeComparison.after.url}
                alt="after"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
              {/* Before (clipped to left portion) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={activeComparison.before.url}
                  alt="before"
                  className="absolute inset-0 h-full object-cover"
                  style={{ width: `${(100 * 100) / sliderPos}%` }}
                  draggable={false}
                />
              </div>

              {/* Divider line */}
              <div
                className="absolute top-0 bottom-0 flex flex-col items-center"
                style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-0.5 h-full bg-white shadow-xl" />
                <div className="absolute top-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full shadow-xl flex items-center justify-center text-gray-600 font-bold text-sm pointer-events-none">
                  ⇔
                </div>
              </div>

              {/* Labels */}
              <span className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded font-semibold">
                BEFORE
              </span>
              <span className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded font-semibold">
                AFTER
              </span>
            </div>

            {/* Range slider fallback */}
            <div className="px-6 py-4">
              <input
                type="range"
                min={5}
                max={95}
                value={sliderPos}
                onChange={e => setSliderPos(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>← Before</span>
                <span>After →</span>
              </div>
            </div>
          </div>
        )}

        {/* Creation flow */}
        {creating && (
          <div className="bg-white border rounded-xl shadow-sm p-6 mb-6">
            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-6">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i <= stepIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      step === s ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  >
                    {stepLabel(s)}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="text-gray-200 ml-1">›</span>
                  )}
                </div>
              ))}
            </div>

            {/* Step content */}
            {(step === 'select-before' || step === 'select-after') && (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  {step === 'select-before'
                    ? 'Pick the photo taken before work began:'
                    : 'Now pick the photo showing completed work:'}
                </p>

                {loading ? (
                  <div className="text-center py-12 text-gray-400">Loading photos...</div>
                ) : photos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No photos yet.{' '}
                    <Link href="/fieldsnap/capture" className="text-blue-600 hover:underline">
                      Upload some first →
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-72 overflow-y-auto pr-1">
                    {photos
                      .filter(p => step === 'select-after' ? p.id !== beforePhoto?.id : true)
                      .map(photo => (
                        <button
                          key={photo.id}
                          onClick={() =>
                            step === 'select-before' ? selectBefore(photo) : selectAfter(photo)
                          }
                          className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all group relative"
                          title={photo.filename}
                        >
                          <img
                            src={photo.url}
                            alt={photo.filename}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </button>
                      ))}
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={cancel}
                    className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {step === 'name' && beforePhoto && afterPhoto && (
              <div>
                {/* Preview */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Before</p>
                    <img
                      src={beforePhoto.url}
                      alt="before"
                      className="w-full h-40 object-cover rounded-lg border"
                    />
                    <p className="text-xs text-gray-400 mt-1 truncate">{beforePhoto.filename}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">After</p>
                    <img
                      src={afterPhoto.url}
                      alt="after"
                      className="w-full h-40 object-cover rounded-lg border"
                    />
                    <p className="text-xs text-gray-400 mt-1 truncate">{afterPhoto.filename}</p>
                  </div>
                </div>

                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comparison title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveComparison()}
                  placeholder="e.g. Kitchen – Renovation Complete, Floor 3 North Wing"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  autoFocus
                />

                <div className="flex gap-3">
                  <button
                    onClick={saveComparison}
                    disabled={!title.trim() || saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Comparison'}
                  </button>
                  <button
                    onClick={() => setStep('select-after')}
                    className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={cancel}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comparisons grid */}
        {!loading && comparisons.length === 0 && !creating ? (
          <div className="bg-white border rounded-xl p-16 text-center">
            <div className="text-5xl mb-4">🖼️</div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              No comparisons yet
            </h3>
            <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
              Create before/after comparisons to document project progress and impress clients with visual proof of work.
            </p>
            <button
              onClick={startCreating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4" />
              Create First Comparison
            </button>
          </div>
        ) : comparisons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisons.map((comp, i) => (
              <button
                key={comp.id || i}
                onClick={() => { setActiveComparison(comp); setSliderPos(50) }}
                className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition-shadow text-left group"
              >
                {/* Side-by-side thumbnail */}
                <div className="grid grid-cols-2 h-36 relative">
                  <div className="relative overflow-hidden">
                    <img
                      src={comp.before.url}
                      alt="before"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      Before
                    </span>
                  </div>
                  <div className="relative overflow-hidden">
                    <img
                      src={comp.after.url}
                      alt="after"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      After
                    </span>
                  </div>
                  {/* Divider */}
                  <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white shadow" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-900 truncate">{comp.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Click to view slider comparison</p>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
