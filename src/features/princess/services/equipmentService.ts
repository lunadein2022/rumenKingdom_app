import type { PrincessProfile } from "../../../app/types";

export function getEquippedItems(profile: PrincessProfile) {
  // TODO: Replace with Supabase Query
  return profile.equippedItems;
}

export function equipItem(profile: PrincessProfile, slot: string, name: string): PrincessProfile {
  // TODO: Replace with Supabase Query
  return {
    ...profile,
    equippedItems: [
      ...profile.equippedItems.filter((item) => item.slot !== slot),
      { slot, name },
    ],
  };
}
