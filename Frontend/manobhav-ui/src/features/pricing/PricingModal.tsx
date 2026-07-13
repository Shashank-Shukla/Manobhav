import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';

const pricingPackages = [
  { packageName: '1 Session', originalPrice: '₹1,099', packagePrice: '₹1,099', save: '₹0', discount: '0%' },
  { packageName: '3 Sessions', originalPrice: '₹3,297', packagePrice: '₹3,149', save: '₹148', discount: '4.5% off' },
  { packageName: '6 Sessions', originalPrice: '₹6,594', packagePrice: '₹5,999', save: '₹595', discount: '9.0% off' },
  { packageName: '9 Sessions', originalPrice: '₹9,891', packagePrice: '₹8,499', save: '₹1,392', discount: '14.1% off' },
  { packageName: '12 Sessions', originalPrice: '₹13,188', packagePrice: '₹10,799', save: '₹2,389', discount: '18.1% off' },
];

type PricingModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PricingModal({ open, onClose }: PricingModalProps) {
  return (
    <Dialog
      aria-labelledby="pricing-title"
      fullWidth
      maxWidth="sm"
      onClose={onClose}
      open={open}
      PaperProps={{ style: { borderRadius: 24 } }}
    >
      <DialogContent>
        <div className="space-y-6 px-4 py-6 sm:px-6">
          <div className="text-center">
            <h2 id="pricing-title" className="text-2xl font-semibold tracking-tight text-[#2D3748]">
              Pricing packages
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5F5A55]">
              Choose the right session package for your needs.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-[#E8DDD8] bg-white shadow-sm">
            <table className="min-w-full divide-y divide-[#E8DDD8] text-left text-sm">
              <thead className="bg-[#F7F4EF] text-xs uppercase tracking-[0.18em] text-[#7A8C6A]">
                <tr>
                  <th className="px-4 py-4">Package</th>
                  <th className="px-4 py-4">Original Price</th>
                  <th className="px-4 py-4">Package Price</th>
                  <th className="px-4 py-4">You Save</th>
                  <th className="px-4 py-4">Discount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DDD8] text-[#4E453C]">
                {pricingPackages.map((item) => (
                  <tr key={item.packageName} className="even:bg-[#FBF7F2]">
                    <td className="whitespace-nowrap px-4 py-4 font-medium">{item.packageName}</td>
                    <td className="px-4 py-4">{item.originalPrice}</td>
                    <td className="px-4 py-4 text-[#243B6B] font-semibold">{item.packagePrice}</td>
                    <td className="px-4 py-4">{item.save}</td>
                    <td className="px-4 py-4 text-[#7A8C6A]">{item.discount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#9CAF88] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7A8C6A]"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
