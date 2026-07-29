import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ToastMessage {
  id: number;
  message: string;
  type: "info" | "success" | "warning";
}

let toastId = 0;
let showToastFn: ((message: string, type?: "info" | "success" | "warning") => void) | null = null;

export function showHardwareToast(message: string, type: "info" | "success" | "warning" = "info") {
  if (showToastFn) {
    showToastFn(message, type);
  }
}

export function HardwareToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    showToastFn = (message: string, type: "info" | "success" | "warning" = "info") => {
      const id = toastId++;
      setToasts((prev) => [...prev, { id, message, type }]);
      
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2000);
    };

    return () => {
      showToastFn = null;
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className={`px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium ${
              toast.type === "success"
                ? "bg-blue-600"
                : toast.type === "warning"
                ? "bg-slate-700"
                : "bg-blue-500"
            }`}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
