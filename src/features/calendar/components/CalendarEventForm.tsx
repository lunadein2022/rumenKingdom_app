import { FormEvent } from "react";
import { Button } from "../../../components/design-system/Button";
import { useCalendarForm } from "../hooks/useCalendarForm";
import { reminderOptions, type CalendarCategory, type CalendarEventInput } from "../types/calendar.types";

interface CalendarEventFormProps {
  selectedDate: string;
  onCreate: (input: CalendarEventInput, linkQuest: boolean) => void;
}

const categories: CalendarCategory[] = ["work", "personal", "quest", "routine", "meeting", "serin", "rest", "event"];

export function CalendarEventForm({ selectedDate, onCreate }: CalendarEventFormProps) {
  const { form, setField, reset } = useCalendarForm(selectedDate);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) return;
    const formData = new FormData(event.currentTarget);
    onCreate({ ...form, title: form.title.trim() }, formData.get("linkQuest") === "on");
    reset(selectedDate);
  }

  return (
    <form className="calendar-event-form" onSubmit={submit}>
      <input
        value={form.title}
        onChange={(event) => setField("title", event.target.value)}
        placeholder="새 왕실 일정"
      />
      <textarea
        value={form.description}
        onChange={(event) => setField("description", event.target.value)}
        placeholder="설명"
      />
      <div className="calendar-form-grid">
        <input
          type="datetime-local"
          value={form.startAt.slice(0, 16)}
          onChange={(event) => setField("startAt", `${event.target.value}:00`)}
        />
        <select
          value={form.category}
          onChange={(event) => setField("category", event.target.value as CalendarCategory)}
        >
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        <select
          value={form.reminderMinutes ?? ""}
          onChange={(event) => setField("reminderMinutes", event.target.value ? Number(event.target.value) : null)}
        >
          {reminderOptions.map((option) => (
            <option key={option.label} value={option.value ?? ""}>{option.label}</option>
          ))}
        </select>
      </div>
      <label className="calendar-check-row">
        <input type="checkbox" name="linkQuest" />
        <span>이 일정을 Quest로도 생성</span>
      </label>
      <Button type="submit">일정 추가</Button>
    </form>
  );
}
