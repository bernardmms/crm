import { Input } from "@repo/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import type { WaitConfig } from "../nodes/WaitNode";

interface Props {
  config: Partial<WaitConfig>;
  onChange: (config: WaitConfig) => void;
}

export function WaitConfigPanel({ config, onChange }: Props) {
  const mode = config.mode ?? "duration";

  function handleModeChange(newMode: string) {
    if (newMode === "duration") {
      onChange({ mode: "duration", value: 1, unit: "days" });
    } else {
      onChange({ mode: "until", at: new Date().toISOString().slice(0, 16) });
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Wait type</label>
        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="duration">Duration</TabsTrigger>
            <TabsTrigger value="until">Until date</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === "duration" && (
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              min={1}
              value={(config as { value?: number }).value ?? 1}
              onChange={(e) =>
                onChange({
                  mode: "duration",
                  value: Number(e.target.value),
                  unit: (config as { unit?: string }).unit as "days" ?? "days",
                })
              }
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">Unit</label>
            <Select
              value={(config as { unit?: string }).unit ?? "days"}
              onValueChange={(unit) =>
                onChange({
                  mode: "duration",
                  value: (config as { value?: number }).value ?? 1,
                  unit: unit as "minutes" | "hours" | "days",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {mode === "until" && (
        <div className="space-y-1">
          <label className="text-sm font-medium">Date and time</label>
          <Input
            type="datetime-local"
            value={(config as { at?: string }).at?.slice(0, 16) ?? ""}
            min={new Date().toISOString().slice(0, 16)}
            onChange={(e) => onChange({ mode: "until", at: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
