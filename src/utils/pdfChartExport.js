// Shared PDF chart-export design, used by NewClientDashboard, ClientChartsPage,
// and ThirdPartyChartsPage — one place to change the look (bar/pie drawing,
// card shadow, page header + logo, page layout) for every "Export Charts"
// button in the app.
import { jsPDF } from "jspdf";
import logomarkWhiteUrl from "../assets/Logomark White.svg";
import { layoutPieLabels } from "./pieLabelLayout";

// Also used on-screen for the recharts <Pie> <Cell> fills, so pie colors stay
// identical between the live dashboard and the exported PDF.
export const PIE_COLORS = [
  "#2a78d6", "#008300", "#e87ba4", "#eda100",
  "#1baf7a", "#eb6834", "#4a3aa7", "#e34948",
];

// "#rrggbb" -> [r, g, b] for jsPDF's setFillColor, which takes 0-255 ints.
const hexToRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

// Soft drop shadow behind a chart card — mirrors the on-screen shadow-lg —
// built from a few offset, low-opacity layers since jsPDF has no native blur.
const drawCardShadow = (pdf, x, y, width, height) => {
  const layers = [
    { offset: 1.6, opacity: 0.05 },
    { offset: 1, opacity: 0.06 },
    { offset: 0.5, opacity: 0.07 },
  ];
  layers.forEach(({ offset, opacity }) => {
    pdf.saveGraphicsState();
    pdf.setGState(new pdf.GState({ opacity }));
    pdf.setFillColor(15, 23, 42);
    pdf.rect(x + offset * 0.5, y + offset, width, height, "F");
    pdf.restoreGraphicsState();
  });
};

