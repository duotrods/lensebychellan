import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Download, Image, Video, X } from "lucide-react";
import { clientDataService } from "../../services/clientDataService";
import ClientSidebarLayout from "../../components/layout/ClientSidebarLayout";
import { generateReportPDF } from "../../utils/pdfGenerator";
import { isVideoFile } from "../../utils/fileType";

const IncidentReportView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState({}); // Track which images are loaded
  const [viewingFile, setViewingFile] = useState(null); // { url, isVideo } for fullscreen view

  // Load image on demand (saves Firebase Storage bandwidth!)
  const handleLoadImage = (index) => {
    setLoadedImages((prev) => ({ ...prev, [index]: true }));
  };

  // Load all images at once
  const handleLoadAllImages = () => {
    if (report?.files) {
      const allLoaded = {};
      report.files.forEach((_, index) => {
        allLoaded[index] = true;
      });
      setLoadedImages(allLoaded);
    }
  };

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      // Use efficient single-document fetch (1 read instead of loading all reports!)
      const foundReport = await clientDataService.getIncidentById(id);

      if (foundReport) {
        setReport(foundReport);
      } else {
        toast.error("Report not found");
        navigate(-1);
      }
    } catch (error) {
      console.error("Failed to load report:", error);
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      await generateReportPDF(report, "incident");
      toast.success("Downloaded report as PDF");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to download PDF");
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <ClientSidebarLayout>
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg text-brand-500"></span>
        </div>
      </ClientSidebarLayout>
    );
  }

  if (!report) {
    return (
      <ClientSidebarLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Report not found</p>
        </div>
      </ClientSidebarLayout>
    );
  }

  return (
    <ClientSidebarLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-gray-800">
                  Incident Report Details
                </h3>
                {report.status === "live" ? (
                  <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-semibold">
                    LIVE
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold">
                    COMPLETED
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Reference: {report.referenceId || report.id.slice(0, 12)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-xl shadow-md p-8 space-y-6">
          {/* CONDITIONAL RENDER: Show different content based on status */}
          {report.status === "live" ? (
            // ============ LIVE INCIDENT - Show only Step 1 fields ============
            <>
              {/* Basic Info for Live Incident */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                  Incident Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Scheme
                    </label>
                    <p className="text-gray-800">{report.scheme || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Section
                    </label>
                    <p className="text-gray-800">{report.section || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Marker Post
                    </label>
                    <p className="text-gray-800">
                      {report.markerPost || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Date
                    </label>
                    <p className="text-gray-800">{report.date || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Name
                    </label>
                    <p className="text-gray-800">
                      {report.firstName} {report.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Time Spotted
                    </label>
                    <p className="text-gray-800">
                      {report.timeSpotted || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attachments for Live Incident - Lazy loaded to save bandwidth */}
              {report.files && report.files.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4 border-b pb-2">
                    <h4 className="text-lg font-semibold text-gray-800">
                      Attachments ({report.files.length})
                    </h4>
                    {Object.keys(loadedImages).length < report.files.length && (
                      <button
                        onClick={handleLoadAllImages}
                        className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                      >
                        Load All
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {report.files.map((file, index) => (
                      <div key={index} className="relative">
                        {loadedImages[index] ? (
                          isVideoFile(file) ? (
                            <div className="relative">
                              <video
                                src={file.downloadUrl}
                                controls
                                className="w-full h-48 object-cover rounded-lg bg-black"
                              />
                              <a
                                href={file.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-2 right-2 p-2 bg-white/80 rounded-lg hover:bg-white transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download className="w-4 h-4 text-gray-700" />
                              </a>
                            </div>
                          ) : (
                            <>
                              <img
                                src={file.downloadUrl}
                                alt={file.fileName}
                                className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setViewingFile({ url: file.downloadUrl, isVideo: false })}
                              />
                              <a
                                href={file.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-2 right-2 p-2 bg-white/80 rounded-lg hover:bg-white transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download className="w-4 h-4 text-gray-700" />
                              </a>
                            </>
                          )
                        ) : (
                          <button
                            onClick={() => handleLoadImage(index)}
                            className="w-full h-48 bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-gray-200 transition-colors border-2 border-dashed border-gray-300"
                          >
                            {isVideoFile(file) ? (
                              <Video className="w-8 h-8 text-gray-400" />
                            ) : (
                              <Image className="w-8 h-8 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-500">
                              Click to load {isVideoFile(file) ? "video" : "image"}
                            </span>
                            <span className="text-xs text-gray-400">
                              {file.fileName}
                            </span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Status Indicator */}
              <div className="bg-yellow-50 rounded-lg p-6">
                <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-medium">
                  LIVE
                </span>
                <p className="text-sm text-gray-600 mt-3">
                  This incident is currently live. Full details will be
                  available once completed.
                </p>
              </div>
            </>
          ) : (
            // ============ COMPLETED INCIDENT - Show all fields ============
            <>
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Scheme
                    </label>
                    <p className="text-gray-800">{report.scheme || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Section
                    </label>
                    <p className="text-gray-800">{report.section || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Date
                    </label>
                    <p className="text-gray-800">{report.date || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Submitted By
                    </label>
                    <p className="text-gray-800">
                      {report.submittedBy?.name ||
                        `${report.firstName || ""} ${report.lastName || ""}`.trim() ||
                        "N/A"}
                    </p>
                  </div>
                  {report.lastEditedBy && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-gray-600">
                        Last Edited By
                      </label>
                      <p className="text-blue-600">
                        {report.lastEditedBy?.name || "Unknown"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Incident Details */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                  Incident Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Weather Conditions
                    </label>
                    <p className="text-gray-800">
                      {report.weatherConditions || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Traffic Conditions
                    </label>
                    <p className="text-gray-800">
                      {report.trafficConditions || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      NH Log
                    </label>
                    <p className="text-gray-800">{report.nhLog || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Collar Number
                    </label>
                    <p className="text-gray-800">
                      {report.collarNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Incursion
                    </label>
                    <p className="text-gray-800">{report.incursion || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Reported By
                    </label>
                    <p className="text-gray-800">
                      {report.reportedBy || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Camera Number
                    </label>
                    <p className="text-gray-800">
                      {report.cameraNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Marker Post
                    </label>
                    <p className="text-gray-800">
                      {report.markerPost || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Track
                    </label>
                    <p className="text-gray-800">{report.track || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Incident Type
                    </label>
                    <p className="text-gray-800">
                      {report.incidentType || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Fault
                    </label>
                    <p className="text-gray-800">{report.fault || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Asset Damage?
                    </label>
                    <p className="text-gray-800">
                      {report.propertyDamage ? "Yes" : "No"}
                    </p>
                  </div>
                  {report.propertyDamage && (
                    <>
                      <div>
                        <label className="text-sm font-semibold text-gray-600">
                          Asset Type
                        </label>
                        <p className="text-gray-800">
                          {report.assetType || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-600">
                          Damage Type
                        </label>
                        <p className="text-gray-800">
                          {report.damageType || "N/A"}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Affected Lanes */}
              {report.affectedLanes && report.affectedLanes.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                    Affected Lanes
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {report.affectedLanes.map((lane, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                      >
                        {lane}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency Services */}
              {report.emergencyServices &&
                report.emergencyServices.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                      Emergency Services
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {report.emergencyServices.map((service, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Recovery Requested */}
              {report.recoveryRequested && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                    Recovery Requested
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Light
                      </label>
                      <p className="text-gray-800">
                        {report.recoveryRequested.light || 0}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Heavy
                      </label>
                      <p className="text-gray-800">
                        {report.recoveryRequested.heavy || 0}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        IPV
                      </label>
                      <p className="text-gray-800">
                        {report.recoveryRequested.ipv || 0}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        HETOS
                      </label>
                      <p className="text-gray-800">
                        {report.recoveryRequested.hetos || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Time Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                  Time Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Time Spotted
                    </label>
                    <p className="text-gray-800">
                      {report.timeSpotted || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Time On Site
                    </label>
                    <p className="text-gray-800">
                      {report.timeOnSite || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Time Cleared
                    </label>
                    <p className="text-gray-800">
                      {report.timeCleared || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Closed Log Collar Number
                    </label>
                    <p className="text-gray-800">
                      {report.closedLogCollar || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vehicles Involved */}
              {report.vehicles && report.vehicles.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                    Vehicles Involved
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left text-sm font-semibold text-gray-600 px-4 py-2">
                            Type
                          </th>
                          <th className="text-left text-sm font-semibold text-gray-600 px-4 py-2">
                            Make
                          </th>
                          <th className="text-left text-sm font-semibold text-gray-600 px-4 py-2">
                            Model
                          </th>
                          <th className="text-left text-sm font-semibold text-gray-600 px-4 py-2">
                            VIN
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.vehicles.map((vehicle, index) => (
                          <tr key={index} className="border-b">
                            <td className="px-4 py-2">
                              {vehicle.type || "N/A"}
                            </td>
                            <td className="px-4 py-2">
                              {vehicle.make || "N/A"}
                            </td>
                            <td className="px-4 py-2">
                              {vehicle.model || "N/A"}
                            </td>
                            <td className="px-4 py-2">
                              {vehicle.vin || "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                  Description of Incident
                </h4>
                <p className="text-gray-800 whitespace-pre-wrap">
                  {report.description || "N/A"}
                </p>
              </div>

              {/* Files - Lazy loaded to save bandwidth */}
              {report.files && report.files.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4 border-b pb-2">
                    <h4 className="text-lg font-semibold text-gray-800">
                      Attachments ({report.files.length})
                    </h4>
                    {Object.keys(loadedImages).length < report.files.length && (
                      <button
                        onClick={handleLoadAllImages}
                        className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                      >
                        Load All
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {report.files.map((file, index) => (
                      <div key={index} className="relative">
                        {loadedImages[index] ? (
                          isVideoFile(file) ? (
                            <div className="relative">
                              <video
                                src={file.downloadUrl}
                                controls
                                className="w-full h-48 object-cover rounded-lg bg-black"
                              />
                              <a
                                href={file.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-2 right-2 p-2 bg-white/80 rounded-lg hover:bg-white transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download className="w-4 h-4 text-gray-700" />
                              </a>
                            </div>
                          ) : (
                            <>
                              <img
                                src={file.downloadUrl}
                                alt={file.fileName}
                                className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setViewingFile({ url: file.downloadUrl, isVideo: false })}
                              />
                              <a
                                href={file.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-2 right-2 p-2 bg-white/80 rounded-lg hover:bg-white transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download className="w-4 h-4 text-gray-700" />
                              </a>
                            </>
                          )
                        ) : (
                          <button
                            onClick={() => handleLoadImage(index)}
                            className="w-full h-48 bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-gray-200 transition-colors border-2 border-dashed border-gray-300"
                          >
                            {isVideoFile(file) ? (
                              <Video className="w-8 h-8 text-gray-400" />
                            ) : (
                              <Image className="w-8 h-8 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-500">
                              Click to load {isVideoFile(file) ? "video" : "image"}
                            </span>
                            <span className="text-xs text-gray-400">
                              {file.fileName}
                            </span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                  <div>
                    <label className="font-semibold">Created:</label>{" "}
                    {formatDateTime(report.createdAt)}
                  </div>
                  {report.updatedAt && (
                    <div>
                      <label className="font-semibold">Last Updated:</label>{" "}
                      {formatDateTime(report.updatedAt)}
                    </div>
                  )}
                  <div>
                    <label className="font-semibold">Status:</label>{" "}
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      {report.status || "completed"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fullscreen File Viewer Modal */}
      {viewingFile && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingFile(null)}
        >
          <button
            onClick={() => setViewingFile(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          {viewingFile.isVideo ? (
            <video
              src={viewingFile.url}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={viewingFile.url}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <a
            href={viewingFile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-4 h-4" />
            Download
          </a>
        </div>
      )}
    </ClientSidebarLayout>
  );
};

export default IncidentReportView;
