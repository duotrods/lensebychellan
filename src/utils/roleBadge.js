import {
  MdAdminPanelSettings,
  MdManageAccounts,
  MdPerson,
  MdHandshake,
  MdBusiness,
  MdVideocam,
  MdCameraAlt,
  MdSupportAgent,
} from "react-icons/md";

// Shared across User Management and Login Logs so role badges look the same everywhere.
export const ROLE_BADGE = {
  admin: "bg-purple-100 text-purple-700",
  staff: "bg-blue-100 text-blue-700",
  client: "bg-teal-100 text-teal-700",
  liveoperator: "bg-orange-100 text-orange-700",
  cctvfaultoperator: "bg-rose-100 text-rose-700",
  thirdpartystaff: "bg-indigo-100 text-indigo-700",
  thirdpartyclient: "bg-cyan-100 text-cyan-700",
  thirdpartyliveoperator: "bg-amber-100 text-amber-700",
  thirdpartycctvoperator: "bg-pink-100 text-pink-700",
};

export const ROLE_ICON = {
  admin: MdAdminPanelSettings,
  staff: MdManageAccounts,
  client: MdPerson,
  liveoperator: MdSupportAgent,
  cctvfaultoperator: MdCameraAlt,
  thirdpartystaff: MdHandshake,
  thirdpartyclient: MdBusiness,
  thirdpartyliveoperator: MdVideocam,
  thirdpartycctvoperator: MdCameraAlt,
};
