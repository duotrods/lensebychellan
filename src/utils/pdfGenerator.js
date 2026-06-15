import { jsPDF } from "jspdf";
import lenselogo from "../assets/chellanpng.png";
import { SCHEMES } from "./schemes";

// Cache for compressed logo to avoid re-processing
let cachedCompressedLogo = null;

/**
 * Compress logo image to reduce PDF size
 * Converts PNG to compressed JPEG and caches the result
 */
const getCompressedLogo = () => {
  return new Promise((resolve) => {
    if (cachedCompressedLogo) {
      resolve(cachedCompressedLogo);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // 3x display size for retina quality (logo displays at 50x25)
      canvas.width = 150;
      canvas.height = 75;
      const ctx = canvas.getContext("2d");
      // White background for transparency
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Compress to JPEG at 70% quality
      cachedCompressedLogo = canvas.toDataURL("image/jpeg", 0.7);
      resolve(cachedCompressedLogo);
    };
    img.onerror = () => {
      // Fallback to original if compression fails
      resolve(lenselogo);
    };
    img.src = lenselogo;
  });
};

/**
 * Generate PDF for any report type
 * @param {Object} report - The report data
 * @param {string} reportType - Type of report (incident, asset-damage, daily-occurrence, cctv-check)
 * @param {string} filterSchemeId - Optional scheme ID to filter CCTV sections (for client view)
 */
