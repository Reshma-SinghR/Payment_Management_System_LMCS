import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    Users,
    BarChart3,
    Activity,
    Clock,
    CalendarRange,
    Database,
    Settings,
    LogOut,
    CheckCircle2,
    List,
    UserPlus,
    X,
    Calendar,
    Bus
} from 'lucide-react';
import logo from '../assets/logo.jpeg';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: List, label: 'Fee Categories', path: '/fee-categories' },
        { icon: Calendar, label: 'Academic Years', path: '/academic-years' },
        { icon: FileText, label: 'Recent Receipts', path: '/payments' },
        { icon: Users, label: 'Students', path: '/students' },
        { icon: BarChart3, label: 'Reports', path: '/reports' },
        { icon: Activity, label: 'CCA Management', path: '/cca' },
        { icon: UserPlus, label: 'Promote Class', path: '/promote' },
        { icon: Clock, label: 'Pending Fees', path: '/reports?tab=pending' },
        { icon: CalendarRange, label: 'Monthly Summary', path: '/reports?tab=monthly' },
        { icon: Database, label: 'Backup', path: '/backup' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('auth');
        window.location.href = '/login';
    };

    return (
        <div className={`fixed inset-y-0 left-0 lg:static w-72 h-screen sidebar-gradient text-white flex flex-col shadow-2xl z-40 transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} overflow-hidden`}>
            {/* Mobile Close Button */}
            <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden absolute top-4 right-4 p-2 text-white/60 hover:text-white"
            >
                <X size={20} />
            </button>

            {/* School Branding */}
            <div className="p-8 pb-4 flex flex-col items-center border-b border-navy-700/50">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20 shadow-inner">
                    <img src={logo} alt="School Logo" className="w-12 h-12 object-contain" />
                </div>
                <h1 className="text-sm font-black tracking-[0.2em] text-white text-center uppercase leading-tight">
                    LOURDES MATA CENTRAL SCHOOL
                </h1>
                <p className="text-[10px] text-blue-300/80 font-bold uppercase mt-1 tracking-wider">
                    Payment Management System
                </p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto scrollbar-hide">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-6 py-3.5 rounded-2xl transition-all duration-300 group ${isActive
                                ? 'active-pill font-bold scale-[1.02]'
                                : 'text-blue-100/60 hover:bg-white/5 hover:text-white'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={20} className={isActive ? 'text-white' : 'text-blue-200/40 group-hover:text-blue-200'} />
                                <span className="text-sm tracking-wide">{item.label}</span>
                                {isActive && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]" />}
                            </>
                        )}
                    </NavLink>
                ))}

                <div className="pt-6 mt-6 border-t border-white/5">
                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-6 py-3.5 rounded-2xl transition-all duration-300 group ${isActive
                                ? 'active-pill font-bold'
                                : 'text-blue-100/60 hover:bg-white/5 hover:text-white'
                            }`
                        }
                    >
                        <Settings size={20} className="text-blue-200/40 group-hover:text-blue-200" />
                        <span className="text-sm">Settings</span>
                    </NavLink>
                </div>
            </nav>

            {/* Footer Status */}
            <div className="p-6 bg-black/20 border-t border-white/5 space-y-4">


                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-6 py-3 w-full text-blue-200/50 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 text-sm font-semibold group"
                >
                    <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
