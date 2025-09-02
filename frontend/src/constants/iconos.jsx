export function getIcon(type) {
  switch (type) {
    case "diagnostico":
      return (
        <svg width="40" height="40" fill="none" viewBox="0 0 24 24">
          <rect width="24" height="24" rx="12" fill="#0099E5" />
          <path
            d="M7 13l3 3 7-7"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "terapia":
      return (
        <svg width="40" height="40" fill="none" viewBox="0 0 24 24">
          <rect width="24" height="24" rx="12" fill="#FF7F27" />
          <circle cx="12" cy="10" r="3" fill="#fff" />
          <rect x="9" y="14" width="6" height="4" rx="2" fill="#fff" />
        </svg>
      );
    case "familia":
      return (
        <svg width="40" height="40" fill="none" viewBox="0 0 24 24">
          <rect width="24" height="24" rx="12" fill="#E53935" />
          <circle cx="8" cy="10" r="2" fill="#fff" />
          <circle cx="16" cy="10" r="2" fill="#fff" />
          <rect x="6" y="14" width="12" height="4" rx="2" fill="#fff" />
        </svg>
      );
    default:
      return null;
  }
}