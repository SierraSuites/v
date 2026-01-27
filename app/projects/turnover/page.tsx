'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { clientCommunication, formatCurrency, formatDate } from '@/lib/client-communication-integration'

interface TurnoverPackage {
  id: string
  project_id: string
  package_name: string
  package_type: 'complete' | 'interim' | 'warranty_only'
  warranty_documents: WarrantyDocument[]
  maintenance_schedules: MaintenanceItem[]
  asbuilt_drawings: Document[]
  owner_manuals: Document[]
  inspection_reports: Document[]
  permits_certificates: Document[]
  emergency_contacts: Contact[]
  subcontractor_contacts: Contact[]
  supplier_contacts: Contact[]
  custom_sections: CustomSection[]
  generated_pdf_url: string | null
  package_size_bytes: number
  delivered_to: string
  delivered_at: string | null
  delivery_method: 'email' | 'usb_drive' | 'cloud_link' | 'printed_binder' | null
  status: 'draft' | 'review' | 'approved' | 'delivered'
  notes: string
}

interface WarrantyDocument {
  id: string
  item: string
  category: string
  manufacturer: string
  warranty_period: string
  expiration_date: string
  coverage_details: string
  claim_process: string
  document_url: string | null
}

interface MaintenanceItem {
  id: string
  system: string
  task: string
  frequency: string
  season: string
  instructions: string
  estimated_cost: number
  professional_required: boolean
}

interface Document {
  id: string
  name: string
  type: string
  url: string | null
  size_bytes: number
  uploaded_at: string
}

interface Contact {
  id: string
  name: string
  company: string
  role: string
  phone: string
  email: string
  hours: string
  notes: string
}

interface CustomSection {
  id: string
  title: string
  content: string
  order: number
}

