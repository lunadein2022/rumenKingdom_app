import type { PrincessProfile } from "../../../app/types";
import { getDailyFate, getPrincess } from "../services/princessService";

export function usePrincess(profile: PrincessProfile) {
  return {
    princess: getPrincess(profile),
    fate: getDailyFate(),
  };
}
