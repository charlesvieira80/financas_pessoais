import React, { ReactNode, useEffect, useState } from 'react';
import { XIcon } from './icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
      if(isOpen) {
          setShowModal(true);
          document.body.style.overflow = 'hidden';
      } else {
          const timer = setTimeout(() => setShowModal(false), 200); // Wait for animation
          document.body.style.overflow = 'unset';
          return () => clearTimeout(timer);
      }
  }, [isOpen]);

  if (!showModal && !isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex justify-center items-end sm:items-center transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"></div>

      {/* Content */}
      <div 
        className={`
            bg-white dark:bg-slate-900 shadow-2xl w-full relative transform transition-all duration-300 
            ${sizeClasses[size]} 
            
            /* Mobile Styles: Bottom Sheet, Full Width, Dynamic Height */
            rounded-t-3xl rounded-b-none m-0 max-h-[95dvh] flex flex-col
            
            /* Desktop Styles: Centered, Rounded, Margin */
            sm:rounded-3xl sm:m-4 sm:max-h-[90vh]
            
            ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} 
            /* Importante: overflow-hidden no container principal para o flex funcionar */
            overflow-hidden
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Fixed/Static */}
        <div className="flex-shrink-0 flex justify-between items-center p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
          <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors">
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-0 md:px-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;