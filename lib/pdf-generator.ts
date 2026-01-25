/**
 * PDF GENERATION SERVICE FOR QUOTEHUB
 *
 * Generates professional construction quotes as PDF documents
 * Uses HTML templates that can be converted to PDF via browser print or server-side tools
 */

import type { Quote, QuoteLineItem } from './quotes'

interface CompanyInfo {
  name: string
  logo_url?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
  email?: string
  website?: string
  license_number?: string
}

interface ClientInfo {
  company_name?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
}

interface PDFOptions {
  includeCompanyInfo?: boolean
  includeClientInfo?: boolean
  includeLineItems?: boolean
  includeOptionalItems?: boolean
  includeTermsConditions?: boolean
  includeSignature?: boolean
  watermark?: string // 'DRAFT', 'SENT', etc.
  pageSize?: 'letter' | 'a4'
  orientation?: 'portrait' | 'landscape'
}

const DEFAULT_OPTIONS: PDFOptions = {
  includeCompanyInfo: true,
  includeClientInfo: true,
  includeLineItems: true,
  includeOptionalItems: true,
  includeTermsConditions: true,
  includeSignature: true,
  pageSize: 'letter',
  orientation: 'portrait'
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format date for display
 */
function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(d)
}

/**
 * Get item type icon for display
 */
function getItemTypeDisplay(type: string): { icon: string; color: string; label: string } {
  const displays = {
    labor: { icon: '👷', color: '#3B82F6', label: 'Labor' },
    material: { icon: '🧱', color: '#10B981', label: 'Material' },
    equipment: { icon: '🚜', color: '#F59E0B', label: 'Equipment' },
    subcontractor: { icon: '👥', color: '#8B5CF6', label: 'Subcontractor' },
    overhead: { icon: '📊', color: '#6B7280', label: 'Overhead' },
    profit: { icon: '💰', color: '#EF4444', label: 'Profit' }
  }
  return displays[type as keyof typeof displays] || { icon: '📋', color: '#6B7280', label: type }
}

/**
 * Generate HTML for quote PDF
 */
