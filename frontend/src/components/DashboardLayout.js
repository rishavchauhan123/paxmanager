import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  PlaneTakeoff,
  FileText,
  Users,
  Building2,
  History,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { ROLES } from '../utils/constants';

export const DashboardLayout = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: [ROLES.AGENT1, ROLES.AGENT2, ROLES.ACCOUNT, ROLES.ADMIN] },
    { name: 'Bookings', href: '/bookings', icon: PlaneTakeoff, roles: [ROLES.AGENT1, ROLES.AGENT2, ROLES.ACCOUNT, ROLES.ADMIN] },
    { name: 'Reports', href: '/reports', icon: FileText, roles: [ROLES.ACCOUNT, ROLES.ADMIN] },
    { name: 'Suppliers', href: '/suppliers', icon: Building2, roles: [ROLES.ADMIN] },
    { name: 'Users', href: '/users', icon: Users, roles: [ROLES.ADMIN] },
    { name: 'Activity Logs', href: '/audit-logs', icon: History, roles: [ROLES.ADMIN] },
  ];

  const filteredNavigation = navigation.filter((item) => hasRole(item.roles));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700">
            <h1 className="text-xl font-bold text-white tracking-tight">Pax Manager</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-slate-300"
              data-testid="close-sidebar-btn"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 mr-3" strokeWidth={1.5} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info & Logout */}
          <div className="p-4 border-t border-slate-700">
            <div className="mb-3 px-4">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-slate-400">
                {user?.role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </p>
            </div>
            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" strokeWidth={1.5} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center h-16 px-6 bg-white border-b border-slate-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-600 hover:text-slate-900"
            data-testid="open-sidebar-btn"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 lg:ml-0 ml-4">
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
              {filteredNavigation.find((item) => location.pathname.startsWith(item.href))?.name || 'Dashboard'}
            </h2>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};
