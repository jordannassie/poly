"use client";

import { useEffect } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "./ui/button";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  loading = false,
}: ConfirmModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, loading]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: "text-red-500",
      button: "bg-red-600 hover:bg-red-700 text-white",
    },
    warning: {
      icon: "text-yellow-500",
      button: "bg-yellow-600 hover:bg-yellow-700 text-white",
    },
    default: {
      icon: "text-blue-500",
      button: "bg-blue-600 hover:bg-blue-700 text-white",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />
      
      {/* Modal */}
      <div className="relative bg-[color:var(--surface)] rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 fade-in duration-200 border border-[color:var(--border-soft)]">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] transition disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center mx-auto mb-4 ${styles.icon}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-center text-[color:var(--text-strong)] mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-center text-[color:var(--text-muted)] mb-6">
            {message}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border-[color:var(--border-soft)]"
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 ${styles.button}`}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
