import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Loader2, Check } from "lucide-react";
import { labelService } from "@/services/label.service";
import type { LabelDto } from "@/types/task";
import { toast } from "react-toastify";

interface LabelSelectorProps {
  projectId: number;
  selectedLabels: LabelDto[];
  onChange: (labels: LabelDto[]) => void;
  isManager: boolean;
}

export function LabelSelector({ projectId, selectedLabels, onChange, isManager }: LabelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [projectLabels, setProjectLabels] = useState<LabelDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [newLabelColor, setNewLabelColor] = useState("#6366F1");

  useEffect(() => {
    if (open && projectLabels.length === 0) {
      fetchLabels();
    }
  }, [open, projectId]);

  const fetchLabels = async () => {
    setLoading(true);
    try {
      const res = await labelService.getProjectLabels(projectId);
      if (res.data) {
        setProjectLabels(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch labels", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLabel = (label: LabelDto) => {
    const isSelected = selectedLabels.some((l) => l.id === label.id);
    if (isSelected) {
      onChange(selectedLabels.filter((l) => l.id !== label.id));
    } else {
      onChange([...selectedLabels, label]);
    }
    setOpen(false);
  };

  const removeLabel = (id: number) => {
    onChange(selectedLabels.filter((l) => l.id !== id));
  };

  const handleCreateLabel = async () => {
    if (!search.trim()) return;
    try {
      setIsCreating(true);
      const res = await labelService.createLabel(projectId, {
        name: search.trim(),
        color: newLabelColor
      });
      if (res.data) {
        setProjectLabels([...projectLabels, res.data]);
        onChange([...selectedLabels, res.data]);
        setSearch("");
        setOpen(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create label");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredLabels = projectLabels.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
  const exactMatch = projectLabels.some(l => l.name.toLowerCase() === search.toLowerCase().trim());

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {selectedLabels.map((label) => (
          <span
            key={label.id}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-white shadow-sm"
            style={{ backgroundColor: label.color }}
          >
            {label.name}
            <button
              type="button"
              className="hover:bg-black/20 rounded-full p-0.5"
              onClick={() => removeLabel(label.id)}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs border-dashed rounded-full">
              <Plus className="w-3 h-3 mr-1" /> Add Label
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <Input
              placeholder="Search or create..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm mb-2"
              autoFocus
            />
            <div className="max-h-[200px] overflow-y-auto flex flex-col gap-1">
              {loading && <div className="flex justify-center p-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>}

              {!loading && filteredLabels.map((label) => {
                const isSelected = selectedLabels.some((l) => l.id === label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label)}
                    className={`flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-muted`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
                      <span className="truncate">{label.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4" />}
                  </button>
                );
              })}

              {!loading && search.trim() !== "" && !exactMatch && isManager && (
                <div className="mt-2 pt-2 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="color"
                      value={newLabelColor}
                      onChange={(e) => setNewLabelColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                    />
                    <span className="text-xs text-muted-foreground">Choose color</span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full text-xs"
                    onClick={handleCreateLabel}
                    disabled={isCreating}
                  >
                    {isCreating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                    Create "{search}"
                  </Button>
                </div>
              )}
              {!loading && search.trim() !== "" && !exactMatch && !isManager && (
                 <div className="mt-2 pt-2 border-t text-xs text-muted-foreground text-center italic">
                   No label found matching "{search}". Only managers can create new labels.
                 </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
