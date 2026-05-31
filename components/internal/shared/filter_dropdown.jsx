"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function FilterDropdown({
  value: controlledValue,
  onValueChange,
  options = [],
  placeholder = "Select filter",
  icon: Icon,
  height = "h-8",
}) {
  const [internalFilter, setInternalFilter] = useState(options[0]?.value);

  const filter = controlledValue !== undefined ? controlledValue : internalFilter;

  const handleValueChange = (newValue) => {
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setInternalFilter(newValue);
    }
  };

  const getFilterLabel = (filterValue) => {
    const option = options.find((opt) => opt.value === filterValue);
    return option?.label || placeholder;
  };

  return (
    <div className="flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={`gap-1.5 bg-[#202020] border-[#2a2a2a] text-[#ededed] hover:bg-[#1a1a1a] text-xs px-3 rounded-md font-medium ${height}`}
          >
            {Icon ? <Icon className="h-3.5 w-3.5 text-[#737373]" /> : null}
            {getFilterLabel(filter)}
            <ChevronDown className="w-3.5 h-3.5 ml-2 text-[#737373]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-[#1a1a1a] border-[#2a2a2a] text-[#ededed]">
          <DropdownMenuRadioGroup value={filter} onValueChange={handleValueChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="text-xs focus:bg-[#2a2a2a] focus:text-[#ededed] cursor-pointer"
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
