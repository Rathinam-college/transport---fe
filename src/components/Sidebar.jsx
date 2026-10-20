import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Database, ClipboardList, Menu, X, Layers, Shield, LogOut, FileText, Wrench, Users } from 'lucide-react';

import favicon from '../assets/favicon.svg';
import RathinamTextLogo from '../assets/RathinamTextLogo';

const getInitialThemeName = (storedTheme) => {
    if (storedTheme === 'custom') return 'Mercury Glass';
    if (storedTheme === 'dark-glass') return 'Dark Glass';
    if (storedTheme === 'rathinam-light') return 'Rathinam Light';
    if (storedTheme === 'rathinam-dark') return 'Rathinam Dark';
    if (storedTheme === 'rathinam-3d') return 'Rathinam 3D';
    return 'Dark Default';
};

const getInitialThemeBase = (storedTheme) => {
    if (storedTheme === 'rathinam-light' || storedTheme === 'custom') return 'light';
    return 'dark';
};

const Sidebar = () => {
    const location = useLocation();
    const storedTheme = localStorage.getItem('pt_theme');
    
    const [openGroup, setOpenGroup] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [themeName, setThemeName] = useState(getInitialThemeName(storedTheme));
    const [theme, setTheme] = useState(getInitialThemeBase(storedTheme));

    useEffect(() => {
        if (isCollapsed) {
            document.body.classList.add('sidebar-collapsed');
        } else {
            document.body.classList.remove('sidebar-collapsed');
        }
    }, [isCollapsed]);

    useEffect(() => {
        if (storedTheme) {
            document.body.classList.add(`theme-${storedTheme}`);
        }
    }, [storedTheme]);

    const handleToggleGroup = (groupName) => {
        if (isCollapsed) return;
        setOpenGroup(prev => prev === groupName ? null : groupName);
    };

    const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

    const closeMobileMenu = () => setMobileMenuOpen(false);

    const toggleThemeCycle = () => {
        const body = document.body;
        const themes = ['theme-custom', 'theme-dark-glass', 'theme-rathinam-light', 'theme-rathinam-dark', 'theme-rathinam-3d'];
        const currentTheme = themes.find(t => body.classList.contains(t));

        body.classList.remove(...themes);

        if (!currentTheme) {
            body.classList.add('theme-custom');
            localStorage.setItem('pt_theme', 'custom');
            setThemeName('Mercury Glass');
            setTheme('light');
        } else if (currentTheme === 'theme-custom') {
            body.classList.add('theme-dark-glass');
            localStorage.setItem('pt_theme', 'dark-glass');
            setThemeName('Dark Glass');
            setTheme('dark');
        } else if (currentTheme === 'theme-dark-glass') {
            body.classList.add('theme-rathinam-light');
            localStorage.setItem('pt_theme', 'rathinam-light');
            setThemeName('Rathinam Light');
            setTheme('light');
        } else if (currentTheme === 'theme-rathinam-light') {
            body.classList.add('theme-rathinam-dark');
            localStorage.setItem('pt_theme', 'rathinam-dark');
            setThemeName('Rathinam Dark');
            setTheme('dark');
        } else if (currentTheme === 'theme-rathinam-dark') {
            body.classList.add('theme-rathinam-3d');
            localStorage.setItem('pt_theme', 'rathinam-3d');
            setThemeName('Rathinam 3D');
            setTheme('dark');
        } else {
            localStorage.setItem('pt_theme', 'dark');
            setThemeName('Dark Default');
            setTheme('dark');
        }
    };

    return (
        <>
            <button className={`mobile-sidebar-toggle ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <span className="icon">{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</span>
            </button>

            {mobileMenuOpen && <div className="sidebar-overlay" onClick={closeMobileMenu}></div>}

            <nav className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header relative" style={{ padding: isCollapsed ? '1.5rem 0' : '1.5rem 1rem', display: 'flex', justifyContent: 'center' }}>
                    <div 
                        onClick={() => { 
                            if (!isCollapsed) setOpenGroup(null);
                            setIsCollapsed(!isCollapsed); 
                        }} 
                        style={{ cursor: 'pointer', display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', alignItems: 'center', gap: isCollapsed ? '4px' : '12px', width: '100%', justifyContent: isCollapsed ? 'center' : 'flex-start' }}
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        <img src={favicon} alt="Logo" style={{ width: '45px', height: '45px', flexShrink: 0 }} />
                        {isCollapsed ? (
                            <div className="animate-fade-in mt-1">
                                <RathinamTextLogo width="45px" fillPrimary={theme === 'light' ? '#71307e' : '#a25bb1'} />
                            </div>
                        ) : (
                            <div className="flex flex-col animate-fade-in" style={{ alignItems: 'flex-start' }}>
                                <RathinamTextLogo width="80px" fillPrimary={theme === 'light' ? '#71307e' : '#a25bb1'} />
                                <div className="mt-1 leading-tight text-left">
                                    <div className="font-bold text-slate-200 tracking-wider hover:text-white transition-colors" style={{ fontSize: '0.65rem' }}>TRANSPORT</div>
                                    <div className="text-slate-400 font-medium tracking-widest hover:text-slate-300 transition-colors" style={{ fontSize: '0.5rem' }}>DEPARTMENT</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="sidebar-scrollable custom-scrollbar">
                    <ul className="sidebar-menu">
                        {!isCollapsed && <li className="menu-heading">Main Navigation</li>}

                        <li>
                            <Link to="/" onClick={closeMobileMenu} className={isActive('/')} title="Dashboard">
                                <span className="icon"><Activity size={18} /></span> <span className="nav-text">Dashboard</span>
                            </Link>
                        </li>

                        <li>
                            <Link to="/summary" onClick={closeMobileMenu} className={isActive('/summary')} title="Executive Summary">
                                <span className="icon"><FileText size={18} /></span> <span className="nav-text">Summary</span>
                            </Link>
                        </li>

                        <li className="menu-group">
                            <div className={`nav-link group-header ${openGroup === 'reports' ? 'open' : ''}`} onClick={() => handleToggleGroup('reports')} title="Reports">
                                <span className="flex items-center flex-1"><span className="icon"><FileText size={18} /></span> <span className="nav-text">Reports</span></span> <span className="chevron">{openGroup === 'reports' ? '▾' : '▸'}</span>
                            </div>
                            <div className={`group-items ${openGroup === 'reports' ? 'expanded' : ''}`}>
                                <Link className={isActive('/report/students')} to="/report/students" onClick={closeMobileMenu}>Student Count Report</Link>
                                <Link className={isActive('/report/odometer')} to="/report/odometer" onClick={closeMobileMenu}>Odometer Report</Link>
                                <Link className={isActive('/report/fuel')} to="/report/fuel" onClick={closeMobileMenu}>Fuel Purchase Report</Link>
                                <Link className={isActive('/report/expense')} to="/report/expense" onClick={closeMobileMenu}>Expense Report</Link>
                                <Link className={isActive('/report/fleet')} to="/report/fleet" onClick={closeMobileMenu}>Fleet Report</Link>
                                <Link className={isActive('/service-request-status')} to="/service-request-status" onClick={closeMobileMenu}>Service Request Status</Link>
                            </div>
                        </li>

                        <li className="menu-group">
                            <div className={`nav-link group-header ${openGroup === 'data-entry' ? 'open' : ''}`} onClick={() => handleToggleGroup('data-entry')} title="Data Entry">
                                <span className="flex items-center flex-1"><span className="icon"><ClipboardList size={18} /></span> <span className="nav-text">Data Entry</span></span> <span className="chevron">{openGroup === 'data-entry' ? '▾' : '▸'}</span>
                            </div>
                            <div className={`group-items ${openGroup === 'data-entry' ? 'expanded' : ''}`}>
                                <Link className={isActive('/entry/students')} to="/entry/students" onClick={closeMobileMenu}>Student & Staff Riders</Link>
                                <Link className={isActive('/entry/vehicle-odometer-log')} to="/entry/vehicle-odometer-log" onClick={closeMobileMenu}>Daily Odometer Log</Link>
                                <Link className={isActive('/entry/fuel-data')} to="/entry/fuel-data" onClick={closeMobileMenu}>Fuel Entry</Link>
                                <Link className={isActive('/entry/service-request')} to="/entry/service-request" onClick={closeMobileMenu}>Service Request</Link>
                                <Link className={isActive('/entry/expenses')} to="/entry/expenses" onClick={closeMobileMenu}>Expense Record</Link>
                                <Link className={isActive('/entry/transfer')} to="/entry/transfer" onClick={closeMobileMenu}>Transfer Vehicle</Link>
                                <Link className={isActive('/entry/renewals')} to="/entry/renewals" onClick={closeMobileMenu}>Vehicle Renewals</Link>
                            </div>
                        </li>

                        <li className="menu-group">
                            <div className={`nav-link group-header ${openGroup === 'manage-entries' ? 'open' : ''}`} onClick={() => handleToggleGroup('manage-entries')} title="Manage Entries">
                                <span className="flex items-center flex-1"><span className="icon"><ClipboardList size={18} /></span> <span className="nav-text">Manage Entries</span></span> <span className="chevron">{openGroup === 'manage-entries' ? '▾' : '▸'}</span>
                            </div>
                            <div className={`group-items ${openGroup === 'manage-entries' ? 'expanded' : ''}`}>
                                <Link className={isActive('/check/students')} to="/check/students" onClick={closeMobileMenu}>Student & Staff Riders</Link>
                                <Link className={isActive('/check/vehicle-odometer-log')} to="/check/vehicle-odometer-log" onClick={closeMobileMenu}>Daily Odometer Log</Link>
                                <Link className={isActive('/check/fuel-data')} to="/check/fuel-data" onClick={closeMobileMenu}>Fuel Data</Link>
                                <Link className={isActive('/check/service-request')} to="/check/service-request" onClick={closeMobileMenu}>Service Request</Link>
                                <Link className={isActive('/check/expenses')} to="/check/expenses" onClick={closeMobileMenu}>Expense Record</Link>
                                <Link className={isActive('/check/transfer')} to="/check/transfer" onClick={closeMobileMenu}>Vehicle Transfer</Link>
                            </div>
                        </li>

                        <li className="menu-group">
                            <div className={`nav-link group-header ${openGroup === 'master-data' ? 'open' : ''}`} onClick={() => handleToggleGroup('master-data')} title="Master Data">
                                <span className="flex items-center flex-1"><span className="icon"><Database size={18} /></span> <span className="nav-text">Master Data</span></span> <span className="chevron">{openGroup === 'master-data' ? '▾' : '▸'}</span>
                            </div>
                            <div className={`group-items ${openGroup === 'master-data' ? 'expanded' : ''}`}>
                                <Link className={isActive('/entry/students')} to="/entry/students" onClick={closeMobileMenu}>Student & Staff Directory</Link>
                                <Link className={isActive('/entry/institution')} to="/entry/institution" onClick={closeMobileMenu}>Institution</Link>
                                <Link className={isActive('/entry/registered-institution')} to="/entry/registered-institution" onClick={closeMobileMenu}>Registered Institution</Link>
                                <Link className={isActive('/entry/vehicle')} to="/entry/vehicle" onClick={closeMobileMenu}>Vehicle</Link>
                                <Link className={isActive('/entry/fuel-rates')} to="/entry/fuel-rates" onClick={closeMobileMenu}>Fuel Rates</Link>
                                <Link className={isActive('/entry/vehicle-operational-history')} to="/entry/vehicle-operational-history" onClick={closeMobileMenu}>Vehicle Route History</Link>
                                <Link className={isActive('/entry/budget-heads')} to="/entry/budget-heads" onClick={closeMobileMenu}>Budget Head</Link>
                                <Link className={isActive('/entry/sub-budget-heads')} to="/entry/sub-budget-heads" onClick={closeMobileMenu}>Sub Budget Head</Link>
                                <Link className={isActive('/category-management')} to="/category-management" onClick={closeMobileMenu}>Category Management</Link>
                                <Link className={isActive('/database-management')} to="/database-management" onClick={closeMobileMenu}>Database Management</Link>
                                <Link className={isActive('/entry/vendors')} to="/entry/vendors" onClick={closeMobileMenu}>Vendor</Link>
                            </div>
                        </li>

                        <li className="menu-group">
                            <div className={`nav-link group-header ${openGroup === 'manage-data' ? 'open' : ''}`} onClick={() => handleToggleGroup('manage-data')} title="Manage Data">
                                <span className="flex items-center flex-1"><span className="icon"><Layers size={18} /></span> <span className="nav-text">Manage Data</span></span> <span className="chevron">{openGroup === 'manage-data' ? '▾' : '▸'}</span>
                            </div>
                            <div className={`group-items ${openGroup === 'manage-data' ? 'expanded' : ''}`}>
                                <Link className={isActive('/check/students')} to="/check/students" onClick={closeMobileMenu}>Student & Staff Directory</Link>
                                <Link className={isActive('/check/institution')} to="/check/institution" onClick={closeMobileMenu}>Institution</Link>
                                <Link className={isActive('/check/registered-institution')} to="/check/registered-institution" onClick={closeMobileMenu}>Registered Institution</Link>
                                <Link className={isActive('/check/vehicle')} to="/check/vehicle" onClick={closeMobileMenu}>Vehicle</Link>
                                <Link className={isActive('/check/fuel-rates')} to="/check/fuel-rates" onClick={closeMobileMenu}>Fuel Rates</Link>
                                <Link className={isActive('/check/vehicle-operational-history')} to="/check/vehicle-operational-history" onClick={closeMobileMenu}>Vehicle Route History</Link>
                                <Link className={isActive('/check/budget-heads')} to="/check/budget-heads" onClick={closeMobileMenu}>Budget Head</Link>
                                <Link className={isActive('/check/sub-budget-heads')} to="/check/sub-budget-heads" onClick={closeMobileMenu}>Sub Budget Head</Link>
                                <Link className={isActive('/check/vendors')} to="/check/vendors" onClick={closeMobileMenu}>Vendor</Link>
                            </div>
                        </li>
                    </ul>
                </div>

                <div className="sidebar-footer border-t border-slate-800 p-4 flex flex-col gap-2">
                    <a
                        href={import.meta.env.PROD ? '/transport/admin/' : 'http://127.0.0.1:8000/transport/admin/'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-2 rounded-lg cursor-pointer transition-colors w-full bg-slate-800/50 text-slate-300 hover:bg-slate-700"
                        title="Django Admin"
                    >
                        <Shield size={18} className="shrink-0" />
                        {!isCollapsed && <span className="font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis">Django Admin</span>}
                    </a>
                    <button
                        className={`flex items-center justify-center gap-2 p-2 rounded-lg cursor-pointer transition-colors w-full bg-slate-800/50 text-slate-300 hover:bg-slate-700`}
                        onClick={toggleThemeCycle}
                        title="Toggle Theme"
                    >
                        <Activity size={18} className="shrink-0" />
                        {!isCollapsed && <span className="font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis">{themeName}</span>}
                    </button>
                    <button
                        className="flex items-center justify-center gap-2 p-2 rounded-lg cursor-pointer transition-colors w-full bg-red-900/40 text-red-400 hover:bg-red-800/60"
                        onClick={() => {
                            localStorage.removeItem('pt_token');
                            window.location.href = '/transport/';
                        }}
                        title="Log Off"
                    >
                        <LogOut size={18} className="shrink-0" />
                        {!isCollapsed && <span className="font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis">Log Off</span>}
                    </button>
                </div>
            </nav>
        </>
    );
};

export default Sidebar;
