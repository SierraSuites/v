/**
 * Professional Quote PDF Generator
 *
 * Generates client-ready PDF quotes with:
 * - Company branding
 * - Itemized line items
 * - Professional layout
 * - Terms & conditions
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// Professional PDF styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 30,
    borderBottom: '3 solid #2563EB',
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 5,
  },
  companyDetails: {
    fontSize: 9,
    color: '#64748B',
    lineHeight: 1.4,
  },
  quoteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 15,
    marginTop: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 10,
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: 'bold',
  },
  value: {
    fontSize: 10,
    color: '#0F172A',
  },
  table: {
    marginTop: 15,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E40AF',
    padding: 10,
    borderRadius: 4,
    marginBottom: 5,
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #E2E8F0',
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  colDescription: {
    width: '45%',
  },
  colQuantity: {
    width: '15%',
    textAlign: 'center',
  },
  colRate: {
    width: '20%',
    textAlign: 'right',
  },
  colAmount: {
    width: '20%',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: '40%',
    backgroundColor: '#F8FAFC',
    padding: 15,
    borderRadius: 6,
    border: '1 solid #CBD5E1',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subtotalLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  subtotalValue: {
    fontSize: 10,
    color: '#0F172A',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '2 solid #2563EB',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  terms: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#FEF3C7',
    borderLeft: '4 solid #F59E0B',
    borderRadius: 4,
  },
  termsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 8,
  },
  termsText: {
    fontSize: 9,
    color: '#78350F',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94A3B8',
    borderTop: '1 solid #E2E8F0',
    paddingTop: 10,
  },
  statusBadge: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
    padding: '4 10',
    borderRadius: 12,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
})

interface QuoteLineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
  category?: string
}

interface QuoteData {
  quote_number: string
  title: string
  client_name: string
  client_email?: string
  client_phone?: string
  client_address?: string
  project_address?: string
  issue_date: string
  valid_until: string
  status: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  currency: string
  scope_of_work?: string
  notes?: string
  quote_items: QuoteLineItem[]
  company?: {
    name: string
    email: string
    phone: string
    address: string
    website?: string
    logo_url?: string
  }
}

interface QuotePDFProps {
  quote: QuoteData
}

export const QuotePDFDocument: React.FC<QuotePDFProps> = ({ quote }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: quote.currency || 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const company = quote.company || {
    name: 'The Sierra Suites',
    email: 'hello@sierrasuites.com',
    phone: '(555) 123-4567',
    address: '123 Construction Ave, Suite 100, Builder City, BC 12345',
    website: 'www.sierrasuites.com',
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Company Info */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyDetails}>
            {company.address}
          </Text>
          <Text style={styles.companyDetails}>
            {company.phone} • {company.email}
          </Text>
          {company.website && (
            <Text style={styles.companyDetails}>{company.website}</Text>
          )}
        </View>

        {/* Quote Title */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={styles.quoteTitle}>QUOTE #{quote.quote_number}</Text>
          <View style={styles.statusBadge}>
            <Text>{quote.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Quote Details Section */}
        <View style={[styles.section, { flexDirection: 'row', justifyContent: 'space-between' }]}>
          {/* Client Information */}
          <View style={{ width: '48%' }}>
            <Text style={styles.sectionTitle}>CLIENT INFORMATION</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{quote.client_name}</Text>
            </View>
            {quote.client_email && (
              <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{quote.client_email}</Text>
              </View>
            )}
            {quote.client_phone && (
              <View style={styles.row}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{quote.client_phone}</Text>
              </View>
            )}
            {quote.client_address && (
              <View style={{ marginTop: 5 }}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>{quote.client_address}</Text>
              </View>
            )}
          </View>

          {/* Quote Information */}
          <View style={{ width: '48%' }}>
            <Text style={styles.sectionTitle}>QUOTE DETAILS</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Issue Date:</Text>
              <Text style={styles.value}>{formatDate(quote.issue_date)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Valid Until:</Text>
              <Text style={styles.value}>{formatDate(quote.valid_until)}</Text>
            </View>
            {quote.project_address && (
              <View style={{ marginTop: 5 }}>
                <Text style={styles.label}>Project Location:</Text>
                <Text style={styles.value}>{quote.project_address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Project Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROJECT</Text>
          <Text style={{ fontSize: 12, color: '#0F172A', fontWeight: 'bold' }}>
            {quote.title}
          </Text>
        </View>

        {/* Scope of Work */}
        {quote.scope_of_work && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SCOPE OF WORK</Text>
            <Text style={{ fontSize: 9, color: '#475569', lineHeight: 1.5 }}>
              {quote.scope_of_work}
            </Text>
          </View>
        )}

        {/* Line Items Table */}
        <View style={styles.table}>
          <Text style={styles.sectionTitle}>LINE ITEMS</Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colQuantity]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colRate]}>Rate</Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
          </View>

          {/* Table Rows */}
          {quote.quote_items.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.tableRow,
                ...(index % 2 === 1 ? [styles.tableRowAlt] : []),
              ]}
            >
              <View style={styles.colDescription}>
                <Text style={{ fontSize: 9, color: '#0F172A' }}>
                  {item.description}
                </Text>
                {item.category && (
                  <Text style={{ fontSize: 7, color: '#94A3B8', marginTop: 2 }}>
                    {item.category}
                  </Text>
                )}
              </View>
              <Text style={[styles.colQuantity, { fontSize: 9, color: '#475569' }]}>
                {item.quantity}
              </Text>
              <Text style={[styles.colRate, { fontSize: 9, color: '#475569' }]}>
                {formatCurrency(item.unit_price)}
              </Text>
              <Text style={[styles.colAmount, { fontSize: 9, color: '#0F172A' }]}>
                {formatCurrency(item.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.subtotalLabel}>Subtotal:</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(quote.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.subtotalLabel}>Tax ({(quote.tax_rate * 100).toFixed(1)}%):</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(quote.tax_amount)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>TOTAL:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(quote.total_amount)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {quote.notes && (
          <View style={{ marginTop: 20, marginBottom: 15 }}>
            <Text style={[styles.label, { marginBottom: 5 }]}>NOTES:</Text>
            <Text style={{ fontSize: 9, color: '#475569', lineHeight: 1.5 }}>
              {quote.notes}
            </Text>
          </View>
        )}

        {/* Terms & Conditions */}
        <View style={styles.terms}>
          <Text style={styles.termsTitle}>TERMS & CONDITIONS</Text>
          <Text style={styles.termsText}>
            • This quote is valid for 30 days from the issue date.{'\n'}
            • A 50% deposit is required to commence work.{'\n'}
            • Final payment is due upon project completion.{'\n'}
            • Prices exclude any permits or fees unless otherwise noted.{'\n'}
            • Change orders may affect the total cost and timeline.{'\n'}
            • All work is guaranteed for 1 year from completion date.
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by The Sierra Suites • {new Date().toLocaleDateString()} • Quote #{quote.quote_number}
        </Text>
      </Page>
    </Document>
  )
}

/**
 * Helper function to render PDF to blob for download
 */
export async function generateQuotePDFBlob(quote: QuoteData): Promise<Blob> {
  const { pdf } = await import('@react-pdf/renderer')
  const blob = await pdf(<QuotePDFDocument quote={quote} />).toBlob()
  return blob
}

/**
 * Helper function to download PDF
 */
export async function downloadQuotePDF(quote: QuoteData, filename?: string): Promise<void> {
  const blob = await generateQuotePDFBlob(quote)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `Quote-${quote.quote_number}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
