import React, { useState } from 'react';
import { Activity, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import AnimatedRGULogo from '../assets/AnimatedRGULogo';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            // Note: Since transport_department might not have auth endpoint yet, this acts as a placeholder
            // But we will use the standard login endpoint if available
            const response = await api.post('token/', { username, password });
            if (response.data && response.data.access) {
                localStorage.setItem('pt_token', response.data.access);
                onLogin();
            } else {
                setError('Invalid credentials');
                setLoading(false);
            }
        } catch (err) {
            // Check if it's a 401 unauthorized
            if (err.response && err.response.status === 401) {
                setError('Invalid credentials');
            } else {
                setError('Failed to connect to server');
            }
            setLoading(false);
        }
    };

    const styles = {
        wrapper: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-main, #070b14)',
            backgroundImage: `
                radial-gradient(circle at 20% 20%, var(--gradient-1, rgba(244,121,32,0.1)) 0%, transparent 40%),
                radial-gradient(circle at 80% 80%, var(--gradient-2, rgba(0,150,214,0.1)) 0%, transparent 40%),
                radial-gradient(circle at 50% 50%, var(--gradient-3, rgba(161,43,142,0.05)) 0%, transparent 60%)
            `,
            padding: '1rem',
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
        },
        card: {
            background: 'var(--bg-navbar, #1a1a2e)',
            border: '1px solid var(--border-glass-bright, rgba(255,255,255,0.2))',
            borderRadius: '20px',
            padding: '3rem 2.5rem',
            width: '95%',
            maxWidth: '420px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            position: 'relative',
            zIndex: 1,
            margin: '1rem',
        },
        logoArea: {
            textAlign: 'center',
            marginBottom: '2rem',
        },
        subtitle: {
            fontSize: '0.9rem',
            color: 'var(--text-muted, #94a3b8)',
            margin: 0,
            letterSpacing: '0.05em',
            fontWeight: 600,
            textTransform: 'uppercase'
        },
        fieldGroup: {
            marginBottom: '1.3rem',
        },
        label: {
            display: 'block',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text-muted, #94a3b8)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '0.5rem',
        },
        inputWrap: {
            position: 'relative',
        },
        input: {
            width: '100%',
            padding: '0.85rem 1rem',
            background: 'var(--bg-glass, rgba(255,255,255,0.05))',
            border: '1px solid var(--border-glass, rgba(255,255,255,0.1))',
            borderRadius: '10px',
            color: 'var(--text-main, #f8fafc)',
            fontSize: '1rem',
            outline: 'none',
            transition: 'all 0.3s',
            boxSizing: 'border-box',
        },
        eyeBtn: {
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: '1.15rem',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
        },
        submitBtn: {
            width: '100%',
            padding: '1rem',
            background: 'linear-gradient(135deg, #92278F, #009CDE)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.05rem',
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: '1rem',
            transition: 'all 0.3s',
            boxShadow: '0 8px 25px rgba(146, 39, 143, 0.3)',
            textTransform: 'uppercase'
        },
        errorBox: {
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171',
            padding: '0.7rem 1rem',
            borderRadius: '10px',
            fontSize: '0.88rem',
            marginBottom: '1.2rem',
            textAlign: 'center',
        }
    };

    return (
        <div style={styles.wrapper}>
            <button 
                onClick={() => {
                    const body = document.body;
                    const themes = ['theme-custom', 'theme-dark-glass', 'theme-rathinam-light', 'theme-rathinam-dark', 'theme-rathinam-3d'];
                    const currentTheme = themes.find(t => body.classList.contains(t));
                    
                    body.classList.remove(...themes);
                    
                    if (!currentTheme) {
                        body.classList.add('theme-custom');
                        localStorage.setItem('pt_theme', 'custom');
                    } else if (currentTheme === 'theme-custom') {
                        body.classList.add('theme-dark-glass');
                        localStorage.setItem('pt_theme', 'dark-glass');
                    } else if (currentTheme === 'theme-dark-glass') {
                        body.classList.add('theme-rathinam-light');
                        localStorage.setItem('pt_theme', 'rathinam-light');
                    } else if (currentTheme === 'theme-rathinam-light') {
                        body.classList.add('theme-rathinam-dark');
                        localStorage.setItem('pt_theme', 'rathinam-dark');
                    } else if (currentTheme === 'theme-rathinam-dark') {
                        body.classList.add('theme-rathinam-3d');
                        localStorage.setItem('pt_theme', 'rathinam-3d');
                    } else {
                        localStorage.setItem('pt_theme', 'dark');
                    }
                }}
                title="Toggle Theme"
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'var(--bg-glass, rgba(255,255,255,0.05))',
                    border: '1px solid var(--border-glass-bright, rgba(255,255,255,0.2))',
                    color: 'var(--text-main, #fff)',
                    padding: '12px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s'
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.background = 'var(--bg-glass-heavy, rgba(255,255,255,0.15))';
                    e.currentTarget.style.boxShadow = '0 0 15px var(--color-primary, rgba(0, 243, 255, 0.4))';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.background = 'var(--bg-glass, rgba(255,255,255,0.05))';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                }}
            >
                <Activity size={22} />
            </button>
            
            <div style={styles.card}>
                <div style={styles.logoArea}>
                    <div className="logo-container" style={{ width: '100%', maxWidth: '450px', margin: '0 auto 1.5rem', display: 'flex', justifyContent: 'center' }}>
                        <AnimatedRGULogo style={{ width: '100%', height: 'auto', maxHeight: '180px', objectFit: 'contain' }} />
                    </div>
                    <p style={styles.subtitle}>Transport Department System</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && <div style={styles.errorBox}>⚠️ {error}</div>}

                    <div style={styles.fieldGroup}>
                        <label style={styles.label} htmlFor="username">Username</label>
                        <div style={styles.inputWrap}>
                            <input
                                type="text"
                                id="username"
                                style={styles.input}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                            />
                        </div>
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={styles.label} htmlFor="password">Password</label>
                        <div style={styles.inputWrap}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                style={{ ...styles.input, paddingRight: '3rem' }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                            />
                            <button
                                type="button"
                                style={styles.eyeBtn}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" style={styles.submitBtn} disabled={loading}>
                        {loading ? '⏳ Signing in...' : '🔐 Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
