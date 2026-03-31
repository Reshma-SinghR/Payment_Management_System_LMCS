import { jsPDF } from 'jspdf';

/**
 * Converts a numeric amount to English words.
 */
export const toWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n) => {
        if ((n = n.toString()).length > 9) return 'overflow';
        let nArray = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!nArray) return '';
        let str = '';
        str += nArray[1] != 0 ? (a[Number(nArray[1])] || b[nArray[1][0]] + ' ' + a[nArray[1][1]]) + 'Crore ' : '';
        str += nArray[2] != 0 ? (a[Number(nArray[2])] || b[nArray[2][0]] + ' ' + a[nArray[2][1]]) + 'Lakh ' : '';
        str += nArray[3] != 0 ? (a[Number(nArray[3])] || b[nArray[3][0]] + ' ' + a[nArray[3][1]]) + 'Thousand ' : '';
        str += nArray[4] != 0 ? (a[Number(nArray[4])] || b[nArray[4][0]] + ' ' + a[nArray[4][1]]) + 'Hundred ' : '';
        str += nArray[5] != 0 ? (str != '' ? 'and ' : '') + (a[Number(nArray[5])] || b[nArray[5][0]] + ' ' + a[nArray[5][1]]) : '';
        return str;
    };

    const amount = Math.floor(num);
    const words = inWords(amount);
    return words ? words + 'Rupees Only' : 'Zero Rupees Only';
};

/*
- **New ViewSets**: Added `AcademicYearViewSet` and `SchoolClassViewSet` to provide full CRUD capabilities for managing academic periods and classes.
- **Summarized Fee Logic**: Added `summarized_items` to the Receipt API, which dynamically groups individual monthly fees into categories with month ranges (e.g., "Tuition Fee (Jan–Mar)").
- **Dashboard Cleanup**: Removed the "Pending" data bar from the Monthly Collections chart as requested, focusing the primary visualization on actual collections.

### Frontend
- **Landscape Receipt Layout**: Redesigned `utils.js` to generate receipts in **Landscape Mode**. This optimized layout fits all information onto a single page and uses a professional, clean aesthetic.
- **Summarized Display**: The receipt now shows grouped fee categories and their respective month ranges instead of long, repetitive monthly lists.
- **Synchronized Preview**: Updated the `Payments.jsx` preview modal to match the new summarized landscape format.
*/
/**
 * Generates a professional PDF receipt matching the reference image.
 */
