import { useMemo } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { Logo } from '../shared/Logo';

function formatNow() {
  const now = new Date();
  const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} | ${time}`;
}

export function AppointmentPage() {
  const meetingStamp = useMemo(() => formatNow(), []);
  const roomName = useMemo(() => `manobhav-${crypto.randomUUID()}`, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-gradient)] text-[color:var(--text-color)]">
      {/* Navbar trapezium with centered logo */}
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

      {/* Parent container */}
      <div className="flex-1 flex flex-col gap-4 px-0">
        {/* Meeting status bar */}
        <div className="relative">
          <div className="absolute left-4 top-0 opacity-50 text-sm bg-white/60 rounded-full px-3 py-1 shadow-sm w-fit">
            {meetingStamp}
          </div>
        </div>

        {/* Jitsi meeting container */}
        <div className="flex flex-1 mt-8">
          <div className="w-[80vw] bg-black/90 text-white flex items-center justify-center">
            <JitsiMeeting
              domain="meet.jit.si"
              roomName={roomName}
              configOverwrite={{ startWithAudioMuted: true, startWithVideoMuted: false, prejoinPageEnabled: true }}
              interfaceConfigOverwrite={{}}
              getIFrameRef={(iframe) => {
                if (iframe) iframe.style.height = '100%';
              }}
              loadingComponent={<div className="text-center">Loading meeting…</div>}
            />
          </div>
          <div className="flex-1 bg-white text-gray-800 flex items-center justify-center border-l border-gray-200">
            <p className="text-center px-6">1-on-1 chat messaging coming soon!</p>
          </div>
        </div>

        {/* Access control bar */}
        <div className="relative mb-6">
          <div className="absolute left-4 flex gap-3">
            <button className="px-4 py-2 rounded-full bg-gray-500 text-white shadow">Mic</button>
            <button className="px-4 py-2 rounded-full bg-gray-500 text-white shadow">Video</button>
          </div>
          <div className="absolute right-4">
            <button className="px-4 py-2 rounded-full bg-red-500 text-white shadow">Leave</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-10 flex items-center justify-center text-sm text-white" style={{ background: '#9CAF88' }}>
        Manobhav © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
