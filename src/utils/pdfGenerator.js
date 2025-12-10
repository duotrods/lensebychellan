import { jsPDF } from 'jspdf';

/**
 * Generate PDF for any report type
 * @param {Object} report - The report data
 * @param {string} reportType - Type of report (incident, asset-damage, daily-occurrence, cctv-check)
 */
export const generateReportPDF = (report, reportType) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = 20;

  // Helper function to add text with word wrap
  const addText = (text, x, y, options = {}) => {
    const { fontSize = 10, fontStyle = 'normal', maxWidth = contentWidth } = options;
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);

    if (text && text.toString().length > 0) {
      const lines = doc.splitTextToSize(text.toString(), maxWidth);
      doc.text(lines, x, y);
      return lines.length * (fontSize * 0.35); // Return height used
    }
    return 0;
  };

  // Helper to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Helper to format time
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Header
  doc.setFillColor(59, 130, 246); // Blue background
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  addText('LENS BY CHELLAN', margin, 15, { fontSize: 18, fontStyle: 'bold' });
  addText('Security Report', margin, 23, { fontSize: 12 });

  yPosition = 40;
  doc.setTextColor(0, 0, 0);

  // Report Title
  const reportTitles = {
    'incident': 'Incident Report',
    'asset-damage': 'Asset Damage Report',
    'daily-occurrence': 'Daily Occurrence Report',
    'cctv-check': 'CCTV Check Report'
  };

  addText(reportTitles[reportType] || 'Report', margin, yPosition, { fontSize: 16, fontStyle: 'bold' });
  yPosition += 10;

  // Reference ID
  if (report.referenceId) {
    addText(`Reference: ${report.referenceId}`, margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
    yPosition += 8;
  }

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Report Details based on type
  const addField = (label, value, bold = false) => {
    if (value === undefined || value === null) return;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, yPosition);

    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const valueText = value.toString();
    const lines = doc.splitTextToSize(valueText, contentWidth - 40);
    doc.text(lines, margin + 40, yPosition);

    yPosition += lines.length * 5 + 3;

    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
  };

  // Common fields
  addField('Date', formatDate(report.createdAt || report.timestamp || report.date));
  addField('Time', formatTime(report.createdAt || report.timestamp || report.time));

  if (report.scheme || report.schemeId) {
    addField('Scheme', report.scheme || report.schemeId);
  }

  if (report.location) {
    addField('Location', report.location);
  }

  // Type-specific fields
  switch (reportType) {
    case 'incident':
      if (report.incidentType) addField('Incident Type', report.incidentType, true);
      if (report.severity) addField('Severity', report.severity);
      if (report.laneAffected) addField('Lane Affected', report.laneAffected);
      if (report.spottedBy) addField('Spotted By', report.spottedBy);
      if (report.vehicleDispatched !== undefined) {
        addField('Vehicle Dispatched', report.vehicleDispatched ? 'Yes' : 'No');
      }
      if (report.description) addField('Description', report.description);
      if (report.actionTaken) addField('Action Taken', report.actionTaken);
      break;

    case 'asset-damage':
      if (report.damageType) addField('Damage Type', report.damageType, true);
      if (report.assetName) addField('Asset Name', report.assetName);
      if (report.severity) addField('Severity', report.severity);
      if (report.description) addField('Description', report.description);
      if (report.estimatedCost) addField('Estimated Cost', `£${report.estimatedCost}`);
      if (report.repairStatus) addField('Repair Status', report.repairStatus);
      break;

    case 'daily-occurrence':
      if (report.title) addField('Title', report.title, true);
      if (report.category) addField('Category', report.category);
      if (report.description) addField('Description', report.description);
      if (report.weatherConditions) addField('Weather', report.weatherConditions);
      if (report.trafficFlow) addField('Traffic Flow', report.trafficFlow);
      break;

    case 'cctv-check':
      if (report.allWorking !== undefined) {
        addField('All Systems Working', report.allWorking ? 'Yes' : 'No', true);
      }
      if (report.status) addField('Status', report.status);
      if (report.camerasChecked) addField('Cameras Checked', report.camerasChecked);
      if (report.issuesFound) addField('Issues Found', report.issuesFound);
      if (report.notes) addField('Notes', report.notes);
      break;
  }

  // Status
  if (report.status) {
    yPosition += 3;
    addField('Status', report.status, true);
  }

  // Submitted By
  if (report.submittedBy) {
    const submitter = typeof report.submittedBy === 'object'
      ? report.submittedBy?.name || 'Staff'
      : report.submittedBy;
    addField('Submitted By', submitter);
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`,
      margin,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0];
  const refId = report.referenceId || 'report';
  const filename = `${reportType}_${refId}_${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);
};

/**
 * Generate PDF for CCTV recording details
 * @param {Object} recording - The CCTV recording data
 */
export const generateCCTVRecordingPDF = (recording) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = 20;

  // Helper to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('LENS BY CHELLAN', margin, 15);
  doc.setFontSize(12);
  doc.text('CCTV Recording Report', margin, 23);

  yPosition = 40;
  doc.setTextColor(0, 0, 0);

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CCTV Recording Details', margin, yPosition);
  yPosition += 15;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Recording Details
  const addField = (label, value) => {
    if (!value) return;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(value.toString(), margin + 50, yPosition);
    yPosition += 8;
  };

  addField('Camera Number', recording.cameraNumber);
  addField('Location', recording.location);
  addField('Scheme', recording.scheme);
  addField('Date & Time', formatDate(recording.uploadedAt || recording.dateTime));
  addField('File Name', recording.fileName);
  addField('File Size', recording.fileSize ? `${(recording.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A');
  addField('Duration', recording.duration || 'N/A');

  if (recording.notes) {
    yPosition += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', margin, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    const notes = doc.splitTextToSize(recording.notes, pageWidth - (margin * 2));
    doc.text(notes, margin, yPosition);
    yPosition += notes.length * 6;
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`,
    margin,
    doc.internal.pageSize.getHeight() - 10
  );

  // Save
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `cctv_${recording.cameraNumber}_${timestamp}.pdf`;
  doc.save(filename);
};
