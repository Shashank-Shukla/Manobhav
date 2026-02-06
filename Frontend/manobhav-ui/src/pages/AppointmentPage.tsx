import { useMemo } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { Logo } from '../shared/Logo';

export function AppointmentPage() {
  const roomName = useMemo(() => `manobhav-${crypto.randomUUID()}`, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-gradient)] text-[color:var(--text-color)]">
      {/* Navbar with centered logo inside trapezium */}
      <header className="w-full flex justify-center pt-4 pb-6 sticky top-0 z-30">
        <div
          className="px-10 py-3 shadow-lg"
          style={{
            background: 'rgba(255,255,255,0.9)',
            clipPath: 'polygon(12% 0, 88% 0, 100% 100%, 0 100%)',
          }}
        >
          <Logo />
        </div>
      </header>

      <main className="flex-1 px-4 pb-6">
        <div className="w-full h-[70vh] bg-black/90 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
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
            loadingComponent={<div className="text-center text-white py-6">Loading meeting…</div>}
          />
        </div>
      </main>

      <footer className="h-10 flex items-center justify-center text-sm text-white" style={{ background: '#9CAF88' }}>
        Manobhav © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
