"use client";

import React from "react";
import { useAcademicYear } from "@/components/providers/AcademicYearProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function YearSwitcher() {
  const {
    years,
    currentYearId,
    setCurrentYearId,
    includeDrafts,
    setIncludeDrafts,
    isManagement,
    setAsDefaultForOrg,
  } = useAcademicYear();

  const hasYears = years && years.length > 0;

  return (
    <div className="flex items-center gap-3">
      {isManagement && (
        <div className="flex items-center gap-2 pr-2 border-r">
          <Switch
            id="toggle-drafts"
            checked={includeDrafts}
            onCheckedChange={(v) => setIncludeDrafts(!!v)}
          />
          <Label
            htmlFor="toggle-drafts"
            className="text-xs text-muted-foreground"
          >
            Include drafts
          </Label>
        </div>
      )}

      <div className="min-w-56">
        <Select
          value={currentYearId ?? ""}
          onValueChange={setCurrentYearId}
          disabled={!hasYears}
        >
          <SelectTrigger className="w-56">
            <SelectValue
              placeholder={hasYears ? "Select academic year" : "No years"}
            />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={String(y._id)} value={String(y._id)}>
                {y.name}
                {y.status !== "published" ? " (draft)" : ""}
                {y.isDefaultForOrg ? " • default" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isManagement && currentYearId && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAsDefaultForOrg(currentYearId)}
        >
          Set default
        </Button>
      )}
    </div>
  );
}
