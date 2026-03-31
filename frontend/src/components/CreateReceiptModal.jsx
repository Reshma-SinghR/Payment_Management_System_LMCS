import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle, Info } from 'lucide-react';
import api from '../services/api';

const CreateReceiptModal = ({ 
    isOpen, 
    onClose, 
    academicYear, 
    feeTypes, 
    paymentStatuses, 
    onSuccess, 
    schoolLogo,
    editData = null 
}) => {
    // Form & Search State
    const [studentSearch, setStudentSearch] = useState('');
    const [showStudentDropdown, setShowStudentDropdown] = useState(false);
    const [students, setStudents] = useState([]);
    const [unpaidFees, setUnpaidFees] = useState([]);
    const [formError, setFormError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        receipt_no: '',
        date: new Date().toISOString().split('T')[0],
        student: '',
        student_name: '',
        total_amount: 0,
        payment_status: '',
        month: new Date().toLocaleString('en-US', { month: 'long' }),
        description: '',
        item_ids: [],
        academic_year: academicYear
    });

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // State to prevent re-initialization on background refreshes
    const hasInitializedRef = React.useRef(false);
    const prevEditDataIdRef = React.useRef(null);

    // Reset initialization flag when modal opens
    useEffect(() => {
        if (isOpen) {
            hasInitializedRef.current = false;
        }
    }, [isOpen]);

    // Initialize editing data or defaults
    useEffect(() => {
        if (!isOpen) return;

        // Skip if already initialized and it's the same record
        const currentEditId = editData?.id || null;
        if (hasInitializedRef.current && prevEditDataIdRef.current === currentEditId) {
            return;
        }

        if (editData && editData.id) {
            // Full receipt object for editing
            setFormData({
                id: editData.id,
                receipt_no: editData.receipt_no,
                date: editData.date,
                student: editData.student,
                student_name: editData.student_details?.name || editData.student_name,
                total_amount: parseFloat(editData.total_amount) || 0,
                payment_status: editData.payment_status,
                month: editData.month,
                description: editData.description || '',
                item_ids: editData.items?.map(it => it.id) || [],
                academic_year: editData.academic_year
            });
            setStudentSearch(editData.student_details?.name || editData.student_name || '');
            hasInitializedRef.current = true;
            prevEditDataIdRef.current = editData.id;
        } else if (editData && editData.student) {
            // Partial data (likely just student selection from another page)
            const defaultPaidStatus = paymentStatuses.find(s => s.name === 'Paid') || (paymentStatuses.length > 0 ? paymentStatuses[0] : null);
            setStudentSearch(editData.student_details?.name || '');
            handleStudentSelect(editData.student_details || { id: editData.student }, defaultPaidStatus?.id);
            hasInitializedRef.current = true;
            prevEditDataIdRef.current = null;
        } else {
            // New receipt defaults
            const defaultPaidStatus = paymentStatuses.find(s => s.name === 'Paid') || (paymentStatuses.length > 0 ? paymentStatuses[0] : null);
            setFormData(prev => ({
                ...prev,
                payment_status: defaultPaidStatus?.id || '',
                total_amount: 0,
                student: '',
                student_name: '',
                item_ids: [],
                receipt_no: ''
            }));
            setStudentSearch('');
            setUnpaidFees([]);
            hasInitializedRef.current = true;
            prevEditDataIdRef.current = null;
        }
    }, [editData, paymentStatuses, isOpen]);

    // Student Search logic
    const fetchStudents = async (search = '') => {
        try {
            const res = await api.get(`students/?search=${search}&academic_year=${academicYear}`);
            setStudents(res.data.results || res.data || []);
        } catch (error) {
            console.error('Error searching students', error);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (studentSearch && showStudentDropdown) {
                fetchStudents(studentSearch);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [studentSearch, showStudentDropdown]);

    const handleStudentSelect = async (student, defaultStatusId = null) => {
        setFormData(prev => ({
            ...prev,
            student: student.id,
            student_name: student.name,
            total_amount: 0,
            item_ids: [],
            payment_status: defaultStatusId || prev.payment_status
        }));
        setStudentSearch(student.name);
        setShowStudentDropdown(false);

        try {
            const res = await api.get('payments/fee-mappings/', { 
                params: { student: student.id, is_paid: false, academic_year: academicYear } 
            });
            const data = res.data.results || res.data || [];
            setUnpaidFees(data);

            const selectedIds = data.map(item => item.id);
            const total = data.reduce((sum, item) => {
                const amount = parseFloat(item.amount) || 0;
                const paid = parseFloat(item.paid_amount || 0) || 0;
                return sum + (amount - paid);
            }, 0);

            setFormData(prev => ({
                ...prev,
                total_amount: total,
                item_ids: selectedIds
            }));
        } catch (e) {
            console.error('Error fetching unpaid fees', e);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);

        if (!formData.student) { return setFormError('Please select a student.'); }
        if (formData.item_ids.length === 0) { return setFormError('No fee items selected.'); }
        if (parseFloat(formData.total_amount) <= 0) { return setFormError('Total amount must be greater than zero.'); }

        const payload = {
            ...formData,
            payment_status: formData.payment_status || null,
            total_amount: parseFloat(parseFloat(formData.total_amount).toFixed(2)) || 0
        };

        setIsSaving(true);
        try {
            let res;
            if (formData.id) {
                res = await api.put(`payments/receipts/${formData.id}/`, payload);
            } else {
                res = await api.post('payments/receipts/', payload);
            }
            onSuccess(res.data.id || formData.id);
        } catch (error) {
            console.error('Error saving receipt:', error);
            setFormError('Failed to save receipt. Please check your network or inputs.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const filteredStudentsList = students.slice(0, 10);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-extrabold text-gray-900">
                        {formData.id ? 'Edit Payment Receipt' : 'New Payment Receipt'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    {formError && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 flex items-start gap-2">
                            <Info className="shrink-0 mt-0.5" size={16} />
                            <span>{formError}</span>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Receipt Number</label>
                                <input readOnly name="receipt_no" value={formData.receipt_no || '(Auto-generated)'} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none bg-gray-100 font-mono text-sm text-gray-500" />
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search Student (Name or Adm No)</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search by Name or Admission No..."
                                        value={studentSearch || ""}
                                        onChange={(e) => {
                                            setStudentSearch(e.target.value);
                                            setShowStudentDropdown(true);
                                            if (!e.target.value) setFormData(prev => ({ ...prev, student: '', student_name: '', student_balance: 0 }));
                                        }}
                                        onFocus={() => setShowStudentDropdown(true)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                    />
                                </div>

                                {showStudentDropdown && studentSearch.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                        {filteredStudentsList.length > 0 ? filteredStudentsList.map(s => (
                                            <div
                                                key={s.id}
                                                onClick={() => handleStudentSelect(s)}
                                                className="px-4 py-2 hover:bg-primary-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                                            >
                                                <div className="font-bold text-gray-900 text-sm">{s.name}</div>
                                                <div className="text-xs text-gray-500">Adm: {s.admission_no} | Class: {s.student_class}-{s.division}</div>
                                            </div>
                                        )) : (
                                            <div className="px-4 py-3 text-sm text-gray-400 text-center">No students found</div>
                                        )}
                                    </div>
                                )}
                                
                                {formData.student && (
                                    <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                                        <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle size={14} className="text-blue-600" />
                                                <span className="text-xs font-bold text-blue-800">Selected: {formData.student_name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const allSelected = formData.item_ids.length === unpaidFees.length;
                                                    const newIds = allSelected ? [] : unpaidFees.map(f => f.id);
                                                    const newTotal = allSelected ? 0 : unpaidFees.reduce((sum, f) => sum + (parseFloat(f.amount || 0) - parseFloat(f.paid_amount || 0)), 0);
                                                    setFormData(prev => ({ ...prev, item_ids: newIds, total_amount: newTotal }));
                                                }}
                                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase bg-blue-100/50 px-2 py-1 rounded"
                                            >
                                                {formData.item_ids.length === unpaidFees.length ? 'Deselect All' : 'Select All'} ({unpaidFees.length})
                                            </button>
                                        </div>

                                        <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                                            {unpaidFees.map(item => {
                                                const isSelected = formData.item_ids.includes(item.id);
                                                const itemBalance = parseFloat(item.amount) - parseFloat(item.paid_amount || 0);
                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => {
                                                            setFormData(prev => {
                                                                const newIds = isSelected ? prev.item_ids.filter(id => id !== item.id) : [...prev.item_ids, item.id];
                                                                    const newTotal = unpaidFees.filter(f => newIds.includes(f.id)).reduce((sum, f) => sum + (parseFloat(f.amount || 0) - parseFloat(f.paid_amount || 0)), 0);
                                                                    return { ...prev, item_ids: newIds, total_amount: newTotal };
                                                            });
                                                        }}
                                                        className={`p-2 rounded-lg border flex justify-between items-center cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/80 border-blue-200' : 'bg-white/60 border-gray-100 hover:bg-gray-50'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                                                {isSelected && <CheckCircle size={12} className="text-white" />}
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase block">{item.fee_category_details?.name}</span>
                                                                <span className="text-xs font-bold text-gray-700">{item.month_with_year || item.month}</span>
                                                            </div>
                                                        </div>
                                                        <span className={`text-sm font-extrabold ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>₹{(parseFloat(item.amount || 0) - parseFloat(item.paid_amount || 0)).toFixed(2)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="flex justify-between items-center bg-primary-50 p-3 rounded-lg border border-primary-100 mt-2">
                                            <span className="text-xs font-bold text-primary-700 uppercase">Total Amount</span>
                                            <span className="text-lg font-black text-primary-700">₹{(parseFloat(formData.total_amount) || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Billing Month</label>
                                <select name="month" value={formData.month || ""} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white">
                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description / Remarks</label>
                                <textarea name="description" value={formData.description || ''} onChange={handleChange} placeholder="Enter any additional notes..." className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white h-20" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                                <div className="text-xs font-bold text-gray-400 uppercase mb-2">Final Summary</div>
                                {paymentStatuses.find(ps => ps.id === formData.payment_status)?.name === 'Partial' ? (
                                    <div className="flex flex-col items-center justify-center gap-1">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-2xl font-black text-gray-900">₹</span>
                                            <input type="number" name="total_amount" value={formData.total_amount || 0} onChange={handleChange} className="w-32 text-3xl font-black text-gray-900 bg-white border border-primary-300 rounded-lg text-center outline-none focus:ring-2 focus:ring-primary-500" />
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-medium">
                                            Remaining: ₹{(unpaidFees.filter(f => formData.item_ids.includes(f.id)).reduce((s, f) => s + (parseFloat(f.amount || 0) - parseFloat(f.paid_amount || 0)), 0) - (parseFloat(formData.total_amount) || 0)).toFixed(2)}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-3xl font-black text-gray-900 mb-1">₹{(parseFloat(formData.total_amount) || 0).toFixed(2)}</div>
                                )}
                                <div className="text-[10px] font-bold text-gray-400 uppercase">Items: {formData.item_ids.length}</div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Status</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {paymentStatuses.map(ps => (
                                        <button key={ps.id} type="button" onClick={() => setFormData(p => ({ ...p, payment_status: ps.id }))} className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${formData.payment_status === ps.id ? 'bg-primary-600 border-primary-600 text-white shadow-md' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-primary-300'}`}>
                                            {ps.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={!formData.student || isSaving} className="flex-[2] py-3 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 shadow-lg disabled:opacity-50 transition-all">
                            {isSaving ? 'Processing...' : (formData.id ? 'Update Receipt' : 'Save & Generate Receipt')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default React.memo(CreateReceiptModal);
