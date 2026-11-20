// PDF of one camera's fault history (timeline + merged notes), opened from the sidebar.
// Imported lazily so jsPDF stays out of the main bundle.
import { jsPDF } from "jspdf";

const TEAL = [23, 175, 147];
const RED = [239, 68, 68];
const MARGIN = 15;

const fmtDay = (ms) => new Date(ms).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const fmtDayLong = (ms) =>
  new Date(ms).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (ms) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const roleLabel = (role) =>
  role === "cctvfaultoperator" || role === "thirdpartycctvoperator" ? "CCTV Operator" : role ? "Staff" : "";

export const exportCameraHistoryPDF = ({ entry, windowStartMs, windowEndMs, subtitle, rangeText, fileName }) => {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  let y = 0;

  const header = () => {
    pdf.setFillColor(...TEAL);
    pdf.rect(0, 0, pageW, 28, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(entry.camera, MARGIN, 12);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(
      `${entry.faultCount} fault${entry.faultCount !== 1 ? "s" : ""}${entry.hasLive ? " - live fault open" : ""}`,
      MARGIN,
      19,
    );
    pdf.text(`${subtitle}  |  ${rangeText}`, MARGIN, 24);
    y = 38;
  };
  const ensure = (h) => {
    if (y + h > pageH - MARGIN) {
      pdf.addPage();
      y = MARGIN;
    }
  };
  const heading = (text) => {
    ensure(12);
    pdf.setTextColor(107, 114, 128);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(text.toUpperCase(), MARGIN, y);
    y += 6;
  };

  header();

  // ---- Fault timeline ----
  heading("Fault timeline");
  const labelW = 22;
  const trackX = MARGIN + labelW;
  const trackW = contentW - labelW;
  const span = Math.max(1, windowEndMs - windowStartMs);
  const xAt = (ms) => trackX + ((Math.min(Math.max(ms, windowStartMs), windowEndMs) - windowStartMs) / span) * trackW;
  const rowH = 7;
  const gridTop = y - 1;
  const gridBottom = y + entry.faults.length * rowH;

  pdf.setDrawColor(...TEAL);
  pdf.setLineWidth(0.1);
  pdf.setLineDashPattern([0.8, 0.8], 0);
  for (let i = 0; i < 5; i++) pdf.line(trackX + (trackW / 4) * i, gridTop, trackX + (trackW / 4) * i, gridBottom);
  pdf.setLineDashPattern([], 0);

  entry.faults.forEach((f) => {
    const x1 = xAt(f.startMs);
    const x2 = Math.max(xAt(f.endMs ?? windowEndMs), x1 + 1.2);
    pdf.setTextColor(55, 65, 81);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(String(f.referenceId), MARGIN, y + 3.4);
    pdf.setFillColor(...(f.status === "live" ? RED : TEAL));
    pdf.roundedRect(x1, y, x2 - x1, 4, 1, 1, "F");
    y += rowH;
  });
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(8);
  for (let i = 0; i < 5; i++) {
    const ms = windowStartMs + (span / 4) * i;
    pdf.text(fmtDay(ms), trackX + (trackW / 4) * i, y + 3, { align: i === 0 ? "left" : i === 4 ? "right" : "center" });
  }
  y += 14;

  // ---- Notes ----
  heading(`Notes history${entry.notes.length ? ` (${entry.notes.length})` : ""}`);
  if (entry.notes.length === 0) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(9);
    pdf.text("No notes on this camera's faults.", MARGIN, y);
  }

  let lastDay = "";
  [...entry.notes].reverse().forEach((n) => {
    const day = fmtDayLong(n.atMs);
    if (day !== lastDay) {
      ensure(12);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text(day, pageW / 2, y + 2, { align: "center" });
      y += 8;
      lastDay = day;
    }
    const isOperator = roleLabel(n.authorRole) === "CCTV Operator";
    const bubbleW = contentW * 0.75;
    const bx = isOperator ? pageW - MARGIN - bubbleW : MARGIN;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(n.text, bubbleW - 8);
    const bubbleH = 6 + lines.length * 4.2 + 6;
    ensure(bubbleH + 3);

    pdf.setFillColor(...(isOperator ? [240, 253, 250] : [239, 246, 255]));
    pdf.setDrawColor(...(isOperator ? [204, 251, 241] : [219, 234, 254]));
    pdf.setLineWidth(0.2);
    pdf.roundedRect(bx, y, bubbleW, bubbleH, 2.5, 2.5, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(31, 41, 55);
    const who = n.authorName || "Note";
    pdf.text(who, bx + 4, y + 5);
    if (roleLabel(n.authorRole)) {
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(156, 163, 175);
      pdf.text(roleLabel(n.authorRole), bx + 4 + pdf.getTextWidth(who) + 2, y + 5);
    }
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(31, 41, 55);
    pdf.text(lines, bx + 4, y + 10);
    pdf.setFontSize(7.5);
    pdf.setTextColor(...TEAL);
    pdf.text(String(n.referenceId), bx + 4, y + bubbleH - 2.5);
    pdf.setTextColor(156, 163, 175);
    pdf.text(fmtTime(n.atMs), bx + bubbleW - 4, y + bubbleH - 2.5, { align: "right" });
    y += bubbleH + 3;
  });

  pdf.save(fileName);
};
