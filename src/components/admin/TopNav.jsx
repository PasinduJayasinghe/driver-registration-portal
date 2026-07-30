export default function TopNav({ email }) {
  const initials = (email ?? "A")
    .split("@")[0]
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 z-40 flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 bg-surface-container-lowest/85 backdrop-blur-xl border-b border-outline-variant/25">
      <div className="flex items-center md:hidden">
        <span className="text-headline-md text-primary font-bold tracking-[-0.01em]">
          Fenix Cars
        </span>
      </div>

      <div className="hidden md:flex flex-1 items-center max-w-md">
        <div className="text-body-md text-on-surface-variant/90">
          Admin Dashboard
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-label-md font-semibold tracking-[0.01em] text-on-surface">
            {email ?? "Admin"}
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-md font-bold shadow-[var(--shadow-e1)] ring-1 ring-[#191c1d]/5">
          {initials || "A"}
        </div>
      </div>
    </header>
  );
}
