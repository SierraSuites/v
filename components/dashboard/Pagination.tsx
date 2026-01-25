"use client"

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: '#E0E0E0' }}>
      {/* Items info */}
      <div className="text-sm" style={{ color: '#6B7280' }}>
        Showing <span className="font-semibold" style={{ color: '#1A1A1A' }}>{startItem}</span> to{' '}
        <span className="font-semibold" style={{ color: '#1A1A1A' }}>{endItem}</span> of{' '}
        <span className="font-semibold" style={{ color: '#1A1A1A' }}>{totalItems}</span> results
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          style={{ borderColor: '#E0E0E0', color: '#4A4A4A' }}
        >
          ← Previous
        </button>

        {/* Page numbers */}
        <div className="flex gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-3 py-1" style={{ color: '#6B7280' }}>
                  ...
                </span>
              )
            }

            const pageNum = page as number
            const isActive = pageNum === currentPage

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`px-3 py-1 rounded border transition-colors ${
                  isActive ? 'font-bold text-white' : 'hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: isActive ? '#FF6B6B' : 'transparent',
                  borderColor: isActive ? '#FF6B6B' : '#E0E0E0',
                  color: isActive ? '#FFFFFF' : '#4A4A4A'
                }}
              >
                {pageNum}
              </button>
            )
          })}
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          style={{ borderColor: '#E0E0E0', color: '#4A4A4A' }}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