export const generateReceiptPDF = async (receipt, logoBase64, options = {}) => {
    const { shouldSave = true, shouldOpen = true, format = 'a4', orientation = 'landscape' } = options;

    if (!receipt || !receipt.receipt_no) {
        console.error('Invalid receipt data for PDF generation:', receipt);
        alert('Error: Receipt data is incomplete. Please try again.');
        return;
    }

    const doc = new jsPDF({
        unit: 'pt',
        format: format,
        orientation: orientation
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 45;

    const TEXT_DARK = [10, 10, 10];
    const LINE_COLOR = [180, 180, 180];

    // --- HEADER SECTION ---
    let y = 50;

    // Helper to load image if it's a URL (for Vite assets)
    const loadImage = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg'));
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    };

    // School Logo (Top Left)
    if (logoBase64) {
        let finalLogo = logoBase64;
        if (typeof logoBase64 === 'string' && logoBase64.startsWith('/')) {
            // It's a URL (Vite asset path), try to convert to data URL
            finalLogo = await loadImage(logoBase64);
        }
        if (finalLogo) {
            try {
                // Crest-style logo on the left - increased width, slightly reduced height
                doc.addImage(finalLogo, 'JPEG', margin, y - 25, 160, 90);
            } catch (e) {
                console.warn('Failed to add logo to PDF', e);
            }
        }
    }

    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Lourdes Mata Central School', pageW / 2, y, { align: 'center' });

    y += 18;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('KOVILTHOTTAM, CHAVARA (PO) CBIC AFF 931047', pageW / 2, y, { align: 'center' });

    y += 14;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PHONE 0476-2683401, 8281044713', pageW / 2, y, { align: 'center' });

    y += 40;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FEE RECEIPT', pageW / 2, y, { align: 'center' });

    // Draw underline for FEE RECEIPT
    const titleWidth = doc.getTextWidth('FEE RECEIPT');
    doc.setLineWidth(1);
    doc.line(pageW / 2 - titleWidth / 2, y + 2, pageW / 2 + titleWidth / 2, y + 2);

    y += 35;
    // Underline for title
    doc.setLineWidth(1);
    doc.setDrawColor(20, 20, 20);
    const titleW = doc.getTextWidth('FEE RECEIPT');
    doc.line(pageW / 2 - titleW / 2, y + 4, pageW / 2 + titleW / 2, y + 4);

    // --- STUDENT INFO SECTION ---
    y += 45;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text('Receipt No:', margin, y);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(receipt.receipt_no, margin + 85, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Date:', pageW - margin - 120, y);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(receipt.date, pageW - margin, y, { align: 'right' });

    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Student Name:', margin, y);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(receipt.student_details?.name || '-', margin + 85, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Class:', pageW - margin - 120, y);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(`${receipt.student_details?.student_class || '-'}${receipt.student_details?.division || ''}`, pageW - margin, y, { align: 'right' });

    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Admission No:', margin, y);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(receipt.student_details?.admission_no || '-', margin + 85, y);

    // --- TABLE SECTION ---
    y += 30; // 225

    // Top horizontal line for table header
    doc.setDrawColor(...TEXT_DARK);
    doc.setLineWidth(1);
    doc.line(margin, y, pageW - margin, y);

    y += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    doc.text('PARTICULARS', margin + 15, y);
    doc.text('AMOUNT', pageW - margin - 15, y, { align: 'right' });

    y += 12;
    // Bottom horizontal line for table header
    doc.line(margin, y, pageW - margin, y);

    y += 25; // Initial row position
    doc.setFont('helvetica', 'normal');

    const summarizedItems = receipt.summarized_items || [];
    const printItems = summarizedItems.length > 0 ? summarizedItems : [
        {
            category: receipt.fee_type_summary || receipt.fee_type_details?.name || 'School Fee',
            month_range: receipt.month || '',
            amount: receipt.total_amount
        }
    ];

    printItems.forEach(item => {
        const rangeText = item.month_range ? ` (${item.month_range})` : '';
        doc.text(`${item.category}${rangeText}`, margin + 15, y);
        // Display formatted number
        doc.text(parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), pageW - margin - 15, y, { align: 'right' });
        y += 22;
    });

    // --- TOTALS SECTION ---
    y = Math.max(y + 30, 360);

    // In reference image: No line above GRAND TOTAL, just clear bold text
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('GRAND TOTAL', margin + 15, y);
    doc.text(parseFloat(receipt.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), pageW - margin - 15, y, { align: 'right' });

    y += 35;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const amountWords = toWords(receipt.total_amount);
    doc.text(`(Amount in words: ${amountWords})`, pageW / 2, y, { align: 'center' });

    // --- SIGNATURE SECTION ---
    y = pageH - 70;
    doc.setDrawColor(220, 220, 220); // Very light grey line
    doc.setLineWidth(0.5);
    const sigLineW = 120;

    doc.line(margin + 30, y, margin + 30 + sigLineW, y);
    doc.line(pageW - margin - 30 - sigLineW, y, pageW - margin - 30, y);

    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text('Received By', margin + 30 + (sigLineW / 2), y, { align: 'center' });
    doc.text('Authorized Signature', pageW - margin - 30 - (sigLineW / 2), y, { align: 'center' });

    if (shouldOpen || shouldSave) {
        const isElectron = window.hasOwnProperty('process') && window.process.versions.hasOwnProperty('electron');

        if (isElectron) {
            try {
                const pdfBase64 = doc.output('datauristring').split(',')[1];
                const fileName = `Receipt_${receipt.receipt_no}.pdf`;
                // Use the bridge if defined, otherwise try direct ipcRenderer if contextIsolation is off
                const ipc = window.require ? window.require('electron').ipcRenderer : null;
                if (ipc) {
                    await ipc.invoke('save-and-open-pdf', { base64Data: pdfBase64, fileName });
                } else {
                    // Fallback for standard browser behavior if IPC fails
                    if (shouldOpen) {
                        const blob = doc.output('blob');
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                    }
                    if (shouldSave) {
                        doc.save(fileName);
                    }
                }
            } catch (err) {
                console.error('Electron IPC failed:', err);
                // Fallback
                if (shouldOpen) {
                    const blob = doc.output('blob');
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                }
                if (shouldSave) {
                    doc.save(`Receipt_${receipt.receipt_no}.pdf`);
                }
            }
        } else {
            // Standard Browser Behavior
            if (shouldOpen) {
                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            }
            if (shouldSave) {
                doc.save(`Receipt_${receipt.receipt_no}.pdf`);
            }
        }
    }

    return doc;
};
