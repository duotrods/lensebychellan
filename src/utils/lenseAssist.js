import { isAnyThirdParty } from "./roleHelpers";
import { isDemoUser } from "./schemes";

// Why a user can never be given Lense Assist, or null when they are eligible.
export const lenseAssistIneligibleReason = (user) => {
  if (isAnyThirdParty(user?.role)) return "Third-party account";
  if (isDemoUser(user)) return "Demo scheme";
  return null;
};

// `lenseAssist` is only ever written as an explicit true/false by an admin;
// users who have never been touched (field missing) keep access.
export const hasLenseAssist = (user) =>
  !!user && !lenseAssistIneligibleReason(user) && user.lenseAssist !== false;
