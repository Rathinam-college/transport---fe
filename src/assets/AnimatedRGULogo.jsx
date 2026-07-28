import React from 'react';

const AnimatedRGULogo = ({ style, className, animated = true }) => {
    return (
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 500 386"
            style={style}
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <g>
                <text
                    x="-6.3300104"
                    y="168.81502"
                    style={{
                        fontFamily: 'sans-serif',
                        fontWeight: 'bold',
                        fontSize: '213.931px'
                    }}
                >
                    <tspan className={animated ? "anim-letter letter-r" : ""} style={!animated ? { fill: '#71307e' } : {}}>R</tspan>
                    <tspan className={animated ? "anim-letter letter-g" : ""} style={!animated ? { fill: '#2096db' } : {}}>G</tspan>
                    <tspan className={animated ? "anim-letter letter-u" : ""} style={!animated ? { fill: '#a5cb3a' } : {}}>U</tspan>
                </text>
                
                <g className={(animated ? "anim-fade-up " : "") + "subtitle-group logo-glow-text"}>
                    <text
                        x="6.4904075"
                        y="246.76138"
                        style={{
                            fontFamily: 'sans-serif',
                            fontSize: '68.874px',
                            fill: 'var(--text-main)',
                            fillOpacity: 0.811671
                        }}
                    >
                        Deemed to be
                    </text>
                </g>
                
                <g className={(animated ? "anim-fade-up " : "") + "university-group logo-glow-text"}>
                    <text
                        x="9.3154974"
                        y="306.4913"
                        transform="scale(0.93583994,1.0685588)"
                        style={{
                            fontFamily: 'sans-serif',
                            fontWeight: 'bold',
                            fontSize: '72.4667px',
                            fill: 'var(--text-main)'
                        }}
                    >
                        UNIVERSITY
                    </text>
                </g>

                <g transform="translate(0.56427783,0.52916643)">
                    <rect className={animated ? "anim-rect rect-1" : ""} style={!animated ? { fill: '#f29a33' } : {}} width="156.4016" height="18.639761" x="12.0185" y="350.64288" />
                    <rect className={animated ? "anim-rect rect-2" : ""} style={!animated ? { fill: '#2096db' } : {}} width="166.23145" height="18.639761" x="168.45616" y="350.5347" />
                    <rect className={animated ? "anim-rect rect-3" : ""} style={!animated ? { fill: '#a5cb3a' } : {}} width="156.95247" height="18.639761" x="332.97495" y="350.52698" />
                </g>
            </g>
        </svg>
    );
};

export default AnimatedRGULogo;
