export function buildPDFHeaderHTML(options: {
  companyName: string;
  companyLogoUrl?: string | null;
  title: string;
  documentNumber?: string;
  date?: string;
}): string {
  const { companyName, companyLogoUrl, title, documentNumber, date } = options;
  const logoHtml = companyLogoUrl
    ? `<img src="${companyLogoUrl}" alt="${companyName}" style="max-height:60px;max-width:120px;" />`
    : `<div style="font-size:20px;font-weight:bold;color:#1e40af;">${companyName}</div>`;

  return `
    <div style="display:flex;align-items:center;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #1e40af;">
      <div style="flex-shrink:0;width:120px;">
        ${logoHtml}
      </div>
      <div style="flex:1;text-align:right;">
        <div style="font-size:18px;font-weight:bold;color:#1e40af;">${companyName}</div>
        <div style="font-size:14px;font-weight:bold;color:#333;margin-top:4px;">${title}</div>
        ${documentNumber ? `<div style="font-size:11px;color:#666;margin-top:2px;">${documentNumber}</div>` : ''}
        ${date ? `<div style="font-size:11px;color:#666;margin-top:2px;">${date}</div>` : ''}
      </div>
    </div>`;
}

export function drawPDFHeader(
  doc: any,
  options: {
    companyName: string;
    title: string;
    documentNumber?: string;
    date?: string;
  }
): number {
  const { companyName, title, documentNumber, date } = options;
  const pageWidth = 612;
  const margin = 50;
  const rightColX = margin;
  const leftColWidth = 120;
  const rightColWidth = pageWidth - margin - leftColWidth - margin;

  let y = margin;

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e40af');
  doc.text(companyName, margin, y, { width: leftColWidth });

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#333');
  doc.text(title, pageWidth - margin, y, { width: rightColWidth, align: 'right' });

  y += 22;

  if (documentNumber) {
    doc.fontSize(11).font('Helvetica').fillColor('#666');
    doc.text(documentNumber, pageWidth - margin, y, { width: rightColWidth, align: 'right' });
    y += 16;
  }

  if (date) {
    doc.fontSize(11).font('Helvetica').fillColor('#666');
    doc.text(date, pageWidth - margin, y, { width: rightColWidth, align: 'right' });
    y += 16;
  }

  if (!documentNumber && !date) {
    y += 4;
  }

  doc.fillColor('#000');
  doc.moveTo(margin, y + 2).lineTo(pageWidth - margin, y + 2).stroke('#1e40af');
  y += 12;

  return y;
}
