import AnimatedBusSVG from '../assets/AnimatedBusSVG';

const Sample1 = () => (
    <svg className="w-full h-full" viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="120" width="400" height="15" fill="#334155" />
      <line x1="0" y1="127.5" x2="400" y2="127.5" stroke="#94a3b8" strokeDasharray="20 10" strokeWidth="2">
        <animate attributeName="stroke-dashoffset" from="30" to="0" dur="0.5s" repeatCount="indefinite" />
      </line>
      <g>
        <animateTransform attributeName="transform" type="translate" values="130,60; 130,58; 130,60" dur="0.8s" repeatCount="indefinite" />
        <path d="M 0 10 Q 0 0 10 0 L 130 0 Q 145 0 145 20 L 145 50 L 0 50 Z" fill="#eab308" />
        <rect x="10" y="10" width="20" height="22" rx="3" fill="#0f172a" />
        <rect x="35" y="10" width="20" height="22" rx="3" fill="#0f172a" />
        <rect x="60" y="10" width="20" height="22" rx="3" fill="#0f172a" />
        <rect x="85" y="10" width="20" height="22" rx="3" fill="#0f172a" />
        <path d="M 110 10 L 130 10 Q 135 10 135 15 L 135 32 L 110 32 Z" fill="#0f172a" />
        <circle cx="30" cy="50" r="12" fill="#0f172a" />
        <circle cx="30" cy="50" r="6" fill="#94a3b8" />
        <circle cx="110" cy="50" r="12" fill="#0f172a" />
        <circle cx="110" cy="50" r="6" fill="#94a3b8" />
      </g>
    </svg>
);

const Sample2 = () => (
    <svg className="w-full h-full" viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="120" width="400" height="15" fill="#334155" />
      <line x1="0" y1="127.5" x2="400" y2="127.5" stroke="#94a3b8" strokeDasharray="30 15" strokeWidth="2">
        <animate attributeName="stroke-dashoffset" from="45" to="0" dur="0.3s" repeatCount="indefinite" />
      </line>
      <g>
        <animateTransform attributeName="transform" type="translate" values="130,50; 130,52; 130,50" dur="1s" repeatCount="indefinite" />
        {/* Sleek Bus Body */}
        <path d="M 0 30 Q 0 0 30 0 L 110 0 Q 150 0 160 40 L 160 60 L 0 60 Z" fill="#3b82f6" />
        {/* Continuous Window */}
        <path d="M 10 25 Q 10 10 30 10 L 105 10 Q 130 10 145 35 L 145 40 L 10 40 Z" fill="#0f172a" />
        <rect x="30" y="10" width="5" height="30" fill="#3b82f6" />
        <rect x="70" y="10" width="5" height="30" fill="#3b82f6" />
        <rect x="110" y="10" width="5" height="30" fill="#3b82f6" />
        {/* Wheels */}
        <circle cx="35" cy="60" r="14" fill="#1e293b" />
        <circle cx="125" cy="60" r="14" fill="#1e293b" />
        <circle cx="35" cy="60" r="8" fill="#cbd5e1" stroke="#334155" strokeWidth="2" strokeDasharray="4 2">
          <animateTransform attributeName="transform" type="rotate" from="0 35 60" to="360 35 60" dur="0.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="125" cy="60" r="8" fill="#cbd5e1" stroke="#334155" strokeWidth="2" strokeDasharray="4 2">
          <animateTransform attributeName="transform" type="rotate" from="0 125 60" to="360 125 60" dur="0.5s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
);

const Sample3 = () => (
    <svg className="w-full h-full" viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="120" width="400" height="15" fill="#1e293b" />
      <line x1="0" y1="127.5" x2="400" y2="127.5" stroke="#f59e0b" strokeDasharray="15 15" strokeWidth="2">
        <animate attributeName="stroke-dashoffset" from="30" to="0" dur="0.6s" repeatCount="indefinite" />
      </line>
      <g>
        <animateTransform attributeName="transform" type="translate" values="130,45; 130,44; 130,45" dur="1.2s" repeatCount="indefinite" />
        {/* Double Decker Bus Body */}
        <path d="M 5 5 L 125 5 Q 135 5 135 15 L 135 75 L 0 75 Q 0 5 5 5 Z" fill="#ef4444" />
        {/* Top Windows */}
        <rect x="10" y="12" width="22" height="18" rx="2" fill="#0f172a" />
        <rect x="37" y="12" width="22" height="18" rx="2" fill="#0f172a" />
        <rect x="64" y="12" width="22" height="18" rx="2" fill="#0f172a" />
        <rect x="91" y="12" width="35" height="18" rx="2" fill="#0f172a" />
        {/* Bottom Windows */}
        <rect x="10" y="40" width="22" height="20" rx="2" fill="#0f172a" />
        <rect x="37" y="40" width="22" height="20" rx="2" fill="#0f172a" />
        <rect x="64" y="40" width="22" height="20" rx="2" fill="#0f172a" />
        <rect x="91" y="40" width="25" height="20" rx="2" fill="#0f172a" />
        
        {/* Door */}
        <rect x="119" y="40" width="13" height="35" fill="#f8fafc" />
        {/* Stripe */}
        <rect x="0" y="34" width="135" height="3" fill="#f8fafc" />
        
        {/* Wheels */}
        <circle cx="25" cy="75" r="10" fill="#0f172a" />
        <circle cx="25" cy="75" r="4" fill="#94a3b8" />
        <circle cx="105" cy="75" r="10" fill="#0f172a" />
        <circle cx="105" cy="75" r="4" fill="#94a3b8" />
      </g>
    </svg>
);

export default function BusSamples() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-slate-100 mb-8">Bus SVG Samples</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
                    <h2 className="text-xl text-yellow-500 font-semibold mb-4">Sample 1: Classic Flat</h2>
                    <div className="w-full h-40 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-inner">
                        <Sample1 />
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
                    <h2 className="text-xl text-blue-500 font-semibold mb-4">Sample 2: Sleek Bullet</h2>
                    <div className="w-full h-40 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-inner">
                        <Sample2 />
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
                    <h2 className="text-xl text-red-500 font-semibold mb-4">Sample 3: Double Decker</h2>
                    <div className="w-full h-40 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-inner">
                        <Sample3 />
                    </div>
                </div>
            </div>
        </div>
    );
}
