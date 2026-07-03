import React, { useRef, useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

interface BookingData {
  id: number;
  quantity: number;
  qrRedemptionToken: string;
  status: string;
  createdAt: string;
  buyer: {
    fullName: string;
    email: string;
  };
  eventTicket: {
    id: number;
    title: string;
    price: number;
  };
}

interface TicketDownloaderProps {
  booking: BookingData;
}

export const TicketDownloader: React.FC<TicketDownloaderProps> = ({ booking }) => {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    if (booking.qrRedemptionToken) {
      QRCode.toDataURL(
        booking.qrRedemptionToken,
        {
          margin: 1,
          width: 250,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        },
        (err, url) => {
          if (err) console.error('QR Generator Error: ', err);
          else setQrCodeDataUrl(url);
        }
      );
    }
  }, [booking.qrRedemptionToken]);

  const downloadPDF = async () => {
    if (!ticketRef.current) return;
    setDownloading(true);

    try {
      const element = ticketRef.current;
      const canvas = await html2canvas(element, { 
        scale: 3,
        useCORS: true,
        backgroundColor: '#09090b'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a6'
      });
      
      const imgWidth = 105; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`TikitiHub-Pass-${booking.id}.pdf`);
    } catch (error) {
      console.error("PDF generation engine failed:", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-full">
      <button 
        onClick={downloadPDF} 
        disabled={downloading || !qrCodeDataUrl}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {downloading ? <span>Downloading Ticket...</span> : <span>Download Event Pass</span>}
      </button>

      <div className="absolute overflow-hidden w-0 h-0 pointer-events-none -left-[9999px]">
        <div 
          ref={ticketRef}
          className="w-[420px] rounded-none font-sans flex flex-col justify-between relative"
          style={{ 
            boxSizing: 'border-box', 
            backgroundColor: '#09090b',
            padding: '2.5rem 2rem',
            color: '#ffffff'
          }}
        >
          <div style={{ borderBottom: '1px dashed #27272a', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="flex justify-between items-start mb-2">
              <span 
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border"
                style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.2)' }}
              >
                🎟️ Official Admission Pass
              </span>
              <span className="text-[10px] font-mono" style={{ color: '#71717a' }}>
                PASS_ID: #{booking.id}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-3" style={{ color: '#ffffff' }}>
              {booking.eventTicket?.title}
            </h2>
          </div>

          {/* Info Details Row */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-xs" style={{ color: '#a1a1aa' }}>
            <div>
              <span className="block text-[9px] uppercase tracking-wider font-bold" style={{ color: '#52525b' }}>Attendee</span>
              <span className="block text-sm font-bold mt-0.5" style={{ color: '#e4e4e7' }}>{booking.buyer?.fullName}</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider font-bold" style={{ color: '#52525b' }}>Quantity</span>
              <span className="block text-sm font-bold mt-0.5" style={{ color: '#e4e4e7' }}>{booking.quantity} Ticket(s)</span>
            </div>
          </div>

          <div 
            className="p-6 rounded-2xl flex flex-col items-center justify-center border" 
            style={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', boxSizing: 'border-box' }}
          >
            {qrCodeDataUrl ? (
              <img 
                src={qrCodeDataUrl} 
                alt="Entry Verification QR" 
                className="w-44 h-44 object-contain"
                style={{ display: 'block' }}
              />
            ) : (
              <div className="w-44 h-44 bg-zinc-100 animate-pulse rounded-lg" />
            )}
            
            <span 
              className="text-[9px] font-mono uppercase tracking-widest mt-4 block text-center break-all max-w-[280px]" 
              style={{ color: '#71717a', lineHeight: '1.4' }}
            >
              {booking.qrRedemptionToken}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};