import { useMemo } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';

export function AppointmentPage() {
  const roomName = useMemo(() => `manobhav-${crypto.randomUUID()}`, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-gradient)] text-[color:var(--text-color)]">
      <main className="flex-1 px-0 pb-0">
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
