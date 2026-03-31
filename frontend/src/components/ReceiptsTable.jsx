import React, { memo } from 'react';
import { Printer, RefreshCw, Edit2, Trash2, History } from 'lucide-react';
import schoolLogo from '../assets/logo.jpeg';
import { generateReceiptPDF } from '../utils';

const ReceiptsTable = ({ receipts, loading, onViewHistory, onEdit, onDelete }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print-area">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-3 text-left">Receipt No</th>
                            <th className="px-6 py-3 text-left">Date</th>
                            <th className="px-6 py-3 text-left">Student</th>
                            <th className="px-6 py-3 text-left">Fee Type</th>
                            <th className="px-6 py-3 text-left">Month</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-right no-print">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {receipts.length > 0 ? (
                            receipts.map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50 transition-colors text-sm">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{r.receipt_no}</div>
                                        {r.is_edited && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase mt-1">
                                                <RefreshCw size={10} className="animate-spin-slow" />
                                                Edited
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{r.date}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{r.student_details?.name}</div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                            <span className="text-xs text-gray-400">Adm: {r.student_details?.admission_no}</span>
                                            <span className="hidden sm:inline text-gray-300">•</span>
                                            <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                {r.student_details?.student_class} - {r.student_details?.division}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-medium">{r.fee_type_summary || r.fee_type_details?.name}</td>
                                    <td className="px-6 py-4 text-gray-500 italic">{r.month_summary || r.month}</td>
                                    <td className="px-6 py-4 text-right font-black text-gray-900">₹{parseFloat(r.total_amount).toFixed(2)}</td>
                                    <td className="px-6 py-3 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${r.payment_status_details?.name === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {r.payment_status_details?.name || 'Unpaid'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right no-print">
                                        <div className="flex justify-end gap-2 text-center">
                                            <button onClick={() => generateReceiptPDF(r, schoolLogo)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition" title="Print PDF">
                                                <Printer size={16} />
                                            </button>

                                            {r.is_edited && (
                                                <button onClick={() => onViewHistory(r)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition" title="View History">
                                                    <History size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => onEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => onDelete(r.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="px-6 py-12 text-center text-gray-400 italic">
                                    {loading ? 'Loading receipts...' : 'No receipts found. Create your first receipt using the button above.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default memo(ReceiptsTable);
