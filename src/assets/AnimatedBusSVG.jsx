export default function AnimatedBusSVG({ className = "" }) {
  return (
    <svg 
      className={`w-full h-full ${className}`} 
      viewBox="0 0 400 150" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Defs for gradients and reusable parts */}
      <defs>
        {/* A single tree */}
        <g id="tree">
          <rect x="12" y="30" width="6" height="20" fill="#d4a373" />
          <circle cx="15" cy="20" r="15" fill="#22c55e" />
          <circle cx="5" cy="25" r="10" fill="#16a34a" />
          <circle cx="25" cy="25" r="10" fill="#16a34a" />
          <circle cx="15" cy="10" r="12" fill="#4ade80" />
        </g>
        
        {/* A group of trees to tile */}
        <g id="tree-group">
          <use href="#tree" x="10" y="55" transform="scale(1.2)" />
          <use href="#tree" x="80" y="70" transform="scale(0.8)" />
          <use href="#tree" x="130" y="45" transform="scale(1.5)" />
          <use href="#tree" x="220" y="60" transform="scale(1.1)" />
          <use href="#tree" x="290" y="75" transform="scale(0.9)" />
          <use href="#tree" x="350" y="50" transform="scale(1.3)" />
        </g>
      </defs>

      {/* Infinite Looping Trees */}
      <g>
        <animateTransform 
          attributeName="transform" 
          type="translate" 
          from="-400,0" 
          to="0,0" 
          dur="4s" 
          repeatCount="indefinite" 
        />
        <use href="#tree-group" x="0" y="0" />
        <use href="#tree-group" x="400" y="0" />
      </g>

      {/* Road */}
      <rect x="0" y="125" width="400" height="25" fill="#475569" />
      <line x1="0" y1="135" x2="400" y2="135" stroke="#cbd5e1" strokeDasharray="30 20" strokeWidth="2">
        <animate attributeName="stroke-dashoffset" from="50" to="0" dur="0.5s" repeatCount="indefinite" />
      </line>

      {/* The School Bus */}
      <g>
        <animateTransform 
            attributeName="transform" 
            type="translate" 
            values="110,65; 110,63; 110,65" 
            dur="0.6s" 
            repeatCount="indefinite" 
        />
        
        {/* Bus Hood */}
        <path d="M 0 35 L 25 35 L 30 20 L 40 20 L 40 50 L 0 50 Z" fill="#f59e0b" />
        {/* Front Grill/Bumper */}
        <rect x="-2" y="42" width="6" height="8" fill="#1e293b" />
        <rect x="0" y="38" width="8" height="10" rx="2" fill="#0f172a" />
        
        {/* Main Body */}
        <path d="M 25 5 Q 30 0 35 0 L 140 0 Q 145 0 145 5 L 145 50 L 25 50 Z" fill="#f59e0b" />
        
        {/* Black Stripes */}
        <rect x="30" y="28" width="115" height="3" fill="#0f172a" />
        <rect x="30" y="38" width="115" height="2" fill="#0f172a" />

        {/* Stop Sign */}
        <polygon points="35,28 39,28 41,32 41,36 39,40 35,40 33,36 33,32" fill="#ef4444" stroke="#ffffff" strokeWidth="0.5" />
        <rect x="36" y="33" width="2" height="2" fill="#ffffff" />

        {/* Windows */}
        {/* Front Windshield area */}
        <path d="M 27 20 L 32 5 L 40 5 L 40 20 Z" fill="#0f172a" />
        
        {/* Side Windows */}
        {[45, 57, 69, 81, 93, 105, 117, 129].map((x, i) => (
          <rect key={i} x={x} y="6" width="9" height="15" rx="1" fill="#0f172a" />
        ))}

        {/* Door */}
        <rect x="43" y="6" width="13" height="42" fill="#f59e0b" stroke="#0f172a" strokeWidth="1" />
        <rect x="45" y="8" width="9" height="16" fill="#0f172a" />
        <rect x="45" y="26" width="9" height="16" fill="#0f172a" />

        {/* Wheels */}
        {/* Front Wheel */}
        <circle cx="20" cy="50" r="12" fill="#0f172a" />
        <circle cx="20" cy="50" r="6" fill="#94a3b8">
          <animateTransform attributeName="transform" type="rotate" from="0 20 50" to="360 20 50" dur="0.8s" repeatCount="indefinite" />
        </circle>
        
        {/* Rear Wheel */}
        <circle cx="115" cy="50" r="12" fill="#0f172a" />
        <circle cx="115" cy="50" r="6" fill="#94a3b8">
          <animateTransform attributeName="transform" type="rotate" from="0 115 50" to="360 115 50" dur="0.8s" repeatCount="indefinite" />
        </circle>

        {/* Exhaust smoke */}
        <circle cx="145" cy="45" r="4" fill="#94a3b8" opacity="0">
          <animate attributeName="opacity" values="0;0.5;0" dur="1s" repeatCount="indefinite" />
          <animate attributeName="cx" values="145;165" dur="1s" repeatCount="indefinite" />
          <animate attributeName="cy" values="45;35" dur="1s" repeatCount="indefinite" />
          <animate attributeName="r" values="2;6" dur="1s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}
