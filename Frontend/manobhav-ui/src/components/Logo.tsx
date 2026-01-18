type LogoProps = {
  onClick?: () => void;
  className?: string;
};

export function Logo({ onClick, className = '' }: LogoProps) {
  return (
    <div onClick={onClick} className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <div className="relative w-10 h-10 overflow-hidden rounded-full bg-slate-100 flex items-center justify-center">
        <img
          src="Manobhav_Logo.png"
          alt="Manobhav"
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLDivElement | null;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div className="hidden absolute inset-0 bg-[#9CAF88] items-center justify-center text-white font-bold text-lg">
          M
        </div>
      </div>
      <span className="font-bold text-xl tracking-tight text-slate-700">Manobhav</span>
    </div>
  );
}
