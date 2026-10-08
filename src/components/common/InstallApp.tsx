import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallApp = () => {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!installEvent) return null;
  const install = async () => {
    const event = installEvent;
    setInstallEvent(null);
    try {
      await event.prompt();
      await event.userChoice;
    } catch (error) {
      console.error('Install prompt failed', error);
    }
  };
  return (
    <div className="no-print flex items-center justify-between gap-3 border-b border-[#cce6c6] bg-[#edf8e9] px-4 py-2 text-xs text-[#285c24]">
      <span>Pasang Kiri Supply untuk akses langsung dari layar utama.</span>
      <button onClick={() => void install()} className="flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-[#252525] px-3 font-semibold text-white">
        <Download className="h-4 w-4" /> Install aplikasi
      </button>
    </div>
  );
};