export function generateQuoteHTML(
  quote: Quote,
  company: CompanyInfo,
  client: ClientInfo | null,
  options: PDFOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Group line items by category
  const lineItemsByCategory = (quote.line_items || []).reduce((acc, item) => {
    const category = item.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, QuoteLineItem[]>)

  const categories = Object.keys(lineItemsByCategory)
  const showCategories = categories.length > 1 || (categories.length === 1 && categories[0] !== 'Uncategorized')

  // Calculate totals
  const requiredItems = (quote.line_items || []).filter(item => !item.is_optional)
  const optionalItems = (quote.line_items || []).filter(item => item.is_optional)
  const optionalTotal = optionalItems.reduce((sum, item) => sum + item.total_price, 0)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote ${quote.quote_number}</title>
  <style>
    @media print {
      @page {
        size: ${opts.pageSize} ${opts.orientation};
        margin: 0.5in;
      }
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .page-break {
        page-break-before: always;
      }
      .no-print {
        display: none;
      }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1A1A1A;
      background: white;
    }

    .container {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in;
      position: relative;
    }

    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120pt;
      font-weight: bold;
      color: rgba(255, 107, 107, 0.1);
      z-index: -1;
      pointer-events: none;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #FF6B6B;
    }

    .company-info {
      flex: 1;
    }

    .company-logo {
      max-width: 200px;
      max-height: 80px;
      margin-bottom: 10px;
    }

    .company-name {
      font-size: 24pt;
      font-weight: bold;
      color: #FF6B6B;
      margin-bottom: 8px;
    }

    .company-details {
      font-size: 10pt;
      color: #6B7280;
      line-height: 1.4;
    }

    .quote-info {
      text-align: right;
    }

    .quote-title {
      font-size: 32pt;
      font-weight: bold;
      color: #1A1A1A;
      margin-bottom: 8px;
    }

    .quote-number {
      font-size: 14pt;
      color: #6B7280;
      margin-bottom: 4px;
    }

    .quote-date {
      font-size: 10pt;
      color: #6B7280;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 8px;
    }

    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }

    .party {
      padding: 20px;
      background: #F9FAFB;
      border-radius: 8px;
    }

    .party-label {
      font-size: 10pt;
      font-weight: bold;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .party-name {
      font-size: 14pt;
      font-weight: bold;
      color: #1A1A1A;
      margin-bottom: 4px;
    }

    .party-details {
      font-size: 10pt;
      color: #374151;
      line-height: 1.5;
    }

    .description {
      margin-bottom: 30px;
      padding: 20px;
      background: #FFF9E6;
      border-left: 4px solid #F59E0B;
      border-radius: 4px;
    }

    .description-label {
      font-size: 10pt;
      font-weight: bold;
      color: #92400E;
      margin-bottom: 8px;
    }

    .description-text {
      font-size: 11pt;
      color: #78350F;
      line-height: 1.6;
    }

    .line-items {
      margin-bottom: 40px;
    }

    .section-title {
      font-size: 14pt;
      font-weight: bold;
      color: #1A1A1A;
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid #E5E7EB;
    }

    .category-header {
      background: #F3F4F6;
      padding: 8px 12px;
      font-weight: bold;
      color: #374151;
      margin-top: 16px;
      margin-bottom: 8px;
      border-radius: 4px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    thead {
      background: #F9FAFB;
    }

    th {
      padding: 12px 8px;
      text-align: left;
      font-size: 9pt;
      font-weight: bold;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #E5E7EB;
    }

    th.text-right {
      text-align: right;
    }

    th.text-center {
      text-align: center;
    }

    td {
      padding: 10px 8px;
      font-size: 10pt;
      color: #374151;
      border-bottom: 1px solid #E5E7EB;
    }

    td.text-right {
      text-align: right;
    }

    td.text-center {
      text-align: center;
    }

    .item-description {
      font-weight: 600;
      color: #1A1A1A;
    }

    .item-notes {
      font-size: 9pt;
      color: #6B7280;
      margin-top: 4px;
    }

    .item-type {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9pt;
      font-weight: 600;
    }

    .optional-badge {
      display: inline-block;
      padding: 2px 6px;
      background: #FEF3C7;
      color: #92400E;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: bold;
      margin-left: 8px;
    }

    .totals {
      margin-top: 30px;
      padding: 20px;
      background: #F9FAFB;
      border-radius: 8px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 11pt;
    }

    .total-row.subtotal {
      color: #6B7280;
    }

    .total-row.discount {
      color: #10B981;
      font-weight: 600;
    }

    .total-row.tax {
      color: #6B7280;
    }

    .total-row.grand-total {
      padding-top: 16px;
      margin-top: 16px;
      border-top: 2px solid #E5E7EB;
      font-size: 18pt;
      font-weight: bold;
    }

    .total-row.grand-total .label {
      color: #1A1A1A;
    }

    .total-row.grand-total .amount {
      color: #FF6B6B;
    }

    .optional-items-notice {
      background: #FFF9E6;
      border: 1px solid #FEF3C7;
      border-radius: 8px;
      padding: 16px;
      margin-top: 20px;
    }

    .optional-items-notice .title {
      font-weight: bold;
      color: #92400E;
      margin-bottom: 4px;
    }

    .optional-items-notice .subtitle {
      font-size: 9pt;
      color: #78350F;
    }

    .terms {
      margin-top: 40px;
      padding: 20px;
      background: #F9FAFB;
      border-radius: 8px;
    }

    .terms-title {
      font-size: 12pt;
      font-weight: bold;
      color: #1A1A1A;
      margin-bottom: 12px;
    }

    .terms-content {
      font-size: 10pt;
      color: #374151;
      line-height: 1.8;
      white-space: pre-line;
    }

    .signature-section {
      margin-top: 60px;
      padding-top: 40px;
      border-top: 2px solid #E5E7EB;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
    }

    .signature-box {
      text-align: center;
    }

    .signature-line {
      border-bottom: 2px solid #1A1A1A;
      height: 60px;
      margin-bottom: 8px;
    }

    .signature-label {
      font-size: 10pt;
      color: #6B7280;
    }

    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      font-size: 9pt;
      color: #6B7280;
    }

    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: #FF6B6B;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14pt;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 1000;
    }

    .print-button:hover {
      background: #FF5252;
    }
  </style>
