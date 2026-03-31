import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Download, Search, Calendar, FileText, User, Users, BarChart2, AlertCircle, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import api from '../services/api';
import { useAcademicYear } from '../context/AcademicYearContext';
import schoolLogo from '../assets/logo.jpeg';

// ─── Shared PDF Helpers ────────────────────────────────────────────────────

const getBase64FromUrl = (url) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
});

/**
 * buildReportPDF — shared PDF generator for all report sections.
 * @param {object} opts
 *   title        - Report title string
 *   subtitle     - Optional subtitle (e.g. class/division heading)
 *   filters      - Object of active filters to display
 *   columns      - Array of { label, key, align? ('left'|'right'), width? } 
 *   rows         - Array of data objects
 *   totalsRow    - Optional object { label, values: { [key]: string } }
 *   academicYear - String
 *   filename     - PDF filename (no extension)
 */
const buildReportPDF = async ({ title, subtitle, filters, columns, rows, totalsRow, academicYear, filename }) => {
    const logoBase64 = await getBase64FromUrl(schoolLogo);
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 36;
    const contentW = pageW - margin * 2;

    const NAVY = [17, 47, 135];
    const AMBER = [250, 204, 21];
    const LIGHT = [241, 245, 249];
    const BORDER = [203, 213, 225];
    const TEXT_DARK = [30, 41, 59];
    const TEXT_MID = [71, 85, 105];
    const TEXT_LIGHT = [100, 116, 139];
    const GREEN = [21, 128, 61];
    const RED = [185, 28, 28];

    let pageNum = 1;

    const drawHeader = () => {
        // Navy band
        doc.setFillColor(...NAVY);
        doc.rect(0, 0, pageW, 108, 'F');
        // Amber stripe
        doc.setFillColor(...AMBER);
        doc.rect(0, 106, pageW, 3, 'F');

        // Logo
        if (logoBase64) doc.addImage(logoBase64, 'JPEG', margin, 14, 44, 44);

        const tx = margin + 56;
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('LOURDES MATA CENTRAL SCHOOL', tx, 32);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(186, 209, 255);
        doc.text('KOVILTHOTTAM, CHAVARN (PD)  |  CBIC AFF 931047', tx, 45);
        doc.text('PHONE: 0476-2683401, 8281044713', tx, 56);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...AMBER);
        doc.text(title.toUpperCase(), tx, 72);

        if (subtitle) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(186, 209, 255);
            doc.text(subtitle, tx, 84);
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(186, 209, 255);
        doc.text(`Academic Year: ${academicYear}`, tx, subtitle ? 96 : 84);

        return 120;
    };

    const drawFilterBar = (y) => {
        const activeFilters = Object.entries(filters).filter(([, v]) => v && v !== '');
        if (activeFilters.length === 0) return y;

        doc.setFillColor(...LIGHT);
        doc.setDrawColor(...BORDER);
        doc.roundedRect(margin, y, contentW, 26, 4, 4, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...TEXT_MID);
        let fx = margin + 10;
        doc.text('Filters:', fx, y + 17);
        fx += 36;
        doc.setFont('helvetica', 'normal');
        activeFilters.forEach(([k, v]) => {
            const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ': ' + v;
            doc.text(label, fx, y + 17);
            fx += doc.getTextWidth(label) + 16;
        });
        return y + 34;
    };

    const drawFooter = (pageNumber, totalPages) => {
        const fy = pageH - 24;
        doc.setFillColor(...LIGHT);
        doc.rect(0, fy - 6, pageW, 30, 'F');
        doc.setFillColor(...AMBER);
        doc.rect(0, fy - 6, pageW, 2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...TEXT_LIGHT);
        doc.text(`Generated: ${new Date().toLocaleString()}`, margin, fy + 10);
        doc.text('Lourdes Mata Central School  |  KOVILTHOTTAM, CHAVARN (PD)', pageW / 2, fy + 10, { align: 'center' });
        doc.text(`Page ${pageNumber}`, pageW - margin, fy + 10, { align: 'right' });
    };

    // ── Compute column widths ──────────────────────────────────────────────
    const totalFlexCols = columns.filter(c => !c.width).length;
    const fixedWidth = columns.filter(c => c.width).reduce((s, c) => s + c.width, 0);
    const flexWidth = (contentW - fixedWidth) / Math.max(totalFlexCols, 1);
    const colWidths = columns.map(c => c.width || flexWidth);
    const colX = [];
    let cx = margin;
    colWidths.forEach(w => { colX.push(cx); cx += w; });

    // ── Draw table ─────────────────────────────────────────────────────────
    let y = drawHeader();
    y = drawFilterBar(y + 6);
    y += 10;

    const ROW_H = 20;
    const HEADER_H = 22;

    const drawTableHeader = () => {
        doc.setFillColor(...NAVY);
        doc.rect(margin, y, contentW, HEADER_H, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        columns.forEach((col, i) => {
            const tx = col.align === 'right' ? colX[i] + colWidths[i] - 4 : colX[i] + 4;
            doc.text(col.label, tx, y + 15, { align: col.align === 'right' ? 'right' : 'left' });
        });
        y += HEADER_H;
    };

    drawTableHeader();

    rows.forEach((row, idx) => {
        // Compute row height based on text wrapping
        let maxRowH = ROW_H;
        columns.forEach((col, i) => {
            const val = String(row[col.key] ?? '-');
            const splitText = doc.splitTextToSize(val, colWidths[i] - 8);
            const neededH = splitText.length * 10 + 10; // 10 check for font size + padding
            if (neededH > maxRowH) maxRowH = neededH;
        });

        if (y + maxRowH > pageH - 50) {
            drawFooter(pageNum, '?');
            doc.addPage();
            pageNum++;
            y = drawHeader();
            y += 6;
            drawTableHeader();
        }

        if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y, contentW, maxRowH, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        columns.forEach((col, i) => {
            const val = String(row[col.key] ?? '-');
            doc.setTextColor(...TEXT_DARK);

            // Color-coded status
            if (col.key === 'status') {
                const isPaid = val === 'Paid';
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...(isPaid ? GREEN : RED));
            } else {
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...TEXT_DARK);
            }

            const tx = col.align === 'right' ? colX[i] + colWidths[i] - 4 : colX[i] + 4;
            const splitText = doc.splitTextToSize(val, colWidths[i] - 8);
            doc.text(splitText, tx, y + 13, { align: col.align === 'right' ? 'right' : 'left' });
        });

        doc.setDrawColor(...BORDER);
        doc.line(margin, y + maxRowH, margin + contentW, y + maxRowH);
        y += maxRowH;
    });

    // ── Totals row ─────────────────────────────────────────────────────────
    if (totalsRow) {
        if (y + 26 > pageH - 50) {
            drawFooter(pageNum, '?');
            doc.addPage();
            pageNum++;
            y = drawHeader() + 6;
        }
        doc.setFillColor(...NAVY);
        doc.rect(margin, y, contentW, 26, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(totalsRow.label || 'TOTAL', margin + 4, y + 18);
        columns.forEach((col, i) => {
            if (totalsRow.values?.[col.key]) {
                const tx = col.align === 'right' ? colX[i] + colWidths[i] - 4 : colX[i] + 4;
                doc.text(totalsRow.values[col.key], tx, y + 18, { align: col.align === 'right' ? 'right' : 'left' });
            }
        });
        y += 26;
    }

    if (rows.length === 0) {
        doc.setTextColor(...TEXT_LIGHT);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('No data found for the selected filters.', pageW / 2, y + 20, { align: 'center' });
    }

    drawFooter(pageNum, pageNum);
    doc.save(`${filename}.pdf`);
};

