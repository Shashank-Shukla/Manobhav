import { useMemo } from 'react';
import { AlertTriangle, FileText, LockKeyhole, RotateCcw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Text } from '../../shared/primitives/Text';
import { Terms } from './components/Terms';
import { Privacy } from './components/Privacy';
import { Refunds } from './components/Refunds';

type PanelKey = 'terms' | 'privacy' | 'refunds';

const panelOrder: PanelKey[] = ['terms', 'privacy', 'refunds'];

const panelMeta: Record<
  PanelKey,
  {
    label: string;
    helper: string;
    icon: typeof FileText;
    accent: string;
  }
> = {
  terms: {
    label: 'Terms',
    helper: 'Use, bookings, and responsibilities',
    icon: FileText,
    accent: '#efd5cb',
  },
  privacy: {
    label: 'Privacy',
    helper: 'Data, confidentiality, and consent',
    icon: LockKeyhole,
    accent: '#cfe0df',
  },
  refunds: {
    label: 'Refunds',
    helper: 'Cancellation and refund timelines',
    icon: RotateCcw,
    accent: '#d9d3a8',
  },
};

export function DisclaimerPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activePanel = useMemo<PanelKey | null>(() => {
    const panel = searchParams.get('panel');
    return panelOrder.includes(panel as PanelKey) ? (panel as PanelKey) : null;
  }, [searchParams]);

  const setActivePanel = (panel: PanelKey) => {
    setSearchParams({ panel }, { replace: true });
  };

  const clearActivePanel = () => {
    setSearchParams({}, { replace: true });
  };

  const activePanelTitle = activePanel ? panelMeta[activePanel].label : null;

  const renderModal = (className: string) => {
    if (activePanel === 'terms') {
      return <Terms mode="modal" onClose={clearActivePanel} className={className} />;
    }

    if (activePanel === 'privacy') {
      return <Privacy mode="modal" onClose={clearActivePanel} className={className} />;
    }

    if (activePanel === 'refunds') {
      return <Refunds mode="modal" onClose={clearActivePanel} className={className} />;
    }

    return null;
  };

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(circle at 14% 20%, rgba(214,162,173,0.38), transparent 32%), radial-gradient(circle at 84% 18%, rgba(168,209,198,0.34), transparent 30%), radial-gradient(circle at 76% 84%, rgba(217,211,168,0.34), transparent 28%), linear-gradient(135deg, #f1d8dd 0%, #f3e4d8 28%, #d8ebe7 58%, #e9e2be 100%)',
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,250,247,0.24),rgba(255,255,255,0.08))]" />
        <div className="absolute left-[7%] top-[14%] h-[16rem] w-[16rem] rounded-full bg-[#d6a2ad]/25 blur-[5rem]" />
        <div className="absolute right-[6%] top-[12%] h-[15rem] w-[15rem] rounded-full bg-[#cfe0df]/26 blur-[5rem]" />
        <div className="absolute bottom-[10%] left-[22%] h-[14rem] w-[14rem] rounded-full bg-[#d9d3a8]/24 blur-[4.5rem]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col justify-center px-4 pb-28 pt-24 sm:px-6 sm:pb-32 sm:pt-28 md:justify-start md:pb-6">
        <div
          className="animate-disclaimer-nudge mx-auto w-full max-w-4xl flex-none rounded-[1rem] border border-white/35 bg-[linear-gradient(160deg,rgba(255,248,243,0.5),rgba(255,255,255,0.18))] p-4"
          style={{
            backdropFilter: 'blur(1.2rem)',
            WebkitBackdropFilter: 'blur(1.2rem)',
            boxShadow: 'inset 0 0 0 0.3125rem rgba(255,251,247,0.68), 0 1rem 2rem rgba(62,54,80,0.1)',
          }}
        >
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#efd5cb] text-[#243b6b] shadow-[0_1rem_1.8rem_rgba(36,59,107,0.08)]">
              <AlertTriangle size={20} />
            </div>
            <div>
              <Text variant="body" className="font-semibold text-[#243b6b]">
                Important
              </Text>
              <Text variant="body" className="mt-1 text-sm text-[#5f6770]">
                Manobhav is not a crisis intervention website. If you are in immediate danger or experiencing a mental health crisis, please seek help from the nearest emergency services.
              </Text>
            </div>
          </div>
        </div>

        <div className="relative mt-4 hidden min-h-0 flex-1 overflow-hidden md:block">
          <div
            className={`hidden h-full min-h-0 gap-4 transition-all duration-500 ease-in-out md:grid md:grid-cols-3 ${activePanel ? 'scale-[0.985] blur-[0.08rem]' : 'scale-100'}`}
            aria-hidden={activePanel ? 'true' : 'false'}
          >
            <Terms onOpen={() => setActivePanel('terms')} />
            <Privacy onOpen={() => setActivePanel('privacy')} />
            <Refunds onOpen={() => setActivePanel('refunds')} />
          </div>
        </div>
      </div>

      {activePanel && (
        <div
          className="fixed inset-0 z-50 hidden md:block"
          aria-hidden="false"
          onClick={clearActivePanel}
        >
          <div className="absolute inset-0 bg-[rgba(255,247,244,0.28)] backdrop-blur-[0.5rem]" />

          <div className="absolute inset-x-0 bottom-[4%] top-[10rem] flex items-center justify-center px-6">
            <div
              onClick={(event) => event.stopPropagation()}
              className="relative z-10 flex h-full w-[min(100%,56rem)]"
              aria-label={activePanelTitle ? `${activePanelTitle} expanded policy` : 'Expanded policy'}
            >
              {renderModal('h-full animate-in fade-in duration-500')}
            </div>
          </div>
        </div>
      )}

      {activePanel && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          aria-hidden="false"
          onClick={clearActivePanel}
        >
          <div className="absolute inset-0 bg-[rgba(255,247,244,0.24)] backdrop-blur-[0.45rem]" />

          <div
            onClick={(event) => event.stopPropagation()}
            className="absolute inset-x-0 bottom-0 z-10 mx-auto h-[calc(80dvh+5.5rem)] w-full max-w-3xl"
            aria-label={activePanelTitle ? `${activePanelTitle} expanded policy` : 'Expanded policy'}
          >
            <div className="absolute inset-x-4 top-0 z-0 flex h-[1dvh] items-end gap-[0.1rem] overflow-visible">
              {panelOrder.map((panel, index) => {
                const { label } = panelMeta[panel];
                const isActive = activePanel === panel;
                const { accent } = panelMeta[panel];

                return (
                  <button
                    key={`mobile-active-${panel}`}
                    type="button"
                    onClick={() => setActivePanel(panel)}
                    className={`relative flex min-h-[4.35rem] min-w-0 flex-1 items-center justify-center rounded-t-[1.15rem] px-3 pb-3 pt-3 text-center transition-all duration-500 ease-in-out ${
                      isActive
                        ? 'translate-y-0 text-[#243b6b]'
                        : 'translate-y-[0.95rem] text-[#676f79] opacity-75'
                    }`}
                    style={{
                      backdropFilter: 'blur(1rem)',
                      WebkitBackdropFilter: 'blur(1rem)',
                      background: isActive
                        ? `linear-gradient(180deg, rgba(255,252,248,0.96) 0%, ${accent}70 100%)`
                        : `linear-gradient(180deg, rgba(255,250,245,0.74) 0%, ${accent}2a 100%)`,
                      boxShadow: isActive
                        ? 'inset 0 0 0 0.3125rem rgba(255,251,247,0.76), 0 0.9rem 1.8rem rgba(62,54,80,0.1)'
                        : 'inset 0 0 0 0.3125rem rgba(255,251,247,0.52), 0 0.55rem 1.1rem rgba(62,54,80,0.06)',
                      zIndex: isActive ? 4 : 2 - index,
                    }}
                  >
                    <span
                      className="absolute inset-x-[18%] top-[0.55rem] h-[0.32rem] rounded-full opacity-80"
                      style={{ backgroundColor: accent }}
                    />
                    {isActive && (
                      <>
                        <span className="absolute bottom-[-0.45rem] left-[0.3rem] right-[0.3rem] h-[0.45rem] rounded-b-[0.9rem] bg-[rgba(255,252,248,0.96)]" />
                        <span className="absolute bottom-[-1.05rem] left-1/2 h-[1.05rem] w-[0.16rem] -translate-x-1/2 rounded-full bg-white/85 shadow-[0_0_0.7rem_rgba(255,255,255,0.7)]" />
                      </>
                    )}
                    <span className="text-sm font-semibold">{label}</span>
                  </button>
                );
              })}
            </div>

            {renderModal('absolute inset-x-0 bottom-0 h-[80dvh] rounded-b-none rounded-t-[1rem] pt-[1.25rem] animate-in slide-in-from-bottom-4 duration-500')}
          </div>
        </div>
      )}

      {!activePanel && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 md:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-2">
          {panelOrder.map((panel, index) => {
            const { label } = panelMeta[panel];
            const isActive = activePanel === panel;
            const { accent } = panelMeta[panel];

            return (
              <button
                key={panel}
                type="button"
                onClick={() => setActivePanel(panel)}
                className={`relative flex min-h-[4.6rem] items-center justify-center rounded-t-[1rem] px-3 pb-4 pt-3 text-center transition-all duration-500 ease-in-out ${
                  isActive
                    ? 'translate-y-0 bg-[rgba(255,252,248,0.84)] text-[#243b6b]'
                    : 'translate-y-[1.1rem] bg-[rgba(255,248,243,0.5)] text-[#5f6770]'
                }`}
                style={{
                  backdropFilter: 'blur(1rem)',
                  WebkitBackdropFilter: 'blur(1rem)',
                  background: `linear-gradient(180deg, rgba(255,252,248,0.92) 0%, ${accent}42 100%)`,
                  boxShadow: 'inset 0 0 0 0.3125rem rgba(255,251,247,0.72), 0 0.9rem 1.8rem rgba(62,54,80,0.1)',
                  zIndex: isActive ? 3 : 2 - index,
                }}
              >
                <span
                  className="absolute inset-x-[18%] top-[0.6rem] h-[0.32rem] rounded-full opacity-80"
                  style={{ backgroundColor: accent }}
                />
                <span className="text-sm font-semibold">{label}</span>
              </button>
            );
          })}
        </div>
        </div>
      )}
    </div>
  );
}

export default DisclaimerPage;
