'use client'

import { useState, useRef } from 'react'

interface LineItem {
  description: string
  category?: string
  quantity: number
  unit: string
  unit_price: number
  is_taxable?: boolean
  is_optional?: boolean
  is_allowance?: boolean
  notes?: string
  convert_to_task?: boolean
}

interface ExcelImportProps {
  onImport: (items: LineItem[]) => void
  onClose: () => void
}

export default function ExcelImport({ onImport, onClose }: ExcelImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Check file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ]

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      setError('Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)')
      return
    }

    setFile(selectedFile)
    setError(null)

    // Parse file
    await parseFile(selectedFile)
  }

  const parseFile = async (file: File) => {
    setLoading(true)
    setError(null)

    try {
      const text = await file.text()

      // Parse CSV (simple parser - works for both CSV and TSV from Excel)
      const lines = text.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        throw new Error('File must contain headers and at least one data row')
      }

      // Parse headers
      const headers = lines[0].split(/[,\t]/).map(h => h.trim().toLowerCase())

      // Find column indices
      const descriptionIndex = headers.findIndex(h =>
        h.includes('description') || h.includes('item') || h.includes('name')
      )
      const quantityIndex = headers.findIndex(h =>
        h.includes('quantity') || h.includes('qty')
      )
      const unitIndex = headers.findIndex(h =>
        h.includes('unit') || h.includes('uom')
      )
      const priceIndex = headers.findIndex(h =>
        h.includes('price') || h.includes('rate') || h.includes('cost')
      )
      const categoryIndex = headers.findIndex(h =>
        h.includes('category') || h.includes('type')
      )
      const taxableIndex = headers.findIndex(h =>
        h.includes('taxable') || h.includes('tax')
      )
      const notesIndex = headers.findIndex(h =>
        h.includes('notes') || h.includes('comment')
      )

      if (descriptionIndex === -1) {
        throw new Error('Could not find "Description" column. Make sure your file has a description/item/name column.')
      }

      // Parse data rows
      const items: LineItem[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(/[,\t]/).map(v => v.trim())

        // Skip empty rows
        if (values.every(v => !v)) continue

        const description = values[descriptionIndex] || ''
        if (!description) continue // Skip rows without description

        const quantity = quantityIndex !== -1
          ? parseFloat(values[quantityIndex]) || 1
          : 1

        const unit_price = priceIndex !== -1
          ? parseFloat(values[priceIndex]?.replace(/[$,]/g, '') || '0')
          : 0

        const unit = unitIndex !== -1
          ? values[unitIndex] || 'ea'
          : 'ea'

        const category = categoryIndex !== -1
          ? values[categoryIndex] || undefined
          : undefined

        const is_taxable = taxableIndex !== -1
          ? ['yes', 'true', '1', 'y'].includes(values[taxableIndex]?.toLowerCase() || '')
          : true

        const notes = notesIndex !== -1
          ? values[notesIndex] || undefined
          : undefined

        items.push({
          description,
          category,
          quantity,
          unit,
          unit_price,
          is_taxable,
          is_optional: false,
          is_allowance: false,
          notes,
          convert_to_task: true
        })
      }

      if (items.length === 0) {
        throw new Error('No valid line items found in file')
      }

      setPreview(items)
    } catch (err) {
      console.error('Error parsing file:', err)
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = () => {
    if (preview.length === 0) return
    onImport(preview)
    onClose()
  }

  const downloadTemplate = () => {
    const csv = [
      'Description,Quantity,Unit,Unit Price,Category,Taxable,Notes',
      'Demo existing fixtures,8,hours,75,Demo,yes,Remove all old fixtures',
      'Install new cabinets,1,ea,8500,Installation,yes,Premium maple cabinets',
      'Paint kitchen walls,1,ea,1200,Finishing,yes,Two coats premium paint',
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quote_line_items_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Import Line Items from Excel</h2>
            <p className="text-sm text-gray-600">Upload a CSV or Excel file with your line items</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!file ? (
            <>
              {/* Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <svg
                  className="w-16 h-16 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Click to upload or drag and drop
                </h3>
                <p className="text-gray-600 mb-1">Excel (.xlsx, .xls) or CSV (.csv) files</p>
                <p className="text-sm text-gray-500">Maximum file size: 10 MB</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Template Download */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">Need a template?</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Download our Excel template with the correct column headers and example data.
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Format Instructions */}
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Required Columns:</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Description</span>
                    <span className="text-gray-500">(required)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">Quantity</span>
                    <span className="text-gray-500">(optional, defaults to 1)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">Unit</span>
                    <span className="text-gray-500">(optional, defaults to "ea")</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">Unit Price</span>
                    <span className="text-gray-500">(optional, defaults to $0)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="font-medium">Category</span>
                    <span className="text-gray-500">(optional)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="font-medium">Taxable</span>
                    <span className="text-gray-500">(optional, defaults to yes)</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* File Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <div className="font-semibold text-gray-900">{file.name}</div>
                      <div className="text-sm text-gray-600">
                        {(file.size / 1024).toFixed(2)} KB
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null)
                      setPreview([])
                      setError(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-red-900 mb-1">Import Error</h4>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Parsing file...</p>
                </div>
              )}

              {/* Preview Table */}
              {!loading && preview.length > 0 && (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      Preview ({preview.length} items)
                    </h3>
                    <div className="text-sm text-gray-600">
                      Total: {formatCurrency(preview.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0))}
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {preview.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{item.category || '-'}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{item.quantity}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{item.unit}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">
                                {formatCurrency(item.unit_price)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                                {formatCurrency(item.quantity * item.unit_price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>

          {preview.length > 0 && (
            <button
              onClick={handleImport}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Import {preview.length} Items
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
