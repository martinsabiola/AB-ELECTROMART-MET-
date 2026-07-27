import React, { useState } from 'react';

interface ABLogoProps {
  className?: string;
}

export default function ABLogo({ className = "w-9 h-9" }: ABLogoProps) {
  const [useFallback, setUseFallback] = useState(false);

  if (!useFallback) {
    return (
      <img
        src="/logo.png"
        alt="AB-ELECTROMART Logo"
        className={`${className} object-contain rounded-full`}
        onError={() => setUseFallback(true)}
      />
    );
  }

  // Extremely beautiful and authentic SVG recreation of the user's uploaded logo!
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer circular clip container */}
      <g clipPath="url(#circle-clip)">
        {/* Background base (deep charcoal) */}
        <circle cx="256" cy="256" r="240" fill="#2d3142" />

        {/* Background Colors Sections */}
        {/* Left pink background section */}
        <path d="M256 16C123.45 16 16 123.45 16 256c0 53.5 17.5 102.8 47.1 142.8L256 256V16z" fill="#ec4899" />
        <path d="M63.1 398.8C103.5 453.6 168.4 489 241.6 495.4L256 256L63.1 398.8z" fill="#f43f5e" />
        
        {/* Top right purple section */}
        <path d="M256 16v240h240C496 123.45 388.55 16 256 16z" fill="#86198f" />
        
        {/* Bottom right dark charcoal section */}
        <path d="M256 256h240c0 132.55-107.45 240-240 240V256z" fill="#312e81" />

        {/* Letter A (White outlines/accents overlay) */}
        {/* Outer and inner strokes of letter A */}
        <path
          d="M245 110 L145 420"
          stroke="#ffffff"
          strokeWidth="38"
          strokeLinecap="round"
        />
        <path
          d="M245 110 L285 240"
          stroke="#ffffff"
          strokeWidth="38"
          strokeLinecap="round"
        />
        <path
          d="M178 300 H260"
          stroke="#ffffff"
          strokeWidth="28"
          strokeLinecap="round"
        />

        {/* Letter B (Stylized curves overlay) */}
        <path
          d="M290 150 H360 C395 150 420 172 420 205 C420 238 395 255 360 255 H290"
          fill="none"
          stroke="#ffffff"
          strokeWidth="38"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M290 255 H375 C410 255 435 277 435 315 C435 353 410 375 375 375 H290"
          fill="none"
          stroke="#ffffff"
          strokeWidth="38"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M290 130 V395"
          stroke="#ffffff"
          strokeWidth="38"
          strokeLinecap="round"
        />
      </g>

      {/* Clean high-contrast dark border */}
      <circle cx="256" cy="256" r="240" stroke="#111827" strokeWidth="20" fill="none" />

      {/* Dynamic Bright Yellow Lightning Bolt right down the seam */}
      <g filter="url(#glow)">
        <path
          d="M285 180 L195 290 H265 L240 370 L330 260 H260 Z"
          fill="#fbbf24"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <defs>
        <clipPath id="circle-clip">
          <circle cx="256" cy="256" r="240" />
        </clipPath>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}
