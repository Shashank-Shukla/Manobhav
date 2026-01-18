export function Footer() {
  return (
    <footer className="bg-slate-50/50 pt-20 pb-10 px-6 border-t border-slate-200 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-16">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#9CAF88] flex items-center justify-center text-white font-bold text-sm">M</div>
            <span className="font-bold text-lg text-slate-700">Manobhav</span>
          </div>
          <p className="mt-6 text-gray-500 max-w-xs leading-relaxed">
            Manobhav is dedicated to making mental healthcare accessible, approachable, and effective for everyone.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-800 mb-6">Platform</h4>
          <ul className="space-y-4 text-gray-500">
            <li><a href="#" className="hover:text-[#D6A2AD]">Browse Therapists</a></li>
            <li><a href="#" className="hover:text-[#D6A2AD]">How it Works</a></li>
            <li><a href="#" className="hover:text-[#D6A2AD]">Pricing</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-slate-800 mb-6">Company</h4>
          <ul className="space-y-4 text-gray-500">
            <li><a href="#" className="hover:text-[#D6A2AD]">About Us</a></li>
            <li><a href="#" className="hover:text-[#D6A2AD]">Careers</a></li>
            <li><a href="#" className="hover:text-[#D6A2AD]">Contact</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-200 text-sm text-gray-400">
        <p>&copy; 2026 Manobhav Wellbeing. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
      </div>
    </footer>
  );
}
