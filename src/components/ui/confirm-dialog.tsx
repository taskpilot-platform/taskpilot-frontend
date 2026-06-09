import React, { createContext, useContext, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, Trash2 } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<(value: boolean) => void>(null);

  const confirm = (options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions(options);
      setIsOpen(true);
      resolveRef.current = resolve;
    });
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
    }
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(true);
    }
  };

  const isDestructive = options?.variant === "destructive" || options?.variant === "warning";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent className="sm:max-w-[440px] overflow-hidden border-border/40 shadow-2xl backdrop-blur-lg bg-card/95 p-6 rounded-xl">
          <div className="flex gap-4 items-start">
            <div className={`p-3 rounded-full flex-shrink-0 ${
              options?.variant === "destructive" 
                ? "bg-red-500/10 text-red-500 dark:bg-red-500/20" 
                : options?.variant === "warning"
                ? "bg-amber-500/10 text-amber-500 dark:bg-amber-500/20"
                : "bg-primary/10 text-primary dark:bg-primary/20"
            }`}>
              {options?.variant === "destructive" ? (
                <Trash2 className="h-6 w-6 stroke-[2]" />
              ) : options?.variant === "warning" ? (
                <AlertTriangle className="h-6 w-6 stroke-[2]" />
              ) : (
                <Info className="h-6 w-6 stroke-[2]" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <DialogHeader className="text-left">
                <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                  {options?.title || "Xác nhận hành động"}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground/90 font-normal leading-relaxed pt-1">
                  {options?.message}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
          <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-3 sm:space-x-0">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="px-4 py-2 border-border/60 hover:bg-muted text-sm font-medium transition-all active:scale-[0.98] rounded-lg w-full sm:w-auto"
            >
              {options?.cancelText || "Hủy"}
            </Button>
            <Button
              variant={isDestructive ? "destructive" : "default"}
              onClick={handleConfirm}
              className={`px-5 py-2 text-sm font-medium transition-all active:scale-[0.98] rounded-lg shadow-sm w-full sm:w-auto ${
                options?.variant === "destructive"
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : options?.variant === "warning"
                  ? "bg-amber-600 hover:bg-amber-500 text-white"
                  : "bg-primary hover:bg-primary/95 text-primary-foreground"
              }`}
            >
              {options?.confirmText || (isDestructive ? "Xóa" : "Xác nhận")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
};
