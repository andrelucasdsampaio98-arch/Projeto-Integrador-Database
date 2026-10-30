/**
 * Utility to generate lightweight, valid PDF 1.4 data URLs in pure TypeScript.
 * No external heavy libraries required. Allows creating real PDF files for lessons.
 */

export function generatePdfDataUrl(
  title: string,
  author: string,
  subject: string,
  bodyLines: string[]
): string {
  const sanitize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics for standard Type1 Helvetica
      .replace(/[\\()]/g, '');

  const safeTitle = sanitize(title);
  const safeAuthor = sanitize(author);
  const safeSubject = sanitize(subject);

  // Build stream content with font commands
  let streamText = 'BT\n/F1 20 Tf\n50 780 Td\n(' + safeTitle.substring(0, 60) + ') Tj\n';
  streamText += '/F1 12 Tf\n0 -28 Td\n(Disciplina: ' + safeSubject.substring(0, 50) + ' | Docente: ' + safeAuthor.substring(0, 50) + ') Tj\n';
  streamText += '0 -15 Td\n(--------------------------------------------------------------------------------) Tj\n';
  streamText += '0 -25 Td\n';

  bodyLines.slice(0, 30).forEach((line) => {
    const cleanLine = sanitize(line).substring(0, 85);
    streamText += '(' + cleanLine + ') Tj\n0 -18 Td\n';
  });

  streamText += 'ET\n';

  const streamLen = streamText.length;

  let pdf = '%PDF-1.4\n';
  
  const obj1Offset = pdf.length;
  pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  const obj2Offset = pdf.length;
  pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  const obj3Offset = pdf.length;
  pdf += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';

  const obj4Offset = pdf.length;
  pdf += `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamText}endstream\nendobj\n`;

  const obj5Offset = pdf.length;
  pdf += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  const xrefOffset = pdf.length;
  pdf += 'xref\n0 6\n';
  pdf += '0000000000 65535 f \n';
  pdf += `${String(obj1Offset).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj2Offset).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj3Offset).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj4Offset).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj5Offset).padStart(10, '0')} 00000 n \n`;

  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  // Encode as base64 data url
  const base64 = btoa(unescape(encodeURIComponent(pdf)));
  return `data:application/pdf;base64,${base64}`;
}
