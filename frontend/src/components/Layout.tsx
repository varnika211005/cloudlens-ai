import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Cloud,
  BarChart3,
  Lightbulb,
  Bell,
  Sliders,
  MessageCircle,
  Leaf,
  FlaskConical,
  MapPin,
  AlertTriangle,
  TrendingUp,
  FileText,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { ChatBox } from './ChatBox';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  items: NavItem[];
}

const standaloneItem: NavItem = { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard };

const navGroups: NavGroup[] = [
  {
    label: 'Cloud Management',
    icon: Cloud,
    items: [
      { path: '/clouds', label: 'Clouds', icon: Cloud },
      { path: '/idle-resources', label: 'Idle Resources', icon: AlertTriangle },
    ],
  },
  {
    label: 'Analytics & Monitoring',
    icon: BarChart3,
    items: [
      { path: '/billing', label: 'Billing', icon: BarChart3 },
      { path: '/forecast', label: 'Cost Forecasting', icon: TrendingUp },
      { path: '/anomalies', label: 'Anomalies', icon: AlertTriangle },
      { path: '/alerts', label: 'Alerts', icon: Bell },
    ],
  },
  {
    label: 'Optimization',
    icon: Lightbulb,
    items: [
      { path: '/recommendations', label: 'Recommendations', icon: Lightbulb },
      { path: '/regions', label: 'Regions', icon: MapPin },
      { path: '/simulator', label: 'Simulator', icon: FlaskConical },
      { path: '/reports', label: 'Reports', icon: FileText },
      { path: '/tags', label: 'Tags', icon: Tag },
    ],
  },
  {
    label: 'System',
    icon: Sliders,
    items: [
      { path: '/carbon', label: 'Carbon', icon: Leaf },
      { path: '/settings', label: 'Settings', icon: Sliders },
    ],
  },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (path: string) => location.pathname === path;
  const isGroupActive = (items: NavItem[]) => items.some(item => isActive(item.path));

  // Close desktop dropdown when clicking outside the nav
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const NavLink = ({ path, label, icon: Icon }: NavItem) => (
    <Link
      to={path}
      onClick={() => { setIsMenuOpen(false); setOpenDropdown(null); }}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition ${
        isActive(path)
          ? 'bg-primary text-white'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary">☁️ CloudLens AI</h1>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1" ref={navRef}>
              {/* Dashboard (standalone) */}
              <NavLink {...standaloneItem} />

              {/* Grouped dropdowns */}
              {navGroups.map((group) => {
                const isOpen = openDropdown === group.label;
                const groupActive = isGroupActive(group.items);
                const GroupIcon = group.icon;

                return (
                  <div key={group.label} className="relative">
                    <button
                      onClick={() => setOpenDropdown(isOpen ? null : group.label)}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition ${
                        groupActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <GroupIcon size={18} />
                      <span className="text-sm">{group.label}</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        {group.items.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setOpenDropdown(null)}
                            className={`flex items-center space-x-2 px-4 py-2 text-sm transition first:rounded-t-lg last:rounded-b-lg ${
                              isActive(item.path)
                                ? 'bg-primary text-white'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <item.icon size={16} />
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Desktop Right Section */}
            <div className="hidden lg:flex items-center space-x-4">
              <span className="text-gray-700 text-sm">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <nav className="lg:hidden border-t border-gray-200 py-4 space-y-1">
              {/* Dashboard standalone */}
              <NavLink {...standaloneItem} />

              {/* Grouped accordion sections */}
              {navGroups.map((group) => {
                const isOpen = openMobileGroup === group.label;
                const groupActive = isGroupActive(group.items);
                const GroupIcon = group.icon;

                return (
                  <div key={group.label}>
                    <button
                      onClick={() => setOpenMobileGroup(isOpen ? null : group.label)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition ${
                        groupActive ? 'bg-blue-50 text-primary' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <GroupIcon size={18} />
                        <span>{group.label}</span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="ml-4 mt-1 space-y-1">
                        {group.items.map((item) => (
                          <NavLink key={item.path} {...item} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
                <div className="px-3 py-2 text-gray-700 text-sm">{user?.email}</div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Floating Chat Button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 bg-primary text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition z-30"
          title="Open CloudLens AI Chat"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Box - Available on All Pages */}
      <ChatBox isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};
