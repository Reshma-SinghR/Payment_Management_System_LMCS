import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, History, Download, Loader2 } from 'lucide-react';
import api from '../services/api';

const Backup = () => {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const response = await api.get('backup/');
            setBackups(response.data);
        } catch (error) {
            console.error('Failed to fetch backups', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    const handleRunBackup = async () => {
        setCreating(true);
        try {
            await api.post('backup/');
            fetchBackups();
        } catch (error) {
            console.error('Failed to create backup', error);
            alert('Failed to create backup');
        } finally {
            setCreating(false);
        }
    };

    const handleDownload = (id) => {
        window.open(`http://127.0.0.1:8000/api/backup/${id}/download/`, '_blank');
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleString();
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">System Backup</h1>
                    <p className="text-[10px] sm:text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Data Safety & Disaster Recovery</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                {/* Main Action Card */}
                <div className="bg-white rounded-2xl sm:rounded-[2rem] p-6 sm:p-10 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-50 rounded-2xl sm:rounded-[2rem] flex items-center justify-center text-green-600 mb-4 sm:mb-6 border border-green-100 shadow-sm">
                        <Database size={28} className="sm:w-8 sm:h-8" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-gray-800 tracking-tight mb-2">Create New Backup</h3>
                    <p className="text-xs sm:text-sm text-gray-500 max-w-xs mb-6 sm:mb-8 font-medium leading-relaxed">Securely compress and store your school management data to a local file.</p>
                    <button
                        onClick={handleRunBackup}
                        disabled={creating}
                        className="w-full py-3 sm:py-4 bg-navy-900 text-white rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-navy-100 flex items-center justify-center gap-3 active:scale-95 duration-200 disabled:opacity-50"
                    >
                        {creating ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                        {creating ? 'Creating Backup...' : 'Run Backup Now'}
                    </button>
                    <div className="mt-4 sm:mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                        <ShieldCheck size={12} />
                        Auto-Backup Enabled
                    </div>
                </div>

                {/* History/Info Card */}
                <div className="bg-white rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-base sm:text-lg font-black text-gray-800 tracking-tight mb-4 sm:mb-6 flex items-center gap-3">
                        <History className="text-blue-500" size={20} />
                        Recent Backups
                    </h3>
                    <div className="space-y-3 sm:space-y-4 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="flex justify-center p-8 text-gray-400">
                                <Loader2 className="animate-spin" size={24} />
                            </div>
                        ) : backups.length > 0 ? (
                            backups.map((backup, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all group gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] sm:text-xs font-black text-gray-700 truncate">{backup.filename}</p>
                                        <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest">{formatDate(backup.created_at)} • {formatSize(backup.size)}</p>
                                    </div>
                                    <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-black uppercase">Success</span>
                                        <button
                                            onClick={() => handleDownload(backup.id)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Download Backup"
                                        >
                                            <Download size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center p-8 text-gray-300 italic text-sm">
                                No backup history found
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Backup;
