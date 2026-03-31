import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Printer, X, CheckCircle, Trash2, RefreshCw, History, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAcademicYear } from '../context/AcademicYearContext';
import { generateReceiptPDF } from '../utils';
import schoolLogo from '../assets/logo.jpeg';
import ReceiptsTable from '../components/ReceiptsTable';
import CreateReceiptModal from '../components/CreateReceiptModal';
import ConfirmModal from '../components/ConfirmModal';

const Payments = () => {
    const navigate = useNavigate();
    const [receipts, setReceipts] = useState([]);
    const [feeTypes, setFeeTypes] = useState([]);
    const [paymentStatuses, setPaymentStatuses] = useState([]);
    const [loading, setLoading] = useState(false);
    const { academicYear } = useAcademicYear();

    // Modal & Preview State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const isModalOpenRef = React.useRef(false);

    const [showPreview, setShowPreview] = useState(false);
    const [lastCreatedReceipt, setLastCreatedReceipt] = useState(null);
    const [historyReceipt, setHistoryReceipt] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    
    const [editData, setEditData] = useState(null);

    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });

    // Sync ref with state
    useEffect(() => {
        isModalOpenRef.current = isModalOpen;
    }, [isModalOpen]);

    const fetchData = useCallback(async () => {
        if (!academicYear) return;
        setLoading(true);
        console.log('Fetching core payment data...');

        try {
            const results = await Promise.allSettled([
                api.get(`payments/receipts/?academic_year=${academicYear}`),
                api.get('payments/fee-categories/'),
                api.get('payments/payment-statuses/')
            ]);

            if (results[0].status === 'fulfilled') {
                setReceipts(results[0].value.data.results || results[0].value.data || []);
            }
            if (results[1].status === 'fulfilled') {
                setFeeTypes(results[1].value.data.results || results[1].value.data || []);
            }
            if (results[2].status === 'fulfilled') {
                setPaymentStatuses(results[2].value.data.results || results[2].value.data || []);
            }
        } catch (error) {
            console.error('Error fetching dashboard data', error);
        } finally {
            setLoading(false);
        }
    }, [academicYear]);

    useEffect(() => {
        fetchData();
        
        // Auto-open logic if coming from another page
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const studentId = params.get('studentId');
        if (studentId) {
            handleAutoOpenForStudent(studentId);
        }
    }, [academicYear, fetchData]);

    const handleAutoOpenForStudent = async (id) => {
        try {
            const res = await api.get(`students/${id}/`);
            setEditData({ student_details: res.data, student: res.data.id });
            setIsModalOpen(true);
        } catch (e) { console.error(e); }
    };

    const handleOpenModal = () => {
        setEditData(null);
        setShowPreview(false);
        setShowHistory(false);
        setIsModalOpen(true);
    };

    const handleDeleteReceipt = (id) => {
        setDeleteConfirm({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteConfirm.id;
        try {
            await api.delete(`payments/receipts/${id}/`);
            await fetchData();
            window.dispatchEvent(new Event('payment-updated'));
            setDeleteConfirm({ isOpen: false, id: null });
        } catch (error) {
            console.error('Error deleting receipt', error);
            alert('Failed to delete receipt.');
        }
    };

    const handleEditReceipt = (r) => {
        setEditData(r);
        setIsModalOpen(true);
    };

    const handleViewHistory = (r) => {
        setHistoryReceipt(r);
        setShowHistory(true);
    };

    const handleReceiptSuccess = async (receiptId) => {
        setIsModalOpen(false);
        try {
            const res = await api.get(`payments/receipts/${receiptId}/`);
            setLastCreatedReceipt(res.data);
            setShowPreview(true);
            await fetchData();
            window.dispatchEvent(new Event('payment-updated'));
        } catch (e) {
            console.error('Error post-success', e);
            fetchData();
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payments & Receipts</h1>
                    <p className="text-gray-500 text-sm">Manage school fee collections and generate receipts.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/payments/recycle-bin')}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium border border-red-100"
                    >
                        <Trash2 size={20} />
                        <span>Recycle Bin</span>
                    </button>
                    <button
                        onClick={handleOpenModal}
                        className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition shadow-md font-medium"
                    >
                        <Plus size={20} />
                        <span>Create Receipt</span>
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <ReceiptsTable
                receipts={receipts}
                loading={loading}
                onViewHistory={handleViewHistory}
                onEdit={handleEditReceipt}
                onDelete={handleDeleteReceipt}
            />

            {/* Create Receipt Modal */}
            <CreateReceiptModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                academicYear={academicYear}
                feeTypes={feeTypes}
                paymentStatuses={paymentStatuses}
                onSuccess={handleReceiptSuccess}
                schoolLogo={schoolLogo}
                editData={editData}
            />

            {/* Receipt Preview Modal */}
            {showPreview && lastCreatedReceipt && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-gray-900/80 backdrop-blur-md overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm my-auto overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-4 sm:p-8 text-center space-y-6">
                            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                <CheckCircle size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black text-gray-900">Success!</h3>
                                <p className="text-sm text-gray-500">Receipt generated successfully.</p>
                            </div>
                            <div className="bg-gray-50 p-4 sm:p-6 rounded-2xl text-left space-y-3 font-mono text-[10px] sm:text-xs border border-dashed border-gray-300 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                                    <img src={schoolLogo} alt="" className="w-20" />
                                </div>
                                <div className="flex flex-col items-center gap-3 border-b border-gray-200 pb-4 mb-4">
                                    <img src={schoolLogo} alt="Logo" className="w-16 h-16 rounded-lg shadow-sm" />
                                    <div className="text-center">
                                        <div className="text-sm font-black text-gray-900 leading-tight">LOURDES MATA CENTRAL SCHOOL</div>
                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Official Payment Receipt</div>
                                    </div>
                                </div>

                                <div className="flex justify-between"><span>Receipt No:</span><span className="font-bold">{lastCreatedReceipt.receipt_no}</span></div>
                                <div className="flex justify-between"><span>Date:</span><span>{lastCreatedReceipt.date}</span></div>
                                <div className="flex justify-between"><span>Student:</span><span className="font-bold">{lastCreatedReceipt.student_details?.name}</span></div>

                                <div className="border-t border-gray-100 py-2 space-y-1">
                                    {(lastCreatedReceipt.summarized_items || []).map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                            <span>{item.category}{item.month_range ? ` (${item.month_range})` : ''}</span>
                                            <span>₹{parseFloat(item.amount).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-black">
                                    <span>Total:</span><span>₹{parseFloat(lastCreatedReceipt.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button onClick={() => generateReceiptPDF(lastCreatedReceipt, schoolLogo)} className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition shadow-lg">
                                    <Printer size={18} />
                                    Print Receipt (Landscape)
                                </button>

                                <button onClick={() => setShowPreview(false)} className="w-full py-3 text-gray-500 font-bold hover:text-gray-700 transition">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* History Modal */}
            {showHistory && historyReceipt && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center text-amber-900">
                            <div className="flex items-center gap-2">
                                <History size={20} />
                                <h2 className="text-lg font-extrabold tracking-tight">Receipt Edit History</h2>
                            </div>
                            <button onClick={() => setShowHistory(false)} className="hover:text-amber-600 transition">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 mb-4">
                                <div className="flex-1">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">Receipt No</div>
                                    <div className="text-sm font-black text-gray-900">{historyReceipt.receipt_no}</div>
                                </div>
                                <div className="flex-1 text-right">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">Last Updated</div>
                                    <div className="text-sm font-bold text-gray-700">{historyReceipt.date}</div>
                                </div>
                            </div>

                            {historyReceipt.audit_logs && historyReceipt.audit_logs.length > 0 ? (
                                <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-4 before:w-px before:bg-gray-100">
                                    {historyReceipt.audit_logs.map((log, idx) => (
                                        <div key={idx} className="relative pl-10">
                                            <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-amber-100 border-4 border-white flex items-center justify-center text-amber-600 shadow-sm">
                                                <RefreshCw size={12} />
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                                                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                                                    <span className="text-xs font-black text-gray-900">Changes documented</span>
                                                    <span className="text-[10px] text-gray-400 font-bold">{new Date(log.timestamp).toLocaleString()}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {Object.entries(log.change_details).map(([field, vals]) => (
                                                        <div key={field} className="grid grid-cols-2 gap-4 text-xs">
                                                            <div className="col-span-2 text-[10px] font-bold text-amber-600 uppercase tracking-wider">{field.replace('_', ' ')}</div>
                                                            <div className="p-2 bg-red-50 rounded-lg text-red-700 decoration-red-200 line-through">
                                                                <span className="opacity-50 mr-1">Was:</span>{vals.old}
                                                            </div>
                                                            <div className="p-2 bg-green-50 rounded-lg text-green-700 font-bold">
                                                                <span className="opacity-50 mr-1 font-normal">Now:</span>{vals.new}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="pt-2 flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                                                    <Info size={12} />
                                                    Updated by {log.user_name || 'Administrator'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 text-center text-gray-400 italic font-medium">No history recorded for this receipt.</div>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                            <button onClick={() => setShowHistory(false)} className="px-8 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition shadow-sm">
                                Close History
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Confirm Delete Modal */}
            <ConfirmModal 
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                title="Delete Receipt"
                message="Are you sure you want to delete this receipt? This will move it to the recycle bin."
                confirmText="Delete"
                confirmColor="danger"
            />
        </div>
    );
};

export default Payments;