// ─── Reports Component ─────────────────────────────────────────────────────

const Reports = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('collection');
    const [filters, setFilters] = useState({
        start_date: '',
        end_date: '',
        student_class: '',
        division: '',
        fee_type: '',
        search: '',
        academic_year: '',
        bus_id: '',
        cca_activity_id: ''
    });
    const { academicYear, simulationDate } = useAcademicYear();
    const [classes, setClasses] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [feeTypes, setFeeTypes] = useState([]);
    const [stats, setStats] = useState({ today_collection: 0, month_collection: 0, pending_amount: 0 });
    const [selectedClass, setSelectedClass] = useState('');
    const [buses, setBuses] = useState([]);
    const [ccaActivities, setCcaActivities] = useState([]);

    const fetchInitialData = async () => {
        try {
            api.get(`students/?academic_year=${academicYear}`).then(res => {
                const students = res.data.results || res.data || [];
                const uniqueClasses = [...new Set(students.map(s => s.student_class))].filter(Boolean).sort((a, b) => parseInt(a) - parseInt(b));
                const uniqueDivisions = [...new Set(students.map(s => s.division))].filter(Boolean).sort();
                setClasses(uniqueClasses);
                setDivisions(uniqueDivisions);
            });
            api.get('payments/fee-categories/').then(res => setFeeTypes(res.data.results || res.data || []));
            api.get(`buses/?academic_year__name=${academicYear}`).then(res => setBuses(res.data.results || res.data || []));
            api.get(`payments/cca-activities/?academic_year=${academicYear}`).then(res => setCcaActivities(res.data.results || res.data || []));
        } catch (error) { console.error('Error fetching initial data', error); }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('reports/dashboard/', {
                params: { ...filters, simulation_date: simulationDate || '' }
            });
            setStats(res.data);
        } catch (error) { console.error('Error fetching stats', error); }
    };

    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        const search = params.get('search');

        if (tab && tabs.find(t => t.id === tab)) {
            setActiveTab(tab);
        }
        if (search) {
            setFilters(prev => ({ ...prev, search }));
        }
    }, [location.search]);

    useEffect(() => {
        setFilters(prev => ({ ...prev, academic_year: academicYear }));
        fetchInitialData();
        window.addEventListener('payment-updated', fetchInitialData);
        window.addEventListener('payment-updated', fetchStats);
        return () => {
            window.removeEventListener('payment-updated', fetchInitialData);
            window.removeEventListener('payment-updated', fetchStats);
        };
    }, [academicYear, simulationDate]);

    useEffect(() => {
        if (filters.academic_year) {
            fetchStats();
        }
    }, [filters, simulationDate]);

    const handleReset = () => {
        setFilters({
            start_date: '',
            end_date: '',
            student_class: '',
            division: '',
            fee_type: '',
            search: '',
            academic_year: academicYear,
            bus_id: '',
            cca_activity_id: ''
        });
        setSelectedClass('');
    };

    const tabs = [
        { id: 'collection', name: 'Date-wise Report', icon: Calendar },
        { id: 'fee-type', name: 'Fee Type Report', icon: FileText },
        { id: 'student', name: 'Student Report', icon: User },
        { id: 'class-wise', name: 'Class-wise Report', icon: Users },
        { id: 'monthly', name: 'Monthly Summary', icon: BarChart2 },
        { id: 'pending', name: 'Pending Report', icon: AlertCircle },
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Reports Module</h1>
                <button onClick={fetchInitialData} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition" title="Refresh">
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 no-print">
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-2 sm:p-3 bg-blue-50 text-blue-600 rounded-full"><Calendar size={20} className="sm:w-6 sm:h-6" /></div>
                    <div>
                        <p className="text-[10px] sm:text-sm font-medium text-gray-500">Today's Collection</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{parseFloat(stats.today_collection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-2 sm:p-3 bg-green-50 text-green-600 rounded-full"><BarChart2 size={20} className="sm:w-6 sm:h-6" /></div>
                    <div>
                        <p className="text-[10px] sm:text-sm font-medium text-gray-500">This Month</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{parseFloat(stats.month_collection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 sm:col-span-2 lg:col-span-1">
                    <div className="p-2 sm:p-3 bg-red-50 text-red-600 rounded-full"><AlertCircle size={20} className="sm:w-6 sm:h-6" /></div>
                    <div>
                        <p className="text-[10px] sm:text-sm font-medium text-gray-500">Total Pending</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{parseFloat(stats.pending_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 no-print">
                <h3 className="text-[10px] sm:text-sm font-black text-gray-400 mb-4 uppercase tracking-[0.2em]">Advanced Filters</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">From</label>
                        <input type="date" value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })} className="border border-gray-200 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">To</label>
                        <input type="date" value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })} className="border border-gray-200 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Class</label>
                        <select value={filters.student_class} onChange={e => setFilters({ ...filters, student_class: e.target.value })} className="border border-gray-200 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full bg-white">
                            <option value="">All Classes</option>
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fee Type</label>
                        <select value={filters.fee_type} onChange={e => setFilters({ ...filters, fee_type: e.target.value })} className="border border-gray-200 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full bg-white">
                            <option value="">All Fees</option>
                            {feeTypes.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Division</label>
                        <select value={filters.division} onChange={e => setFilters({ ...filters, division: e.target.value })} className="border border-gray-200 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full bg-white">
                            <option value="">All Divisions</option>
                            {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col col-span-2 sm:col-span-1 lg:col-span-1 gap-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input type="text" placeholder="Name/Adm No..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bus</label>
                        <select value={filters.bus_id} onChange={e => setFilters({ ...filters, bus_id: e.target.value })} className="border border-gray-200 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full bg-white">
                            <option value="">All Buses</option>
                            {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CCA</label>
                        <select value={filters.cca_activity_id} onChange={e => setFilters({ ...filters, cca_activity_id: e.target.value })} className="border border-gray-200 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full bg-white">
                            <option value="">All CCAs</option>
                            {ccaActivities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end col-span-2">
                        <button onClick={handleReset} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition flex items-center justify-center gap-2">
                            <RefreshCw size={14} /> Reset
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-64 flex-shrink-0 no-print">
                    <nav className="flex lg:flex-col gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-200 overflow-x-auto no-scrollbar">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all whitespace-nowrap min-w-max lg:min-w-0 ${activeTab === tab.id
                                        ? 'bg-primary-50 text-primary-700 shadow-sm border border-primary-100'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'}`}
                                >
                                    <Icon size={18} className={activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'} />
                                    <span className="tracking-tight">{tab.name}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex-1 print-area">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
                        {activeTab === 'collection' && <DateWiseCollection filters={filters} academicYear={academicYear} />}
                        {activeTab === 'fee-type' && <FeeTypeReport filters={filters} academicYear={academicYear} />}
                        {activeTab === 'student' && <StudentReport filters={filters} academicYear={academicYear} />}
                        {activeTab === 'class-wise' && <ClassWiseReport filters={filters} academicYear={academicYear} />}
                        {activeTab === 'monthly' && <MonthlySummary filters={filters} academicYear={academicYear} />}
                        {activeTab === 'pending' && <PendingReport filters={filters} academicYear={academicYear} selectedClass={selectedClass} setSelectedClass={setSelectedClass} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Date-wise Collection ──────────────────────────────────────────────────

const DateWiseCollection = ({ filters, academicYear }) => {
    const [data, setData] = useState({ receipts: [], total_amount: 0 });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!academicYear) return;
            setLoading(true);
            try {
                const res = await api.get('reports/collection/', { params: filters });
                setData(res.data);
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        fetchData();
    }, [filters]);

    const handleExportPDF = async () => {
        const rows = (data.receipts || []).map(r => ({
            receipt_no: r.receipt_no,
            date: r.date,
            student: r.student_name,
            class_div: `${r.class}-${r.division}`,
            fee_type: r.fee_type,
            status: r.status,
            amount: `Rs.${parseFloat(r.amount).toFixed(2)}`,
        }));
        const total = parseFloat(data.total_amount || 0).toFixed(2);
        await buildReportPDF({
            title: 'Date-wise Collection Report',
            filters: {
                'From Date': filters.start_date, 'To Date': filters.end_date,
                'Class': filters.student_class, 'Division': filters.division,
                'Fee Type': filters.fee_type,
            },
            columns: [
                { label: 'Receipt No', key: 'receipt_no', width: 90 },
                { label: 'Date', key: 'date', width: 72 },
                { label: 'Student', key: 'student' },
                { label: 'Class', key: 'class_div', width: 52 },
                { label: 'Fee Type', key: 'fee_type', width: 72 },
                { label: 'Status', key: 'status', width: 52 },
                { label: 'Amount', key: 'amount', width: 80, align: 'right' },
            ],
            rows,
            totalsRow: { label: 'TOTAL COLLECTION', values: { amount: `Rs.${total}` } },
            academicYear,
            filename: `DateWise_Collection_${academicYear}`,
        });
    };

    return (
        <div className="space-y-4">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-bold text-gray-800">Date-wise Collection Report</h2>
                <button onClick={handleExportPDF} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg no-print" title="Export PDF">
                    <Download size={20} />
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-3 text-left">Receipt No</th>
                            <th className="px-6 py-3 text-left">Date</th>
                            <th className="px-6 py-3 text-left">Student</th>
                            <th className="px-6 py-3 text-left">Class</th>
                            <th className="px-6 py-3 text-left">Fee Type</th>
                            <th className="px-6 py-3 text-left">Status</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.receipts && data.receipts.length > 0 ? data.receipts.map((r, i) => (
                            <tr key={i} className="text-sm hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-black text-gray-900">{r.receipt_no}</td>
                                <td className="px-6 py-4 text-gray-500 font-medium">{r.date}</td>
                                <td className="px-6 py-4 font-bold text-gray-700">{r.student_name}</td>
                                <td className="px-6 py-4 text-gray-500 font-black">{r.class}-{r.division}</td>
                                <td className="px-6 py-4 text-gray-500 font-medium">{r.fee_type}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${r.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{r.status}</span>
                                </td>
                                <td className="px-6 py-4 text-right font-black text-gray-900">₹{parseFloat(r.amount).toFixed(2)}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No receipts found for the selected period.</td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
                        <tr>
                            <td colSpan="6" className="px-6 py-4 text-right">Total Collection:</td>
                            <td className="px-6 py-4 text-right text-primary-700 text-lg">₹{parseFloat(data.total_amount || 0).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

// ─── Fee Type Report ───────────────────────────────────────────────────────

const FeeTypeReport = ({ filters, academicYear }) => {
    const [summary, setSummary] = useState([]);
    const [students, setStudents] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [totalMatching, setTotalMatching] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!academicYear) return;
            setLoading(true);
            try {
                const res = await api.get('reports/fee-types/', { params: filters });
                setSummary(res.data.summary || []);
                setStudents(res.data.students || []);
                setHasMore(res.data.has_more || false);
                setTotalMatching(res.data.total_matching_students || 0);
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        fetchData();
    }, [filters]);

    const handleExportPDF = async () => {
        if (students.length === 0) return;

        const rows = students.map(s => ({
            name: (s.name || '').replace(/&/g, 'and'),
            adm: s.admission_no,
            class: s.class,
            fee: s.categories.map(c => `${(c.name || '').replace(/&/g, 'and')}: Rs.${(c.paid + c.owed).toFixed(0)}`).join(', '),
            status: s.status,
            date: s.payment_date || (s.status === 'Unpaid' ? 'Pending' : '-'),
            paid: `Rs.${parseFloat(s.total_paid).toFixed(2)}`,
            balance: `Rs.${parseFloat(s.total_balance).toFixed(2)}`
        }));

        await buildReportPDF({
            title: 'Student-wise Detailed Fee Report',
            subtitle: `Detailed Summary — ${academicYear}`,
            filters: {
                'From': filters.start_date,
                'To': filters.end_date,
                'Class': filters.student_class,
                'Bus': filters.bus_id,
                'CCA': filters.cca_activity_id
            },
            columns: [
                { label: 'Student Name', key: 'name' },
                { label: 'Adm No', key: 'adm', width: 50 },
                { label: 'Class', key: 'class', width: 50 },
                { label: 'Fee Breakdown', key: 'fee' },
                { label: 'Status', key: 'status', width: 55 },
                { label: 'Date', key: 'date', width: 65 },
                { label: 'Total Paid', key: 'paid', width: 70, align: 'right' },
                { label: 'Balance', key: 'balance', width: 70, align: 'right' },
            ],
            rows,
            academicYear,
            filename: `StudentFeeDtl_${academicYear}`,
        });
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-bold text-gray-800 uppercase tracking-tight text-sm">Fee Type Summary</h2>
                <div className="flex gap-2">
                    <button onClick={handleExportPDF} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg no-print transition-colors" title="Export Student List PDF">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-6">
                {summary.map((d, i) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3 group-hover:text-primary-600 transition-colors border-b pb-2">{d.fee_type}</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500">Total Students Paid</span>
                                <span className="text-lg font-black text-gray-900">{d.total_students}</span>
                            </div>
                            <div className="flex justify-between items-end pt-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Total Collected</span>
                                <span className="text-2xl font-black text-primary-600 tracking-tighter">₹{parseFloat(d.total_amount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detailed Student List */}
            <div className="px-6 pb-6">
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Student-wise Fee Details</h3>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-gray-400">
                                {hasMore ? `Showing 1000 of ${totalMatching} Records` : `${students.length} Records Found`}
                            </span>
                        </div>
                    </div>
                    {hasMore && (
                        <div className="bg-orange-50 px-6 py-3 border-b border-orange-100 flex items-start gap-3">
                            <div className="mt-0.5 text-orange-600"><AlertCircle size={16} /></div>
                            <div>
                                <p className="text-xs font-bold text-orange-800 uppercase tracking-wider">Results Truncated</p>
                                <p className="text-xs text-orange-700 mt-0.5 font-medium">To keep the application fast, only the first 1000 grouped records are displayed. Please refine your filters to see more specific details.</p>
                            </div>
                        </div>
                    )}
                    {loading ? (
                        <div className="p-20 text-center flex flex-col items-center gap-3">
                            <RefreshCw className="animate-spin text-primary-600" size={32} />
                            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Fetching Records...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-white">
                                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">
                                        <th className="px-6 py-4">Student</th>
                                        <th className="px-6 py-4">Breakdown</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Date</th>
                                        <th className="px-6 py-4 text-right">Owed</th>
                                        <th className="px-6 py-4 text-right">Paid</th>
                                        <th className="px-6 py-4 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {students.map((s, idx) => (
                                        <tr key={idx} className="hover:bg-primary-50/20 transition-colors text-xs font-semibold group">
                                            <td className="px-6 py-4">
                                                <div className="font-black text-gray-900">{s.name}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.admission_no} • {s.class}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {s.categories.map((cat, ci) => (
                                                        <div key={ci} className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 flex flex-col gap-0.5">
                                                            <span className="text-[8px] font-black text-gray-400 uppercase leading-none">{cat.name}</span>
                                                            <span className={`text-[10px] font-bold ${cat.status === 'Paid' ? 'text-green-600' : 'text-orange-500'}`}>₹{cat.paid.toFixed(0)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${s.status === 'Paid' ? 'bg-green-100 text-green-700' :
                                                    s.status === 'Partial' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-400 font-bold">{s.payment_date || '-'}</td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-500">₹{s.total_owed.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-black text-green-600">₹{s.total_paid.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-black text-gray-900 border-l border-gray-50">
                                                <span className={s.total_balance > 0 ? 'text-red-600' : 'text-gray-400'}>₹{s.total_balance.toFixed(2)}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {students.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                                                No specific student payment records match these filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Student Report ────────────────────────────────────────────────────────

const StudentReport = ({ filters, academicYear }) => {
    const [studentData, setStudentData] = useState(null);
    const [studentList, setStudentList] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'


    useEffect(() => {
        // Stay in current view mode but refresh data
        if (viewMode === 'detail' && filters.search) {
            fetchStudentData(filters.search);
        } else if (viewMode === 'list') {
            fetchStudentList();
        }
    }, [filters, viewMode]);

    // When filters.search changes and we are in list mode, just fetch the filtered list.
    // We don't want to jump to detail mode automatically anymore.


    const fetchStudentList = async () => {
        if (!academicYear) return;
        setLoading(true);
        try {
            const res = await api.get('reports/student-list/', { params: filters });
            setStudentList(res.data);
            setError('');
        } catch {
            setError('Failed to fetch student list.');
        }
        setLoading(false);
    };

    const fetchStudentData = async (searchQuery) => {
        setLoading(true);
        try {
            const res = await api.get('reports/student/', { params: { search: searchQuery, academic_year: filters.academic_year } });
            setStudentData(res.data);
            setError('');
        } catch {
            setError('Student not found. Please try Admission No or full name.');
            setStudentData(null);
        }
        setLoading(false);
    };

    const handleExportPDF = async () => {
        const logoBase64 = await getBase64FromUrl(schoolLogo);
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 36;
        const contentW = pageW - margin * 2;

        const NAVY = [17, 47, 135];
        const AMBER = [250, 204, 21];
        const TEXT_DARK = [30, 41, 59];
        const TEXT_MID = [71, 85, 105];
        const TEXT_LIGHT = [100, 116, 139];

        const drawHeader = () => {
            doc.setFillColor(...NAVY);
            doc.rect(0, 0, pageW, 100, 'F');
            doc.setFillColor(...AMBER);
            doc.rect(0, 98, pageW, 2, 'F');

            if (logoBase64) doc.addImage(logoBase64, 'JPEG', margin, 15, 40, 40);
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14); doc.setFont('helvetica', 'bold');
            doc.text('LOURDES MATA CENTRAL SCHOOL', margin + 50, 35);
            doc.setFontSize(9); doc.setFont('helvetica', 'normal');
            doc.text('STUDENT PAYMENT REPORT', margin + 50, 50);
            doc.setFontSize(8); doc.setTextColor(200, 220, 255);
            doc.text(`Academic Year: ${academicYear} | Generated: ${new Date().toLocaleDateString()}`, margin + 50, 62);
            return 120;
        };

        let y = drawHeader();

        // --- STUDENT PROFILE HEADER ---
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(margin, y, contentW, 75, 4, 4, 'F');
        doc.setTextColor(...TEXT_DARK);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text(studentData.student_name, margin + 15, y + 25);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text(`Adm No: ${studentData.admission_no} | Class: ${studentData.class}-${studentData.division}`, margin + 15, y + 42);
        doc.text(`Phone: ${studentData.phone_number || '-'}`, margin + 15, y + 55);

        // CCA & Bus on Right
        doc.setFont('helvetica', 'bold');
        doc.text('Activity Details:', margin + contentW - 140, y + 25);
        doc.setFont('helvetica', 'normal');
        doc.text(`Bus: ${studentData.bus_number || 'N/A'} (${studentData.bus_stop || 'N/A'})`, margin + contentW - 140, y + 37);
        const ccaText = studentData.cca_activities?.length > 0 ? studentData.cca_activities.join(', ') : 'None';
        const splitCCA = doc.splitTextToSize(`CCA: ${ccaText}`, 140);
        doc.text(splitCCA, margin + contentW - 140, y + 49);

        y += 95;

        // --- FEE SETTINGS SUMMARY ---
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
        doc.text('FIXED MONTHLY FEE SETTINGS', margin, y);
        y += 15;
        const feeBoxW = (contentW - 20) / 3;
        const feeSettings = [
            { l: 'TUITION FEE', v: studentData.tuition_fee_monthly },
            { l: 'BUS FEE', v: studentData.bus_fee_monthly },
            { l: 'CCA FEE', v: studentData.cca_fee_monthly }
        ];
        feeSettings.forEach((f, i) => {
            const bx = margin + (feeBoxW + 10) * i;
            doc.setDrawColor(220, 230, 240);
            doc.roundedRect(bx, y, feeBoxW, 35, 2, 2, 'D');
            doc.setFontSize(6); doc.setTextColor(...TEXT_LIGHT);
            doc.text(f.l, bx + feeBoxW / 2, y + 12, { align: 'center' });
            doc.setFontSize(9); doc.setTextColor(...TEXT_DARK); doc.setFont('helvetica', 'bold');
            doc.text(`Rs.${parseFloat(f.v).toFixed(2)}`, bx + feeBoxW / 2, y + 26, { align: 'center' });
        });
        y += 55;

        // --- ANNUAL SUMMARY BOXES ---
        const s = studentData.annual_summary;
        const boxes = [
            { label: 'ANNUAL OWED', val: s.total_owed, color: [71, 85, 105] },
            { label: 'ANNUAL PAID', val: s.total_paid, color: [22, 163, 74] },
            { label: 'PENDING DUES', val: s.due_balance, color: [220, 38, 38] }
        ];

        boxes.forEach((box, i) => {
            const bx = margin + (feeBoxW + 10) * i;
            doc.setFillColor(250, 251, 253);
            doc.setDrawColor(230, 235, 245);
            doc.roundedRect(bx, y, feeBoxW, 50, 3, 3, 'FD');
            doc.setFontSize(7); doc.setTextColor(100, 116, 139);
            doc.text(box.label, bx + feeBoxW / 2, y + 18, { align: 'center' });
            doc.setFontSize(11); doc.setTextColor(...box.color); doc.setFont('helvetica', 'bold');
            doc.text(`Rs.${parseFloat(box.val).toFixed(2)}`, bx + feeBoxW / 2, y + 38, { align: 'center' });
        });
        y += 75;

        // --- BREAKDOWN TABLE ---
        doc.setFontSize(10); doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold');
        doc.text('MONTHLY FEE BREAKDOWN', margin, y);
        y += 18;

        const cols = [
            { l: 'MONTH', w: 100 },
            { l: 'FEE CATEGORY', w: 150 },
            { l: 'OWED', w: 90, a: 'right' },
            { l: 'PAID', w: 90, a: 'right' },
            { l: 'BALANCE', w: 90, a: 'right' }
        ];

        const drawTableHeader = (posY) => {
            doc.setFillColor(...NAVY);
            doc.rect(margin, posY, contentW, 20, 'F');
            doc.setTextColor(255, 255, 255); doc.setFontSize(7);
            let curX = margin;
            cols.forEach(c => {
                doc.text(c.l, c.a === 'right' ? curX + c.w - 5 : curX + 5, posY + 13, { align: c.a === 'right' ? 'right' : 'left' });
                curX += c.w;
            });
            return posY + 20;
        };

        y = drawTableHeader(y);

        studentData.monthly_breakdown.forEach((m, mIdx) => {
            const rowCount = Math.max(m.fees.length, 1);
            const rowH = rowCount * 15 + 10;

            if (y + rowH > pageH - 40) {
                doc.addPage();
                y = drawHeader() + 20;
                y = drawTableHeader(y);
            }

            doc.setFillColor(...(mIdx % 2 === 0 ? [255, 255, 255] : [248, 250, 252]));
            doc.rect(margin, y, contentW, rowH, 'F');
            doc.setDrawColor(241, 245, 249);
            doc.line(margin, y, margin + contentW, y);

            doc.setTextColor(...TEXT_DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
            doc.text(m.display_month, margin + 5, y + 15);
            if (m.is_due) {
                doc.setFontSize(6); doc.setTextColor(220, 38, 38);
                doc.text('DUE', margin + 5, y + 25);
            }

            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...TEXT_MID);
            m.fees.forEach((f, fIdx) => {
                const fy = y + 15 + (fIdx * 15);
                doc.text(f.category, margin + 105, fy);
                doc.text(f.owed.toFixed(2), margin + 100 + 150 + 90 - 5, fy, { align: 'right' });
                doc.text(f.paid.toFixed(2), margin + 100 + 150 + 180 - 5, fy, { align: 'right' });

                if (f.balance > 0) doc.setTextColor(220, 38, 38);
                doc.text(f.balance.toFixed(2), margin + 100 + 150 + 270 - 5, fy, { align: 'right' });
                doc.setTextColor(...TEXT_MID);
            });
            y += rowH;
        });

        // --- RECEIPT HISTORY TABLE ---
        y += 40;
        if (y + 100 > pageH - 40) { doc.addPage(); y = drawHeader() + 20; }

        doc.setFontSize(10); doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold');
        doc.text('PAYMENT HISTORY (RECEIPTS)', margin, y);
        y += 18;

        const histCols = [
            { l: 'DATE', w: 80 },
            { l: 'RECEIPT NO', w: 100 },
            { l: 'FEE TYPE', w: 150 },
            { l: 'STATUS', w: 100 },
            { l: 'AMOUNT', w: 90, a: 'right' }
        ];

        doc.setFillColor(...NAVY);
        doc.rect(margin, y, contentW, 20, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(7);
        let hX = margin;
        histCols.forEach(c => {
            doc.text(c.l, c.a === 'right' ? hX + c.w - 5 : hX + 5, y + 13, { align: c.a === 'right' ? 'right' : 'left' });
            hX += c.w;
        });
        y += 20;

        if (!studentData.history || studentData.history.length === 0) {
            doc.setTextColor(...TEXT_LIGHT); doc.setFont('helvetica', 'italic');
            doc.text('No payment history found.', pageW / 2, y + 20, { align: 'center' });
        } else {
            studentData.history.forEach((h, hIdx) => {
                if (y + 20 > pageH - 40) { doc.addPage(); y = drawHeader() + 20; }
                doc.setFillColor(...(hIdx % 2 === 0 ? [255, 255, 255] : [248, 250, 252]));
                doc.rect(margin, y, contentW, 20, 'F');
                doc.setTextColor(...TEXT_DARK); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);

                let curHX = margin;
                doc.text(h.date, curHX + 5, y + 13); curHX += 80;
                doc.setFont('helvetica', 'bold');
                doc.text(h.receipt_no, curHX + 5, y + 13); curHX += 100;
                doc.setFont('helvetica', 'normal');
                doc.text(h.fee_type, curHX + 5, y + 13); curHX += 150;

                const isPaid = h.status === 'Paid';
                doc.setTextColor(isPaid ? 22 : 185, isPaid ? 128 : 28, isPaid ? 61 : 28);
                doc.text(h.status, curHX + 5, y + 13); curHX += 100;

                doc.setTextColor(...TEXT_DARK);
                doc.text(h.amount.toFixed(2), curHX + 90 - 5, y + 13, { align: 'right' });
                y += 20;
            });
        }

        doc.save(`Detailed_Report_${studentData.admission_no}.pdf`);
    };

    const handleExportListPDF = async () => {
        const rows = studentList.map(s => ({
            adm: s.admission_no,
            name: s.name,
            class: `${s.class}-${s.division}`,
            bus: s.bus_route,
            status: s.status,
            owed: `Rs.${s.total_owed.toFixed(2)}`,
            paid: `Rs.${s.total_paid.toFixed(2)}`,
            balance: s.balance > 0 ? `Rs.${s.balance.toFixed(2)}` : 'Nil'
        }));

        await buildReportPDF({
            title: 'Student Payment Status List',
            subtitle: `Filtered Report — ${academicYear}`,
            filters: {
                'Class': filters.student_class,
                'Bus': filters.bus_id,
                'CCA': filters.cca_activity_id
            },
            columns: [
                { label: 'Adm No', key: 'adm', width: 60 },
                { label: 'Student Name', key: 'name' },
                { label: 'Class', key: 'class', width: 60 },
                { label: 'Bus', key: 'bus', width: 80 },
                { label: 'Status', key: 'status', width: 60 },
                { label: 'Owed', key: 'owed', width: 70, align: 'right' },
                { label: 'Paid', key: 'paid', width: 70, align: 'right' },
                { label: 'Balance', key: 'balance', width: 70, align: 'right' },
            ],
            rows,
            academicYear,
            filename: `StudentList_Status_${academicYear}`,
        });
    };

    if (loading) return <div className="p-20 text-center flex flex-col items-center gap-3"><RefreshCw className="animate-spin text-primary-600" size={32} /><p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Loading...</p></div>;
    if (error) return <div className="p-12 text-center text-red-500 bg-red-50 rounded-xl m-6 border border-red-100">{error}</div>;

    if (viewMode === 'list') {
        return (
            <div className="space-y-4">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h2 className="font-bold text-gray-800">Student Payment Status List</h2>
                        <p className="text-xs text-gray-500 mt-1">Showing {studentList.length} active students matching the filters</p>
                    </div>
                    <button onClick={handleExportListPDF} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg no-print transition-colors" title="Export List PDF">
                        <Download size={20} />
                    </button>
                </div>
                <div className="overflow-x-auto p-4 sm:p-6 pb-12 pt-0">
                    <table className="min-w-full divide-y divide-gray-100 border border-gray-100 shadow-sm rounded-xl overflow-hidden">
                        <thead className="bg-white">
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Class</th>
                                <th className="px-6 py-4">Bus Route</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Owed</th>
                                <th className="px-6 py-4 text-right">Paid</th>
                                <th className="px-6 py-4 text-right">Balance</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {studentList.map(s => (
                                <tr key={s.id} className="hover:bg-primary-50/20 transition-colors text-sm group">
                                    <td className="px-6 py-4">
                                        <div className="font-black text-gray-900 group-hover:text-primary-700 transition-colors">{s.name}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.admission_no}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-medium">{s.class}-{s.division}</td>
                                    <td className="px-6 py-4 text-gray-500 text-xs">{s.bus_route}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${s.status === 'Paid' ? 'bg-green-100 text-green-700' :
                                            s.status === 'Partial' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-500">₹{s.total_owed.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-green-600">₹{s.total_paid.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-black">
                                        <span className={s.balance > 0 ? 'text-red-600' : 'text-gray-400'}>
                                            ₹{s.balance.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => { setViewMode('detail'); fetchStudentData(s.admission_no); }}
                                            className="px-3 py-1.5 bg-gray-50 text-gray-700 text-xs font-bold rounded-lg hover:bg-primary-600 hover:text-white transition-all shadow-sm group-hover:shadow-md"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {studentList.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                                        No students found matching the current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (!studentData) return null;

    return (
        <div className="space-y-6 p-6 bg-gray-50/30">
            {/* Detailed Header */}
            <div className="flex items-center gap-2 mb-2 no-print">
                <button onClick={() => setViewMode('list')} className="text-sm font-bold text-gray-500 hover:text-primary-600 transition flex items-center gap-1">
                    ← Back to List
                </button>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-6">
                <div className="flex gap-5">
                    <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600">
                        <User size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 leading-tight">{studentData.student_name}</h2>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm font-bold text-gray-400">
                            <span className="flex items-center gap-1"><FileText size={14} /> ADM: {studentData.admission_no}</span>
                            <span className="flex items-center gap-1"><Users size={14} /> CLASS: {studentData.class}-{studentData.division}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-bold shadow-lg shadow-primary-200 text-sm no-print">
                        <Download size={18} /> Detailed Report (PDF)
                    </button>
                    {studentData.bus_number && (
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Bus Route</p>
                            <p className="text-sm font-bold text-gray-700">{studentData.bus_number} — {studentData.bus_stop}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Annual Owed</p>
                    <p className="text-xl font-black text-gray-900">₹{parseFloat(studentData.annual_summary.total_owed).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-green-600">Annual Paid</p>
                    <p className="text-xl font-black text-green-600">₹{parseFloat(studentData.annual_summary.total_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-red-600">Pending Dues</p>
                    <p className="text-xl font-black text-red-600">₹{parseFloat(studentData.annual_summary.due_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-primary-600 p-5 rounded-2xl shadow-lg shadow-primary-100">
                    <p className="text-[10px] font-black text-primary-100 uppercase tracking-widest mb-1">CCA Enrolled</p>
                    <p className="text-sm font-bold text-white truncate">
                        {studentData.cca_activities?.length > 0 ? studentData.cca_activities.join(', ') : 'None'}
                    </p>
                </div>
            </div>

            {/* Monthly Fee Breakdown Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-black text-gray-800 uppercase tracking-wide text-sm">Monthly Fee Breakdown</h3>
                    <div className="flex items-center gap-4 text-[10px] font-bold">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Due Months</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Future Months</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-white">
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">
                                <th className="px-6 py-4">Month</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4 text-right">Owed</th>
                                <th className="px-6 py-4 text-right">Paid</th>
                                <th className="px-6 py-4 text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {studentData.monthly_breakdown.map((month, idx) => (
                                <tr key={idx} className={`${month.is_due ? 'bg-red-50/10' : ''} hover:bg-gray-50 transition-colors`}>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${month.is_due ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-blue-400'}`} />
                                            <span className="font-black text-gray-900 text-sm">{month.display_month}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1.5">
                                            {month.fees.map((fee, fIdx) => (
                                                <div key={fIdx} className="flex justify-between items-center group">
                                                    <span className="text-xs font-bold text-gray-500 min-w-[120px]">{fee.category}</span>
                                                    <div className="flex gap-4">
                                                        <span className="text-[10px] font-bold text-gray-400">Rs.{fee.owed.toFixed(2)}</span>
                                                        <span className={`text-[10px] font-bold ${fee.is_paid ? 'text-green-600' : 'text-orange-500'}`}>
                                                            {fee.is_paid ? 'Full Paid' : `Paid: ${fee.paid.toFixed(2)}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {month.fees.length === 0 && <span className="text-xs italic text-gray-400">No active fees for this month</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right align-top font-bold text-gray-700">₹{month.total_owed.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right align-top font-bold text-green-600">₹{month.total_paid.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right align-top">
                                        <span className={`font-black text-sm ${month.balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                            ₹{month.balance.toFixed(2)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Existing Payment History */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-black text-gray-800 uppercase tracking-wide text-sm">Recent Transactions (Academic Year)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                        <tbody className="divide-y divide-gray-100">
                            {studentData.history?.map((h, i) => (
                                <tr key={i} className="hover:bg-primary-50/20 transition-colors">
                                    <td className="px-6 py-4 font-black">{h.receipt_no}</td>
                                    <td className="px-6 py-4 text-gray-500 font-medium">{h.date}</td>
                                    <td className="px-6 py-4 text-gray-500 font-bold">{h.fee_type}</td>
                                    <td className="px-6 py-4 text-gray-500 font-black">{h.month}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${h.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{h.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-gray-900">₹{parseFloat(h.amount).toFixed(2)}</td>
                                </tr>
                            ))}
                            {studentData.history?.length === 0 && (
                                <tr><td colSpan="6" className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No transactions found for this year.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ─── Class-wise Report ─────────────────────────────────────────────────────

const ClassWiseReport = ({ filters, academicYear }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await api.get('reports/classes/', { params: filters });
                setData(res.data);
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        fetchData();
    }, [filters]);

    // Dynamic class/division heading
    const classLabel = filters.student_class ? `Class: ${filters.student_class}` : 'All Classes';
    const divLabel = filters.division ? `Division: ${filters.division}` : 'All Divisions';
    const headingText = `${classLabel}  |  ${divLabel}`;

    const handleExportPDF = async () => {
        const rows = data.map(d => ({
            class: `Class ${d.class}`,
            paid_count: String(d.paid_count),
            unpaid_count: String(d.unpaid_count),
            total_paid: `Rs.${parseFloat(d.total_paid || 0).toFixed(2)}`,
        }));
        const grandTotal = data.reduce((s, d) => s + parseFloat(d.total_paid || 0), 0);
        await buildReportPDF({
            title: 'Class-wise Collection Summary',
            subtitle: headingText,
            filters: { 'Class': filters.student_class, 'Division': filters.division },
            columns: [
                { label: 'Class', key: 'class' },
                { label: 'Paid Count', key: 'paid_count', width: 100, align: 'right' },
                { label: 'Unpaid Count', key: 'unpaid_count', width: 110, align: 'right' },
                { label: 'Total Paid', key: 'total_paid', width: 120, align: 'right' },
            ],
            rows,
            totalsRow: { label: 'GRAND TOTAL', values: { total_paid: `Rs.${grandTotal.toFixed(2)}` } },
            academicYear,
            filename: `ClassWise_Report_${academicYear}`,
        });
    };

    return (
        <div className="space-y-4">
            <div className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="font-extrabold text-gray-900 tracking-tight text-lg">Class-wise Collection Summary</h2>
                    <p className="text-sm font-semibold text-primary-600 mt-0.5">{headingText}</p>
                </div>
                <button onClick={handleExportPDF} className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl no-print transition-all" title="Export PDF">
                    <Download size={20} />
                </button>
            </div>
            {loading ? (
                <div className="flex flex-col justify-center items-center py-20 gap-3">
                    <RefreshCw className="animate-spin text-primary-500" size={32} />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Aggregating Data...</p>
                </div>
            ) : (
                <div className="overflow-x-auto p-4 space-y-8">
                    {/* Class Summary Table */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Class-wise Aggregates</h3>
                        <table className="min-w-full divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                            <thead className="bg-gray-50/50">
                                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                    <th className="px-6 py-5 text-left">Class</th>
                                    <th className="px-6 py-5 text-left">Paid Count</th>
                                    <th className="px-6 py-5 text-left">Unpaid Count</th>
                                    <th className="px-6 py-5 text-right">Total Paid Collection</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-50">
                                {data.map((d, i) => (
                                    <tr key={i} className="text-sm hover:bg-primary-50/30 transition-colors">
                                        <td className="px-6 py-5 font-black text-gray-800">Class {d.class}</td>
                                        <td className="px-6 py-5">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-100">{d.paid_count}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100">{d.unpaid_count}</span>
                                        </td>
                                        <td className="px-6 py-5 text-right font-black text-gray-900 text-base">
                                            <span className="text-[10px] text-gray-400 font-bold mr-1 align-top uppercase">INR</span>
                                            {parseFloat(d.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                                {data.length === 0 && (
                                    <tr><td colSpan="4" className="px-8 py-16 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No class-wise data matched filters.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Detailed Student List (Only visible when bus or cca filtered) */}
                    {(filters.bus_id || filters.cca_activity_id) && data.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                                <Users size={14} className="text-primary-600" />
                                Filtered Student List
                            </h3>
                            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-primary-600">
                                        <tr className="text-[10px] font-bold text-white uppercase tracking-widest">
                                            <th className="px-6 py-4 text-left">Admission No</th>
                                            <th className="px-6 py-4 text-left">Student Name</th>
                                            <th className="px-6 py-4 text-left">Class-Div</th>
                                            <th className="px-6 py-4 text-left">Bus Route</th>
                                            <th className="px-6 py-4 text-left">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-50">
                                        {(data[0]?.student_details || []).map((s, idx) => (
                                            <tr key={idx} className="text-xs hover:bg-gray-50">
                                                <td className="px-6 py-3 font-black text-gray-900">{s.admission_no}</td>
                                                <td className="px-6 py-3 font-bold text-gray-700">{s.name}</td>
                                                <td className="px-6 py-3 text-gray-500">{s.student_class}-{s.division}</td>
                                                <td className="px-6 py-3 text-gray-500 font-medium">{s.bus_number}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full font-black uppercase text-[9px] tracking-widest ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {s.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {(data[0]?.student_details || []).length === 0 && (
                                            <tr><td colSpan="5" className="p-8 text-center text-gray-400 italic">No matching students found in these classes.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Monthly Summary ───────────────────────────────────────────────────────

const MonthlySummary = ({ filters, academicYear }) => {
    const [data, setData] = useState([]);

    useEffect(() => {
        api.get('reports/monthly/', { params: filters }).then(res => setData(res.data)).catch(console.error);
    }, [filters]);

    const handleExportPDF = async () => {
        const rows = data.map(d => ({
            month: d.month,
            total_collection: `Rs.${parseFloat(d.total_collection).toFixed(2)}`,
        }));
        const grandTotal = data.reduce((s, d) => s + parseFloat(d.total_collection || 0), 0);
        await buildReportPDF({
            title: 'Monthly Revenue Summary',
            filters: { 'Academic Year': academicYear },
            columns: [
                { label: 'Month', key: 'month' },
                { label: 'Total Collection', key: 'total_collection', align: 'right' },
            ],
            rows,
            totalsRow: { label: 'ANNUAL TOTAL', values: { total_collection: `Rs.${grandTotal.toFixed(2)}` } },
            academicYear,
            filename: `Monthly_Summary_${academicYear}`,
        });
    };

    return (
        <div className="space-y-4">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-bold text-gray-800">Monthly Revenue Summary</h2>
                <button onClick={handleExportPDF} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg no-print" title="Export PDF">
                    <Download size={20} />
                </button>
            </div>
            <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {data.map((d, i) => (
                        <div key={i} className="bg-white border rounded-xl p-4 shadow-sm text-center">
                            <p className="text-sm font-bold text-gray-500 uppercase mb-1">{d.month}</p>
                            <p className="text-2xl font-black text-gray-900">₹{parseFloat(d.total_collection).toFixed(2)}</p>
                        </div>
                    ))}
                    {data.length === 0 && <div className="col-span-full p-8 text-center text-gray-400">No monthly data available yet.</div>}
                </div>
            </div>
        </div>
    );
};

// ─── Pending Report ────────────────────────────────────────────────────────

const PendingReport = ({ filters, academicYear, selectedClass, setSelectedClass }) => {
    const navigate = useNavigate();
    const { academicYear: contextYear, simulationDate } = useAcademicYear();
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);

    useEffect(() => {
        fetchData();
        window.addEventListener('payment-updated', fetchData);
        return () => window.removeEventListener('payment-updated', fetchData);
    }, [selectedClass, filters, simulationDate]);

    const fetchData = async () => {
        if (!contextYear) return;
        try {
            const res = await api.get('reports/pending/', {
                params: {
                    ...filters,
                    class: selectedClass,
                    simulation_date: simulationDate
                }
            });
            if (!selectedClass) setClasses(res.data);
            else setStudents(res.data);
        } catch (e) { console.error(e); }
    };

    const handleExportPDF = async () => {
        const rows = students.map(s => ({
            student_name: s.student_name,
            admission_no: s.admission_no,
            pending_months: s.pending_months || '-',
            pending_amount: `Rs.${parseFloat(s.pending_amount).toFixed(2)}`,
        }));
        const grandTotal = students.reduce((s, st) => s + parseFloat(st.pending_amount || 0), 0);
        await buildReportPDF({
            title: `Pending Dues — Class ${selectedClass}`,
            filters: { 'Class': selectedClass },
            columns: [
                { label: 'Student Name', key: 'student_name' },
                { label: 'Admission No', key: 'admission_no', width: 100 },
                { label: 'Pending Months', key: 'pending_months' },
                { label: 'Total Owed', key: 'pending_amount', width: 100, align: 'right' },
            ],
            rows,
            totalsRow: { label: 'TOTAL PENDING', values: { pending_amount: `Rs.${grandTotal.toFixed(2)}` } },
            academicYear,
            filename: `Pending_Class_${selectedClass}_${academicYear}`,
        });
    };

    if (!selectedClass) {
        return (
            <div className="p-4 sm:p-6 space-y-4">
                <h2 className="font-bold text-gray-800 mb-4">Pending Dues Grouped by Class</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {classes.map((c, i) => (
                        <div key={i} onClick={() => setSelectedClass(c.class)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:border-red-300 hover:shadow-md transition group">
                            <h3 className="text-xl font-black text-gray-900 mb-2">Class {c.class}</h3>
                            <div className="flex justify-between items-end">
                                <span className="text-red-600 font-bold text-lg">{c.unpaid_count} Pending</span>
                                <span className="text-gray-400 text-sm group-hover:text-primary-600">View List →</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedClass('')} className="text-red-700 hover:underline text-sm font-bold no-print">← Back</button>
                    <h2 className="font-bold text-red-900 text-lg">Class {selectedClass} — Pending List</h2>
                </div>
                <button onClick={handleExportPDF} className="p-2 text-red-600 hover:bg-red-100 rounded-lg no-print" title="Export PDF">
                    <Download size={20} />
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-3 text-left">Student Name</th>
                            <th className="px-6 py-3 text-left">Admission No</th>
                            <th className="px-6 py-3 text-left">Months Pending</th>
                            <th className="px-6 py-3 text-right">Total Owed</th>
                            <th className="px-6 py-3 text-right no-print">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {students.map((s, i) => (
                            <tr key={i} className="text-sm hover:bg-red-50/30">
                                <td className="px-6 py-4 font-bold text-gray-900">{s.student_name}</td>
                                <td className="px-6 py-4 text-gray-500">{s.admission_no}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {s.pending_months ? (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase">{s.pending_months}</span>
                                        ) : <span className="text-xs text-green-600 font-bold uppercase tracking-widest">Cleared</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-red-600 font-black text-right">₹{parseFloat(s.pending_amount).toFixed(2)}</td>
                                <td className="px-6 py-4 text-right no-print">
                                    <button
                                        onClick={() => navigate(`/payments?studentId=${s.student_id}&feeIds=${(s.mapping_ids || []).join(',')}`)}
                                        className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
                                    >Pay</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Reports;
