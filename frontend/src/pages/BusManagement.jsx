import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Bus, IndianRupee, Save, RefreshCw } from 'lucide-react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const BusManagement = () => {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentBus, setCurrentBus] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        bus_number: '',
        monthly_fee: ''
    });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchBuses();
    }, []);

    const fetchBuses = async () => {
        setLoading(true);
        try {
            const response = await api.get('buses/');
            setBuses(response.data.results || response.data || []);
        } catch (error) {
            console.error('Failed to fetch buses', error);
        }
        setLoading(false);
    };

    const handleOpenModal = (bus = null) => {
        if (bus) {
            setCurrentBus(bus);
            setFormData({
                bus_number: bus.bus_number,
                monthly_fee: bus.monthly_fee
            });
        } else {
            setCurrentBus(null);
            setFormData({
                bus_number: '',
                monthly_fee: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentBus(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (currentBus) {
                await api.put(`buses/${currentBus.id}/`, formData);
            } else {
                await api.post('buses/', formData);
            }
            handleCloseModal();
            fetchBuses();
        } catch (error) {
            console.error('Error saving bus', error);
            alert('Failed to save bus details.');
        }
        setSaving(false);
    };

    const handleDelete = (id) => {
        setDeleteModal({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteModal.id;
        setDeleting(true);
        try {
            await api.delete(`buses/${id}/`);
            fetchBuses();
            setDeleteModal({ isOpen: false, id: null });
        } catch (error) {
            console.error('Error deleting bus', error);
            alert('Failed to delete bus. It might be assigned to students.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bus Management</h1>
                    <p className="text-sm text-gray-500">Manage school bus fleet and monthly transport fees.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-bold"
                >
                    <Plus size={20} />
                    <span>Add New Bus</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <RefreshCw className="animate-spin text-primary-500" size={32} />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {buses.map((bus) => (
                        <div key={bus.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                                        <Bus size={24} />
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenModal(bus)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(bus.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900">{bus.bus_number}</h3>
                                    <div className="mt-2 flex items-center gap-1.5 text-primary-600 font-black text-xl">
                                        <IndianRupee size={18} />
                                        <span>{parseFloat(bus.monthly_fee).toFixed(2)}</span>
                                        <span className="text-[10px] text-gray-400 uppercase tracking-widest ml-1">/ Month</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Transport Fee Setting</span>
                                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest px-2 py-0.5 bg-green-100 rounded-full">Active</span>
                            </div>
                        </div>
                    ))}
                    {buses.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <Bus size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500 font-bold">No buses added yet.</p>
                            <button onClick={() => handleOpenModal()} className="mt-4 text-primary-600 font-black text-sm uppercase tracking-widest hover:underline">+ Add First Bus</button>
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">{currentBus ? 'Edit Bus' : 'Add New Bus'}</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Bus Number / Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Bus 1 or Route A"
                                    value={formData.bus_number}
                                    onChange={(e) => setFormData({ ...formData, bus_number: e.target.value })}
                                    className="w-full border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary-500 outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Monthly Fee (₹)</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        <IndianRupee size={18} />
                                    </div>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.monthly_fee}
                                        onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                                        className="w-full border border-gray-300 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary-500 outline-none transition"
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                                    {currentBus ? 'Update Bus' : 'Save Bus'}
                                </button>
                            </div>
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
                title="Delete Bus Route"
                message="Are you sure you want to delete this bus? This will affect all students assigned to it."
                confirmText="Delete"
                confirmColor="danger"
            />
        </div>
    );
};

export default BusManagement;
