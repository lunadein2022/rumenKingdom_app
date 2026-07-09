import { mockPrincessOsRepository } from "./mock/mockPrincessOsRepository";
import { supabasePrincessOsRepository } from "./supabase/supabasePrincessOsRepository";

export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") !== "false";

export const princessOsRepository = USE_MOCK
  ? mockPrincessOsRepository
  : supabasePrincessOsRepository;
