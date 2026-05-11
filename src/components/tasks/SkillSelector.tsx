import React, { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2 } from "lucide-react";
import { skillService } from "@/services/skill.service";
import type { SkillDto } from "@/types/task";

interface SkillSelectorProps {
  selectedSkills: SkillDto[];
  onChange: (skills: SkillDto[]) => void;
}

export function SkillSelector({ selectedSkills, onChange }: SkillSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SkillDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    
    const fetchSkills = async () => {
      setLoading(true);
      try {
        const res = await skillService.searchSkills(search);
        if (res.data) {
          setResults(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch skills", err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSkills, 300);
    return () => clearTimeout(debounce);
  }, [search, open]);

  const toggleSkill = (skill: SkillDto) => {
    const isSelected = selectedSkills.some((s) => s.id === skill.id);
    if (isSelected) {
      onChange(selectedSkills.filter((s) => s.id !== skill.id));
    } else {
      onChange([...selectedSkills, skill]);
    }
  };

  const removeSkill = (id: number) => {
    onChange(selectedSkills.filter((s) => s.id !== id));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {selectedSkills.map((skill) => (
          <Badge key={skill.id} variant="secondary" className="flex items-center gap-1 px-2 py-1">
            {skill.name}
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground rounded-full"
              onClick={() => removeSkill(skill.id)}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs border-dashed rounded-full">
              <Plus className="w-3 h-3 mr-1" /> Add Skill
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <Input
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm mb-2"
              autoFocus
            />
            <div className="max-h-[200px] overflow-y-auto flex flex-col gap-1">
              {loading && <div className="flex justify-center p-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>}
              {!loading && results.length === 0 && (
                <div className="text-sm text-center text-muted-foreground p-2">No skills found.</div>
              )}
              {!loading && results.map((skill) => {
                const isSelected = selectedSkills.some((s) => s.id === skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
                      isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                    }`}
                  >
                    {skill.name}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
