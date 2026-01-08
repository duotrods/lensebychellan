import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, X, Plus } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { staffService } from "../../services/staffService";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import { SCHEMES } from "../../utils/schemes";

import chellanlogo from "../../assets/chellanpng.png"

const DailyOccurrenceFormPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    occurrences: [
      {
        date: "",
        time: "",
        location: "",
        description: "",
        actionTaken: "",
        urn: "",
        recoveryRequired: "",
        rcc: "",
        nameInitials: "",
        scheme: "",
      },
    ],
  });

  useEffect(() => {
    if (editId) {
      loadFormData();
    }
  }, [editId]);

  const loadFormData = async () => {
    try {
      setLoading(true);
      const reports = await staffService.getDailyOccurrenceReports(null);
      const report = reports.find((r) => r.id === editId);

      if (report) {
        setFormData({
          occurrences: report.occurrences || [
            {
              date: "",
              time: "",
              location: "",
              description: "",
              actionTaken: "",
              urn: "",
              recoveryRequired: "",
              rcc: "",
              nameInitials: "",
              scheme: "",
            },
          ],
        });
      } else {
        toast.error("Form not found");
        navigate("/dashboard/staff");
      }
    } catch (error) {
      console.error("Failed to load form:", error);
      toast.error("Failed to load form data");
    } finally {
      setLoading(false);
    }
  };

  const handleOccurrenceChange = (index, field, value) => {
    const updated = [...formData.occurrences];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, occurrences: updated }));
  };

  const addOccurrence = () => {
    setFormData((prev) => ({
      ...prev,
      occurrences: [
        ...prev.occurrences,
        {
          date: "",
          time: "",
          location: "",
          description: "",
          actionTaken: "",
          urn: "",
          recoveryRequired: "",
          rcc: "",
          nameInitials: "",
          scheme: "",
        },
      ],
    }));
  };

  const removeOccurrence = (index) => {
    if (formData.occurrences.length > 1) {
      setFormData((prev) => ({
        ...prev,
        occurrences: prev.occurrences.filter((_, i) => i !== index),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      if (editId) {
        await staffService.updateDailyOccurrenceReport(
          editId,
          formData,
          userProfile.uid,
          userProfile.displayName
        );
        toast.success("Daily Occurrence Report updated successfully!");
      } else {
        const result = await staffService.submitDailyOccurrenceReport(
          formData,
          userProfile.uid,
          userProfile.displayName
        );

        // Show different messages based on whether it was merged or created new
        if (result.merged) {
          toast.success(
            `Added ${formData.occurrences.length} occurrence(s) to existing report ${result.referenceId} for ${formData.occurrences[0].date}`,
            { duration: 5000 }
          );
        } else {
          toast.success(`Daily Occurrence Report ${result.referenceId} created successfully!`);
        }
      }

      navigate("/dashboard/staff");
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StaffSidebarLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h3 className="text-2xl font-bold text-gray-800">
            {editId ? "Edit Daily Occurrence Sheet" : "Daily Occurrence Sheet"}
          </h3>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-md p-8 space-y-6"
        >
          <div className="flex justify-center items-center space-x-2 mb-8">
                              <img src={chellanlogo} alt="MyApp Logo" className="h-25 w-auto" />
                    </div>
          {/* Occurrences Section */}
          <div className="border-t border-gray-300 pt-8">
            <div className="flex items-center justify-between mb-8">
              <label className="label">
                <span className="label-text font-semibold text-lg">
                  Daily Occurrences <span className="text-red-500">*</span>
                </span>
              </label>
              <button
                type="button"
                onClick={addOccurrence}
                className="btn btn-sm btn-outline gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Occurrence
              </button>
            </div>

            <div className="space-y-6">
              {formData.occurrences.map((occurrence, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-6 bg-gray-50 relative"
                >
                  {formData.occurrences.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOccurrence(index)}
                      className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}

                  <h5 className="font-semibold text-gray-700 mb-4">
                    Occurrence #{index + 1}
                  </h5>

                  {/* Scheme */}
                  <div className="mb-4">
                    <label className="label">
                      <span className="label-text font-semibold mb-2">
                        Scheme <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <select
                      value={occurrence.scheme}
                      onChange={(e) =>
                        handleOccurrenceChange(index, "scheme", e.target.value)
                      }
                      className="select select-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                      required
                    >
                      <option value="">Please Select</option>
                      <option value="All Schemes">All Schemes</option>
                      {SCHEMES.map((scheme) => (
                        <option key={scheme.id} value={scheme.fullName}>
                          {scheme.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date, Time, Location, URN */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="label">
                        <span className="label-text font-semibold mb-2">
                          Date <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="date"
                        value={occurrence.date}
                        onChange={(e) =>
                          handleOccurrenceChange(index, "date", e.target.value)
                        }
                        className="input input-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text font-semibold mb-2">
                          Time <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="time"
                        value={occurrence.time}
                        onChange={(e) =>
                          handleOccurrenceChange(index, "time", e.target.value)
                        }
                        className="input input-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text font-semibold mb-2">
                          Location 
                        </span>
                      </label>
                      <input
                        type="text"
                        value={occurrence.location}
                        onChange={(e) =>
                          handleOccurrenceChange(
                            index,
                            "location",
                            e.target.value
                          )
                        }
                        className="input input-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                        placeholder="e.g., J9, MP 2.5"
                       
                      />
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text font-semibold mb-2">
                          URN
                        </span>
                      </label>
                      <input
                        type="text"
                        value={occurrence.urn}
                        onChange={(e) =>
                          handleOccurrenceChange(index, "urn", e.target.value)
                        }
                        className="input input-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                        placeholder="Unique Reference Number"
                      />
                    </div>
                  </div>

                  {/* Recovery Required, RCC, Name/Initials */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="label">
                        <span className="label-text font-semibold mb-2">
                          Recovery Required
                        </span>
                      </label>
                      <select
                        value={occurrence.recoveryRequired}
                        onChange={(e) =>
                          handleOccurrenceChange(
                            index,
                            "recoveryRequired",
                            e.target.value
                          )
                        }
                        className="select select-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                      >
                        <option value="">Please Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text font-semibold mb-2">
                          RCC log number
                        </span>
                      </label>
                      <input
                        type="text"
                        value={occurrence.rcc}
                        onChange={(e) =>
                          handleOccurrenceChange(index, "rcc", e.target.value)
                        }
                        className="input input-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                        placeholder="RCC log number"
                      />
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text font-semibold mb-2">
                          Name or Initials
                        </span>
                      </label>
                      <input
                        type="text"
                        value={occurrence.nameInitials}
                        onChange={(e) =>
                          handleOccurrenceChange(
                            index,
                            "nameInitials",
                            e.target.value
                          )
                        }
                        className="input input-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                        placeholder="Name or Initials"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="label">
                      <span className="label-text font-semibold mb-2">
                        Description
                      </span>
                    </label>
                    <textarea
                      value={occurrence.description}
                      onChange={(e) =>
                        handleOccurrenceChange(
                          index,
                          "description",
                          e.target.value
                        )
                      }
                      rows={2}
                      className="textarea textarea-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                      placeholder="Describe what was observed..."
                    />
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text font-semibold mb-2">
                        Action Taken
                      </span>
                    </label>
                    <textarea
                      value={occurrence.actionTaken}
                      onChange={(e) =>
                        handleOccurrenceChange(
                          index,
                          "actionTaken",
                          e.target.value
                        )
                      }
                      rows={2}
                      className="textarea textarea-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                      placeholder="Describe any actions taken..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-300">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors font-semibold"
            >
              {loading
                ? editId
                  ? "Updating..."
                  : "Submitting..."
                : editId
                ? "Update"
                : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </StaffSidebarLayout>
  );
};

export default DailyOccurrenceFormPage;
