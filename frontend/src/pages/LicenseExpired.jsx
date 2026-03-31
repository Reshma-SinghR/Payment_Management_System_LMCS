import React from 'react';
import { ShieldAlert, Phone, Mail, Globe } from 'lucide-react';

const LicenseExpired = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-500">
                <div className="bg-red-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ShieldAlert size={120} className="text-white" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm border border-white/30">
                            <ShieldAlert size={48} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-wider">Trial Expired</h1>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="text-center space-y-2">
                        <p className="text-slate-600 font-medium">
                            Your 5-day trial period for the <span className="font-bold text-slate-900">PaymentMag School Management System</span> has ended.
                        </p>
                        <p className="text-sm text-slate-400">
                            Please contact the administrator to activate your full license and continue managing your school's finances seamlessly.
                        </p>
                    </div>

                    <div className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Contact Support</h2>

                        <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all">
                                <Phone size={18} />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Phone</div>
                                <div className="text-sm font-bold text-slate-700">+91 1111111111</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all">
                                <Mail size={18} />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Email</div>
                                <div className="text-sm font-bold text-slate-700">support@paymentmag.com</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all">
                                <Globe size={18} />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Website</div>
                                <div className="text-sm font-bold text-slate-700">www.paymentmag.com</div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98]"
                    >
                        Try Reconnecting
                    </button>

                    <div className="text-center pt-2">
                        <p className="text-[10px] text-slate-400 font-medium italic">
                            All your data is safe and will be accessible immediately after activation.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LicenseExpired;
