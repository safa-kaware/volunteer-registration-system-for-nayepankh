import React, { useRef } from 'react';
import { Award, Download, Printer, CheckCircle, Heart } from 'lucide-react';

interface VerificationLetterProps {
  volunteerName: string;
  volunteerCity: string;
  onClose: () => void;
}

export default function VerificationLetter({ volunteerName, volunteerCity, onClose }: VerificationLetterProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;

    if (printContent) {
      // Create a temporary print frame or use simple print styling
      const style = `
        <style>
          @media print {
            body { background: white; color: black; font-family: 'Inter', sans-serif; padding: 20px; }
            .no-print { display: none !important; }
            .certificate-border { border: 8px double #10b981 !important; padding: 40px !important; margin: 0 !important; }
            .decor-corner { display: none !important; }
          }
        </style>
      `;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>NayePankh Foundation Appreciation Certification</title>
              <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
              ${style}
            </head>
            <body>
              <div class="p-8">${printContent}</div>
              <script>
                window.onload = function() {
                  window.print();
                  window.close();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 min-h-screen z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-emerald-100 overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in duration-300">
        
        {/* Modal Toolbar - Not Printed */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-800">Registration Successful!</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Letter
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Certificate Container */}
        <div className="p-8 md:p-12 overflow-y-auto max-h-[80vh] bg-slate-50">
          <div 
            ref={printRef}
            className="certificate-border relative bg-white border-8 border-double border-emerald-600 p-8 md:p-10 rounded-lg shadow-sm text-slate-800"
          >
            {/* Elegant Corner Ornaments */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-emerald-600/30"></div>
            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-emerald-600/30"></div>
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-emerald-600/30"></div>
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-emerald-600/30"></div>

            {/* Header */}
            <div className="text-center mb-6">
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-emerald-600 font-semibold mb-1 block">OFFICIAL WELCOME LETTER</span>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 font-sans">NayePankh Foundation</h1>
              <p className="text-xs text-slate-500 mt-1 font-mono italic">Regd No. IV-129 | Empowering Underprivileged Communities</p>
              <div className="w-24 h-0.5 bg-emerald-500 mx-auto mt-3"></div>
            </div>

            {/* Date and Ref */}
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mb-6">
              <span>REF: NP/VOL/{Math.floor(Math.random() * 90000 + 10000)}</span>
              <span>Date: {currentDate}</span>
            </div>

            {/* Letter Content */}
            <div className="space-y-4 text-justify text-[13px] leading-relaxed text-slate-700">
              <p className="font-semibold text-slate-900">Dear {volunteerName},</p>
              
              <p>
                On behalf of the entire family at <strong>NayePankh Foundation</strong>, we would like to express our 
                heartfelt appreciation for registering as a volunteer. We are absolutely thrilled to welcome you to our growing 
                cause in <strong>{volunteerCity}</strong>!
              </p>

              <p>
                At NayePankh Foundation, we believe that change begins with action. Volunteers like you form the backbone of 
                our societal missions. Your willingness to offer your precious skills, energy, and advocacy represents a powerful 
                milestone in our ongoing initiatives. Together, we shall work hand-in-hand to elevate menstrual health, bridge educational 
                divides, lead food distribution drives, and create lasting impact for needy groups.
              </p>

              <p>
                Our core community coordinator will get in touch with you shortly to orient you through your scheduled tasks, 
                upcoming logistical planning, and virtual training events. We have successfully secured your credentials and verified 
                your application.
              </p>

              <p className="italic text-slate-600">
                "Small acts, when multiplied by millions of people, can transform the world." Thank you once again for taking 
                this noble leap.
              </p>
            </div>

            {/* Signatures & Seal */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
              
              {/* Gold Badge */}
              <div className="flex items-center gap-2 bg-amber-50/50 border border-amber-200/50 rounded-xl px-4 py-2">
                <Award className="w-8 h-8 text-amber-500 shrink-0" />
                <div className="text-left">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-amber-700 block">FOUNDATION CERTIFIED</span>
                  <span className="text-[11px] font-semibold text-amber-800">Official Volunteer</span>
                </div>
              </div>

              {/* Signatory */}
              <div className="text-center sm:text-right">
                <div className="font-serif italic text-emerald-800 text-lg select-none mb-1">Prashant Shukla</div>
                <div className="w-32 h-px bg-slate-200 sm:ml-auto"></div>
                <p className="text-[11px] font-bold text-slate-900 mt-1">Prashant Shukla</p>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">Founder President</p>
                <p className="text-[8px] text-slate-400">NayePankh Foundation</p>
              </div>

            </div>

            {/* Foot note */}
            <p className="text-center text-[10px] text-slate-400 mt-6 pt-4 border-t border-slate-50 font-mono">
              Certified Registration Entity • Securely Encrypted At Rest • www.nayepankh.org
            </p>
          </div>
        </div>

        {/* Modal Footer - Not Printed */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500 no-print">
          <div className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>NayePankh Volunteer System v2.0 - Active</span>
          </div>
          <button 
            onClick={onClose}
            className="text-emerald-700 font-semibold hover:underline cursor-pointer"
          >
            Start exploring systems
          </button>
        </div>

      </div>
    </div>
  );
}
