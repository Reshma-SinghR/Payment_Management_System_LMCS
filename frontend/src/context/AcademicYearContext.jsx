import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AcademicYearContext = createContext();

export const AcademicYearProvider = ({ children }) => {
    const [academicYear, setAcademicYear] = useState(
        localStorage.getItem('academic_year')
    );
    const [simulationDate, setSimulationDate] = useState(
        localStorage.getItem('simulation_date') || ''
    );
    const [availableYears, setAvailableYears] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchYears = async () => {
        try {
            const res = await api.get('academic-years/');
            const years = res.data.results || res.data || [];
            setAvailableYears(years);

            // If no year is set or current year is not in available years, pick the most recent active one
            if (!academicYear || !years.find(y => y.name === academicYear)) {
                const activeYear = years.find(y => y.is_active) || years[0];
                if (activeYear) {
                    setAcademicYear(activeYear.name);
                }
            }
        } catch (error) {
            console.error('Failed to fetch academic years', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchYears();
    }, []);

    useEffect(() => {
        localStorage.setItem('academic_year', academicYear);
        window.dispatchEvent(new CustomEvent('academic-year-changed', { detail: academicYear }));
    }, [academicYear]);

    useEffect(() => {
        if (simulationDate) {
            localStorage.setItem('simulation_date', simulationDate);
        } else {
            localStorage.removeItem('simulation_date');
        }
        window.dispatchEvent(new CustomEvent('simulation-date-changed', { detail: simulationDate }));
    }, [simulationDate]);

    return (
        <AcademicYearContext.Provider value={{
            academicYear, setAcademicYear,
            simulationDate, setSimulationDate,
            availableYears, loading, refreshYears: fetchYears
        }}>
            {children}
        </AcademicYearContext.Provider>
    );
};

export const useAcademicYear = () => {
    const context = useContext(AcademicYearContext);
    if (!context) {
        throw new Error('useAcademicYear must be used within an AcademicYearProvider');
    }
    return context;
};
