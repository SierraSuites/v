// Professional Invoice PDF Template
// Generates high-quality PDF invoices with company branding

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer'
import { Invoice, InvoiceLineItem } from '@/types/financial'

interface InvoicePDFProps {
  invoice: Invoice
  companyInfo: {
    name: string
    address?: string
    city?: string
    state?: string
    zip?: string
    phone?: string
    email?: string
    website?: string
    logo?: string
  }
}

// Register fonts for better typography
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2' },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2', fontWeight: 700 },
  ],
})

// Professional styling
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  logo: {
    width: 150,
    height: 50,
    objectFit: 'contain',
  },
  companyInfo: {
    textAlign: 'right',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 4,
  },
  companyDetails: {
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.5,
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 11,
    color: '#111827',
    fontWeight: 600,
  },
  billToSection: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 4,
    marginBottom: 30,
  },
  billToLabel: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  billToName: {
    fontSize: 12,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 4,
  },
  billToDetails: {
    fontSize: 10,
    color: '#4b5563',
    lineHeight: 1.5,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    padding: 10,
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
    padding: 10,
    fontSize: 10,
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  colDescription: {
    width: '50%',
  },
  colQty: {
    width: '15%',
    textAlign: 'right',
  },
  colRate: {
    width: '15%',
    textAlign: 'right',
  },
  colAmount: {
    width: '20%',
    textAlign: 'right',
  },
  totalsSection: {
    marginLeft: 'auto',
    width: '40%',
    marginTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    fontSize: 10,
  },
  totalLabel: {
    color: '#6b7280',
  },
  totalValue: {
    fontWeight: 600,
    color: '#111827',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingTop: 10,
    borderTop: '2px solid #111827',
    marginTop: 6,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
  },
  balanceDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    backgroundColor: '#dbeafe',
    padding: 10,
    marginTop: 10,
    borderRadius: 4,
  },
  balanceDueLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1e40af',
  },
  balanceDueValue: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1e40af',
  },
  notesSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fffbeb',
    borderRadius: 4,
    borderLeft: '4px solid #f59e0b',
  },
  notesLabel: {
    fontSize: 9,
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 10,
    color: '#78350f',
    lineHeight: 1.6,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 15,
  },
  statusBadge: {
    position: 'absolute',
    top: 40,
    right: 40,
    padding: '8px 16px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusPaid: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusOverdue: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  statusDraft: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function InvoicePDF({ invoice, companyInfo }: InvoicePDFProps) {
  // Determine status badge style
  const getStatusStyle = () => {
    switch (invoice.status) {
      case 'paid':
        return styles.statusPaid
      case 'overdue':
        return styles.statusOverdue
      case 'draft':
        return styles.statusDraft
      default:
        return styles.statusDraft
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, getStatusStyle()]}>
          <Text>{invoice.status.toUpperCase()}</Text>
        </View>

        {/* Header with Company Info */}
        <View style={styles.header}>
          {companyInfo.logo ? (
            <Image src={companyInfo.logo} style={styles.logo} />
          ) : (
            <View>
              <Text style={styles.companyName}>{companyInfo.name}</Text>
            </View>
          )}
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyInfo.name}</Text>
            <View style={styles.companyDetails}>
              {companyInfo.address && <Text>{companyInfo.address}</Text>}
              {(companyInfo.city || companyInfo.state) && (
                <Text>
                  {companyInfo.city}
                  {companyInfo.city && companyInfo.state && ', '}
                  {companyInfo.state} {companyInfo.zip}
                </Text>
              )}
              {companyInfo.phone && <Text>{companyInfo.phone}</Text>}
              {companyInfo.email && <Text>{companyInfo.email}</Text>}
              {companyInfo.website && <Text>{companyInfo.website}</Text>}
            </View>
          </View>
        </View>

        {/* Invoice Title */}
        <Text style={styles.invoiceTitle}>INVOICE</Text>

        {/* Invoice Details */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={{ width: '30%' }}>
              <Text style={styles.label}>Invoice Number</Text>
              <Text style={styles.value}>{invoice.invoice_number}</Text>
            </View>
            <View style={{ width: '30%' }}>
              <Text style={styles.label}>Invoice Date</Text>
              <Text style={styles.value}>{formatDate(invoice.invoice_date)}</Text>
            </View>
            <View style={{ width: '30%' }}>
              <Text style={styles.label}>Due Date</Text>
              <Text style={styles.value}>{formatDate(invoice.due_date)}</Text>
            </View>
          </View>
        </View>

        {/* Bill To Section */}
        <View style={styles.billToSection}>
          <Text style={styles.billToLabel}>Bill To</Text>
          <Text style={styles.billToName}>
            {invoice.contact?.company_name ||
              `${invoice.contact?.first_name} ${invoice.contact?.last_name}`}
          </Text>
          <View style={styles.billToDetails}>
            {invoice.contact?.email && <Text>{invoice.contact.email}</Text>}
            {invoice.contact?.phone && <Text>{invoice.contact.phone}</Text>}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>

          {/* Table Rows */}
          {invoice.line_items.map((item: InvoiceLineItem, index: number) => (
            <View
              key={item.id || index}
              style={[
                styles.tableRow,
                index % 2 === 1 ? styles.tableRowAlt : {},
              ]}
            >
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colRate}>{formatCurrency(item.rate)}</Text>
              <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          {/* Subtotal */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>

          {/* Discount */}
          {invoice.discount_amount && invoice.discount_amount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>
                -{formatCurrency(invoice.discount_amount)}
              </Text>
            </View>
          )}

          {/* Tax */}
          {invoice.tax_amount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Tax ({(invoice.tax_rate * 100).toFixed(2)}%)
              </Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.tax_amount)}</Text>
            </View>
          )}

          {/* Grand Total */}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(invoice.total_amount)}
            </Text>
          </View>

          {/* Amount Paid */}
          {invoice.amount_paid > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Amount Paid</Text>
              <Text style={styles.totalValue}>
                -{formatCurrency(invoice.amount_paid)}
              </Text>
            </View>
          )}

          {/* Balance Due */}
          {invoice.balance_due > 0 && (
            <View style={styles.balanceDueRow}>
              <Text style={styles.balanceDueLabel}>Balance Due</Text>
              <Text style={styles.balanceDueValue}>
                {formatCurrency(invoice.balance_due)}
              </Text>
            </View>
          )}
        </View>

        {/* Notes Section */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Payment Terms */}
        {invoice.payment_terms && (
          <View style={styles.section}>
            <Text style={styles.label}>Payment Terms</Text>
            <Text style={styles.notesText}>{invoice.payment_terms}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Thank you for your business! • {companyInfo.name}
          </Text>
          {companyInfo.email && (
            <Text>Questions? Contact us at {companyInfo.email}</Text>
          )}
        </View>
      </Page>
    </Document>
  )
}