export const generateReportPDF = async (
  report,
  reportType,
  filterSchemeId = null,
) => {
  const doc = new jsPDF({ compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = 20;

  // Helper function to add text with word wrap
  const addText = (text, x, y, options = {}) => {
    const {
      fontSize = 10,
      fontStyle = "normal",
      maxWidth = contentWidth,
    } = options;
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", fontStyle);

    if (text && text.toString().length > 0) {
      const lines = doc.splitTextToSize(text.toString(), maxWidth);
      doc.text(lines, x, y);
      return lines.length * (fontSize * 0.35); // Return height used
    }
    return 0;
  };

  // Helper to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Helper to format time
  const formatTime = (timestamp) => {
    if (!timestamp) return "N/A";

    // If it's already a string in time format (HH:MM), return it
    if (typeof timestamp === "string" && /^\d{1,2}:\d{2}/.test(timestamp)) {
      return timestamp;
    }

    // Try to convert to Date object
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "N/A";
      }

      return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "N/A";
    }
  };

  // Header with white background - increased height for centered logo and text
  doc.setFillColor(255, 255, 255); // White background
  doc.rect(0, 0, pageWidth, 40, "F");

  // Add compressed logo centered on top
  try {
    const compressedLogo = await getCompressedLogo();
    const logoWidth = 50; // Width
    const logoHeight = 25; // Height (adjust ratio to prevent distortion)
    const logoX = (pageWidth - logoWidth) / 2; // Center horizontally
    doc.addImage(
      compressedLogo,
      "JPEG",
      logoX,
      5,
      logoWidth,
      logoHeight,
      undefined,
      "FAST",
    );
  } catch (error) {
    console.error("Error adding logo:", error);
  }

  // Add text centered below the logo
  doc.setTextColor(0, 0, 0); // Black text
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("LENSE BY CHELLAN", pageWidth / 2, 35, { align: "center" });

  yPosition = 50;
  doc.setTextColor(0, 0, 0);

  // Report Title Section
  const reportTitles = {
    incident: "Incident Report",
    "asset-damage": "Asset Damage Report",
    "daily-occurrence": "Daily Occurrence Report",
    "cctv-check": "CCTV Check Report",
  };

  // Title with background
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition - 5, contentWidth, 12, "F");
  doc.setTextColor(0, 0, 0);
  addText(reportTitles[reportType] || "Report", margin + 5, yPosition + 3, {
    fontSize: 14,
    fontStyle: "bold",
  });
  yPosition += 15;

  // Reference ID with improved styling
  if (report.referenceId) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Reference Number: ${report.referenceId}`, margin, yPosition);
    yPosition += 6;
  }

  // Add generation date/time
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB")}`,
    margin,
    yPosition,
  );
  yPosition += 10;

  // Divider line
  doc.setDrawColor(0, 186, 168); // Teal color
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 12;

  // Helper to add section headers
  const addSectionHeader = (title) => {
    if (yPosition > 260) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFillColor(0, 186, 168); // Teal background
    doc.rect(margin, yPosition - 2, contentWidth, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 3, yPosition + 4);
    yPosition += 12;
    doc.setTextColor(0, 0, 0);
  };

  // Improved field display
  const addField = (label, value, bold = false) => {
    if (value === undefined || value === null) return;

    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text(`${label}:`, margin, yPosition);

    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(0, 0, 0);
    const valueText = value.toString();
    const lines = doc.splitTextToSize(valueText, contentWidth - 50);
    doc.text(lines, margin + 50, yPosition);

    yPosition += Math.max(lines.length * 5, 7);
  };

  // Basic Information Section
  addSectionHeader("BASIC INFORMATION");

  // For CCTV Check forms, date and time are already in the correct format
  if (reportType === "cctv-check") {
    if (report.date) addField("Report Date", report.date);
    if (report.time) addField("Report Time", report.time);
  } else {
    addField(
      "Report Date",
      formatDate(report.createdAt || report.timestamp || report.date),
    );
    addField(
      "Report Time",
      formatTime(report.createdAt || report.timestamp || report.time),
    );
  }

  // For CCTV check reports: show filtered scheme if client view, otherwise "All Schemes"
  if (reportType === "cctv-check") {
    if (filterSchemeId) {
      const schemeObj = SCHEMES.find((s) => s.id === filterSchemeId);
      const schemeName = schemeObj ? schemeObj.fullName : filterSchemeId;
      addField("Scheme/Location", schemeName);
    } else {
      addField("Scheme/Location", "All Schemes");
    }
  } else if (report.scheme || report.schemeId) {
    addField("Scheme/Location", report.scheme || report.schemeId);
  }

  if (report.location) {
    addField("Specific Location", report.location);
  }

  // Type-specific fields with section headers
  yPosition += 5;

  // Check if report has multiple occurrences (for daily-occurrence reports)
  const hasOccurrences =
    reportType === "daily-occurrence" &&
    report.occurrences &&
    Array.isArray(report.occurrences);

  if (hasOccurrences) {
    addSectionHeader(`DAILY OCCURRENCES (${report.occurrences.length})`);

    report.occurrences.forEach((occurrence, index) => {
      // Occurrence header
      yPosition += 3;
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPosition - 3, contentWidth, 10, "F");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Occurrence #${index + 1}`, margin + 3, yPosition + 3);
      yPosition += 12;

      // Occurrence details
      if (occurrence.scheme) addField("Scheme", occurrence.scheme);
      if (occurrence.date) addField("Date", formatDate(occurrence.date));
      if (occurrence.time) addField("Time", formatTime(occurrence.time));
      if (occurrence.location) addField("Location", occurrence.location);
      if (occurrence.urn) addField("URN", occurrence.urn);
      if (occurrence.recoveryRequired !== undefined) {
        addField(
          "Recovery Required",
          occurrence.recoveryRequired ? "Yes" : "No",
        );
      }
      if (occurrence.rcc) addField("RCC", occurrence.rcc);
      if (occurrence.nameInitials)
        addField("Name/Initials", occurrence.nameInitials);
      if (occurrence.description)
        addField("Description", occurrence.description);
      if (occurrence.actionTaken)
        addField("Action Taken", occurrence.actionTaken);

      yPosition += 5;
    });
  } else {
    addSectionHeader("REPORT DETAILS");
  }

  switch (reportType) {
    case "incident":
      // Incident Details
      if (report.section) addField("Section", report.section);
      if (report.weatherConditions)
        addField("Weather Conditions", report.weatherConditions);
      if (report.trafficConditions)
        addField("Traffic Conditions", report.trafficConditions);
      if (report.nhLog) addField("NH Log", report.nhLog);
      if (report.collarNumber) addField("Collar Number", report.collarNumber);
      if (report.incursion) addField("Incursion", report.incursion);
      addField("Asset Damage?", report.propertyDamage ? "Yes" : "No");
      if (report.propertyDamage && report.assetType) addField("Asset Type", report.assetType);
      if (report.propertyDamage && report.damageType) addField("Damage Type", report.damageType);
      if (report.reportedBy) addField("Reported By", report.reportedBy);
      if (report.cameraNumber) addField("Camera Number", report.cameraNumber);
      if (report.markerPost) addField("Marker Post", report.markerPost);
      if (report.track) addField("Track", report.track);
      if (report.incidentType)
        addField("Incident Type", report.incidentType, true);
      if (report.fault) addField("Fault", report.fault);

      // Affected Lanes
      if (report.affectedLanes && report.affectedLanes.length > 0) {
        addField("Affected Lanes", report.affectedLanes.join(", "), true);
      }

      // Emergency Services
      if (report.emergencyServices && report.emergencyServices.length > 0) {
        addField("Emergency Services", report.emergencyServices.join(", "));
      }

      // Recovery Requested
      if (report.recoveryRequested) {
        const r = report.recoveryRequested;
        const recoveryParts = [];
        if (r.light) recoveryParts.push(`Light: ${r.light}`);
        if (r.heavy) recoveryParts.push(`Heavy: ${r.heavy}`);
        if (r.ipv) recoveryParts.push(`IPV: ${r.ipv}`);
        if (r.hetos) recoveryParts.push(`HETOS: ${r.hetos}`);
        if (recoveryParts.length > 0)
          addField("Recovery Requested", recoveryParts.join(", "));
      }

      // Time Information
      yPosition += 3;
      addSectionHeader("TIME INFORMATION");
      if (report.timeSpotted) addField("Time Spotted", report.timeSpotted);
      if (report.timeOnSite) addField("Time On Site", report.timeOnSite);
      if (report.timeCleared) addField("Time Cleared", report.timeCleared);
      if (report.closedLogCollar)
        addField("Closed Log Collar Number", report.closedLogCollar);

      // Vehicles Involved
      if (report.vehicles && report.vehicles.length > 0) {
        yPosition += 3;
        addSectionHeader("VEHICLES INVOLVED");
        report.vehicles.forEach((v, i) => {
          if (v.type || v.make || v.model || v.vin) {
            const vehicleStr = [v.type, v.make, v.model, v.vin]
              .filter(Boolean)
              .join(" | ");
            addField(`Vehicle ${i + 1}`, vehicleStr);
          }
        });
      }

      // Description
      if (report.description) {
        yPosition += 3;
        addSectionHeader("DESCRIPTION");
        addField("Description", report.description);
      }
      break;

    case "asset-damage":
      if (report.damageType) addField("Damage Type", report.damageType, true);
      if (report.assetName) addField("Asset Name", report.assetName);
      if (report.severity) addField("Severity", report.severity);
      if (report.description) addField("Description", report.description);
      if (report.estimatedCost)
        addField("Estimated Cost", `£${report.estimatedCost}`);
      if (report.repairStatus) addField("Repair Status", report.repairStatus);
      break;

    case "daily-occurrence":
      // Main occurrence details (skip title as it's already shown in occurrences)
      if (report.category) addField("Category", report.category);

      // Additional fields from the occurrence
      if (report.urn) addField("URN", report.urn);
      if (report.recoveryRequired !== undefined) {
        addField("Recovery Required", report.recoveryRequired ? "Yes" : "No");
      }
      if (report.rcc) addField("RCC", report.rcc);
      if (report.nameInitials) addField("Name/Initials", report.nameInitials);

      // Description and Action Taken
      if (report.description) addField("Description", report.description);
      if (report.actionTaken) addField("Action Taken", report.actionTaken);

      // Weather and Traffic
      if (report.weatherConditions)
        addField("Weather Conditions", report.weatherConditions);
      if (report.trafficFlow) addField("Traffic Flow", report.trafficFlow);
      break;

    case "cctv-check":
      // Display submitted by name
      if (report.firstName) {
        addField("Checked By", report.firstName);
      }

      // A417 Section - only show if no filter OR filter matches A417
      if (
        (!filterSchemeId || filterSchemeId === "A417") &&
        ((report.a417Cameras && report.a417Cameras.length > 0) || (report.a417Comments && report.a417Comments.trim() !== ""))
      ) {
        yPosition += 3;
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition - 3, contentWidth, 10, "F");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("A417", margin + 3, yPosition + 3);
        yPosition += 12;

        if (report.a417Cameras && report.a417Cameras.length > 0) {
          const isNone = report.a417Cameras.includes("NONE");
          if (isNone) {
            addField(
              "CCTV Status",
              "NONE - All cameras working correctly",
              true,
            );
          } else {
            addField(
              "CCTV Issues Reported",
              report.a417Cameras.join(", "),
              true,
            );
          }
        }
        {
          const blackspot = report.a417Blackspot;
          const blackspotYes = blackspot === true || (Array.isArray(blackspot) && blackspot.length > 0 && blackspot[0] !== "All Working Correctly");
          addField("Blackspot Cameras", blackspotYes ? "Yes" : "No");
          addField("TSS Informed", report.a417TssInformed ? "Yes" : "No");
        }
        if (report.a417Comments && report.a417Comments.trim() !== "") {
          addField("Comments", report.a417Comments);
        }
        yPosition += 3;
      }

      // A11/A47 Kier/Core Section - only show if no filter OR filter matches A47
      if (
        (!filterSchemeId || filterSchemeId === "A47") &&
        ((report.kierCore && report.kierCore.length > 0) || (report.kierCoreComments && report.kierCoreComments.trim() !== ""))
      ) {
        yPosition += 3;
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition - 3, contentWidth, 10, "F");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("A11/A47 Kier/Core", margin + 3, yPosition + 3);
        yPosition += 12;

        if (report.kierCore && report.kierCore.length > 0) {
          const isNone = report.kierCore.includes("NONE");
          if (isNone) {
            addField(
              "CCTV Status",
              "NONE - All cameras working correctly",
              true,
            );
          } else {
            addField("CCTV Issues Reported", report.kierCore.join(", "), true);
          }
        }
        {
          const blackspot = report.kierCoreBlackspot;
          const blackspotYes = blackspot === true || (Array.isArray(blackspot) && blackspot.length > 0 && blackspot[0] !== "All Working Correctly");
          addField("Blackspot Cameras", blackspotYes ? "Yes" : "No");
          addField("TSS Informed", report.kierCoreTssInformed ? "Yes" : "No");
        }
        if (report.kierCoreComments && report.kierCoreComments.trim() !== "") {
          addField("Comments", report.kierCoreComments);
        }
        yPosition += 3;
      }

      // M3 Jct 9 Section - only show if no filter OR filter matches M3
      if (
        (!filterSchemeId || filterSchemeId === "M3") &&
        ((report.m3Jct9 && report.m3Jct9.length > 0) || (report.m3Jct9Comments && report.m3Jct9Comments.trim() !== ""))
      ) {
        yPosition += 3;
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition - 3, contentWidth, 10, "F");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("M3 Jct 9", margin + 3, yPosition + 3);
        yPosition += 12;

        if (report.m3Jct9 && report.m3Jct9.length > 0) {
          const isNone = report.m3Jct9.includes("NONE");
          if (isNone) {
            addField(
              "CCTV Status",
              "NONE - All cameras working correctly",
              true,
            );
          } else {
            addField("CCTV Issues Reported", report.m3Jct9.join(", "), true);
          }
        }
        {
          const blackspot = report.m3Jct9Blackspot;
          const blackspotYes = blackspot === true || (Array.isArray(blackspot) && blackspot.length > 0 && blackspot[0] !== "All Working Correctly");
          addField("Blackspot Cameras", blackspotYes ? "Yes" : "No");
          addField("TSS Informed", report.m3TssInformed ? "Yes" : "No");
        }
        if (report.m3Jct9Comments && report.m3Jct9Comments.trim() !== "") {
          addField("Comments", report.m3Jct9Comments);
        }
        yPosition += 3;
      }

      // A452 HS2 Section - only show if no filter OR filter matches A452
      if (
        (!filterSchemeId || filterSchemeId === "A452") &&
        ((report.A452 && report.A452.length > 0) || (report.A452Comments && report.A452Comments.trim() !== ""))
      ) {
        yPosition += 3;
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition - 3, contentWidth, 10, "F");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("A452 HS2", margin + 3, yPosition + 3);
        yPosition += 12;

        if (report.A452 && report.A452.length > 0) {
          const isNone = report.A452.includes("NONE");
          if (isNone) {
            addField(
              "CCTV Status",
              "NONE - All cameras working correctly",
              true,
            );
          } else {
            addField("CCTV Issues Reported", report.A452.join(", "), true);
          }
        }
        {
          const blackspot = report.A452Blackspot;
          const blackspotYes = blackspot === true || (Array.isArray(blackspot) && blackspot.length > 0 && blackspot[0] !== "All Working Correctly");
          addField("Blackspot Cameras", blackspotYes ? "Yes" : "No");
          addField("TSS Informed", report.A452TssInformed ? "Yes" : "No");
        }
        if (report.A452Comments && report.A452Comments.trim() !== "") {
          addField("Comments", report.A452Comments);
        }
        yPosition += 3;
      }

      // Costain - GC Section - only show if no filter OR filter matches Costain
      if (
        (!filterSchemeId || filterSchemeId === "Costain") &&
        (report.Costain || report.CostainComments)
      ) {
        yPosition += 3;
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition - 3, contentWidth, 10, "F");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Costain - GC", margin + 3, yPosition + 3);
        yPosition += 12;

        if (report.Costain && report.Costain.length > 0) {
          const isNone = report.Costain.includes("NONE");
          if (isNone) {
            addField(
              "CCTV Status",
              "NONE - All cameras working correctly",
              true,
            );
          } else {
            addField("CCTV Issues Reported", report.Costain.join(", "), true);
          }
        }
        {
          const blackspot = report.CostainBlackspot;
          const blackspotYes = blackspot === true || (Array.isArray(blackspot) && blackspot.length > 0 && blackspot[0] !== "All Working Correctly");
          addField("Blackspot Cameras", blackspotYes ? "Yes" : "No");
          addField("TSS Informed", report.CostainTssInformed ? "Yes" : "No");
        }
        if (report.CostainComments && report.CostainComments.trim() !== "") {
          addField("Comments", report.CostainComments);
        }
        yPosition += 3;
      }

      // Simister Island - Costain Section - only show if no filter OR filter matches SimisterIsland
      if (
        (!filterSchemeId || filterSchemeId === "SimisterIsland") &&
        ((report.csi && report.csi.length > 0) || (report.csiComments && report.csiComments.trim() !== ""))
      ) {
        yPosition += 3;
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition - 3, contentWidth, 10, "F");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Simister Island - Costain", margin + 3, yPosition + 3);
        yPosition += 12;

        if (report.csi && report.csi.length > 0) {
          const isNone = report.csi.includes("NONE");
          if (isNone) {
            addField("CCTV Status", "NONE - All cameras working correctly", true);
          } else {
            addField("CCTV Issues Reported", report.csi.join(", "), true);
          }
        }
        {
          const blackspot = report.csiBlackspot;
          const blackspotYes = blackspot === true || (Array.isArray(blackspot) && blackspot.length > 0 && blackspot[0] !== "All Working Correctly");
          addField("Blackspot Cameras", blackspotYes ? "Yes" : "No");
          addField("TSS Informed", report.csiTssInformed ? "Yes" : "No");
        }
        if (report.csiComments && report.csiComments.trim() !== "") {
          addField("Comments", report.csiComments);
        }
        yPosition += 3;
      }

      // Demo Section - only show if explicitly filtered to DMO1 (never in staff full download)
      if (
        filterSchemeId === "DMO1" &&
        (report.demoCameras || report.demoComments)
      ) {
        yPosition += 3;
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition - 3, contentWidth, 10, "F");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Demo Scheme", margin + 3, yPosition + 3);
        yPosition += 12;

        if (report.demoCameras && report.demoCameras.length > 0) {
          const isNone = report.demoCameras.includes("NONE");
          if (isNone) {
            addField(
              "CCTV Status",
              "NONE - All cameras working correctly",
              true,
            );
          } else {
            addField(
              "CCTV Issues Reported",
              report.demoCameras.join(", "),
              true,
            );
          }
        }
        {
          const blackspot = report.demoBlackspot;
          const blackspotYes = blackspot === true || (Array.isArray(blackspot) && blackspot.length > 0 && blackspot[0] !== "All Working Correctly");
          addField("Blackspot Cameras", blackspotYes ? "Yes" : "No");
          addField("TSS Informed", report.demoTssInformed ? "Yes" : "No");
        }
        if (report.demoComments && report.demoComments.trim() !== "") {
          addField("Comments", report.demoComments);
        }
        yPosition += 3;
      }
      break;
  }

  // Report Information Section (Status and Submitter)
  yPosition += 5;
  addSectionHeader("REPORT INFORMATION");

  if (report.submittedBy) {
    const submitter =
      typeof report.submittedBy === "object"
        ? report.submittedBy?.name || "Staff Member"
        : report.submittedBy;
    addField("Submitted By", submitter);
  }

  if (report.lastEditedBy) {
    const editor =
      typeof report.lastEditedBy === "object"
        ? report.lastEditedBy?.name || "Staff Member"
        : report.lastEditedBy;
    addField("Last Edited By", editor);
  }

  if (report.status) {
    addField("Status", report.status, true);
  }

  // Add a note section at the bottom
  yPosition += 8;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);

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
      { align: "center" },
    );
    doc.text(
      `Generated on ${new Date().toLocaleDateString(
        "en-GB",
      )} at ${new Date().toLocaleTimeString("en-GB")}`,
      margin,
      doc.internal.pageSize.getHeight() - 10,
    );
  }

  // Generate filename
  const timestamp = new Date().toISOString().split("T")[0];
  const refId = report.referenceId || "report";
  const filename = `${reportType}_${refId}_${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);
};

/**
 * Generate PDF for CCTV recording details
 * @param {Object} recording - The CCTV recording data
 */
export const generateCCTVRecordingPDF = async (recording) => {
  const doc = new jsPDF({ compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = 20;

  // Helper to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Header with white background - increased height for centered logo and text
  doc.setFillColor(255, 255, 255); // White background
  doc.rect(0, 0, pageWidth, 40, "F");

  // Add compressed logo centered on top
  try {
    const compressedLogo = await getCompressedLogo();
    const logoWidth = 50; // Width
    const logoHeight = 25; // Height (adjust ratio to prevent distortion)
    const logoX = (pageWidth - logoWidth) / 2; // Center horizontally
    doc.addImage(
      compressedLogo,
      "JPEG",
      logoX,
      5,
      logoWidth,
      logoHeight,
      undefined,
      "FAST",
    );
  } catch (error) {
    console.error("Error adding logo:", error);
  }

  // Add text centered below the logo
  doc.setTextColor(0, 0, 0); // Black text
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("LENSE BY CHELLAN", pageWidth / 2, 35, { align: "center" });

  yPosition = 50;
  doc.setTextColor(0, 0, 0);

  // Title with background
  const contentWidth = pageWidth - margin * 2;
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition - 5, contentWidth, 12, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("CCTV Recording Details", margin + 5, yPosition + 3);
  yPosition += 15;

  // Add generation date/time
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB")}`,
    margin,
    yPosition,
  );
  yPosition += 8;

  // Divider
  doc.setDrawColor(0, 186, 168);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 12;

  // Helper to add section headers
  const addSectionHeader = (title) => {
    doc.setFillColor(0, 186, 168);
    doc.rect(margin, yPosition - 2, contentWidth, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 3, yPosition + 4);
    yPosition += 12;
    doc.setTextColor(0, 0, 0);
  };

  // Improved field display
  const addField = (label, value) => {
    if (!value) return;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text(`${label}:`, margin, yPosition);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    const valueText = value.toString();
    const lines = doc.splitTextToSize(valueText, contentWidth - 50);
    doc.text(lines, margin + 50, yPosition);
    yPosition += Math.max(lines.length * 5, 7);
  };

  // Recording Information Section
  addSectionHeader("RECORDING INFORMATION");

  addField("Camera Number", recording.cameraNumber);
  addField("Location", recording.location);
  addField("Scheme", recording.scheme);
  addField(
    "Recording Date & Time",
    formatDate(recording.uploadedAt || recording.dateTime),
  );

  // File Details Section
  yPosition += 5;
  addSectionHeader("FILE DETAILS");

  addField("File Name", recording.fileName);
  addField(
    "File Size",
    recording.fileSize
      ? `${(recording.fileSize / 1024 / 1024).toFixed(2)} MB`
      : "N/A",
  );
  addField("Duration", recording.duration || "N/A");

  // Notes Section
  if (recording.notes) {
    yPosition += 5;
    addSectionHeader("ADDITIONAL NOTES");

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    const notes = doc.splitTextToSize(recording.notes, contentWidth);
    doc.text(notes, margin, yPosition);
    yPosition += notes.length * 6;
  }

  // Add a divider line at the bottom
  yPosition += 8;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generated on ${new Date().toLocaleDateString(
      "en-GB",
    )} at ${new Date().toLocaleTimeString("en-GB")}`,
    margin,
    doc.internal.pageSize.getHeight() - 10,
  );

  // Save
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `cctv_${recording.cameraNumber}_${timestamp}.pdf`;
  doc.save(filename);
};
