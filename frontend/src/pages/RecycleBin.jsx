import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, RotateCcw, Trash2, AlertCircle, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAcademicYear } from '../context/AcademicYearContext';
import ConfirmModal from '../components/ConfirmModal';

const RecycleBin = () => {
    const navigate = useNavigate();
    const { academicYear } = useAcademicYear();
    const [deletedReceipts, setDeletedReceipts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [confirmModal, setConfirmModal] = useState({ show: false, receipt: null, action: null });

    const fetchDeletedReceipts = async () => {
        setLoading(true);
        try {
            const res = await api.get(`payments/receipts/deleted/?academic_year=${academicYear}&search=${search}`);
            setDeletedReceipts(res.data.results || res.data || []);
        } catch (error) {
            console.error('Error fetching deleted receipts', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchDeletedReceipts();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [search, academicYear]);

    const handleRestore = async (id) => {
        try {
            await api.post(`payments/receipts/${id}/restore/`);
            fetchDeletedReceipts();
            setConfirmModal({ show: false, receipt: null, action: null });
            window.dispatchEvent(new Event('payment-updated'));
        } catch (error) {
            console.error('Error restoring receipt', error);
            alert('Failed to restore receipt.');
        }
    };

    const handlePermanentDelete = async (id) => {
        try {
            await api.delete(`payments/receipts/${id}/permanent_delete/`);
            fetchDeletedReceipts();
            setConfirmModal({ show: false, receipt: null, action: null });
            window.dispatchEvent(new Event('payment-updated'));
        } catch (error) {
            console.error('Error permanently deleting receipt', error);
            alert('Failed to delete receipt permanently.');
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/payments')}
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                    >
                        <ArrowLeft size={24} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Recycle Bin</h1>
                        <p className="text-gray-500 text-[10px] sm:text-sm font-bold uppercase tracking-widest mt-0.5">Restore recently deleted receipts</p>
                    </div>
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search deleted receipts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 sm:p-4 flex items-start gap-3">
                <AlertCircle className="text-amber-600 shrink-0" size={18} />
                <div className="text-[10px] sm:text-sm text-amber-800 font-medium">
                    <span className="font-bold">Important:</span> Restoring a receipt will automatically update the student's payment status and collection totals.
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                <th className="px-6 py-4 text-left">Receipt No</th>
                                <th className="px-6 py-4 text-left">Student</th>
                                <th className="px-6 py-4 text-left">Amount</th>
                                <th className="px-6 py-4 text-left">Deleted Info</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {deletedReceipts.length > 0 ? (
                                deletedReceipts.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50 transition-colors text-sm">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{r.receipt_no}</div>
                                            <div className="text-xs text-gray-400 font-mono">Date: {r.date}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{r.student_details?.name}</div>
                                            <div className="text-xs text-gray-400">Adm: {r.student_details?.admission_no}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            ₹{parseFloat(r.total_amount).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold uppercase mb-1">
                                                <Calendar size={10} />
                                                {new Date(r.deleted_at).toLocaleDateString()}
                                            </div>
                                            {r.deleted_by_name && (
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold uppercase">
                                                    <User size={10} />
                                                    {r.deleted_by_name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setConfirmModal({ show: true, receipt: r, action: 'restore' })}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Restore Receipt"
                                                >
                                                    <RotateCcw size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmModal({ show: true, receipt: r, action: 'delete' })}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="Permanently Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">
                                        {loading ? 'Searching...' : 'Recycle bin is empty.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal 
                isOpen={confirmModal.show}
                onClose={() => setConfirmModal({ show: false, receipt: null, action: null })}
                onConfirm={() => {
                    if (confirmModal.action === 'restore') {
                        handleRestore(confirmModal.receipt.id);
                    } else {
                        handlePermanentDelete(confirmModal.receipt.id);
                    }
                }}
                title={confirmModal.action === 'restore' ? 'Restore Receipt?' : 'Permanent Delete?'}
                message={confirmModal.action === 'restore'
                    ? `Are you sure you want to restore receipt ${confirmModal.receipt?.receipt_no}? This will re-apply the paid status to the student's fees.`
                    : `This action cannot be undone. Receipt ${confirmModal.receipt?.receipt_no} will be permanently removed from the records.`}
                confirmText={confirmModal.action === 'restore' ? 'Restore' : 'Delete Permanently'}
                type={confirmModal.action === 'restore' ? 'warning' : 'danger'}
            />
        </div>
    );
};

export default RecycleBin;

