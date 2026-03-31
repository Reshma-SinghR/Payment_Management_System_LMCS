import React, { useState, useEffect } from 'react';
import { Users, ArrowRight, CheckCircle2, AlertCircle, Search, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { useAcademicYear } from '../context/AcademicYearContext';
import ConfirmModal from '../components/ConfirmModal';

const Promote = () => {
    const { academicYear, availableYears, loading: yearsLoading } = useAcademicYear();
    const [fromYear, setFromYear] = useState(academicYear);
    const [targetYear, setTargetYear] = useState('');
    const [fromClass, setFromClass] = useState('');
    const [students, setStudents] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isPromoting, setIsPromoting] = useState(false);
    const [result, setResult] = useState(null);
    const [classes, setClasses] = useState([]);
    const [startingMonth, setStartingMonth] = useState('April');
    const [startingYear, setStartingYear] = useState(new Date().getFullYear());
    const [keepFees, setKeepFees] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false });

    useEffect(() => {
        setFromYear(academicYear);
    }, [academicYear]);

    useEffect(() => {
        fetchClasses();
    }, [fromYear]);

    useEffect(() => {
        if (fromClass) {
            fetchStudents();
        } else {
            setStudents([]);
        }
    }, [fromClass, fromYear]);

    const fetchClasses = async () => {
        try {
            const res = await api.get('students/', { params: { academic_year: fromYear } });
            const data = res.data.results || res.data || [];
            const uniqueClasses = [...new Set(data.map(s => s.student_class))].filter(Boolean).sort((a, b) => parseInt(a) - parseInt(b));
            setClasses(uniqueClasses);
        } catch (err) {
            console.error('Error fetching classes', err);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await api.get('students/', {
                params: {
                    academic_year: fromYear,
                    student_class: fromClass,
                    status: 'Active'
                }
            });
            const data = res.data.results || res.data || [];
            setStudents(data);
            setSelectedIds(data.map(s => s.id)); // Select all by default
        } catch (err) {
            console.error('Error fetching students', err);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(students.map(s => s.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handlePromote = () => {
        if (!targetYear) {
            alert('Please select a target academic year.');
            return;
        }

        if (selectedIds.length === 0) {
            alert('Please select at least one student.');
            return;
        }

        if (targetYear === fromYear) {
            alert('Target year cannot be the same as the source year.');
            return;
        }

        setDeleteModal({ isOpen: true });
    };

    const confirmPromote = async () => {
        setDeleteModal({ isOpen: false });
        setIsPromoting(true);
        try {
            const res = await api.post('students/promote/', {
                student_ids: selectedIds,
                from_year: fromYear,
                target_year: targetYear,
                starting_month: startingMonth,
                starting_year: startingYear,
                keep_fees: keepFees
            });
            setResult(res.data);
            if (res.data.message) {
                setStudents([]);
                setFromClass('');
            }
        } catch (err) {
            console.error('Promotion failed', err);
            alert('Promotion failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsPromoting(false);
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Class Promotion</h1>
                    <p className="text-gray-500 font-bold mt-1 uppercase text-[10px] tracking-[0.2em]">Bulk academic year transition</p>
                </div>
                <div className="w-full sm:w-auto bg-blue-600 px-6 py-3 rounded-2xl text-white shadow-xl shadow-blue-100 flex items-center justify-center gap-3">
                    <Users size={20} />
                    <span className="font-bold text-sm tracking-tight text-center">Step-by-Step Promotion</span>
                </div>
            </div>

            {/* Selection Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
                <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                    <div className="bg-white p-6 sm:p-8 rounded-xl sm:rounded-[2rem] shadow-sm border border-gray-100 space-y-4 sm:space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">From Academic Year</label>
                            <select
                                value={fromYear}
                                onChange={(e) => setFromYear(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                            >
                                {availableYears.map(y => (
                                    <option key={y.id} value={y.name}>{y.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-center text-blue-400">
                            <ArrowRight size={24} className="rotate-90 lg:rotate-0" />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Academic Year</label>
                            <select
                                value={targetYear}
                                onChange={(e) => setTargetYear(e.target.value)}
                                className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                            >
                                <option value="">-- Select Target Year --</option>
                                {availableYears.filter(y => {
                                    const fromYearObj = availableYears.find(ay => ay.name === fromYear);
                                    return fromYearObj ? y.start_year > fromYearObj.start_year : true;
                                }).map(y => (
                                    <option key={y.id} value={y.name}>{y.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="pt-4 border-t border-gray-50">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Select Class to Promote</label>
                            <select
                                value={fromClass}
                                onChange={(e) => setFromClass(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                            >
                                <option value="">-- Choose Class --</option>
                                {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
                            </select>
                        </div>

                        <div className="pt-6 border-t border-gray-50 space-y-4">
                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Fee Settings (Target Year)</h4>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Calculation Start Month</label>
                                <select
                                    value={startingMonth}
                                    onChange={(e) => setStartingMonth(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-100 transition-all text-xs"
                                >
                                    {["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Calculation Start Year</label>
                                <select
                                    value={startingYear}
                                    onChange={(e) => setStartingYear(parseInt(e.target.value))}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-100 transition-all text-xs"
                                >
                                    {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={keepFees}
                                        onChange={(e) => setKeepFees(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">Carry forward current fees</span>
                            </label>
                        </div>
                    </div>

                    <div className="bg-orange-50 p-6 rounded-xl sm:rounded-[2rem] border border-orange-100 flex gap-4">
                        <AlertCircle className="text-orange-500 shrink-0" size={24} />
                        <div>
                            <h4 className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-1">Important Note</h4>
                            <p className="text-[10px] sm:text-[11px] text-orange-700 leading-relaxed font-bold">
                                Promotion will create new student records for the target year. Previous year records will be preserved.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Student List Panel */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-xl sm:rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[400px] sm:min-h-[500px]">
                        <div className="px-5 sm:px-8 py-4 sm:py-6 bg-gray-50/50 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="text-base sm:text-lg font-black text-gray-800 tracking-tight">
                                    {fromClass ? `Students in Class ${fromClass}` : 'Select a class to view students'}
                                </h3>
                                {students.length > 0 && (
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                        {selectedIds.length} of {students.length} students selected
                                    </p>
                                )}
                            </div>
                            {students.length > 0 && (
                                <button
                                    onClick={handlePromote}
                                    disabled={selectedIds.length === 0 || isPromoting}
                                    className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-green-600 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-green-100 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                                >
                                    {isPromoting ? 'Promoting...' : 'Promote Now'}
                                    {!isPromoting && <ChevronRight size={18} />}
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-x-auto">
                            {students.length > 0 ? (
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-white sticky top-0 z-10">
                                        <tr>
                                            <th className="px-8 py-4 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.length === students.length && students.length > 0}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </th>
                                            <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Admission No</th>
                                            <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Name</th>
                                            <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Class</th>
                                            <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Division</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {students.map((student) => (
                                            <tr
                                                key={student.id}
                                                onClick={() => handleSelectRow(student.id)}
                                                className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${selectedIds.includes(student.id) ? 'bg-blue-50/20' : ''}`}
                                            >
                                                <td className="px-8 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(student.id)}
                                                        onChange={() => { }} // Handled by row click
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-8 py-4 font-mono text-xs font-bold text-gray-500">{student.admission_no}</td>
                                                <td className="px-8 py-4 text-sm font-black text-gray-800">{student.name}</td>
                                                <td className="px-8 py-4 text-sm font-bold text-gray-600">Class {student.student_class}</td>
                                                <td className="px-8 py-4 text-sm font-bold text-gray-500">{student.division}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 py-20">
                                    <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center">
                                        <Search size={32} />
                                    </div>
                                    <p className="text-sm font-bold uppercase tracking-widest">No students found / Select a class</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Modal */}
            {result && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl sm:rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 sm:p-10 text-center space-y-4 sm:space-y-6">
                            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={32} className="sm:w-[48px] sm:h-[48px]" />
                            </div>
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Promotion Complete!</h3>
                                <p className="text-sm sm:text-base text-gray-500 font-medium mt-2">{result.message}</p>
                            </div>

                            {result.errors && result.errors.length > 0 && (
                                <div className="bg-red-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl text-left max-h-40 overflow-y-auto border border-red-100">
                                    <h4 className="text-[10px] font-black text-red-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <AlertCircle size={14} /> Skipped (Already Exists)
                                    </h4>
                                    <ul className="text-[10px] sm:text-[11px] text-red-600 font-bold space-y-1">
                                        {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={() => setResult(null)}
                                className="w-full py-3 sm:py-4 bg-gray-900 text-white rounded-2xl font-black text-xs sm:text-sm hover:bg-gray-800 transition shadow-xl"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Confirm Promotion Modal */}
            <ConfirmModal 
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false })}
                onConfirm={confirmPromote}
                loading={isPromoting}
                title="Confirm Promotion"
                message={`Are you sure you want to promote ${selectedIds.length} students to ${targetYear}?`}
                confirmText="Promote"
                confirmColor="success"
            />
        </div>
    );
};

export default Promote;
