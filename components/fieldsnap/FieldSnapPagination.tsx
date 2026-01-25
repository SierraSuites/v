"use client"

import { useState } from 'react'

interface FieldSnapPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  loading?: boolean
}

export default function FieldSnapPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onPageSizeChange,
  loading = false
}: FieldSnapPaginationProps) {
  const [showPageSizeMenu, setShowPageSizeMenu] = useState(false)

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const pageSizeOptions = [20, 50, 100, 200]

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = []
    const maxVisiblePages = 7

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 4) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 2)
      const end = Math.min(totalPages - 1, currentPage + 2)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 3) {
        pages.push('...')
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  const handlePrevPage = () => {
    if (currentPage > 1 && !loading) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages && !loading) {
      onPageChange(currentPage + 1)
    }
  }

  const handleFirstPage = () => {
    if (currentPage !== 1 && !loading) {
      onPageChange(1)
    }
  }

  const handleLastPage = () => {
    if (currentPage !== totalPages && !loading) {
      onPageChange(totalPages)
    }
  }

  if (totalItems === 0) {
    return null
  }

  return (
    <div className="bg-white border-t sticky bottom-0 z-10" style={{ borderColor: '#E0E0E0' }}>
      <div className="px-4 py-3 sm:px-6">
        {/* Mobile View */}
        <div className="flex items-center justify-between sm:hidden">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1 || loading}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: currentPage === 1 || loading ? '#F3F4F6' : '#FFFFFF',
              color: '#374151',
              border: '1px solid #E5E7EB'
            }}
          >
            Previous
          </button>
          <div className="text-sm" style={{ color: '#6B7280' }}>
            Page {currentPage} of {totalPages}
          </div>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || loading}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: currentPage === totalPages || loading ? '#F3F4F6' : '#FFFFFF',
              color: '#374151',
              border: '1px solid #E5E7EB'
            }}
          >
            Next
          </button>
        </div>

        {/* Desktop View */}
        <div className="hidden sm:flex sm:items-center sm:justify-between">
          {/* Left: Items info and page size selector */}
          <div className="flex items-center gap-4">
            <div className="text-sm" style={{ color: '#6B7280' }}>
              Showing{' '}
              <span className="font-semibold" style={{ color: '#1A1A1A' }}>
                {startItem}
              </span>
              {' to '}
              <span className="font-semibold" style={{ color: '#1A1A1A' }}>
                {endItem}
              </span>
              {' of '}
              <span className="font-semibold" style={{ color: '#1A1A1A' }}>
                {totalItems}
              </span>
              {' photos'}
            </div>

            {/* Page size selector */}
            <div className="relative">
              <button
                onClick={() => setShowPageSizeMenu(!showPageSizeMenu)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  borderColor: '#E5E7EB'
                }}
              >
                <span>{itemsPerPage} per page</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showPageSizeMenu && (
                <div
                  className="absolute bottom-full left-0 mb-2 w-40 rounded-md shadow-lg bg-white border z-20"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  {pageSizeOptions.map(size => (
                    <button
                      key={size}
                      onClick={() => {
                        onPageSizeChange(size)
                        setShowPageSizeMenu(false)
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        size === itemsPerPage ? 'font-semibold' : ''
                      }`}
                      style={{
                        backgroundColor: size === itemsPerPage ? '#FEF2F2' : 'transparent',
                        color: size === itemsPerPage ? '#FF6B6B' : '#374151'
                      }}
                    >
                      {size} per page
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Pagination controls */}
          <nav className="flex items-center gap-1">
            {/* First page */}
            <button
              onClick={handleFirstPage}
              disabled={currentPage === 1 || loading}
              className="px-2 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'transparent',
                color: '#6B7280'
              }}
              title="First page"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Previous page */}
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#374151',
                borderColor: '#E5E7EB'
              }}
            >
              Previous
            </button>

            {/* Page numbers */}
            <div className="flex gap-1 mx-2">
              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-3 py-1.5 text-sm"
                      style={{ color: '#6B7280' }}
                    >
                      ...
                    </span>
                  )
                }

                const pageNum = page as number
                const isActive = pageNum === currentPage

                return (
                  <button
                    key={pageNum}
                    onClick={() => !loading && onPageChange(pageNum)}
                    disabled={loading}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      isActive ? 'shadow-sm' : ''
                    } disabled:cursor-not-allowed`}
                    style={{
                      backgroundColor: isActive ? '#FF6B6B' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#374151',
                      border: `1px solid ${isActive ? '#FF6B6B' : '#E5E7EB'}`
                    }}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            {/* Next page */}
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || loading}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#374151',
                borderColor: '#E5E7EB'
              }}
            >
              Next
            </button>

            {/* Last page */}
            <button
              onClick={handleLastPage}
              disabled={currentPage === totalPages || loading}
              className="px-2 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'transparent',
                color: '#6B7280'
              }}
              title="Last page"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          </nav>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div
                className="animate-spin rounded-full h-5 w-5 border-b-2"
                style={{ borderColor: '#FF6B6B' }}
              />
              <span className="text-sm font-medium" style={{ color: '#6B7280' }}>
                Loading...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
