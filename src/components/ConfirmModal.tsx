import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Hapus',
  cancelText = 'Batal',
  isDanger = true,
  onConfirm,
  onClose
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-cat-crust/90 backdrop-blur-xs cursor-pointer"
      />

      {/* Modal content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-cat-mantle border border-cat-surface1 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative z-[100] p-5 text-left space-y-4"
      >
        <div className="flex gap-3">
          <div className={`p-2.5 rounded-xl h-fit shrink-0 ${isDanger ? 'bg-cat-red/10 text-cat-red' : 'bg-cat-peach/10 text-cat-peach'}`}>
            <AlertTriangle className="h-5 w-5 font-bold" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-black text-cat-text uppercase tracking-wide">
              {title}
            </h3>
            <p className="text-[11px] text-cat-subtext leading-relaxed font-semibold">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-cat-base border border-cat-surface1 hover:bg-cat-surface0 text-cat-subtext hover:text-cat-text font-black text-[10px] rounded-xl uppercase tracking-wider transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 font-black text-[10px] rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md text-cat-crust ${
              isDanger 
                ? 'bg-cat-red hover:bg-cat-red/90 shadow-cat-red/10' 
                : 'bg-cat-peach hover:bg-cat-peach/90 shadow-cat-peach/10'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
