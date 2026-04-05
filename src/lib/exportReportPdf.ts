import jsPDF from 'jspdf';
import logoDamaUrl from '@/assets/logo-dama.png';

// ── Color palette ──
const COLORS = {
  headerBg: '#0f172a',
  gold: '#D4AF37',
  textPrimary: '#334155',
  textSecondary: '#64748b',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  amber: '#f59e0b',
  footerText: '#94a3b8',
  cardBg: '#f8fafc',
  border: '#e2e8f0',
};

interface ReportPdfOptions {
  type: 'weekly' | 'monthly';
  periodLabel: string; // e.g. "01/04 a 07/04/2026"
  periodSlug: string; // e.g. "2026-04-01" for filename
  doctorName?: string;
  specialty?: string;
  revenueEstimated: number;
  revenueLost: number;
  occupancy: number;
  noshowRate: number;
  reportText: string;
}

function formatBRL(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/** Convert image URL to base64 data URL */
async function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/** Strip markdown bold/italic/headers to plain text for PDF */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1');
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const y = pageH - 12;

  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(20, y - 4, pageW - 20, y - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COLORS.footerText);
  doc.text('DAMA Clínica · damasaude.com.br · Relatório gerado automaticamente', 20, y);
  doc.text(`${pageNum}/${totalPages}`, pageW - 20, y, { align: 'right' });
}

function drawMetricCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  accentColor: string,
) {
  // Card background
  doc.setFillColor(COLORS.cardBg);
  doc.roundedRect(x, y, w, h, 3, 3, 'F');

  // Accent bar top
  doc.setFillColor(accentColor);
  doc.roundedRect(x, y, w, 3, 3, 3, 'F');
  // Cover bottom corners of accent bar
  doc.setFillColor(accentColor);
  doc.rect(x, y + 1.5, w, 1.5, 'F');

  // Value
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(COLORS.textPrimary);
  doc.text(value, x + w / 2, y + 18, { align: 'center' });

  // Label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COLORS.textSecondary);
  doc.text(label, x + w / 2, y + 25, { align: 'center' });
}

export async function exportReportPdf(options: ReportPdfOptions) {
  const {
    type,
    periodLabel,
    periodSlug,
    doctorName,
    specialty,
    revenueEstimated,
    revenueLost,
    occupancy,
    noshowRate,
    reportText,
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth(); // 210
  const marginX = 20;
  const contentW = pageW - marginX * 2;

  // ── Load logo ──
  let logoDataUrl: string | null = null;
  try {
    logoDataUrl = await loadImageAsBase64(logoDamaUrl);
  } catch {
    // Logo not available, skip
  }

  // ── HEADER (dark bar) ──
  const headerH = 36;
  doc.setFillColor(COLORS.headerBg);
  doc.rect(0, 0, pageW, headerH, 'F');

  // Logo
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', marginX, 6, 30, 12);
  }

  // Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor('#ffffff');
  doc.text('DAMA Clínica · Gestão inteligente para médicos', marginX, 24);

  // Gold accent line
  doc.setFillColor(COLORS.gold);
  doc.rect(0, headerH, pageW, 1, 'F');

  // ── TITLE ──
  let cursorY = headerH + 14;

  const titleText = type === 'weekly' ? 'Relatório Semanal' : 'Relatório Mensal';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(COLORS.headerBg);
  doc.text(titleText, marginX, cursorY);

  cursorY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.textSecondary);
  doc.text(periodLabel, marginX, cursorY);

  // Doctor name + specialty
  if (doctorName || specialty) {
    cursorY += 6;
    doc.setFontSize(10);
    doc.setTextColor(COLORS.textSecondary);
    const parts = [doctorName, specialty].filter(Boolean).join(' · ');
    doc.text(parts, marginX, cursorY);
  }

  cursorY += 10;

  // ── METRICS GRID (2×2) ──
  const cardW = (contentW - 6) / 2;
  const cardH = 30;
  const gap = 6;

  drawMetricCard(doc, marginX, cursorY, cardW, cardH, 'Receita Estimada', formatBRL(revenueEstimated), COLORS.green);
  drawMetricCard(doc, marginX + cardW + gap, cursorY, cardW, cardH, 'Receita Perdida', formatBRL(revenueLost), COLORS.red);

  cursorY += cardH + gap;

  drawMetricCard(doc, marginX, cursorY, cardW, cardH, 'Ocupação Média', formatPct(occupancy), COLORS.blue);
  drawMetricCard(doc, marginX + cardW + gap, cursorY, cardW, cardH, 'Taxa de No-show', formatPct(noshowRate), COLORS.amber);

  cursorY += cardH + 12;

  // ── REPORT BODY ──
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(marginX, cursorY, pageW - marginX, cursorY);
  cursorY += 8;

  const plainText = stripMarkdown(reportText);
  const paragraphs = plainText.split('\n').filter(l => l.trim());

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.textPrimary);

  const pageH = doc.internal.pageSize.getHeight();
  const bottomLimit = pageH - 22; // Leave room for footer

  for (const para of paragraphs) {
    const isBullet = para.trim().startsWith('-') || para.trim().startsWith('•');
    const indent = isBullet ? 6 : 0;
    const lineW = contentW - indent;

    // Detect section headers (lines that are emoji + text, short)
    const isHeader = /^[📈📊🔮🎯⚠️✅❌💡🏥]/.test(para.trim()) || (para.trim().length < 60 && para.trim().endsWith(':'));

    if (isHeader) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(COLORS.headerBg);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(COLORS.textPrimary);
    }

    const lines = doc.splitTextToSize(para, lineW);
    const blockH = lines.length * 5;

    // Check if we need a new page
    if (cursorY + blockH > bottomLimit) {
      doc.addPage();
      cursorY = 20;
    }

    for (const line of lines) {
      doc.text(line, marginX + indent, cursorY);
      cursorY += 5;
    }

    cursorY += 2; // paragraph spacing
  }

  // ── FOOTERS on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  // ── OUTPUT ──
  const typeSlug = type === 'weekly' ? 'Semanal' : 'Mensal';
  const fileName = `DAMA-Relatorio-${typeSlug}-${periodSlug}.pdf`;

  // Check if running in Capacitor (native mobile)
  const isNative = typeof (window as any).Capacitor !== 'undefined';

  if (isNative) {
    // For Capacitor: create blob and use share
    const blob = doc.output('blob');
    const file = new File([blob], fileName, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fileName });
        return;
      } catch {
        // User cancelled or share failed, fall through to download
      }
    }
  }

  // Web fallback: direct download
  doc.save(fileName);
}
