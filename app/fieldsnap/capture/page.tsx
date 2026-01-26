'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadMediaAsset } from '@/lib/supabase/fieldsnap'
// queueForAIAnalysis removed - was fake AI feature
import { getWeatherData } from '@/lib/weather'
import Link from 'next/link'

// ============================================
// TYPES
// ============================================

interface UploadFile {
  id: string
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  progress: number
  url?: string
  thumbnail_url?: string
  error?: string
  metadata?: {
    gps?: GeolocationPosition
    weather?: WeatherData
    exif?: any
  }
}

interface WeatherData {
  condition: string
  temperature: number
  humidity: number
  wind_speed: number
  visibility: number
}

interface Project {
  id: string
  name: string
  client_name: string
  status: string
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function FieldSnapCapturePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Upload State
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadMethod, setUploadMethod] = useState<'local' | 'camera' | 'mobile' | 'api'>('local')

  // Form State
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [captureLocation, setCaptureLocation] = useState(true)
  const [captureWeather, setCaptureWeather] = useState(true)
  // autoAiAnalysis removed - was fake AI feature

  // Projects
  const [projects, setProjects] = useState<Project[]>([])

  // Camera State
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Voice Input State
  const [isListening, setIsListening] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ============================================
  // AUTH & DATA LOADING
  // ============================================

  useEffect(() => {
    checkUser()
    loadProjects()
  }, [])

  async function checkUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/login'
      return
    }

    setUser(user)
    setLoading(false)
  }

  async function loadProjects() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, client_name, status')
      .order('created_at', { ascending: false })

    if (data) {
      setProjects(data)
    }
  }

  // ============================================
  // DRAG & DROP
  // ============================================

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  // ============================================
  // FILE HANDLING
  // ============================================

  async function handleFiles(files: File[]) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    const newUploadFiles: UploadFile[] = await Promise.all(
      imageFiles.map(async (file) => {
        const preview = URL.createObjectURL(file)
        const id = Math.random().toString(36).substring(7)

        const uploadFile: UploadFile = {
          id,
          file,
          preview,
          status: 'pending',
          progress: 0,
          metadata: {}
        }

        // Capture GPS if enabled
        if (captureLocation) {
          try {
            const position = await getCurrentPosition()
            uploadFile.metadata!.gps = position
          } catch (error) {
            console.log('GPS not available:', error)
          }
        }

        // Capture weather if enabled
        if (captureWeather && uploadFile.metadata?.gps) {
          try {
            const weather = await getWeatherData(
              uploadFile.metadata.gps.coords.latitude,
              uploadFile.metadata.gps.coords.longitude
            )
            if (weather) {
              uploadFile.metadata!.weather = weather
            }
          } catch (error) {
            console.log('Weather data not available:', error)
          }
        }

        // Extract EXIF data
        try {
          const exif = await extractExifData(file)
          uploadFile.metadata!.exif = exif
        } catch (error) {
          console.log('EXIF extraction failed:', error)
        }

        return uploadFile
      })
    )

    setUploadFiles(prev => [...prev, ...newUploadFiles])
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
    }
  }

  function removeFile(id: string) {
    setUploadFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  // ============================================
  // GEOLOCATION
  // ============================================

  function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      })
    })
  }

  // ============================================
  // EXIF EXTRACTION
  // ============================================

  async function extractExifData(file: File): Promise<any> {
    // In production, use a library like exifr
    // For now, return basic file metadata
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    }
  }

  // ============================================
  // CAMERA CAPTURE
  // ============================================

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraStream(stream)
        setCameraActive(true)
      }
    } catch (error) {
      console.error('Camera access denied:', error)
      alert('Camera access is required for photo capture')
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
      setCameraActive(false)
    }
  }

  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
        handleFiles([file])
      }
    }, 'image/jpeg', 0.95)
  }

  // ============================================
  // VOICE INPUT
  // ============================================

  function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setDescription(prev => prev ? `${prev} ${transcript}` : transcript)
      setIsListening(false)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  // ============================================
  // TAG MANAGEMENT
  // ============================================

  function addTag(tag: string) {
    const trimmed = tag.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed])
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  function handleTagInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  // ============================================
  // UPLOAD TO SUPABASE
  // ============================================

  async function uploadToStorage(file: File, uploadFile: UploadFile): Promise<{ url: string; thumbnail_url: string }> {
    const supabase = createClient()

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Upload original
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media-assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media-assets')
      .getPublicUrl(fileName)

    // Generate thumbnail (in production, use image processing service)
    const thumbnail_url = publicUrl // For now, use same URL

    return { url: publicUrl, thumbnail_url }
  }

  async function startUpload() {
    if (uploadFiles.length === 0) {
      alert('Please select files to upload')
      return
    }

    if (!selectedProject) {
      alert('Please select a project')
      return
    }

    // Upload each file
    for (const uploadFile of uploadFiles) {
      try {
        // Update status
        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
        ))

        // Upload to storage
        const { url, thumbnail_url } = await uploadToStorage(uploadFile.file, uploadFile)

        // Create media asset record
        const { data, error } = await uploadMediaAsset({
          user_id: user.id,
          project_id: selectedProject,
          url,
          thumbnail_url,
          filename: uploadFile.file.name,
          file_size: uploadFile.file.size,
          mime_type: uploadFile.file.type,
          width: null,
          height: null,
          captured_at: new Date().toISOString(),
          uploaded_at: new Date().toISOString(),
          capture_device: null,
          capture_source: uploadMethod === 'camera' ? 'mobile' : 'mobile',
          description: description || null,
          tags,
          gps_latitude: uploadFile.metadata?.gps?.coords.latitude || null,
          gps_longitude: uploadFile.metadata?.gps?.coords.longitude || null,
          gps_altitude: uploadFile.metadata?.gps?.coords.altitude || null,
          gps_accuracy: uploadFile.metadata?.gps?.coords.accuracy || null,
          gps_heading: uploadFile.metadata?.gps?.coords.heading || null,
          weather_condition: uploadFile.metadata?.weather?.condition || null,
          weather_temperature: uploadFile.metadata?.weather?.temperature || null,
          weather_humidity: uploadFile.metadata?.weather?.humidity || null,
          weather_wind_speed: uploadFile.metadata?.weather?.wind_speed || null,
          weather_visibility: uploadFile.metadata?.weather?.visibility || null,
          exif_data: uploadFile.metadata?.exif || null,
          ai_processing_status: 'completed', // AI features removed
          status: 'pending',
          is_favorite: false,
          is_archived: false,
          album_ids: [],
          ai_tags: [],
          annotations: [],
          safety_issues: [],
          defects_detected: [],
          compliance_status: 'needs_review',
          custom_metadata: {},
          blueprint_coordinates: null,
          blueprint_id: null,
          quality_score: null,
          ai_confidence: null,
          reviewed_by: null,
          review_notes: null,
          ai_analysis: null
        })

        if (error) throw error

        // AI analysis queueing removed - was fake feature

        // Update status to completed
        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'completed', progress: 100, url, thumbnail_url } : f
        ))

      } catch (error: any) {
        console.error('Upload failed:', error)
        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'failed', error: error.message } : f
        ))
      }
    }

    // Show success message
    const successCount = uploadFiles.filter(f => f.status === 'completed').length
    alert(`Successfully uploaded ${successCount} photos`)

    // Redirect to main page
    setTimeout(() => {
      window.location.href = '/fieldsnap'
    }, 2000)
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="https://raw.githubusercontent.com/luckyask/test/main/TSS%20logo%20white.jpg" alt="Logo" />
            {!sidebarCollapsed && <span>The Sierra Suites</span>}
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <i className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'}`}></i>
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            <li>
              <Link href="/dashboard">
                <i className="fas fa-home"></i>
                {!sidebarCollapsed && <span>Dashboard</span>}
              </Link>
            </li>
            <li>
              <Link href="/projects">
                <i className="fas fa-project-diagram"></i>
                {!sidebarCollapsed && <span>Projects</span>}
              </Link>
            </li>
            <li className="active">
              <Link href="/fieldsnap">
                <i className="fas fa-camera"></i>
                {!sidebarCollapsed && <span>FieldSnap</span>}
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              <i className="fas fa-bars"></i>
            </button>
            <h2>Smart Capture</h2>
          </div>
          <div className="topbar-right">
            <Link href="/fieldsnap" className="btn btn-outline">
              <i className="fas fa-arrow-left"></i>
              Back to Gallery
            </Link>
          </div>
        </header>

        <div className="content-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Upload Method Selector */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                className={`btn ${uploadMethod === 'local' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => {
                  setUploadMethod('local')
                  stopCamera()
                }}
              >
                <i className="fas fa-upload"></i>
                Local Files
              </button>
              <button
                className={`btn ${uploadMethod === 'camera' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => {
                  setUploadMethod('camera')
                  startCamera()
                }}
              >
                <i className="fas fa-camera"></i>
                Camera Capture
              </button>
              <button
                className={`btn ${uploadMethod === 'mobile' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => {
                  setUploadMethod('mobile')
                  stopCamera()
                }}
              >
                <i className="fas fa-mobile-alt"></i>
                Mobile App
              </button>
              <button
                className={`btn ${uploadMethod === 'api' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => {
                  setUploadMethod('api')
                  stopCamera()
                }}
              >
                <i className="fas fa-code"></i>
                API Upload
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', alignItems: 'start' }}>
            {/* Left Column - Upload Area */}
            <div>
              {uploadMethod === 'local' && (
                <div
                  className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    border: '2px dashed #ddd',
                    borderRadius: '12px',
                    padding: '3rem',
                    textAlign: 'center',
                    backgroundColor: isDragging ? '#f0f9ff' : '#fafafa',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <i className="fas fa-cloud-upload-alt" style={{ fontSize: '4rem', color: '#FF6B6B', marginBottom: '1rem' }}></i>
                  <h3 style={{ marginBottom: '0.5rem' }}>Drag & Drop Photos Here</h3>
                  <p style={{ color: '#666', marginBottom: '1.5rem' }}>or click to browse</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <i className="fas fa-folder-open"></i>
                    Select Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileInputChange}
                    style={{ display: 'none' }}
                  />
                </div>
              )}

              {uploadMethod === 'camera' && (
                <div style={{ position: 'relative', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{ width: '100%', display: cameraActive ? 'block' : 'none' }}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  {cameraActive ? (
                    <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '1rem' }}>
                      <button className="btn btn-primary" onClick={capturePhoto} style={{ borderRadius: '50%', width: '60px', height: '60px' }}>
                        <i className="fas fa-camera"></i>
                      </button>
                      <button className="btn btn-outline" onClick={stopCamera}>
                        <i className="fas fa-stop"></i>
                        Stop Camera
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#fff' }}>
                      <i className="fas fa-camera" style={{ fontSize: '4rem', marginBottom: '1rem' }}></i>
                      <p>Camera not active</p>
                      <button className="btn btn-primary" onClick={startCamera} style={{ marginTop: '1rem' }}>
                        Start Camera
                      </button>
                    </div>
                  )}
                </div>
              )}

              {uploadMethod === 'mobile' && (
                <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fafafa', borderRadius: '12px' }}>
                  <i className="fas fa-mobile-alt" style={{ fontSize: '4rem', color: '#FF6B6B', marginBottom: '1rem' }}></i>
                  <h3 style={{ marginBottom: '0.5rem' }}>Mobile App Upload</h3>
                  <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                    Download the FieldSnap mobile app to capture photos directly from your device with GPS, weather, and offline support.
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn btn-primary">
                      <i className="fab fa-apple"></i>
                      iOS App
                    </button>
                    <button className="btn btn-primary">
                      <i className="fab fa-android"></i>
                      Android App
                    </button>
                  </div>
                </div>
              )}

              {uploadMethod === 'api' && (
                <div style={{ padding: '2rem', backgroundColor: '#fafafa', borderRadius: '12px' }}>
                  <h3 style={{ marginBottom: '1rem' }}>
                    <i className="fas fa-code"></i>
                    API Upload
                  </h3>
                  <p style={{ color: '#666', marginBottom: '1rem' }}>
                    Integrate FieldSnap into your existing systems with our RESTful API.
                  </p>
                  <div style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: '1.5rem', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.9rem', overflowX: 'auto' }}>
                    <pre style={{ margin: 0 }}>{`POST /api/fieldsnap/upload
Authorization: Bearer YOUR_API_KEY
Content-Type: multipart/form-data

{
  "project_id": "uuid",
  "files": [File],
  "metadata": {
    "description": "string",
    "tags": ["string"],
    "gps": {
      "latitude": number,
      "longitude": number
    }
  }
}`}</pre>
                  </div>
                  <button className="btn btn-outline" style={{ marginTop: '1rem' }}>
                    <i className="fas fa-book"></i>
                    View API Documentation
                  </button>
                </div>
              )}

              {/* Upload Preview */}
              {uploadFiles.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>
                    Files to Upload ({uploadFiles.length})
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                    {uploadFiles.map(file => (
                      <div key={file.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                        <img src={file.preview} alt="" style={{ width: '100%', height: '150px', objectFit: 'cover' }} />

                        {/* Status Badge */}
                        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
                          {file.status === 'pending' && (
                            <span style={{ backgroundColor: '#fbbf24', color: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                              Pending
                            </span>
                          )}
                          {file.status === 'uploading' && (
                            <span style={{ backgroundColor: '#3b82f6', color: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                              Uploading...
                            </span>
                          )}
                          {file.status === 'completed' && (
                            <span style={{ backgroundColor: '#10b981', color: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                              ✓ Done
                            </span>
                          )}
                          {file.status === 'failed' && (
                            <span style={{ backgroundColor: '#ef4444', color: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                              Failed
                            </span>
                          )}
                        </div>

                        {/* Remove Button */}
                        {file.status === 'pending' && (
                          <button
                            onClick={() => removeFile(file.id)}
                            style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        )}

                        {/* Progress Bar */}
                        {file.status === 'uploading' && (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', backgroundColor: '#ddd' }}>
                            <div style={{ width: `${file.progress}%`, height: '100%', backgroundColor: '#FF6B6B', transition: 'width 0.3s ease' }}></div>
                          </div>
                        )}

                        {/* Metadata Icons */}
                        <div style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                          {file.metadata?.gps && (
                            <span style={{ backgroundColor: '#000', color: '#fff', padding: '0.25rem', borderRadius: '4px', fontSize: '0.7rem', opacity: 0.8 }}>
                              <i className="fas fa-map-marker-alt"></i>
                            </span>
                          )}
                          {file.metadata?.weather && (
                            <span style={{ backgroundColor: '#000', color: '#fff', padding: '0.25rem', borderRadius: '4px', fontSize: '0.7rem', opacity: 0.8 }}>
                              <i className="fas fa-cloud-sun"></i>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Metadata Form */}
            <div style={{ position: 'sticky', top: '2rem' }}>
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>
                  <i className="fas fa-cog"></i>
                  Upload Settings
                </h3>

                {/* Project Selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Project *
                  </label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name} - {project.client_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description for these photos..."
                    rows={3}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                  <button
                    className="btn btn-outline btn-small"
                    onClick={startVoiceInput}
                    disabled={isListening}
                    style={{ marginTop: '0.5rem', width: '100%' }}
                  >
                    <i className={`fas fa-microphone ${isListening ? 'fa-pulse' : ''}`}></i>
                    {isListening ? 'Listening...' : 'Voice Input'}
                  </button>
                </div>

                {/* Tags */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Tags
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {tags.map(tag => (
                      <span key={tag} style={{ backgroundColor: '#FF6B6B', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Type and press Enter to add tags..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {['progress', 'issue', 'safety', 'quality', 'inspection'].map(quickTag => (
                      <button
                        key={quickTag}
                        className="btn btn-outline btn-small"
                        onClick={() => addTag(quickTag)}
                      >
                        + {quickTag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Capture Options */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>
                    Capture Options
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={captureLocation}
                      onChange={(e) => setCaptureLocation(e.target.checked)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <i className="fas fa-map-marker-alt" style={{ marginRight: '0.5rem', color: '#FF6B6B' }}></i>
                    Capture GPS Location
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={captureWeather}
                      onChange={(e) => setCaptureWeather(e.target.checked)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <i className="fas fa-cloud-sun" style={{ marginRight: '0.5rem', color: '#FF6B6B' }}></i>
                    Capture Weather Data
                  </label>
                </div>

                {/* Upload Button */}
                <button
                  className="btn btn-primary"
                  onClick={startUpload}
                  disabled={uploadFiles.length === 0 || !selectedProject}
                  style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
                >
                  <i className="fas fa-cloud-upload-alt"></i>
                  Upload {uploadFiles.length} Photo{uploadFiles.length !== 1 ? 's' : ''}
                </button>

                {/* Upload Stats */}
                {uploadFiles.length > 0 && (
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Total Files:</span>
                      <strong>{uploadFiles.length}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Total Size:</span>
                      <strong>{(uploadFiles.reduce((sum, f) => sum + f.file.size, 0) / 1024 / 1024).toFixed(2)} MB</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>With GPS:</span>
                      <strong>{uploadFiles.filter(f => f.metadata?.gps).length}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .upload-dropzone.dragging {
          border-color: #FF6B6B !important;
          background-color: #fff5f5 !important;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #FF6B6B;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .content-container > div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
