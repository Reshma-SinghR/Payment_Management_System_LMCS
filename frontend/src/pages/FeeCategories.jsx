import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Layers,
    Info,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const FeeCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await api.get('payments/fee-categories/');
            setCategories(response.data.results || response.data);
        } catch (error) {
            console.error('Failed to fetch fee categories', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (category = null) => {
        if (category) {
            setCurrentCategory(category);
            setFormData({ name: category.name, description: category.description || '' });
        } else {
            setCurrentCategory(null);
            setFormData({ name: '', description: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentCategory(null);
        setFormData({ name: '', description: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (currentCategory) {
                await api.put(`payments/fee-categories/${currentCategory.id}/`, formData);
            } else {
                await api.post('payments/fee-categories/', formData);
            }
            fetchCategories();
            handleCloseModal();
        } catch (error) {
            console.error('Failed to save fee category', error);
            alert('Failed to save category. Make sure the name is unique.');
        }
    };

    const handleDelete = (id) => {
        setDeleteModal({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteModal.id;
        setDeleting(true);
        try {
            await api.delete(`payments/fee-categories/${id}/`);
            fetchCategories();
            setDeleteModal({ isOpen: false, id: null });
        } catch (error) {
            console.error('Failed to delete fee category', error);
            alert('Cannot delete category: ' + (error.response?.data?.detail || 'It might be linked to existing payments.'));
        } finally {
            setDeleting(false);
        }
    };

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Fee Categories</h1>
                    <p className="text-[10px] sm:text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Manage School Fee Structures</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 font-black text-sm uppercase tracking-wider"
                >
                    <Plus size={18} />
                    <span>Create Category</span>
                </button>
            </div>

            {/* Quick Stats/Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                        <Layers size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Types</p>
                        <p className="text-lg sm:text-xl font-black text-gray-800">{categories.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 border-l-4 border-l-green-500">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                        <CheckCircle2 size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Status</p>
                        <p className="text-lg sm:text-xl font-black text-gray-800">Operational</p>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-4 sm:p-6 rounded-xl sm:rounded-[2rem] text-white shadow-xl shadow-blue-100 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-3">
                        <Info size={16} className="text-blue-200" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">System Note</p>
                    </div>
                    <p className="text-[10px] sm:text-[11px] mt-2 font-medium leading-relaxed opacity-90">
                        Categories defined here will appear in the Receipt generation list for student payments.
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search categories..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-xl py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Category Name</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Description</th>
                                <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-8 py-6"><div className="h-4 bg-gray-100 rounded w-1/2" /></td>
                                        <td className="px-8 py-6"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>
                                        <td className="px-8 py-6"><div className="h-4 bg-gray-100 rounded w-1/4 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : filteredCategories.map((cat) => (
                                <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <span className="text-sm font-black text-gray-800">{cat.name}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-sm text-gray-500 font-medium">{cat.description || 'No description provided.'}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenModal(cat)}
                                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cat.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredCategories.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="px-8 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                                        No categories found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-800 tracking-tight">
                                {currentCategory ? 'Edit Category' : 'Create New Category'}
                            </h3>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <Plus size={24} className="text-gray-400 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Category Name</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Tuition Fee, Admission Fee"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                                <textarea
                                    rows="3"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief details about this fee type..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition shadow-xl shadow-blue-100"
                            >
                                {currentCategory ? 'Update Category' : 'Save Category'}
                            </button>
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
                title="Delete Fee Category"
                message="Are you sure you want to delete this category? This might fail if it is currently in use."
                confirmText="Delete"
                confirmColor="danger"
            />
        </div>
    );
};

export default FeeCategories;
