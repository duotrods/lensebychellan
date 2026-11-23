// Location shown in the reports tables (admin + staff), matching the client Reports table:
// a CCTV fault shows its camera, an incident shows its section, anything else its location field.
export const getFormLocation = (form) => {
  if (form.type === "CCTV Faults") return form.camera || form.location || "N/A";
  if (form.type === "Incident Report") return form.section || form.location || "N/A";
  return form.location || "N/A";
};
