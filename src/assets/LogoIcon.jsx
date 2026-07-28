import React from 'react';

const LogoIcon = ({ width = "45px", height = "45px" }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 500 386"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g>
      <text
        style={{ fontSize: '213.931px', fontWeight: 'bold', fontFamily: 'sans-serif' }}
        x="-6.33"
        y="168.81"
      >
        <tspan style={{ fill: '#71307e' }}>R</tspan>
        <tspan style={{ fill: '#2096db' }}>G</tspan>
        <tspan style={{ fill: '#a5cb3a' }}>U</tspan>
      </text>
      
      <g transform="translate(0.56, 0.52)">
        <rect style={{ fill: '#f29a33' }} width="156.4" height="18.6" x="12.01" y="350.64" />
        <rect style={{ fill: '#2096db' }} width="166.2" height="18.6" x="168.45" y="350.53" />
        <rect style={{ fill: '#a5cb3a' }} width="156.9" height="18.6" x="332.97" y="350.52" />
      </g>

      <text
        style={{ fontSize: '68.874px', fontFamily: 'sans-serif', fill: 'var(--text-main)', fillOpacity: 0.9 }}
        x="6.49"
        y="246.76"
      >
        Deemed to be
      </text>

      <text
        style={{ fontSize: '72.4667px', fontWeight: 'bold', fontFamily: 'sans-serif', fill: 'var(--text-main)', fillOpacity: 0.9 }}
        x="9.31"
        y="306.49"
        transform="scale(0.935, 1.068)"
      >
        UNIVERSITY
      </text>
    </g>
  </svg>
);

export default LogoIcon;
