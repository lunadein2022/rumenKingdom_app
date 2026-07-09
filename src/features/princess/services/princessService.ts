import type { PrincessProfile } from "../../../app/types";
import type { FateCard, PrincessMood, PrincessStats } from "../types/princess.types";

export function getPrincess(profile: PrincessProfile) {
  // TODO: Replace with Supabase Query
  return profile;
}

export function gainExp(profile: PrincessProfile, exp: number) {
  // TODO: Replace with Supabase Query
  return { ...profile, currentExp: profile.currentExp + exp };
}

export function changeTitle(profile: PrincessProfile, activeTitle: string) {
  // TODO: Replace with Supabase Query
  return { ...profile, activeTitle };
}

export function changeRoom(profile: PrincessProfile, currentRoom: PrincessProfile["currentRoom"]) {
  // TODO: Replace with Supabase Query
  return { ...profile, currentRoom };
}

export function changeMood(_mood: PrincessMood) {
  // TODO: Replace with Supabase Query
  return true;
}

export function buildPrincessStats(profile: PrincessProfile): PrincessStats {
  return {
    ...profile.stats,
    kindness: 42,
    creativity: 58,
  };
}

export function getDailyFate(): FateCard {
  // TODO: Replace with Serin AI daily fate generator.
  return {
    fortune: "오늘은 작은 정리가 큰 흐름을 여는 날입니다.",
    recommendedQuest: "집무실 Quest 하나를 먼저 완료하기",
    theme: "차분한 전진",
  };
}
