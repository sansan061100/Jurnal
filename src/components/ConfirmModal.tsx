import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

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
  confirmText = 'Yes, Delete',
  cancelText = 'Cancel',
  isDanger = true,
  onConfirm,
  onClose
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 select-none">
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
        className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative z-[100] p-5 text-left space-y-4"
      >
        <div className="flex gap-3">
          <div className={`p-2.5 rounded-xl h-fit shrink-0 border-2 border-cat-surface0 ${isDanger ? 'bg-cat-red/15 text-cat-red' : 'bg-cat-peach/15 text-cat-peach'}`}>
            <AlertTriangle className="h-5 w-5 font-black shrink-0" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-black text-cat-text uppercase tracking-wider">
              {title}
            </h3>
            <p className="text-[11px] text-cat-subtext leading-relaxed font-bold">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-cat-surface0/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-cat-base border-2 border-cat-surface0 hover:bg-cat-surface0 text-cat-subtext font-black text-[10px] rounded-xl uppercase tracking-widest transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 font-black text-[10px] rounded-xl uppercase tracking-widest transition-all border-2 border-cat-surface0 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-y-0.5 cursor-pointer ${
              isDanger 
                ? 'bg-[#dc2626] text-[#fafafa]' 
                : 'bg-cat-peach text-cat-base'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
