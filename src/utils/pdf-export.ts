import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

/**
 * Enhanced PDF Export Utility with security branding
 */
export function exportToPDF(
  title: string, 
  columns: string[], 
  data: any[][], 
  filename: string
) {
  const doc = new jsPDF();
  const companyName = "Gold X Usdt";
  const date = format(new Date(), 'MMMM dd, yyyy');

  // Add Header Branding
  doc.setFontSize(22);
  doc.setTextColor(255, 215, 0); // Gold color
  doc.text(companyName, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Secure USDT Investment Platform", 14, 26);
  
  doc.setDrawColor(255, 215, 0);
  doc.line(14, 28, 196, 28);

  // Add Document Info
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text(title, 14, 40);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${date}`, 14, 46);

  // Add Watermark (Optional, for each page)
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(40);
    doc.setTextColor(200, 200, 200);
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
    doc.text(companyName, 40, 150, { angle: 45 });
    doc.restoreGraphicsState();
  }

  // Generate Table
  autoTable(doc, {
    startY: 55,
    head: [columns],
    body: data,
    theme: 'striped',
    headStyles: { fillColor: [255, 215, 0], textColor: [0, 0, 0] },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { top: 55 },
    didDrawPage: (dataArg) => {
      // Add Footer
      const str = "Page " + (doc as any).internal.getNumberOfPages();
      doc.setFontSize(10);
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.text(str, dataArg.settings.margin.left, pageHeight - 10);
      doc.text(companyName + " - Confidential Data", 140, pageHeight - 10);
    }
  });

  doc.save(`${filename}_${new Date().getTime()}.pdf`);
}
