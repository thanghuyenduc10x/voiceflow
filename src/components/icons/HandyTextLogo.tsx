import React from "react";
import badge from "../../assets/voiceflow-badge.png";

const HandyTextLogo = ({
  width = 160,
  height,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) => {
  const badgeSize = height ?? Math.round(width * 0.34);
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: Math.round(badgeSize * 0.3),
      }}
    >
      <img
        src={badge}
        alt="VoiceFlow"
        width={badgeSize}
        height={badgeSize}
        style={{ borderRadius: Math.round(badgeSize * 0.22), display: "block" }}
      />
      <span
        style={{
          fontSize: Math.round(badgeSize * 0.6),
          fontWeight: 600,
          color: "var(--color-text)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        VoiceFlow
      </span>
    </div>
  );
};

export default HandyTextLogo;
