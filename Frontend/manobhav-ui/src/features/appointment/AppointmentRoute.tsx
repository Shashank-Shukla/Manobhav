import { useEffect, useMemo, useState } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { finalizeStoredBookingHold, hasStoredBookingHold, type Appointment } from '../providers';

type BookingFinalizeState =
  | { status: 'idle' | 'finalizing' }
  | { status: 'confirmed'; appointment: Appointment }
  | { status: 'error'; message: string };

export function AppointmentPage() {
  const roomName = useMemo(() => `manobhav-${crypto.randomUUID()}`, []);
  const [bookingFinalize, setBookingFinalize] = useState<BookingFinalizeState>(() =>
    hasStoredBookingHold() ? { status: 'finalizing' } : { status: 'idle' },
  );

  useEffect(() => {
    if (!hasStoredBookingHold()) {
      return;
    }

    const controller = new AbortController();
    finalizeStoredBookingHold(controller.signal)
      .then((appointment) => {
        setBookingFinalize(appointment ? { status: 'confirmed', appointment } : { status: 'idle' });
      })
      .catch((error: unknown) => {
        setBookingFinalize({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to finalize booking hold.',
        });
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-gradient)] text-[color:var(--text-color)]">
      <main className="flex-1 px-0 pb-0">
        <BookingFinalizeBanner state={bookingFinalize} />
        <div
          className="w-full bg-black overflow-hidden shadow-2xl border border-white/10"
          style={{ height: 'calc(100vh - 2.5rem)' }}
        >
          <JitsiMeeting
            domain="meet.jit.si"
            roomName={roomName}
            configOverwrite={{
              startWithAudioMuted: true,
              startWithVideoMuted: false,
              prejoinPageEnabled: true,
            }}
            interfaceConfigOverwrite={{}}
            getIFrameRef={(iframe) => {
              if (iframe) {
                iframe.style.height = '100%';
                iframe.style.width = '100%';
              }
            }}
          />
        </div>
      </main>

      <footer className="h-10 flex items-center justify-center text-sm text-white" style={{ background: '#9CAF88' }}>
        Manobhav © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

export default AppointmentPage;

function BookingFinalizeBanner({ state }: { state: BookingFinalizeState }) {
  if (state.status === 'idle') {
    return null;
  }

  const className = state.status === 'error'
    ? 'bg-rose-700 text-white'
    : 'bg-[#9CAF88] text-white';
  return (
    <div className={`flex min-h-10 items-center justify-center px-4 text-center text-sm font-semibold ${className}`}>
      {getBookingFinalizeMessage(state)}
    </div>
  );
}

function getBookingFinalizeMessage(state: BookingFinalizeState): string {
  if (state.status === 'confirmed') {
    return `Appointment confirmed - payment ${state.appointment.paymentStatus}`;
  }

  return state.status === 'error' ? state.message : 'Finalizing appointment...';
}
