interface PickLogoProps {
  size?: number;
  className?: string;
}

export function PickLogo({ size = 24, className = "" }: PickLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M32 44L38 108C38 110.209 39.791 112 42 112H86C88.209 112 90 110.209 90 108L96 44H32Z"
        fill="white"
        stroke="#2A9D8F"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M48 44V36C48 28.268 54.268 22 62 22H66C73.732 22 80 28.268 80 36V44"
        fill="none"
        stroke="#2A9D8F"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line x1="32" y1="44" x2="96" y2="44" stroke="#2A9D8F" strokeWidth="4"/>
      <path
        d="M56 68a8 8 0 0 0 16 0"
        stroke="#2A9D8F"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
