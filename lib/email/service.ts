/**
 * Email Service using Resend
 *
 * Handles all email sending functionality for:
 * - Quote emails to clients
 * - Invoice emails to clients
 * - Internal notifications
 */

import { Resend } from 'resend'

let resendInstance: Resend | null = null

function getResend() {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }
  return resendInstance
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer
  }>
}

export interface QuoteEmailData {
  quoteNumber: string
  clientName: string
  clientEmail: string
  quoteTitle: string
  totalAmount: string
  validUntil: string
  companyName: string
  companyEmail: string
  companyPhone: string
  viewUrl: string
}

export interface InvoiceEmailData {
  invoiceNumber: string
  clientName: string
  clientEmail: string
  totalAmount: string
  dueDate: string
  companyName: string
  companyEmail: string
  companyPhone: string
  paymentUrl?: string
}

/**
 * Send a generic email
 */
export async function sendEmail(options: EmailOptions) {
  try {
    const resend = getResend()
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'The Sierra Suites <noreply@sierrasuites.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
      attachments: options.attachments,
    })

    return { success: true, id: result.data?.id }
  } catch (error: any) {
    console.error('[Email Service] Send error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send a quote email to a client
 */
export async function sendQuoteEmail(data: QuoteEmailData, pdfAttachment?: Buffer) {
  const html = generateQuoteEmailHTML(data)

  const attachments = pdfAttachment
    ? [
        {
          filename: `Quote-${data.quoteNumber}.pdf`,
          content: pdfAttachment,
        },
      ]
    : undefined

  return sendEmail({
    to: data.clientEmail,
    subject: `Quote #${data.quoteNumber} from ${data.companyName}`,
    html,
    replyTo: data.companyEmail,
    attachments,
  })
}

/**
 * Send an invoice email to a client
 */
export async function sendInvoiceEmail(data: InvoiceEmailData, pdfAttachment?: Buffer) {
  const html = generateInvoiceEmailHTML(data)

  const attachments = pdfAttachment
    ? [
        {
          filename: `Invoice-${data.invoiceNumber}.pdf`,
          content: pdfAttachment,
        },
      ]
    : undefined

  return sendEmail({
    to: data.clientEmail,
    subject: `Invoice #${data.invoiceNumber} from ${data.companyName}`,
    html,
    replyTo: data.companyEmail,
    attachments,
  })
}

/**
 * Generate HTML for quote email
 */
function generateQuoteEmailHTML(data: QuoteEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote #${data.quoteNumber}</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Quote #${data.quoteNumber}</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">${data.companyName}</p>
  </div>

  <!-- Content -->
  <div style="background-color: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

    <p style="font-size: 16px; margin-bottom: 20px;">Dear ${data.clientName},</p>

    <p style="font-size: 15px; line-height: 1.8; color: #4B5563;">
      Thank you for your interest in our services. We're pleased to provide you with a quote for <strong>${data.quoteTitle}</strong>.
    </p>

    <!-- Quote Details Box -->
    <div style="background-color: #F3F4F6; border-left: 4px solid #3B82F6; padding: 20px; margin: 30px 0; border-radius: 8px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Quote Number:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 14px;">#${data.quoteNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Total Amount:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px; color: #1E40AF;">${data.totalAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Valid Until:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 14px; color: #F59E0B;">${data.validUntil}</td>
        </tr>
      </table>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 35px 0;">
      <a href="${data.viewUrl}" style="display: inline-block; background-color: #1E40AF; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(30, 64, 175, 0.3);">
        View Full Quote
      </a>
    </div>

    <p style="font-size: 14px; line-height: 1.8; color: #4B5563; margin-top: 30px;">
      If you have any questions about this quote, please don't hesitate to reach out. We're here to help and look forward to working with you.
    </p>

    <!-- Divider -->
    <div style="border-top: 1px solid #E5E7EB; margin: 30px 0;"></div>

    <!-- Signature -->
    <p style="font-size: 14px; margin-bottom: 8px; color: #374151;">Best regards,</p>
    <p style="font-size: 15px; font-weight: bold; margin: 0; color: #1F2937;">${data.companyName}</p>
    <p style="font-size: 14px; color: #6B7280; margin: 5px 0 0 0;">
      <a href="tel:${data.companyPhone}" style="color: #3B82F6; text-decoration: none;">${data.companyPhone}</a>
      <span style="color: #D1D5DB;"> • </span>
      <a href="mailto:${data.companyEmail}" style="color: #3B82F6; text-decoration: none;">${data.companyEmail}</a>
    </p>
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 25px 20px; color: #9CA3AF; font-size: 12px;">
    <p style="margin: 0;">This quote was sent from The Sierra Suites platform</p>
    <p style="margin: 8px 0 0 0;">© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
  </div>

</body>
</html>
  `.trim()
}

/**
 * Generate HTML for invoice email
 */
function generateInvoiceEmailHTML(data: InvoiceEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${data.invoiceNumber}</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Invoice #${data.invoiceNumber}</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">${data.companyName}</p>
  </div>

  <!-- Content -->
  <div style="background-color: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

    <p style="font-size: 16px; margin-bottom: 20px;">Dear ${data.clientName},</p>

    <p style="font-size: 15px; line-height: 1.8; color: #4B5563;">
      Thank you for your business. Please find attached your invoice for the completed work.
    </p>

    <!-- Invoice Details Box -->
    <div style="background-color: #F3F4F6; border-left: 4px solid #10B981; padding: 20px; margin: 30px 0; border-radius: 8px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Invoice Number:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 14px;">#${data.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Total Amount Due:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px; color: #059669;">${data.totalAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Due Date:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 14px; color: #DC2626;">${data.dueDate}</td>
        </tr>
      </table>
    </div>

    ${
      data.paymentUrl
        ? `
    <!-- Payment CTA -->
    <div style="text-align: center; margin: 35px 0;">
      <a href="${data.paymentUrl}" style="display: inline-block; background-color: #059669; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3);">
        Pay Invoice
      </a>
    </div>
    `
        : ''
    }

    <p style="font-size: 14px; line-height: 1.8; color: #4B5563; margin-top: 30px;">
      If you have any questions about this invoice or need to discuss payment arrangements, please don't hesitate to contact us.
    </p>

    <!-- Divider -->
    <div style="border-top: 1px solid #E5E7EB; margin: 30px 0;"></div>

    <!-- Signature -->
    <p style="font-size: 14px; margin-bottom: 8px; color: #374151;">Best regards,</p>
    <p style="font-size: 15px; font-weight: bold; margin: 0; color: #1F2937;">${data.companyName}</p>
    <p style="font-size: 14px; color: #6B7280; margin: 5px 0 0 0;">
      <a href="tel:${data.companyPhone}" style="color: #10B981; text-decoration: none;">${data.companyPhone}</a>
      <span style="color: #D1D5DB;"> • </span>
      <a href="mailto:${data.companyEmail}" style="color: #10B981; text-decoration: none;">${data.companyEmail}</a>
    </p>
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 25px 20px; color: #9CA3AF; font-size: 12px;">
    <p style="margin: 0;">This invoice was sent from The Sierra Suites platform</p>
    <p style="margin: 8px 0 0 0;">© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
  </div>

</body>
</html>
  `.trim()
}
