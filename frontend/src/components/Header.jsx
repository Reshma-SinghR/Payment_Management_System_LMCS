import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, User, Receipt, X, Menu, Calendar, FileText, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAcademicYear } from '../context/AcademicYearContext';
import logo from '../assets/logo.jpeg';

const Header = ({ toggleSidebar }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState({ students: [], receipts: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const { academicYear, setAcademicYear, simulationDate, setSimulationDate, availableYears, loading: yearsLoading } = useAcademicYear();
    const [showYearDropdown, setShowYearDropdown] = useState(false);

    const searchRef = React.useRef(null);
    const navigate = useNavigate();

    // Handle clicks outside the search component
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch search results when query changes with debounce
    useEffect(() => {
        const fetchResults = async () => {
            if (!searchQuery.trim()) {
                setResults({ students: [], receipts: [] });
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            try {
                // Determine API base URL. Fallback to localhost if not set in env (handling electron/dev differences).
                const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

                const [studentsRes, receiptsRes] = await Promise.all([
                    axios.get(`${baseUrl}/api/students/?search=${searchQuery}&academic_year=${academicYear}`),
                    axios.get(`${baseUrl}/api/payments/receipts/?search=${searchQuery}&academic_year=${academicYear}`)
                ]);

                setResults({
                    students: studentsRes.data.results ? studentsRes.data.results.slice(0, 5) : studentsRes.data.slice(0, 5),
                    receipts: receiptsRes.data.results ? receiptsRes.data.results.slice(0, 5) : receiptsRes.data.slice(0, 5)
                });
            } catch (error) {
                console.error("Error fetching search results:", error);
                // On error, just clear results
                setResults({ students: [], receipts: [] });
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(() => {
            fetchResults();
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery, academicYear]);

    const handleClearSearch = () => {
        setSearchQuery('');
        setShowDropdown(false);
    };

    const handleResultClick = (path) => {
        navigate(path);
        handleClearSearch();
    };

    return (
        <header className="h-16 sm:h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10 no-print gap-4">
            {/* Mobile Menu Toggle */}
            <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors"
            >
                <Menu size={24} />
            </button>

            {/* Search Bar - Responsive width */}
            <div className="relative flex-1 lg:max-w-md group" ref={searchRef}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                    }}
                    onFocus={() => {
                        if (searchQuery.trim() || results.students.length > 0 || results.receipts.length > 0) {
                            setShowDropdown(true);
                        }
                    }}
                    placeholder="Search Student / Receipt..."
                    className="w-full bg-gray-50 border-none rounded-2xl py-2.5 pl-12 pr-10 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
                {searchQuery && (
                    <button
                        onClick={handleClearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                        <X size={14} />
                    </button>
                )}

                {/* Search Results Dropdown */}
                {showDropdown && searchQuery.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                        {isSearching ? (
                            <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
                        ) : results.students.length === 0 && results.receipts.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">No results found for "{searchQuery}"</div>
                        ) : (
                            <div className="max-h-96 overflow-y-auto">

                                {/* Students Section */}
                                {results.students.length > 0 && (
                                    <div className="py-2">
                                        <div className="px-4 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">Students</div>
                                        {results.students.map(student => (
                                            <div key={`student-${student.id}`} className="border-b border-gray-50 last:border-0 group/student">
                                                {/* Header for student with name/adm */}
                                                <div className="px-4 py-2 flex items-center gap-3 bg-gray-50/30">
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                                        <User size={12} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-[11px] font-bold text-gray-900 truncate">{student.name}</div>
                                                        <div className="text-[10px] text-gray-400">Adm: {student.admission_no}</div>
                                                    </div>
                                                </div>
                                                
                                                {/* Navigation Options */}
                                                <div className="flex bg-white hover:bg-gray-50 transition-colors">
                                                    <div 
                                                        onClick={() => handleResultClick(`/reports?tab=student&search=${student.admission_no}`)}
                                                        className="flex-1 px-4 py-2.5 flex items-center gap-2 cursor-pointer border-r border-gray-100 hover:bg-blue-50/50 transition-colors"
                                                    >
                                                        <FileText size={12} className="text-blue-500" />
                                                        <span className="text-xs font-bold text-gray-600">Student Report</span>
                                                    </div>
                                                    <div 
                                                        onClick={() => handleResultClick(`/students?search=${student.admission_no}&highlight=${student.id}`)}
                                                        className="flex-1 px-4 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-indigo-50/50 transition-colors"
                                                    >
                                                        <Users size={12} className="text-indigo-500" />
                                                        <span className="text-xs font-bold text-gray-600">Students List</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Receipts Section */}
                                {results.receipts.length > 0 && (
                                    <div className="py-2 border-t border-gray-100">
                                        <div className="px-4 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">Receipts</div>
                                        {results.receipts.map(receipt => (
                                            <div
                                                key={`receipt-${receipt.id}`}
                                                onClick={() => handleResultClick('/payments')}
                                                className="px-4 py-3 hover:bg-green-50 cursor-pointer flex items-center gap-3 transition-colors border-l-2 border-transparent hover:border-green-500"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                                                    <Receipt size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-gray-800 truncate">{receipt.receipt_no}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                                        <span className="truncate max-w-[120px]">{receipt.student_name}</span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="font-medium text-green-600">₹{receipt.amount}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4 sm:gap-8">

                {/* Simulation Date Picker */}
                <div className="hidden md:flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200">
                    <Calendar size={14} className="text-orange-500" />
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest leading-none">Simulate Date</span>
                        <input
                            type="date"
                            value={simulationDate || ''}
                            onChange={(e) => setSimulationDate(e.target.value)}
                            className="bg-transparent text-xs font-bold text-orange-800 outline-none w-[110px]"
                        />
                    </div>
                </div>

                {/* Academic Year Selector */}
                <div className="relative">
                    <div
                        onClick={() => setShowYearDropdown(!showYearDropdown)}
                        className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 cursor-pointer hover:bg-white transition-colors"
                    >
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Academic Year:</span>
                        <span className="text-sm font-black text-gray-800">{academicYear}</span>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
                    </div>
                    {showYearDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                            {yearsLoading ? (
                                <div className="px-4 py-2 text-xs text-gray-400 font-bold uppercase tracking-widest animate-pulse">Loading...</div>
                            ) : availableYears.map(year => (
                                <div
                                    key={year.id}
                                    onClick={() => {
                                        setAcademicYear(year.name);
                                        setShowYearDropdown(false);
                                    }}
                                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors ${academicYear === year.name ? 'bg-blue-50 font-bold text-blue-600' : 'text-gray-700'}`}
                                >
                                    {year.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>


                {/* User Profile - Responsive */}
                <div className="flex items-center gap-2 sm:gap-4 sm:pl-8 sm:border-l border-gray-100 cursor-pointer group">
                    <div className="text-right hidden sm:flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase text-gray-400 leading-none mb-0.5">Admin</span>
                        <span className="text-sm font-bold text-gray-800 truncate max-w-[100px] lg:max-w-none">LOURDES MATA CENTRAL SCHOOL</span>
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-all border border-gray-100 relative">
                        <img
                            src={logo}
                            alt="School Logo"
                            className="w-full h-full object-contain"
                        />
                        <div className="absolute bottom-1 right-1 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-green-500 border-2 border-white rounded-full" />
                    </div>
                    <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
                </div>
            </div>
        </header>
    );
};

export default Header;
