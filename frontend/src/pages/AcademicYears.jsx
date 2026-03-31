import React, { useState } from 'react';
import { Plus, Calendar, Edit2, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import api from '../services/api';
import { useAcademicYear } from '../context/AcademicYearContext';

const AcademicYears = () => {
    const { availableYears, loading, refreshYears } = useAcademicYear();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentYear, setCurrentYear] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        start_year: new Date().getFullYear(),
        end_year: new Date().getFullYear() + 1,
        start_date: '',
        end_date: '',
        is_active: false
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
    const [deleting, setDeleting] = useState(false);


    const handleOpenModal = (year = null) => {
        if (year) {
            setCurrentYear(year);
            setFormData({
                name: year.name,
                start_year: year.start_year,
                end_year: year.end_year,
                start_date: year.start_date,
                end_date: year.end_date,
                is_active: year.is_active
            });
        } else {
            setCurrentYear(null);
            const nextYear = new Date().getFullYear();
            setFormData({
                name: `${nextYear}-${(nextYear + 1).toString().slice(-2)}`,
                start_year: nextYear,
                end_year: nextYear + 1,
                start_date: `${nextYear}-04-01`,
                end_date: `${nextYear + 1}-03-31`,
                is_active: false
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentYear(null);
        setSubmitError('');
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Frontend duplicate check
        const isDuplicate = availableYears.some(year => 
            year.name.toLowerCase() === formData.name.toLowerCase() && 
            (!currentYear || year.id !== currentYear.id)
        );
        
        if (isDuplicate) {
            setSubmitError(`Academic year "${formData.name}" already exists locally.`);
            return;
        }

        setSubmitting(true);
        setSubmitError('');
        try {
            if (currentYear) {
                await api.put(`academic-years/${currentYear.id}/`, formData);
            } else {
                await api.post('academic-years/', formData);
            }
            refreshYears();
            handleCloseModal();
        } catch (error) {
            console.error('Failed to save academic year', error);
            const data = error.response?.data;
            let errorMessage = 'Failed to save academic year';
            
            if (data) {
                if (typeof data === 'object') {
                    // Specific field errors (like 'name': ['...'])
                    errorMessage = Object.entries(data)
                        .map(([key, val]) => {
                            const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
                            const msg = Array.isArray(val) ? val[0] : val;
                            return `${fieldName}: ${msg}`;
                        })
                        .join('\n');
                } else if (data.detail) {
                    errorMessage = data.detail;
                }
            }
            setSubmitError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };



    const handleDelete = (id) => {
        setDeleteModal({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteModal.id;
        setDeleting(true);
        try {
            await api.delete(`academic-years/${id}/`);
            refreshYears();
            setDeleteModal({ isOpen: false, id: null });
        } catch (error) {
            console.error('Failed to delete academic year', error);
            const errorMessage = error.response?.data?.detail || 'Possibly in use or database error.';
            alert('Cannot delete: ' + errorMessage);
            refreshYears();
        } finally {
            setDeleting(false);
        }
    };


    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Academic Years</h1>
                    <p className="text-[10px] sm:text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Manage School Cycles</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition shadow-lg"
                >
                    <Plus size={18} />
                    <span>Add Year</span>
                </button>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Year Name</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Range</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                                <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="4" className="p-10 text-center animate-pulse text-gray-400">Loading...</td></tr>
                            ) : availableYears.map(year => (
                                <tr key={year.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-8 py-6 font-black text-gray-800">{year.name}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                            <Calendar size={14} />
                                            {year.start_date} to {year.end_date}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {year.is_active ? (
                                            <span className="flex items-center gap-1.5 text-green-600 text-[10px] font-black bg-green-50 px-3 py-1 rounded-full w-fit">
                                                <CheckCircle2 size={12} /> ACTIVE
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-gray-400 text-[10px] font-black bg-gray-50 px-3 py-1 rounded-full w-fit">
                                                <Clock size={12} /> INACTIVE
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleOpenModal(year)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(year.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 bg-gray-50 border-b flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-800">{currentYear ? 'Edit Year' : 'Add Year'}</h3>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-gray-200 rounded-full rotate-45"><Plus size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {submitError && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold whitespace-pre-line">
                                    {submitError}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Name (2024-25)</label>
                                    <input required disabled={submitting} type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border rounded-xl font-bold disabled:opacity-50" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Active</label>
                                    <div className="flex items-center h-[46px]">
                                        <input type="checkbox" disabled={submitting} checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Start Year</label>
                                    <input required disabled={submitting} type="number" value={formData.start_year} onChange={e => setFormData({ ...formData, start_year: parseInt(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border rounded-xl font-bold disabled:opacity-50" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">End Year</label>
                                    <input required disabled={submitting} type="number" value={formData.end_year} onChange={e => setFormData({ ...formData, end_year: parseInt(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border rounded-xl font-bold disabled:opacity-50" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Start Date</label>
                                    <input required disabled={submitting} type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border rounded-xl font-bold text-xs disabled:opacity-50" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">End Date</label>
                                    <input required disabled={submitting} type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border rounded-xl font-bold text-xs disabled:opacity-50" />
                                </div>
                            </div>
                            <button type="submit" disabled={submitting} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest disabled:opacity-50">{submitting ? 'Saving...' : 'Save Academic Year'}</button>
                        </form>

                    </div>
                </div>
            )}
            {/* Confirm Delete Modal */}
            <ConfirmModal 
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                loading={deleting}
                title="Delete Academic Year"
                message="Are you sure you want to delete this academic year? This will fail if students are linked to this year."
                confirmText="Delete"
                confirmColor="danger"
            />
        </div>
    );
};

export default AcademicYears;
