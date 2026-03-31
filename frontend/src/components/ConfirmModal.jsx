import React from 'react';
import { X, AlertTriangle, CheckCircle2, Info, AlertCircle, Trash2, Send } from 'lucide-react';

const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    loading = false,
    confirmText = 'Confirm',
    confirmColor = 'danger', // danger (red), success (green), info (blue), warning (orange)
    showIcon = true
}) => {
    if (!isOpen) return null;

    const colorConfigs = {
        danger: {
            headerBg: 'bg-red-50',
            iconBg: 'bg-white',
            iconColor: 'text-red-500',
            iconBorder: 'border-red-100',
            buttonBg: 'bg-red-600 hover:bg-red-700',
            buttonShadow: 'shadow-red-100',
            Icon: AlertTriangle
        },
        success: {
            headerBg: 'bg-green-50',
            iconBg: 'bg-white',
            iconColor: 'text-green-500',
            iconBorder: 'border-green-100',
            buttonBg: 'bg-green-600 hover:bg-green-700',
            buttonShadow: 'shadow-green-100',
            Icon: CheckCircle2
        },
        info: {
            headerBg: 'bg-blue-50',
            iconBg: 'bg-white',
            iconColor: 'text-blue-500',
            iconBorder: 'border-blue-100',
            buttonBg: 'bg-blue-600 hover:bg-blue-700',
            buttonShadow: 'shadow-blue-100',
            Icon: Info
        },
        warning: {
            headerBg: 'bg-orange-50',
            iconBg: 'bg-white',
            iconColor: 'text-orange-500',
            iconBorder: 'border-orange-100',
            buttonBg: 'bg-orange-600 hover:bg-orange-700',
            buttonShadow: 'shadow-orange-100',
            Icon: AlertCircle
        }
    };

    const config = colorConfigs[confirmColor] || colorConfigs.danger;
    const { Icon } = config;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Icon */}
                <div className={`relative h-24 ${config.headerBg} flex items-center justify-center`}>
                    {showIcon && (
                        <div className={`w-16 h-16 ${config.iconBg} rounded-2xl shadow-sm flex items-center justify-center ${config.iconColor} border ${config.iconBorder}`}>
                            <Icon size={32} />
                        </div>
                    )}
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-black/5 rounded-xl transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 text-center space-y-4">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
                    <p className="text-sm text-gray-500 font-bold leading-relaxed whitespace-pre-wrap">
                        {message}
                    </p>
                </div>

                {/* Footer Buttons */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-3.5 border border-gray-200 bg-white text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 px-6 py-3.5 ${config.buttonBg} text-white rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-lg ${config.buttonShadow} flex items-center justify-center gap-2 disabled:opacity-50`}
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Icon size={16} />
                        )}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
