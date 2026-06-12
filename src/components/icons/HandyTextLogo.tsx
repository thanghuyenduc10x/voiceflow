import React from "react";

const HandyTextLogo = ({
  width,
  height,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) => {
  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox="0 0 930 328"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g className="logo-primary">
        <rect x="60" y="124" width="36" height="80" rx="18" />
        <rect x="116" y="84" width="36" height="160" rx="18" />
        <rect x="172" y="44" width="36" height="240" rx="18" />
        <rect x="228" y="104" width="36" height="120" rx="18" />
        <rect x="284" y="134" width="36" height="60" rx="18" />
      </g>
      <text
        x="350"
        y="164"
        dominantBaseline="central"
        fontFamily="inherit"
        fontSize="105"
        fontWeight="600"
        className="logo-primary"
      >
        VoiceFlow
      </text>
    </svg>
  );
};

export default HandyTextLogo;
