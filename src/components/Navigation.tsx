import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import InstantTooltip from './InstantTooltip';
import { CreateUserModal } from './CreateUserModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { useAuth } from '../hooks/useAuth';
import { hydrateFromRemote } from '../lib/remoteSync';

export default function Navigation() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { user } = useAuth();
    const isAdminUser = user?.role === 'admin';

    const HomeIcon = () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m3 12 2-2m0 0 7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    );

    const BookIcon = () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
    );

    const UserIcon = () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    );

    const AcademicIcon = () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
    );

    const DashboardIcon = () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
    );

    const UsersIcon = () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    );

    const PortalIcon = () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 3h4a2 2 0 012 2v4" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 17l5-5-5-5" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h11" />
        </svg>
    );

    const isAdminRoute = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/admin');
    const showAdminCreate = isAdminRoute && isAdminUser;
    const showChangePassword = isAdminRoute && !!user;
    const isPortalActive = location.pathname === '/admin';

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await hydrateFromRemote();
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const navItems = useMemo(() => {
        if (isAdminRoute) {
            return [
                { path: '/dashboard', icon: DashboardIcon, label: 'Dashboard', color: 'bg-indigo-500' },
                { path: '/dashboard/participants', icon: UsersIcon, label: 'Participantes', color: 'bg-emerald-500' },
            ];
        }

        return [
            { path: '/', icon: HomeIcon, label: 'Início', color: 'bg-blue-500' },
            { path: '/cursos', icon: AcademicIcon, label: 'Mini Cursos', color: 'bg-orange-500' },
            { path: '/tutorial', icon: BookIcon, label: 'Dicas de Currículo', color: 'bg-green-500' },
            { path: '/criar-cv', icon: UserIcon, label: 'Criar Currículo', color: 'bg-purple-500' }
        ];
    }, [isAdminRoute]);

    const handleNavigation = (path: string) => {
        navigate(path);
        setIsMobileMenuOpen(false);
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    return (
        <>
            {/* Desktop Navigation - Vertical Side Nav */}
            <div className="hidden md:block fixed left-0 top-0 h-screen w-20 bg-theme-surface backdrop-blur-md border-r border-theme z-40">
                <div className="flex flex-col items-center justify-center h-full space-y-8 p-4 relative">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <InstantTooltip key={item.path} tooltip={item.label} position="right">
                                <motion.button
                                    onClick={() => handleNavigation(item.path)}
                                    className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ${isActive
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'hover:bg-theme-surface-hover text-theme-secondary hover:text-theme-primary'
                                        }`}
                                    whileHover={{
                                        scale: 1.05,
                                        transition: { type: "spring", stiffness: 400, damping: 25 }
                                    }}
                                    whileTap={{
                                        scale: 0.95,
                                        transition: { type: "spring", stiffness: 400, damping: 25 }
                                    }}
                                >
                                    {/* Indicator de fundo móvel - APENAS DESKTOP */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="desktopNavIndicator"
                                            className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-blue-600/20 border border-blue-500/30"
                                            transition={{
                                                type: "spring",
                                                stiffness: 200,
                                                damping: 15,
                                                mass: 1.2
                                            }}
                                        />
                                    )}

                                    <motion.div
                                        animate={{
                                            scale: isActive ? 1.1 : 1,
                                            rotate: isActive ? [0, 5, -5, 0] : 0
                                        }}
                                        transition={{
                                            scale: { type: "spring", stiffness: 300, damping: 20 },
                                            rotate: { duration: 0.6, ease: "easeInOut" }
                                        }}
                                        className="relative z-10"
                                    >
                                        <Icon />
                                    </motion.div>
                                </motion.button>
                            </InstantTooltip>
                        );
                    })}

                    {!isAdminRoute && (
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                            <InstantTooltip tooltip="Portal de conteúdos" position="right">
                                <motion.button
                                    onClick={() => handleNavigation('/admin')}
                                    className={`w-12 h-12 rounded-xl border transition-colors duration-300 flex items-center justify-center ${isPortalActive
                                        ? 'bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-500/30'
                                        : 'bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 border-sky-500/20 hover:text-sky-600'
                                        }`}
                                    whileHover={{
                                        scale: 1.08,
                                        rotate: 2,
                                        transition: { type: "spring", stiffness: 380, damping: 24 }
                                    }}
                                    whileTap={{
                                        scale: 0.92,
                                        transition: { type: "spring", stiffness: 380, damping: 24 }
                                    }}
                                >
                                    <motion.div
                                        animate={isPortalActive ? { rotate: [0, -10, 10, 0], scale: [1, 1.05, 1] } : { rotate: 0, scale: 1 }}
                                        transition={{ duration: 0.8, ease: "easeInOut" }}
                                        className="relative z-10"
                                    >
                                        <PortalIcon />
                                    </motion.div>
                                </motion.button>
                            </InstantTooltip>
                        </div>
                    )}

                    {/* Botões Admin - Apenas para Admin */}
                    {showChangePassword && (
                        <div className="absolute bottom-6 flex flex-col gap-3">
                            {/* Botão Atualizar - SEMPRE VISÍVEL PARA ADMIN */}
                            <InstantTooltip tooltip="Atualizar dados" position="right">
                                <motion.button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:text-blue-600 transition-colors duration-300 flex items-center justify-center border border-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    whileHover={!isRefreshing ? {
                                        scale: 1.05,
                                        transition: { type: "spring", stiffness: 400, damping: 25 }
                                    } : {}}
                                    whileTap={!isRefreshing ? {
                                        scale: 0.95,
                                        transition: { type: "spring", stiffness: 400, damping: 25 }
                                    } : {}}
                                >
                                    <motion.svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                                        transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </motion.svg>
                                </motion.button>
                            </InstantTooltip>

                            {showAdminCreate && (
                                <InstantTooltip tooltip="Gerenciar Usuários" position="right">
                                    <motion.button
                                        onClick={() => setShowCreateUserModal(true)}
                                        className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 hover:text-purple-600 transition-colors duration-300 flex items-center justify-center border border-purple-500/20"
                                        whileHover={{
                                            scale: 1.05,
                                            transition: { type: "spring", stiffness: 400, damping: 25 }
                                        }}
                                        whileTap={{
                                            scale: 0.95,
                                            transition: { type: "spring", stiffness: 400, damping: 25 }
                                        }}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                    </motion.button>
                                </InstantTooltip>
                            )}

                            <InstantTooltip tooltip="Trocar Senha" position="right">
                                <motion.button
                                    onClick={() => setShowChangePasswordModal(true)}
                                    className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600 transition-colors duration-300 flex items-center justify-center border border-green-500/20"
                                    whileHover={{
                                        scale: 1.05,
                                        transition: { type: "spring", stiffness: 400, damping: 25 }
                                    }}
                                    whileTap={{
                                        scale: 0.95,
                                        transition: { type: "spring", stiffness: 400, damping: 25 }
                                    }}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                </motion.button>
                            </InstantTooltip>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Hamburger Button - Otimizado iOS */}
            <button
                onClick={toggleMobileMenu}
                className={`md:hidden fixed top-4 z-[60] w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-all duration-300 ${isMobileMenuOpen ? 'left-[256px]' : 'left-4'
                    }`}
                style={{
                    transform: `translateX(${isMobileMenuOpen ? '0px' : '0px'})`,
                    willChange: 'transform'
                }}
            >
                <div className="relative w-6 h-6">
                    {/* Linha 1 */}
                    <span
                        className={`absolute w-5 h-0.5 bg-gray-800 dark:bg-white rounded-full transition-all duration-300 ease-out ${isMobileMenuOpen
                            ? 'top-3 left-0.5 rotate-45'
                            : 'top-2 left-0.5'
                            }`}
                    />
                    {/* Linha 2 */}
                    <span
                        className={`absolute w-5 h-0.5 bg-gray-800 dark:bg-white rounded-full transition-all duration-200 ease-out top-3 left-0.5 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
                            }`}
                    />
                    {/* Linha 3 */}
                    <span
                        className={`absolute w-5 h-0.5 bg-gray-800 dark:bg-white rounded-full transition-all duration-300 ease-out ${isMobileMenuOpen
                            ? 'top-3 left-0.5 -rotate-45'
                            : 'top-4 left-0.5'
                            }`}
                    />
                </div>
            </button>

            {/* Mobile Menu Overlay - SEM ANIMAÇÕES */}
            {isMobileMenuOpen && (
                <>
                    <div
                        onClick={toggleMobileMenu}
                        className="md:hidden fixed inset-0 bg-black/20 z-40"
                    />

                    <div className="md:hidden fixed left-0 top-0 h-screen w-80 bg-theme-surface shadow-2xl z-40 transform transition-transform duration-300 ease-out">
                        <div className="flex flex-col justify-center h-full space-y-4 p-8">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;

                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => handleNavigation(item.path)}
                                        className={`relative flex items-center space-x-4 p-4 rounded-xl transition-colors duration-200 ${isActive
                                            ? 'bg-theme-surface-hover text-blue-600 dark:text-blue-400'
                                            : 'text-theme-secondary active:bg-theme-surface-hover'
                                            }`}
                                    >
                                        {/* Indicador fixo simples */}
                                        {isActive && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full" />
                                        )}

                                        <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center text-white flex-shrink-0 text-sm`}>
                                            <Icon />
                                        </div>
                                        <span className="text-base font-medium flex-1 text-left">
                                            {item.label}
                                        </span>

                                        {isActive && (
                                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}

                            {!isAdminRoute && (
                                <motion.button
                                    onClick={() => handleNavigation('/admin')}
                                    className={`flex items-center space-x-4 p-4 rounded-xl transition-colors duration-200 ${isPortalActive
                                        ? 'bg-sky-500 text-white'
                                        : 'text-sky-500 bg-sky-500/10 hover:bg-sky-500/20 hover:text-sky-600'
                                        }`}
                                    whileHover={{
                                        scale: 1.02,
                                        transition: { type: "spring", stiffness: 320, damping: 27 }
                                    }}
                                    whileTap={{
                                        scale: 0.95,
                                        transition: { type: "spring", stiffness: 320, damping: 27 }
                                    }}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-sky-500 flex items-center justify-center text-white flex-shrink-0">
                                        <PortalIcon />
                                    </div>
                                    <div className="flex flex-col items-start flex-1 text-left">
                                        <span className="text-base font-medium">
                                            Portal de conteúdos
                                        </span>
                                        <motion.span
                                            className="text-xs text-sky-600/80"
                                            animate={{ opacity: [0.7, 1, 0.7] }}
                                            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                                        >
                                            Redirecionar para login
                                        </motion.span>
                                    </div>
                                    <motion.div
                                        className="text-sky-500"
                                        animate={{ x: [0, 6, 0] }}
                                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </motion.div>
                                </motion.button>
                            )}

                            {/* Botões Admin - Mobile */}
                            {isAdminRoute && (
                                <div className="pt-4 mt-4 border-t border-theme space-y-2">
                                    {isAdminUser && (
                                        <button
                                            onClick={() => {
                                                setShowCreateUserModal(true);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="flex items-center space-x-4 p-4 rounded-xl bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors duration-200 w-full"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center text-white flex-shrink-0">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                                </svg>
                                            </div>
                                            <span className="text-base font-medium flex-1 text-left">
                                                Gerenciar Usuários
                                            </span>
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            setShowChangePasswordModal(true);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className="flex items-center space-x-4 p-4 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors duration-200 w-full"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center text-white flex-shrink-0">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                            </svg>
                                        </div>
                                        <span className="text-base font-medium flex-1 text-left">
                                            Trocar Senha
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Modais Admin */}
            {isAdminUser && (
                <CreateUserModal
                    isOpen={showCreateUserModal}
                    onClose={() => setShowCreateUserModal(false)}
                    onUserCreated={() => {
                        console.log('Usuário criado com sucesso!');
                    }}
                    onError={(error) => {
                        console.error('Erro ao criar usuário:', error);
                    }}
                    onSuccess={(message) => {
                        console.log(message);
                    }}
                />
            )}

            <ChangePasswordModal
                isOpen={showChangePasswordModal}
                onClose={() => setShowChangePasswordModal(false)}
                onPasswordChanged={() => {
                    console.log('Senha alterada com sucesso!');
                }}
                onError={(error) => {
                    console.error('Erro ao alterar senha:', error);
                }}
                onSuccess={(message) => {
                    console.log(message);
                }}
            />
        </>
    );
}