export default function ProjectTurnoverPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')

  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string>(projectId || '')
  const [turnoverPackage, setTurnoverPackage] = useState<TurnoverPackage | null>(null)
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showDeliverModal, setShowDeliverModal] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadTurnoverPackage(selectedProject)
    }
  }, [selectedProject])

  const loadProjects = async () => {
    // Demo projects
    const demoProjects = [
      { id: '1', name: 'Custom Home - Oakmont Drive', client_name: 'Johnson Family', status: 'completed', completion_date: '2025-12-15' },
      { id: '2', name: 'Downtown Loft Conversion', client_name: 'Urban Living Partners', status: 'near_completion', completion_date: '2026-01-10' }
    ]
    setProjects(demoProjects)

    if (demoProjects.length > 0 && !selectedProject) {
      setSelectedProject(demoProjects[0].id)
    }
  }

  const loadTurnoverPackage = async (projectId: string) => {
    // Demo turnover package
    const demoPackage: TurnoverPackage = {
      id: '1',
      project_id: projectId,
      package_name: 'Custom Home - Oakmont Drive - Final Turnover Package',
      package_type: 'complete',
      warranty_documents: [
        {
          id: 'w1',
          item: 'Roofing System',
          category: 'Exterior',
          manufacturer: 'CertainTeed',
          warranty_period: '25 years',
          expiration_date: '2050-12-15',
          coverage_details: 'Full material and labor coverage for 10 years, then prorated material coverage for remaining 15 years',
          claim_process: 'Contact manufacturer at 1-800-ROOFING or visit certainteed.com/warranty. Have installation certificate ready.',
          document_url: null
        },
        {
          id: 'w2',
          item: 'HVAC System',
          category: 'Mechanical',
          manufacturer: 'Carrier',
          warranty_period: '10 years parts, 2 years labor',
          expiration_date: '2035-12-15',
          coverage_details: 'Parts covered for 10 years from installation. Labor covered for 2 years. Annual maintenance required to maintain warranty.',
          claim_process: 'Contact installer (Metro HVAC) at (555) 123-4567 for service within first 2 years. After that, contact Carrier directly.',
          document_url: null
        },
        {
          id: 'w3',
          item: 'Windows & Doors',
          category: 'Exterior',
          manufacturer: 'Andersen',
          warranty_period: '20 years',
          expiration_date: '2045-12-15',
          coverage_details: 'Lifetime warranty on glass breakage. 20 years on hardware and mechanisms. Does not cover damage from improper installation or acts of nature.',
          claim_process: 'Register products at andersenwindows.com within 30 days. Contact customer service for claims.',
          document_url: null
        },
        {
          id: 'w4',
          item: 'Kitchen Appliances',
          category: 'Interior',
          manufacturer: 'KitchenAid',
          warranty_period: '1-5 years (varies by appliance)',
          expiration_date: '2030-12-15',
          coverage_details: 'Refrigerator: 5 years sealed system, 1 year parts/labor. Range: 1 year full. Dishwasher: 1 year full.',
          claim_process: 'Call KitchenAid service at 1-800-KITCHENAID. Have model and serial numbers ready.',
          document_url: null
        },
        {
          id: 'w5',
          item: 'Structural Components',
          category: 'Structure',
          manufacturer: 'The Sierra Suites Construction',
          warranty_period: '10 years',
          expiration_date: '2035-12-15',
          coverage_details: 'Full coverage for structural defects including foundation, framing, and load-bearing components.',
          claim_process: 'Contact us directly at (555) 987-6543 or warranty@sierrasuites.com',
          document_url: null
        },
        {
          id: 'w6',
          item: 'Workmanship',
          category: 'General',
          manufacturer: 'The Sierra Suites Construction',
          warranty_period: '1 year',
          expiration_date: '2026-12-15',
          coverage_details: 'Coverage for defects in workmanship and materials. Does not cover normal wear and tear or owner modifications.',
          claim_process: 'Report issues to us within warranty period. We will assess and repair at no cost if covered.',
          document_url: null
        }
      ],
      maintenance_schedules: [
        {
          id: 'm1',
          system: 'HVAC',
          task: 'Replace Air Filters',
          frequency: 'Monthly',
          season: 'Year-round',
          instructions: 'Turn off system. Open filter compartment. Remove old filter and insert new 20x25x1 MERV 11 filter. Ensure arrow points toward airflow.',
          estimated_cost: 15,
          professional_required: false
        },
        {
          id: 'm2',
          system: 'HVAC',
          task: 'Professional System Service',
          frequency: 'Annually',
          season: 'Spring',
          instructions: 'Schedule professional HVAC service before cooling season. Tech will clean coils, check refrigerant, test components.',
          estimated_cost: 175,
          professional_required: true
        },
        {
          id: 'm3',
          system: 'Gutters',
          task: 'Clean Gutters and Downspouts',
          frequency: 'Twice yearly',
          season: 'Spring & Fall',
          instructions: 'Remove leaves and debris. Flush with hose. Check for proper drainage and repair any leaks.',
          estimated_cost: 150,
          professional_required: false
        },
        {
          id: 'm4',
          system: 'Roof',
          task: 'Roof Inspection',
          frequency: 'Annually',
          season: 'Fall',
          instructions: 'Inspect for damaged shingles, flashing issues, or moss growth. Check attic for signs of leaks.',
          estimated_cost: 200,
          professional_required: true
        },
        {
          id: 'm5',
          system: 'Plumbing',
          task: 'Water Heater Flush',
          frequency: 'Annually',
          season: 'Spring',
          instructions: 'Turn off power/gas. Attach hose to drain valve. Flush sediment until water runs clear. Refill and restart.',
          estimated_cost: 0,
          professional_required: false
        },
        {
          id: 'm6',
          system: 'Exterior',
          task: 'Pressure Wash Siding',
          frequency: 'Annually',
          season: 'Summer',
          instructions: 'Use low pressure (1500 PSI max) to clean siding. Work from bottom to top. Avoid windows and electrical.',
          estimated_cost: 300,
          professional_required: false
        },
        {
          id: 'm7',
          system: 'Landscaping',
          task: 'Irrigation System Winterization',
          frequency: 'Annually',
          season: 'Fall',
          instructions: 'Blow out sprinkler lines before first freeze. Shut off water supply. Open valves to drain residual water.',
          estimated_cost: 125,
          professional_required: true
        },
        {
          id: 'm8',
          system: 'Interior',
          task: 'Drain Snake Test',
          frequency: 'Quarterly',
          season: 'Year-round',
          instructions: 'Run hot water through all drains. If slow drainage, use drain snake or enzyme cleaner. Never use chemical drain cleaners.',
          estimated_cost: 0,
          professional_required: false
        }
      ],
      asbuilt_drawings: [
        { id: 'd1', name: 'Foundation Plan - As-Built.pdf', type: 'PDF', url: null, size_bytes: 2500000, uploaded_at: '2025-12-10' },
        { id: 'd2', name: 'Framing Plan - As-Built.pdf', type: 'PDF', url: null, size_bytes: 3200000, uploaded_at: '2025-12-10' },
        { id: 'd3', name: 'Electrical Plan - As-Built.pdf', type: 'PDF', url: null, size_bytes: 1800000, uploaded_at: '2025-12-10' },
        { id: 'd4', name: 'Plumbing Plan - As-Built.pdf', type: 'PDF', url: null, size_bytes: 1600000, uploaded_at: '2025-12-10' },
        { id: 'd5', name: 'HVAC Plan - As-Built.pdf', type: 'PDF', url: null, size_bytes: 1400000, uploaded_at: '2025-12-10' }
      ],
      owner_manuals: [
        { id: 'om1', name: 'HVAC System Manual.pdf', type: 'PDF', url: null, size_bytes: 4500000, uploaded_at: '2025-12-10' },
        { id: 'om2', name: 'Water Heater Manual.pdf', type: 'PDF', url: null, size_bytes: 1200000, uploaded_at: '2025-12-10' },
        { id: 'om3', name: 'Kitchen Appliances Guide.pdf', type: 'PDF', url: null, size_bytes: 8500000, uploaded_at: '2025-12-10' },
        { id: 'om4', name: 'Garage Door Opener Manual.pdf', type: 'PDF', url: null, size_bytes: 900000, uploaded_at: '2025-12-10' }
      ],
      inspection_reports: [
        { id: 'ir1', name: 'Foundation Inspection - Passed.pdf', type: 'PDF', url: null, size_bytes: 850000, uploaded_at: '2025-06-15' },
        { id: 'ir2', name: 'Framing Inspection - Passed.pdf', type: 'PDF', url: null, size_bytes: 920000, uploaded_at: '2025-08-20' },
        { id: 'ir3', name: 'MEP Rough-In Inspection - Passed.pdf', type: 'PDF', url: null, size_bytes: 1100000, uploaded_at: '2025-09-30' },
        { id: 'ir4', name: 'Final Inspection - Passed.pdf', type: 'PDF', url: null, size_bytes: 1300000, uploaded_at: '2025-12-12' }
      ],
      permits_certificates: [
        { id: 'pc1', name: 'Building Permit.pdf', type: 'PDF', url: null, size_bytes: 450000, uploaded_at: '2025-05-01' },
        { id: 'pc2', name: 'Certificate of Occupancy.pdf', type: 'PDF', url: null, size_bytes: 380000, uploaded_at: '2025-12-13' },
        { id: 'pc3', name: 'Energy Compliance Certificate.pdf', type: 'PDF', url: null, size_bytes: 520000, uploaded_at: '2025-12-12' }
      ],
      emergency_contacts: [
        {
          id: 'ec1',
          name: 'Emergency Services',
          company: '911',
          role: 'Police/Fire/Medical',
          phone: '911',
          email: '',
          hours: '24/7',
          notes: 'For life-threatening emergencies only'
        },
        {
          id: 'ec2',
          name: 'Gas Company Emergency',
          company: 'Metro Gas',
          role: 'Gas Leak Response',
          phone: '1-800-GAS-LEAK',
          email: 'emergency@metrogas.com',
          hours: '24/7',
          notes: 'If you smell gas, evacuate and call immediately'
        },
        {
          id: 'ec3',
          name: 'Electric Company Emergency',
          company: 'City Electric',
          role: 'Power Outage/Downed Lines',
          phone: '1-800-NO-POWER',
          email: 'outages@cityelectric.com',
          hours: '24/7',
          notes: 'For power outages or downed power lines'
        },
        {
          id: 'ec4',
          name: 'Water Company Emergency',
          company: 'City Water District',
          role: 'Water Main Breaks',
          phone: '(555) 123-WATER',
          email: 'emergency@citywater.gov',
          hours: '24/7',
          notes: 'For water main breaks or service issues'
        }
      ],
      subcontractor_contacts: [
        {
          id: 'sc1',
          name: 'Mike Torres',
          company: 'Metro HVAC',
          role: 'HVAC Service',
          phone: '(555) 123-4567',
          email: 'service@metrohvac.com',
          hours: 'Mon-Fri 8am-5pm, Emergency 24/7',
          notes: 'Installed your HVAC system. 2-year labor warranty.'
        },
        {
          id: 'sc2',
          name: 'Advanced Plumbing',
          company: 'Advanced Plumbing Co.',
          role: 'Plumbing Service',
          phone: '(555) 234-5678',
          email: 'info@advancedplumbing.com',
          hours: 'Mon-Sat 7am-6pm',
          notes: 'Installed all plumbing. 1-year warranty on labor.'
        },
        {
          id: 'sc3',
          name: 'Bright Electric',
          company: 'Bright Electric Inc.',
          role: 'Electrical Service',
          phone: '(555) 345-6789',
          email: 'service@brightelectric.com',
          hours: 'Mon-Fri 8am-5pm',
          notes: 'Installed electrical system. Licensed electrician.'
        }
      ],
      supplier_contacts: [
        {
          id: 'sup1',
          name: 'BuildRight Supply',
          company: 'BuildRight Supply',
          role: 'Materials Supplier',
          phone: '(555) 456-7890',
          email: 'sales@buildrightsupply.com',
          hours: 'Mon-Sat 6am-6pm',
          notes: 'Supplied lumber, drywall, and hardware'
        },
        {
          id: 'sup2',
          name: 'Appliance Gallery',
          company: 'Appliance Gallery',
          role: 'Appliance Sales/Service',
          phone: '(555) 567-8901',
          email: 'service@appliancegallery.com',
          hours: 'Mon-Sat 9am-7pm, Sun 10am-5pm',
          notes: 'Supplied all kitchen appliances'
        }
      ],
      custom_sections: [],
      generated_pdf_url: null,
      package_size_bytes: 0,
      delivered_to: '',
      delivered_at: null,
      delivery_method: null,
      status: 'draft',
      notes: ''
    }

    setTurnoverPackage(demoPackage)
  }

  const handleGeneratePackage = async (format: string) => {
    setShowGenerateModal(false)
    alert(`Generating ${format.toUpperCase()} turnover package... This may take 30-60 seconds.`)

    setTimeout(() => {
      alert('✅ Turnover package generated successfully!')
      if (turnoverPackage) {
        setTurnoverPackage({
          ...turnoverPackage,
          generated_pdf_url: '/downloads/turnover-package.pdf',
          package_size_bytes: 45000000,
          status: 'review'
        })
      }
    }, 3000)
  }

  const handleDeliverPackage = async (method: string) => {
    setShowDeliverModal(false)
    alert(`Delivering turnover package via ${method}...`)

    setTimeout(() => {
      if (turnoverPackage) {
        setTurnoverPackage({
          ...turnoverPackage,
          delivered_to: 'Sarah Johnson (sarah.johnson@email.com)',
          delivered_at: new Date().toISOString(),
          delivery_method: method as any,
          status: 'delivered'
        })
      }
      alert('✅ Turnover package delivered successfully!')
    }, 2000)
  }

  const selectedProjectData = projects.find(p => p.id === selectedProject)
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (!turnoverPackage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 via-emerald-50 to-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Turnover Package...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-emerald-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                📦 Project Turnover Package
              </h1>
              <p className="text-lg text-gray-600">
                Final delivery documentation for completed projects
              </p>
            </div>
            <div className="flex gap-3">
              {turnoverPackage.status === 'draft' || turnoverPackage.status === 'review' ? (
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  📄 Generate Package
                </button>
              ) : null}
              {turnoverPackage.status === 'review' || turnoverPackage.generated_pdf_url ? (
                <button
                  onClick={() => setShowDeliverModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  📤 Deliver to Client
                </button>
              ) : null}
            </div>
          </div>

          {/* Status Banner */}
          <div className={`p-6 rounded-lg border-l-4 ${
            turnoverPackage.status === 'delivered' ? 'bg-green-100 border-green-600' :
            turnoverPackage.status === 'review' ? 'bg-blue-100 border-blue-600' :
            'bg-yellow-100 border-yellow-600'
          }`}>
            <div className="flex items-start gap-4">
              <div className="text-3xl">
                {turnoverPackage.status === 'delivered' ? '✅' :
                 turnoverPackage.status === 'review' ? '👁️' : '📝'}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">
                  Package Status: {turnoverPackage.status.charAt(0).toUpperCase() + turnoverPackage.status.slice(1)}
                </h3>
                <p className="text-gray-700">
                  {turnoverPackage.status === 'delivered'
                    ? `Delivered to ${turnoverPackage.delivered_to} on ${formatDate(turnoverPackage.delivered_at!)} via ${turnoverPackage.delivery_method?.replace('_', ' ')}`
                    : turnoverPackage.status === 'review'
                    ? 'Package generated and ready for review. Preview before delivering to client.'
                    : 'Complete all sections below, then generate the final turnover package for your client.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Selection */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Project
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-medium"
          >
            <option value="">Choose a project...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name} - {project.client_name} ({project.status})
              </option>
            ))}
          </select>
        </div>

        {/* Package Stats */}
        <div className="grid grid-cols-6 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-600">
            <div className="text-3xl mb-2">📜</div>
            <div className="text-3xl font-bold text-gray-900">{turnoverPackage.warranty_documents.length}</div>
            <div className="text-sm text-gray-600">Warranties</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-600">
            <div className="text-3xl mb-2">🔧</div>
            <div className="text-3xl font-bold text-gray-900">{turnoverPackage.maintenance_schedules.length}</div>
            <div className="text-sm text-gray-600">Maintenance Tasks</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-600">
            <div className="text-3xl mb-2">📐</div>
            <div className="text-3xl font-bold text-gray-900">{turnoverPackage.asbuilt_drawings.length}</div>
            <div className="text-sm text-gray-600">As-Built Drawings</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-600">
            <div className="text-3xl mb-2">📚</div>
            <div className="text-3xl font-bold text-gray-900">{turnoverPackage.owner_manuals.length}</div>
            <div className="text-sm text-gray-600">Owner Manuals</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-600">
            <div className="text-3xl mb-2">📞</div>
            <div className="text-3xl font-bold text-gray-900">
              {turnoverPackage.emergency_contacts.length + turnoverPackage.subcontractor_contacts.length}
            </div>
            <div className="text-sm text-gray-600">Key Contacts</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-pink-600">
            <div className="text-3xl mb-2">💾</div>
            <div className="text-xl font-bold text-gray-900">
              {formatBytes(turnoverPackage.package_size_bytes || 0)}
            </div>
            <div className="text-sm text-gray-600">Package Size</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b overflow-x-auto">
            {[
              { key: 'overview', label: 'Overview', icon: '📋' },
              { key: 'warranties', label: 'Warranties', icon: '📜' },
              { key: 'maintenance', label: 'Maintenance', icon: '🔧' },
              { key: 'documents', label: 'Documents', icon: '📄' },
              { key: 'contacts', label: 'Contacts', icon: '📞' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 font-semibold border-b-4 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Package Overview</h2>

                <div className="space-y-6">
                  <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded">
                    <h3 className="font-bold text-gray-900 mb-2">What's Included in This Package:</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>✓ {turnoverPackage.warranty_documents.length} Warranty Documents (structural, HVAC, appliances, etc.)</li>
                      <li>✓ {turnoverPackage.maintenance_schedules.length} Maintenance Tasks with Schedule</li>
                      <li>✓ {turnoverPackage.asbuilt_drawings.length} As-Built Drawings showing final construction</li>
                      <li>✓ {turnoverPackage.owner_manuals.length} Owner's Manuals for systems and appliances</li>
                      <li>✓ {turnoverPackage.inspection_reports.length} Inspection Reports (all passed)</li>
                      <li>✓ {turnoverPackage.permits_certificates.length} Permits and Certificates (including CO)</li>
                      <li>✓ Emergency Contact List</li>
                      <li>✓ Subcontractor and Supplier Contact Information</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded">
                    <h3 className="font-bold text-gray-900 mb-2">Next Steps:</h3>
                    <ol className="space-y-2 text-gray-700 list-decimal list-inside">
                      <li>Review all sections to ensure completeness</li>
                      <li>Click "Generate Package" to create final PDF/binder</li>
                      <li>Deliver to client via preferred method</li>
                      <li>Schedule final walkthrough if not yet complete</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Warranties Tab */}
            {activeTab === 'warranties' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Warranty Information</h2>

                <div className="space-y-4">
                  {turnoverPackage.warranty_documents.map((warranty) => (
                    <div key={warranty.id} className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{warranty.item}</h3>
                          <div className="text-sm text-gray-600 mt-1">
                            {warranty.manufacturer} • {warranty.category}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">{warranty.warranty_period}</div>
                          <div className="text-xs text-gray-600">Expires: {formatDate(warranty.expiration_date)}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-1">Coverage Details:</div>
                          <div className="text-sm text-gray-700">{warranty.coverage_details}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-1">How to File a Claim:</div>
                          <div className="text-sm text-gray-700">{warranty.claim_process}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Maintenance Tab */}
            {activeTab === 'maintenance' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Maintenance Schedule</h2>

                <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded">
                  <div className="font-semibold text-gray-900 mb-1">⚠️ Important</div>
                  <div className="text-sm text-gray-700">
                    Regular maintenance is essential to protect your investment and maintain warranties.
                    Some warranties require proof of annual professional service.
                  </div>
                </div>

                <div className="space-y-4">
                  {turnoverPackage.maintenance_schedules.map((item) => (
                    <div key={item.id} className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{item.task}</h3>
                          <div className="text-sm text-gray-600 mt-1">{item.system}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-blue-600">{item.frequency}</div>
                          <div className="text-xs text-gray-600">{item.season}</div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Instructions:</div>
                        <div className="text-sm text-gray-700">{item.instructions}</div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-300">
                        <div className="flex items-center gap-4">
                          {item.professional_required ? (
                            <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                              👨‍🔧 Professional Required
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                              ✓ DIY Friendly
                            </span>
                          )}
                          <div className="text-sm text-gray-600">
                            Est. Cost: {item.estimated_cost === 0 ? 'Free' : formatCurrency(item.estimated_cost)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Project Documents</h2>

                {/* As-Built Drawings */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">📐 As-Built Drawings</h3>
                  <div className="space-y-2">
                    {turnoverPackage.asbuilt_drawings.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📄</span>
                          <div>
                            <div className="font-semibold text-gray-900">{doc.name}</div>
                            <div className="text-xs text-gray-600">
                              {formatBytes(doc.size_bytes)} • Uploaded {formatDate(doc.uploaded_at)}
                            </div>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Owner Manuals */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">📚 Owner's Manuals</h3>
                  <div className="space-y-2">
                    {turnoverPackage.owner_manuals.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📖</span>
                          <div>
                            <div className="font-semibold text-gray-900">{doc.name}</div>
                            <div className="text-xs text-gray-600">
                              {formatBytes(doc.size_bytes)} • Uploaded {formatDate(doc.uploaded_at)}
                            </div>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inspection Reports */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">✅ Inspection Reports</h3>
                  <div className="space-y-2">
                    {turnoverPackage.inspection_reports.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">✅</span>
                          <div>
                            <div className="font-semibold text-gray-900">{doc.name}</div>
                            <div className="text-xs text-gray-600">
                              {formatBytes(doc.size_bytes)} • {formatDate(doc.uploaded_at)}
                            </div>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Permits & Certificates */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">🏛️ Permits & Certificates</h3>
                  <div className="space-y-2">
                    {turnoverPackage.permits_certificates.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🏛️</span>
                          <div>
                            <div className="font-semibold text-gray-900">{doc.name}</div>
                            <div className="text-xs text-gray-600">
                              {formatBytes(doc.size_bytes)} • {formatDate(doc.uploaded_at)}
                            </div>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm">
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Important Contacts</h2>

                {/* Emergency Contacts */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">🚨 Emergency Contacts</h3>
                  <div className="space-y-3">
                    {turnoverPackage.emergency_contacts.map((contact) => (
                      <div key={contact.id} className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-gray-900 text-lg">{contact.name}</div>
                            <div className="text-sm text-gray-600">{contact.company}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-red-600 text-xl">{contact.phone}</div>
                            <div className="text-xs text-gray-600">{contact.hours}</div>
                          </div>
                        </div>
                        {contact.notes && (
                          <div className="mt-2 pt-2 border-t border-red-200 text-sm text-gray-700">
                            ⚠️ {contact.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subcontractor Contacts */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">👷 Subcontractor Contacts</h3>
                  <div className="space-y-3">
                    {turnoverPackage.subcontractor_contacts.map((contact) => (
                      <div key={contact.id} className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="font-bold text-gray-900">{contact.name}</div>
                            <div className="text-sm text-gray-600">{contact.company}</div>
                            <div className="text-sm text-blue-700 font-semibold">{contact.role}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">{contact.phone}</div>
                            <div className="text-sm text-gray-600">{contact.email}</div>
                            <div className="text-xs text-gray-600">{contact.hours}</div>
                          </div>
                        </div>
                        {contact.notes && (
                          <div className="mt-2 pt-2 border-t border-blue-200 text-sm text-gray-700">
                            💡 {contact.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supplier Contacts */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">🏪 Supplier Contacts</h3>
                  <div className="space-y-3">
                    {turnoverPackage.supplier_contacts.map((contact) => (
                      <div key={contact.id} className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="font-bold text-gray-900">{contact.name}</div>
                            <div className="text-sm text-gray-600">{contact.role}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">{contact.phone}</div>
                            <div className="text-sm text-gray-600">{contact.email}</div>
                            <div className="text-xs text-gray-600">{contact.hours}</div>
                          </div>
                        </div>
                        {contact.notes && (
                          <div className="mt-2 pt-2 border-t border-gray-200 text-sm text-gray-700">
                            {contact.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generate Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Generate Turnover Package
                </h2>

                <div className="mb-6">
                  <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-2">Package Contents:</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>✓ Complete warranty documentation</li>
                      <li>✓ Maintenance schedule calendar</li>
                      <li>✓ All as-built drawings and plans</li>
                      <li>✓ Owner's manuals for all systems</li>
                      <li>✓ Inspection reports and certificates</li>
                      <li>✓ Emergency and service contact list</li>
                      <li>✓ Professional binder formatting with tabs</li>
                    </ul>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-3">Choose Format:</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleGeneratePackage('pdf')}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 text-left"
                    >
                      <div className="text-3xl mb-2">📕</div>
                      <div className="font-bold text-gray-900 mb-1">Digital PDF</div>
                      <div className="text-sm text-gray-600">Searchable PDF ready for email or cloud storage</div>
                    </button>

                    <button
                      onClick={() => handleGeneratePackage('print')}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 text-left"
                    >
                      <div className="text-3xl mb-2">📘</div>
                      <div className="font-bold text-gray-900 mb-1">Print-Ready Binder</div>
                      <div className="text-sm text-gray-600">Formatted for 3-ring binder with tabs</div>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deliver Modal */}
        {showDeliverModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Deliver Turnover Package
                </h2>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Choose Delivery Method:</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleDeliverPackage('email')}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left"
                    >
                      <div className="text-3xl mb-2">📧</div>
                      <div className="font-bold text-gray-900 mb-1">Email</div>
                      <div className="text-sm text-gray-600">Send PDF via email to client</div>
                    </button>

                    <button
                      onClick={() => handleDeliverPackage('cloud_link')}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left"
                    >
                      <div className="text-3xl mb-2">☁️</div>
                      <div className="font-bold text-gray-900 mb-1">Cloud Link</div>
                      <div className="text-sm text-gray-600">Share via Dropbox/Google Drive link</div>
                    </button>

                    <button
                      onClick={() => handleDeliverPackage('usb_drive')}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left"
                    >
                      <div className="text-3xl mb-2">💾</div>
                      <div className="font-bold text-gray-900 mb-1">USB Drive</div>
                      <div className="text-sm text-gray-600">Load files onto USB drive</div>
                    </button>

                    <button
                      onClick={() => handleDeliverPackage('printed_binder')}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left"
                    >
                      <div className="text-3xl mb-2">📘</div>
                      <div className="font-bold text-gray-900 mb-1">Printed Binder</div>
                      <div className="text-sm text-gray-600">Physical 3-ring binder delivery</div>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowDeliverModal(false)}
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
