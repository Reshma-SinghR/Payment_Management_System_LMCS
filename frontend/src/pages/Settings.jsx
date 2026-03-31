import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, UserCircle, Bell, Shield, Palette, Save, Loader2, CheckCircle, Database, AlertTriangle } from 'lucide-react';
import api from '../services/api';

const Settings = () => {
    const [formData, setFormData] = useState({
        school_name: '',
        address: '',
        phone_number: '',
        email: '',
        principal_name: '',
        academic_year: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [envData, setEnvData] = useState(null);
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const [settingsRes, envRes] = await Promise.all([
                    api.get('settings/'),
                    api.get('system/environment/')
                ]);
                setFormData(settingsRes.data);
                setEnvData(envRes.data);
            } catch (error) {
                console.error('Failed to fetch settings', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setSaved(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put('settings/', formData);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Failed to save settings', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleFactoryReset = async () => {
        const confirm1 = window.confirm("DANGER: This will permanently delete ALL Students, Receipts, and Fee records from the database. Are you absolutely sure?");
        if (!confirm1) return;
        
        const confirm2 = window.prompt("Type 'RESET' to confirm complete data wipe:");
        if (confirm2 !== 'RESET') {
            alert("Reset cancelled.");
            return;
        }

        setResetting(true);
        try {
            await api.post('system/reset/');
            alert("Database has been completely wiped and resetted. The application will now reload.");
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert("Failed to reset database.");
        } finally {
            setResetting(false);
        }
    };

    if (loading) {
        return (
            <div className="h-96 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Settings</h1>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Configure & Personalize Your System</p>
            </div>

            <div className="bg-white rounded-xl sm:rounded-[2rem] p-4 shadow-sm border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-4 min-h-[500px]">
                    {/* Settings Sidebar */}
                    <div className="p-4 sm:p-6 border-b md:border-b-0 md:border-r border-gray-50 flex flex-row md:flex-col gap-2 overflow-x-auto no-scrollbar">
                        <SettingsTab icon={<UserCircle size={18} />} label="School Profile" active />
                        <SettingsTab icon={<Bell size={18} />} label="Notifications" />
                        <SettingsTab icon={<Shield size={18} />} label="Security" />
                        <SettingsTab icon={<Palette size={18} />} label="Appearance" />
                    </div>

                    {/* Settings Content */}
                    <div className="col-span-3 p-6 sm:p-8 md:p-12">
                        <div className="max-w-2xl">
                            <h2 className="text-xl font-black text-gray-800 tracking-tight mb-6">School Profile</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">School Name</label>
                                        <input
                                            type="text"
                                            name="school_name"
                                            value={formData.school_name || ""}
                                            onChange={handleChange}
                                            className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="Enter school name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Principal Name</label>
                                        <input
                                            type="text"
                                            name="principal_name"
                                            value={formData.principal_name || ""}
                                            onChange={handleChange}
                                            className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="Enter principal name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Email Address</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email || ""}
                                            onChange={handleChange}
                                            className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="school@example.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Phone Number</label>
                                        <input
                                            type="text"
                                            name="phone_number"
                                            value={formData.phone_number || ""}
                                            onChange={handleChange}
                                            className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="Contact number"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">School Address</label>
                                        <textarea
                                            name="address"
                                            value={formData.address || ""}
                                            onChange={handleChange}
                                            rows="3"
                                            className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
                                            placeholder="Enter full school address"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    {saved && (
                                        <div className="flex items-center gap-2 text-green-600 text-xs font-bold animate-in fade-in duration-300">
                                            <CheckCircle size={16} />
                                            Settings saved successfully!
                                        </div>
                                    )}
                                </div>
                            </form>

                            {/* DANGER ZONE & ENVIRONMENT */}
                            <div className="mt-12 pt-8 border-t border-gray-100">
                                <h2 className="text-xl font-black text-gray-800 tracking-tight mb-6 flex items-center gap-2">
                                    <Database size={20} className="text-blue-500" />
                                    System Environment
                                </h2>
                                
                                {envData && (
                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 space-y-4 mb-8">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Active Environment</p>
                                                <p className={`text-sm font-bold ${envData.is_production ? 'text-purple-600' : 'text-blue-600'}`}>
                                                    {envData.environment}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Database Target</p>
                                                <p className="text-xs font-mono bg-white px-2 py-1 rounded text-gray-600 border border-gray-200 inline-block max-w-[250px] sm:max-w-md truncate" title={envData.database_path}>
                                                    {envData.database_path}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-sm font-black text-red-600 tracking-tight uppercase flex items-center gap-2 mb-2">
                                        <AlertTriangle size={16} /> Danger Zone
                                    </h3>
                                    <div className="bg-red-50 rounded-xl p-6 border border-red-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div>
                                            <p className="text-sm font-bold text-red-900">Factory Reset Database</p>
                                            <p className="text-xs text-red-700 mt-1">Permanently deletes all student records, receipts, and fee mappings. Structural settings are retained.</p>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={handleFactoryReset}
                                            disabled={resetting}
                                            className="whitespace-nowrap px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-xs uppercase hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {resetting ? <Loader2 className="animate-spin" size={14} /> : <AlertTriangle size={14} />}
                                            {resetting ? 'Wiping Data...' : 'Wipe Database'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SettingsTab = ({ icon, label, active }) => (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer whitespace-nowrap ${active ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
        {icon}
        <span className="text-sm tracking-tight">{label}</span>
    </div>
);

export default Settings;