export const drawBarChart = (pdf, data, title, x, y, width, height) => {
  if (!data || data.length === 0) return;

  drawCardShadow(pdf, x, y, width, height);

  // Draw chart background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y, width, height, "F");
  pdf.setDrawColor(229, 231, 235);
  pdf.rect(x, y, width, height, "S");

  // Draw title at the top with better positioning
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(31, 41, 55);
  pdf.text(title, x + width / 2, y + 6, { align: "center" });

  // Adjusted margins — left is wider now to fit the Y-axis value labels
  const margin = { top: 12, right: 10, bottom: 18, left: 16 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Round the axis max up to a clean multiple of the tick count — same
  // approach recharts' default Y-axis uses (e.g. max data value 25 with
  // 4 ticks -> step 7 -> axis tops out at 28), so the PDF axis matches
  // what's shown on screen.
  const rawMax = Math.max(...data.map((d) => d.Number), 1);
  const gridLines = 4;
  const tickStep = Math.max(1, Math.ceil(rawMax / gridLines));
  const maxValue = tickStep * gridLines;

  const barWidth = (chartWidth / data.length) * 0.7;
  const gap = (chartWidth / data.length) * 0.3;

  // Dashed gridlines behind the bars — mirrors recharts' default
  // CartesianGrid, which draws both horizontal (per Y-axis tick) and
  // vertical (per category, at each bar's center) lines. Drawn before the
  // bars, so — same as on screen — a tall bar naturally covers its own
  // vertical line.
  pdf.setDrawColor(23, 175, 147);
  pdf.setLineWidth(0.1);
  pdf.setLineDashPattern([1, 1], 0);
  for (let g = 0; g < gridLines; g++) {
    const gridY = y + margin.top + (chartHeight / gridLines) * g;
    pdf.line(x + margin.left, gridY, x + margin.left + chartWidth, gridY);
  }
  data.forEach((item, index) => {
    const barCenterX =
      x + margin.left + index * (barWidth + gap) + barWidth / 2;
    pdf.line(
      barCenterX,
      y + margin.top,
      barCenterX,
      y + margin.top + chartHeight,
    );
  });
  // Dashed top/right border closing off the plot box — same dashed style as
  // the gridlines above, so the right side reads as gridline, not axis.
  pdf.line(
    x + margin.left + chartWidth,
    y + margin.top,
    x + margin.left + chartWidth,
    y + margin.top + chartHeight,
  );
  pdf.line(
    x + margin.left,
    y + margin.top,
    x + margin.left + chartWidth,
    y + margin.top,
  );
  pdf.setLineDashPattern([], 0);

  // Solid X/Y axis lines framing the plot area — recharts draws these by
  // default on both axes, distinct from the dashed gridlines.
  pdf.setDrawColor(153, 153, 153);
  pdf.setLineWidth(0.15);
  pdf.line(
    x + margin.left,
    y + margin.top,
    x + margin.left,
    y + margin.top + chartHeight,
  );
  pdf.line(
    x + margin.left,
    y + margin.top + chartHeight,
    x + margin.left + chartWidth,
    y + margin.top + chartHeight,
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(107, 114, 128);
  for (let g = 0; g <= gridLines; g++) {
    const tickValue = maxValue - tickStep * g;
    const tickY = y + margin.top + (chartHeight / gridLines) * g;
    pdf.text(String(tickValue), x + margin.left - 2, tickY + 1, {
      align: "right",
    });
  }

  // Draw bars
  data.forEach((item, index) => {
    const barHeight = (item.Number / maxValue) * chartHeight;
    const barX = x + margin.left + index * (barWidth + gap);
    const barY = y + margin.top + chartHeight - barHeight;

    // Only draw bar if height is valid and greater than 0
    if (
      barHeight > 0 &&
      !isNaN(barHeight) &&
      !isNaN(barX) &&
      !isNaN(barY) &&
      barWidth > 0
    ) {
      pdf.setFillColor(23, 175, 147); // Teal color
      pdf.rect(barX, barY, barWidth, barHeight, "F");
    }

    // Draw value on top of bar
    pdf.setFontSize(8);
    pdf.setTextColor(31, 41, 55);
    const valueY =
      barHeight > 0 ? barY - 2 : y + margin.top + chartHeight - 2;
    pdf.text(String(item.Number), barX + barWidth / 2, valueY, {
      align: "center",
    });

    // Draw label below bar - much closer now
    pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128);
    const label =
      item.name.length > 12 ? item.name.substring(0, 12) + "..." : item.name;
    const labelY = y + margin.top + chartHeight + 5; // Just 5mm below the chart area
    pdf.text(label, barX + barWidth / 2, labelY, {
      align: "center",
      maxWidth: barWidth,
    });
  });
};

// The label layout (pieLabelLayout) is tuned in screen pixels — line heights,
// leader lengths, 12px text. The PDF card is drawn as if it were this many
// pixels wide and everything is scaled down to mm, so the exported pie has
// the same proportions as the on-screen one.
const PIE_VIRTUAL_WIDTH = 620;
const PT_PER_MM = 72 / 25.4;

// Mirrors the on-screen pie view (PieBreakdown in NewClientDashboard) for
// whichever charts are toggled to pie: one label + leader line per slice,
// laid out by the same layoutPieLabels so nothing overlaps or leaves the
// card, and a wrapped legend row underneath. jsPDF has no native pie
// primitive, so each slice is drawn as a filled polygon approximating its arc.
export const drawPieChart = (pdf, data, title, x, y, width, height) => {
  if (!data || data.length === 0) return;

  drawCardShadow(pdf, x, y, width, height);

  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y, width, height, "F");
  pdf.setDrawColor(229, 231, 235);
  pdf.rect(x, y, width, height, "S");

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(31, 41, 55);
  pdf.text(title, x + width / 2, y + 6, { align: "center" });

  // Colour is tied to a category's position in the full data set, same as on screen.
  const slices = data
    .map((item, i) => ({
      name: String(item.name),
      value: item.Number || 0,
      rgb: hexToRgb(PIE_COLORS[i % PIE_COLORS.length]),
    }))
    .filter((slice) => slice.value > 0);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return;

  // Legend: swatch + name, wrapped into centred rows along the bottom.
  const legendFontSize = 6.5;
  const legendRowHeight = 3.8;
  const maxLegendRows = 3;
  const swatch = 2.2;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(legendFontSize);
  const legendRows = [[]];
  let rowWidth = 0;
  slices.forEach((slice) => {
    const itemWidth = swatch + 1.2 + pdf.getTextWidth(slice.name) + 4;
    if (rowWidth + itemWidth > width - 8 && legendRows[legendRows.length - 1].length) {
      legendRows.push([]);
      rowWidth = 0;
    }
    legendRows[legendRows.length - 1].push({ slice, itemWidth });
    rowWidth += itemWidth;
  });
  const shownRows = legendRows.slice(0, maxLegendRows);
  const legendHeight = shownRows.length * legendRowHeight + 2;

  const plotTop = y + 10;
  const plotHeight = height - 10 - legendHeight - 1;
  const scale = width / PIE_VIRTUAL_WIDTH;
  const layout = layoutPieLabels(
    slices.map((slice) => slice.value),
    PIE_VIRTUAL_WIDTH,
    plotHeight / scale,
  );
  const toX = (px) => x + px * scale;
  const toY = (py) => plotTop + py * scale;
  const centerX = toX(layout.cx);
  const centerY = toY(layout.cy);
  const radius = layout.radius * scale;

  // Slices, clockwise from the layout's start angle, with a thin white gap between them.
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(0.35);
  let cumulative = 0;
  slices.forEach((slice) => {
    const from = ((layout.startAngle - (360 * cumulative) / total) * Math.PI) / 180;
    cumulative += slice.value;
    const to = ((layout.startAngle - (360 * cumulative) / total) * Math.PI) / 180;

    pdf.setFillColor(...slice.rgb);
    // Polygon: center -> points along the arc -> back to center (closed).
    const steps = Math.max(2, Math.ceil((slice.value / total) * 90));
    const segments = [];
    let prev = [centerX, centerY];
    for (let s = 0; s <= steps; s++) {
      const angle = from + ((to - from) * s) / steps;
      const point = [centerX + radius * Math.cos(angle), centerY - radius * Math.sin(angle)];
      segments.push([point[0] - prev[0], point[1] - prev[1]]);
      prev = point;
    }
    pdf.lines(segments, centerX, centerY, [1, 1], slices.length > 1 ? "FD" : "F", true);
  });

  // Labels: bold name + muted "count (pct%)", joined to the slice by a leader in its colour.
  const labelFontSize = 12 * scale * PT_PER_MM;
  const roomForText = (PIE_VIRTUAL_WIDTH / 2 - layout.radius - 30) * scale;
  const fit = (text, maxWidth) => {
    if (pdf.getTextWidth(text) <= maxWidth) return text;
    let cut = text;
    while (cut.length > 1 && pdf.getTextWidth(`${cut}...`) > maxWidth) cut = cut.slice(0, -1);
    return `${cut.trimEnd()}...`;
  };
  pdf.setFontSize(labelFontSize);
  slices.forEach((slice, i) => {
    const label = layout.labels[i];
    if (!label) return;
    const [r, g, b] = slice.rgb;
    const points = [label.edge, label.bend, label.lineEnd].map(([px, py]) => [toX(px), toY(py)]);

    pdf.setDrawColor(r, g, b);
    pdf.setLineWidth(0.3);
    pdf.line(points[0][0], points[0][1], points[1][0], points[1][1]);
    pdf.line(points[1][0], points[1][1], points[2][0], points[2][1]);
    pdf.setFillColor(r, g, b);
    pdf.circle(points[2][0], points[2][1], 0.5, "F");

    const pct = (slice.value / total) * 100;
    const stats = `${slice.value} (${pct < 1 ? "<1" : Math.round(pct)}%)`;
    const textX = toX(label.x);
    const align = label.right ? "left" : "right";

    if (layout.twoLine) {
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(31, 41, 55);
      pdf.text(fit(slice.name, roomForText), textX, toY(label.y - 3), { align });
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(99, 115, 129);
      pdf.text(stats, textX, toY(label.y + 12), { align });
      return;
    }

    // One line: the name and the stats sit side by side, so place each by measured width.
    const baseline = toY(label.y + 4);
    pdf.setFont("helvetica", "normal");
    const gap = pdf.getTextWidth(" ");
    const statsWidth = pdf.getTextWidth(stats);
    pdf.setFont("helvetica", "bold");
    const name = fit(slice.name, roomForText - statsWidth - gap);
    const nameWidth = pdf.getTextWidth(name);
    const nameX = label.right ? textX : textX - statsWidth - gap - nameWidth;
    pdf.setTextColor(31, 41, 55);
    pdf.text(name, nameX, baseline);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(99, 115, 129);
    pdf.text(stats, nameX + nameWidth + gap, baseline);
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(legendFontSize);
  pdf.setTextColor(75, 85, 99);
  shownRows.forEach((row, rowIndex) => {
    const rowTotal = row.reduce((sum, item) => sum + item.itemWidth, 0) - 4;
    let itemX = x + (width - rowTotal) / 2;
    const baseline = y + height - legendHeight + 1.5 + rowIndex * legendRowHeight;
    row.forEach(({ slice, itemWidth }) => {
      pdf.setFillColor(...slice.rgb);
      pdf.rect(itemX, baseline - swatch + 0.2, swatch, swatch, "F");
      pdf.text(slice.name, itemX + swatch + 1.2, baseline);
      itemX += itemWidth;
    });
  });
};

// Rasterizes an SVG (as an import URL) into a PNG data URL via canvas —
// jsPDF's addImage doesn't accept SVG directly. Rendered well above the
// final placement size so it stays crisp when printed.
const svgToPngDataUrl = async (svgUrl, pixelWidth, pixelHeight) => {
  const response = await fetch(svgUrl);
  const svgText = await response.text();
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.getContext("2d").drawImage(img, 0, 0, pixelWidth, pixelHeight);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

// Cached across calls in the same session — the logo never changes, so
// every export after the first reuses this instead of re-fetching/rasterizing.
let cachedLogoPromise = null;
const getLogoDataUrl = () => {
  if (!cachedLogoPromise) {
    cachedLogoPromise = svgToPngDataUrl(logomarkWhiteUrl, 300, 365).catch(
      (error) => {
        console.warn("Failed to load logo for PDF export:", error);
        return null;
      },
    );
  }
  return cachedLogoPromise;
};

/**
 * Builds and saves a multi-page landscape PDF: teal header (logo + title +
 * subtitle + date range + stats) followed by the given charts, 4 per page in
 * a 2x2 grid, each drawn as a bar or pie chart depending on chartTypesRef.
 *
 * @param {object} options
 * @param {string} options.reportTitle - Big header title, e.g. "Dashboard Report"
 * @param {string} options.subtitle - Smaller header line under the title, e.g. scheme name
 * @param {string} options.dateRangeText - Right-aligned header line 1
 * @param {string} options.statsText - Right-aligned header line 2
 * @param {{data: Array, title: string, key?: string}[]} options.charts
 * @param {React.MutableRefObject<Record<string,'bar'|'pie'>>} [options.chartTypesRef] -
 *   Optional; when a chart's key maps to "pie" it's drawn as a pie chart, otherwise bar.
 * @param {string} options.fileName
 */
export async function exportChartsToPDF({
  reportTitle,
  subtitle,
  dateRangeText,
  statsText,
  charts,
  chartTypesRef,
  fileName,
}) {
  const pdf = new jsPDF({
    orientation: "l",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const headerHeight = 25;

  const logoAspect = 228.02 / 277.82; // width / height, from the SVG viewBox
  const logoHeight = 15;
  const logoWidth = logoHeight * logoAspect;
  const logoX = 15;
  const logoY = (headerHeight - logoHeight) / 2;
  const titleX = logoX + logoWidth + 5;

  const logoDataUrl = await getLogoDataUrl();

  const drawPageHeader = () => {
    pdf.setFillColor(23, 175, 147); // Teal color
    pdf.rect(0, 0, pdfWidth, headerHeight, "F");

    if (logoDataUrl) {
      pdf.addImage(logoDataUrl, "PNG", logoX, logoY, logoWidth, logoHeight);
    }

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(reportTitle, titleX, 12);

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.text(subtitle, titleX, 19);

    pdf.text(dateRangeText, pdfWidth - 15, 12, { align: "right" });
    pdf.text(statsText, pdfWidth - 15, 19, { align: "right" });
  };

  drawPageHeader();

  // Content area — 4 charts per page in a 2x2 grid.
  const contentStartY = headerHeight + 10;
  const chartGap = 8;
  const chartWidth = (pdfWidth - 30 - chartGap) / 2;
  const chartHeight = (pdfHeight - contentStartY - 15 - chartGap) / 2;
  const positions = [
    { x: 15, y: contentStartY },
    { x: 15 + chartWidth + chartGap, y: contentStartY },
    { x: 15, y: contentStartY + chartHeight + chartGap },
    { x: 15 + chartWidth + chartGap, y: contentStartY + chartHeight + chartGap },
  ];

  let chartsOnPage = 0;

  charts.forEach((chart) => {
    if (chart.data && chart.data.length > 0) {
      if (chartsOnPage === 4) {
        pdf.addPage();
        drawPageHeader();
        chartsOnPage = 0;
      }

      const type = chartTypesRef?.current?.[chart.key];
      const drawFn = type === "pie" ? drawPieChart : drawBarChart;

      const pos = positions[chartsOnPage];
      drawFn(pdf, chart.data, chart.title, pos.x, pos.y, chartWidth, chartHeight);

      chartsOnPage++;
    }
  });

  pdf.save(fileName);
}
