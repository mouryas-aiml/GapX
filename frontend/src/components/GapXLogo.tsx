import React from "react";

interface GapXLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const GapXLogo: React.FC<GapXLogoProps> = ({
  size = 40,
  className = "",
  showText = false,
}) => {
  return (
    <div className={`gapx-logo-container ${className}`} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="gxBgGradComp" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0b1329" />
            <stop offset="50%" stopColor="#0f1f42" />
            <stop offset="100%" stopColor="#060c1c" />
          </linearGradient>
          <linearGradient id="gxCyanGradComp" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="gxElectricGradComp" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        <rect x="8" y="8" width="224" height="224" rx="52" fill="url(#gxBgGradComp)" stroke="#1e293b" strokeWidth="3" />
        <rect x="8" y="8" width="224" height="224" rx="52" stroke="url(#gxCyanGradComp)" strokeWidth="2.5" strokeOpacity="0.5" />

        {/* Reticle Focus Corner Marks */}
        <path d="M 40 56 L 40 40 L 56 40" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
        <path d="M 200 56 L 200 40 L 184 40" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
        <path d="M 40 184 L 40 200 L 56 200" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
        <path d="M 200 184 L 200 200 L 184 200" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />

        {/* Shelf Bars */}
        <rect x="42" y="88" width="156" height="5" rx="2.5" fill="#1e3a8a" opacity="0.7" />
        <rect x="42" y="142" width="156" height="5" rx="2.5" fill="#1e3a8a" opacity="0.7" />
        <rect x="42" y="194" width="156" height="6" rx="3" fill="#38bdf8" opacity="0.9" />

        {/* Shelf Facings & Detected Empty Gap */}
        <rect x="48" y="152" width="22" height="38" rx="4" fill="#0284c7" opacity="0.85" />
        <rect x="74" y="148" width="22" height="42" rx="4" fill="#38bdf8" opacity="0.95" />
        {/* GAP Highlight */}
        <rect x="100" y="148" width="40" height="42" rx="5" fill="#f43f5e" fillOpacity="0.18" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="4 3" />
        <circle cx="120" cy="169" r="3.5" fill="#f43f5e" />
        <rect x="144" y="150" width="22" height="40" rx="4" fill="#0ea5e9" opacity="0.9" />
        <rect x="170" y="154" width="22" height="36" rx="4" fill="#0284c7" opacity="0.85" />

        {/* Central Eye / Aperture Lens */}
        <circle cx="120" cy="80" r="34" stroke="url(#gxElectricGradComp)" strokeWidth="3" strokeDasharray="4 2" fill="none" opacity="0.85" />
        <circle cx="120" cy="80" r="22" stroke="#38bdf8" strokeWidth="2.5" fill="#071228" fillOpacity="0.9" />
        <circle cx="120" cy="80" r="9" fill="url(#gxCyanGradComp)" />

        {/* Crosshair X */}
        <path d="M 112 72 L 128 88" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 128 72 L 112 88" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
      </svg>

      {showText && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.03em", color: "#f8fafc" }}>
            Gap<span style={{ color: "#38bdf8" }}>X</span>
          </span>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Shelf Intelligence
          </span>
        </div>
      )}
    </div>
  );
};
