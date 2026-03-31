import React from 'react';
import { Edit, Trash2, FileText } from 'lucide-react';

const StudentsTable = React.memo(({ students, onGenerateReceiptPDF, onOpenModal, onDelete, highlightId }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admission No</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class / Div</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus No</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus Stop</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus Fee</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CCA Fee</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tuition Fee</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {students.length > 0 ? (
                            students.map((student) => {
                                const isHighlighted = highlightId && student.id === highlightId;
                                return (
                                    <tr
                                        key={student.id}
                                        className={`text-sm transition-all duration-500 ${isHighlighted ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset ring-opacity-100' : 'hover:bg-gray-50'}`}
                                    >
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap font-medium text-gray-900">{student.admission_no}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-700">{student.name}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500">
                                            {student.student_class} - {student.division}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500">{student.phone_number}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500">{student.bus_number_details?.bus_number || student.bus_number || '-'}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-xs">{student.bus_stop || '-'}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">₹{student.bus_fee || '0.00'}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-900 font-semibold text-blue-600">₹{student.cca_fee || '0.00'}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">₹{student.tuition_fee || '0.00'}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => onGenerateReceiptPDF(student)}
                                                title="Download Receipt PDF"
                                                className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition flex items-center justify-center"
                                            >
                                                <FileText size={16} />
                                            </button>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${student.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => onOpenModal(student)} className="text-blue-600 hover:text-blue-900 mx-2">
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => onDelete(student.id)} className="text-red-600 hover:text-red-900 ml-2">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="12" className="px-6 py-4 text-center text-gray-500">No students found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default StudentsTable;
