export type PrincessMood = "happy" | "calm" | "tired" | "sad" | "angry" | "excited";

export interface PrincessStats {
  charm: number;
  wisdom: number;
  courage: number;
  diligence: number;
  kindness: number;
  creativity: number;
}

export interface FateCard {
  fortune: string;
  recommendedQuest: string;
  theme: string;
}
