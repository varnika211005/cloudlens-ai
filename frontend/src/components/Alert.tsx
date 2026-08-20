import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: ReactNode;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  const colors = {
    success: 'bg-green-100 text-green-800 border-green-300',
    error: 'bg-red-100 text-red-800 border-red-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    info: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[type]} flex justify-between items-start`}>
      <div>{message}</div>
      {onClose && (
        <button onClick={onClose} className="ml-4">
          <X size={18} />
        </button>
      )}
    </div>
  );
};