</head>
<body>
  ${opts.watermark ? `<div class="watermark">${opts.watermark}</div>` : ''}

  <button class="print-button no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>

  <div class="container">
    <!-- Header -->
    <div class="header">
      ${opts.includeCompanyInfo ? `
      <div class="company-info">
        ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.name}" class="company-logo">` : ''}
        <div class="company-name">${company.name}</div>
        <div class="company-details">
          ${company.address ? `${company.address}<br>` : ''}
          ${company.city || company.state || company.zip ? `${company.city}, ${company.state} ${company.zip}<br>` : ''}
          ${company.phone ? `📞 ${company.phone}<br>` : ''}
          ${company.email ? `📧 ${company.email}<br>` : ''}
          ${company.website ? `🌐 ${company.website}<br>` : ''}
          ${company.license_number ? `License #${company.license_number}` : ''}
        </div>
      </div>
      ` : ''}

      <div class="quote-info">
        <div class="quote-title">QUOTE</div>
        <div class="quote-number">#${quote.quote_number}</div>
        <div class="quote-date">Date: ${formatDate(quote.created_at)}</div>
        ${quote.valid_until ? `<div class="quote-date">Valid Until: ${formatDate(quote.valid_until)}</div>` : ''}
        <div class="status-badge" style="background: ${getStatusColor(quote.status)}20; color: ${getStatusColor(quote.status)}">
          ${quote.status}
        </div>
      </div>
    </div>

    <!-- Parties -->
    <div class="parties">
      ${opts.includeCompanyInfo ? `
      <div class="party">
        <div class="party-label">From</div>
        <div class="party-name">${company.name}</div>
        <div class="party-details">
          ${company.address || ''}<br>
          ${company.city || ''}, ${company.state || ''} ${company.zip || ''}<br>
          ${company.phone || ''}<br>
          ${company.email || ''}
        </div>
      </div>
      ` : ''}

      ${opts.includeClientInfo && client ? `
      <div class="party">
        <div class="party-label">To</div>
        <div class="party-name">${client.company_name || `${client.first_name || ''} ${client.last_name || ''}`}</div>
        <div class="party-details">
          ${client.address || ''}<br>
          ${client.city || ''}, ${client.state || ''} ${client.zip || ''}<br>
          ${client.phone || ''}<br>
          ${client.email || ''}
        </div>
      </div>
      ` : ''}
    </div>

    <!-- Title and Description -->
    <h1 style="font-size: 18pt; font-weight: bold; margin-bottom: 16px; color: #1A1A1A;">
      ${quote.title}
    </h1>

    ${quote.description ? `
    <div class="description">
      <div class="description-label">Project Description</div>
      <div class="description-text">${quote.description}</div>
    </div>
    ` : ''}

    <!-- Line Items -->
    ${opts.includeLineItems && requiredItems.length > 0 ? `
    <div class="line-items">
      <div class="section-title">📋 Line Items</div>

      ${showCategories ?
        categories.map(category => `
          <div class="category-header">${category}</div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-center">Qty</th>
                <th class="text-center">Unit</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsByCategory[category].filter(item => !item.is_optional).map(item => `
                <tr>
                  <td>
                    <div class="item-description">${item.description}</div>
                    ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ''}
                  </td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-center">${item.unit}</td>
                  <td class="text-right">${formatCurrency(item.unit_price)}</td>
                  <td class="text-right"><strong>${formatCurrency(item.total_price)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `).join('')
        :
        `
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Type</th>
              <th class="text-center">Qty</th>
              <th class="text-center">Unit</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${requiredItems.map(item => {
              const typeDisplay = getItemTypeDisplay(item.item_type)
              return `
                <tr>
                  <td>
                    <div class="item-description">${item.description}</div>
                    ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ''}
                  </td>
                  <td>
                    <span class="item-type" style="background: ${typeDisplay.color}20; color: ${typeDisplay.color}">
                      ${typeDisplay.icon} ${typeDisplay.label}
                    </span>
                  </td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-center">${item.unit}</td>
                  <td class="text-right">${formatCurrency(item.unit_price)}</td>
                  <td class="text-right"><strong>${formatCurrency(item.total_price)}</strong></td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
        `
      }
    </div>
    ` : ''}

    <!-- Totals -->
    <div class="totals">
      <div class="total-row subtotal">
        <span class="label">Subtotal:</span>
        <span class="amount">${formatCurrency(quote.subtotal)}</span>
      </div>

      ${quote.discount_amount && quote.discount_amount > 0 ? `
      <div class="total-row discount">
        <span class="label">Discount:</span>
        <span class="amount">-${formatCurrency(quote.discount_amount)}</span>
      </div>
      ` : ''}

      <div class="total-row tax">
        <span class="label">Tax (${quote.tax_rate}%):</span>
        <span class="amount">${formatCurrency(quote.tax_amount)}</span>
      </div>

      <div class="total-row grand-total">
        <span class="label">TOTAL:</span>
        <span class="amount">${formatCurrency(quote.total_amount)}</span>
      </div>
    </div>

    <!-- Optional Items -->
    ${opts.includeOptionalItems && optionalItems.length > 0 ? `
    <div class="optional-items-notice">
      <div class="total-row">
        <div>
          <div class="title">⭐ Optional Items (Not Included in Total)</div>
          <div class="subtitle">These items can be added if approved by the client</div>
        </div>
        <div style="font-size: 14pt; font-weight: bold; color: #92400E;">
          ${formatCurrency(optionalTotal)}
        </div>
      </div>
    </div>

    <table style="margin-top: 16px;">
      <thead>
        <tr>
          <th>Optional Item</th>
          <th class="text-center">Qty</th>
          <th class="text-center">Unit</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${optionalItems.map(item => `
          <tr>
            <td>
              <div class="item-description">
                ${item.description}
                <span class="optional-badge">OPTIONAL</span>
              </div>
              ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ''}
            </td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-center">${item.unit}</td>
            <td class="text-right">${formatCurrency(item.unit_price)}</td>
            <td class="text-right"><strong>${formatCurrency(item.total_price)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <!-- Terms and Conditions -->
    ${opts.includeTermsConditions && quote.terms_conditions ? `
    <div class="terms">
      <div class="terms-title">📄 Terms & Conditions</div>
      <div class="terms-content">${quote.terms_conditions}</div>
    </div>
    ` : ''}

    <!-- Signature Section -->
    ${opts.includeSignature ? `
    <div class="signature-section">
      <div class="signature-grid">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Contractor Signature & Date</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Client Signature & Date</div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      This quote is valid for ${quote.valid_until ? `until ${formatDate(quote.valid_until)}` : '30 days from the date of issue'}.<br>
      Generated on ${formatDate(new Date())} | Quote #${quote.quote_number}
    </div>
  </div>

  <script>
    // Auto-focus print dialog when specified
    if (window.location.search.includes('autoprint=true')) {
      window.onload = () => window.print();
    }
  </script>
</body>
</html>
  `.trim()
}

/**
 * Get status color for badge
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: '#6B7280',
    sent: '#3B82F6',
    viewed: '#8B5CF6',
    accepted: '#10B981',
    rejected: '#EF4444',
    expired: '#F59E0B',
    converted: '#10B981'
  }
  return colors[status] || '#6B7280'
}

/**
 * Export for use in API routes or pages
 */
export const pdfGenerator = {
  generateQuoteHTML
}
