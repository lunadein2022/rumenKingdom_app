import { useState } from "react";
import type { CalendarCategory, CalendarEventInput } from "../types/calendar.types";

const initialForm: CalendarEventInput = {
  title: "",
  description: "",
  startAt: "2026-07-09T09:00:00",
  endAt: "2026-07-09T10:00:00",
  location: "루멘 왕성",
  category: "personal",
  priority: "medium",
  isAllDay: false,
  reminderMinutes: 10,
  createdBy: "user",
};

export function useCalendarForm(defaultDate: string) {
  const [form, setForm] = useState<CalendarEventInput>({
    ...initialForm,
    startAt: `${defaultDate}T09:00:00`,
    endAt: `${defaultDate}T10:00:00`,
  });

  function setField<K extends keyof CalendarEventInput>(key: K, value: CalendarEventInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function reset(date = defaultDate, category: CalendarCategory = "personal") {
    setForm({
      ...initialForm,
      category,
      startAt: `${date}T09:00:00`,
      endAt: `${date}T10:00:00`,
    });
  }

  return { form, setField, reset };
}
