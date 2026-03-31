import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
    const isAuthenticated = localStorage.getItem('auth');
    const [sidebarOpen, setSidebarOpen] = React.useState(false);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex h-screen bg-[#f8fbff] overflow-hidden">
            {/* Sidebar toggle for mobile backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

                <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-8 scroll-smooth">
                    <div className="max-w-[1600px] mx-auto">
                        <Outlet />
                    </div>
                </main>

                {/* Decorative background elements if needed */}
                <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-blue-50/30 blur-[120px] -z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-indigo-50/20 blur-[100px] -z-10 pointer-events-none" />
            </div>
        </div>
    );
};

export default Layout;
