import lenselogo from "../assets/chellanpng.png";

// Mirrors generateA66UptimeReportPDF in functions/index.js (pdfkit) — if the
// layout changes there, update it here too.

const TEAL = [0, 186, 168];
const MARGIN = 20;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

const loadLogo = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 150;
      canvas.height = 75;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(null);
    img.src = lenselogo;
  });

const fmtRange = (d) =>
  `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

/** Builds and downloads the 24h CCTV uptime report PDF for one scheme. */
export const downloadCCTVUptimeReportPDF = async ({ schemeId, schemeName, report }) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await loadLogo();
  const now = new Date();
  const genDate = now.toLocaleDateString("en-GB");
  const genTime = now.toLocaleTimeString("en-GB");

  // ── Header ──
  if (logo) doc.addImage(logo, "JPEG", (PAGE_W - 50) / 2, 5, 50, 25, undefined, "FAST");
  doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(0);
  doc.text("LENSE BY CHELLAN", PAGE_W / 2, 35, { align: "center" });

  let y = 50;
  doc.setFillColor(240, 240, 240).rect(MARGIN, y - 5, CONTENT_W, 12, "F");
  doc.setFontSize(14).text(`${schemeName} - CCTV Uptime Report`, MARGIN + 5, y + 3);
  y += 15;

  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(100);
  doc.text(
    `Report Window: ${fmtRange(report.windowStart)} - ${fmtRange(report.windowEnd)}`,
    MARGIN,
    y,
  );
  y += 6;
  doc.setFontSize(9).setTextColor(120);
  doc.text(`Generated: ${genDate} at ${genTime}`, MARGIN, y);
  y += 6;
  doc.setDrawColor(...TEAL).setLineWidth(0.3).line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 10;

  const checkBreak = (needed) => {
    if (y + needed > PAGE_H - 15) {
      doc.addPage();
      y = MARGIN;
      return true;
    }
    return false;
  };

  const sectionHeader = (title) => {
    checkBreak(14);
    doc.setFillColor(...TEAL).rect(MARGIN, y - 4, CONTENT_W, 8, "F");
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(255);
    doc.text(title, MARGIN + 3, y + 1.5);
    y += 11;
    doc.setTextColor(0);
  };

  const field = (label, value) => {
    checkBreak(7);
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(60);
    doc.text(`${label}:`, MARGIN, y);
    doc.setFont("helvetica", "normal").setTextColor(0);
    doc.text(String(value), MARGIN + 50, y);
    y += 6.5;
  };

  // ── Summary ──
  const { totals } = report;
  sectionHeader("SUMMARY");
  field("Average Uptime", `${totals.avgUptimePct}%`);
  field("Average Downtime", `${(100 - totals.avgUptimePct).toFixed(1)}%`);
  field("Total Outages", totals.totalOutages);
  field("Average MTTR", totals.avgMttrMins !== null ? `${totals.avgMttrMins} mins` : "N/A");
  y += 3;

  // ── Per-camera table ──
  sectionHeader("PER-CAMERA BREAKDOWN");
  const cols = [
    { label: "Camera", x: 0, w: 23 },
    { label: "Uptime %", x: 23, w: 20 },
    { label: "Downtime", x: 43, w: 23 },
    { label: "Outages", x: 66, w: 18 },
    { label: "MTTR", x: 84, w: 18 },
    { label: "Status", x: 102, w: CONTENT_W - 102 },
  ];

  const tableHeader = () => {
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(60);
    cols.forEach((c) => doc.text(c.label, MARGIN + c.x, y));
    y += 2;
    doc.setDrawColor(200).setLineWidth(0.2).line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal").setTextColor(0);
  };
  tableHeader();

  const MAX_REFS = 3;
  report.cameras.forEach((cam) => {
    let status = "Online";
    if (cam.faultRefs.length > 0) {
      const extra =
        cam.faultRefs.length > MAX_REFS ? `, +${cam.faultRefs.length - MAX_REFS} more` : "";
      status = `Fault Reported (Ref: ${cam.faultRefs.slice(0, MAX_REFS).join(", ")}${extra})`;
    }
    doc.setFontSize(9);
    const statusLines = doc.splitTextToSize(status, cols[5].w);
    const rowH = Math.max(6.5, statusLines.length * 4 + 2.5);

    if (checkBreak(rowH)) tableHeader();

    doc.setTextColor(0);
    doc.text(cam.name, MARGIN + cols[0].x, y);
    doc.text(`${cam.uptimePct}%`, MARGIN + cols[1].x, y);
    doc.text(`${cam.downMins}m`, MARGIN + cols[2].x, y);
    doc.text(String(cam.outages), MARGIN + cols[3].x, y);
    doc.text(cam.mttrMins !== null ? `${cam.mttrMins}m` : "-", MARGIN + cols[4].x, y);
    if (cam.faultRefs.length > 0) doc.setTextColor(185, 28, 28);
    else doc.setTextColor(21, 128, 61);
    doc.text(statusLines, MARGIN + cols[5].x, y);
    y += rowH;
  });

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(200).setLineWidth(0.2).line(MARGIN, PAGE_H - 10, PAGE_W - MARGIN, PAGE_H - 10);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(128);
    doc.text(`Generated on ${genDate} at ${genTime}`, MARGIN, PAGE_H - 6);
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 6, { align: "right" });
  }

  doc.save(`${schemeId}-cctv-uptime-report-${now.toISOString().slice(0, 10)}.pdf`);
};
