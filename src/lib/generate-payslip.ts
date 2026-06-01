import { jsPDF } from "jspdf";

export interface PayslipData {
  userName: string;
  userEmail: string;
  month: string;
  year: number;
  commissionRate: number;
  quotations: number;
  totalSAR: number;
  totalCommissionSAR: number;
  totalCommissionPKR: number;
}

export function generatePayslipPdf(data: PayslipData) {
  const pdf = new jsPDF();
  pdf.setFontSize(18);
  pdf.text("COMMISSION PAYSLIP", 105, 15, { align: "center" });

  pdf.setFontSize(10);
  pdf.text("Skyship Travels - Umrah Division", 20, 30);
  pdf.text("Commission Statement", 20, 37);

  pdf.setFontSize(11);
  pdf.text(`Employee: ${data.userName}`, 20, 50);
  pdf.text(`Email: ${data.userEmail}`, 20, 57);
  pdf.text(`Period: ${data.month} ${data.year}`, 20, 64);
  pdf.text(`Commission Rate: ${data.commissionRate}%`, 20, 71);

  const startY = 85;
  pdf.setFontSize(10);
  pdf.text("Details:", 20, startY);
  pdf.text(`Quotations: ${data.quotations}`, 30, startY + 10);
  pdf.text(`Total Quotation Value (SAR): ${data.totalSAR.toLocaleString()}`, 30, startY + 17);
  pdf.text(`Commission Earned (SAR): ${data.totalCommissionSAR.toLocaleString()}`, 30, startY + 24);
  pdf.text(`Commission Earned (PKR): ${data.totalCommissionPKR.toLocaleString()}`, 30, startY + 31);

  pdf.setFontSize(8);
  pdf.text("Computer-generated payslip. No signature required.", 105, 270, { align: "center" });

  pdf.save(`payslip-${data.userEmail.split("@")[0]}-${data.month}-${data.year}.pdf`);
}
