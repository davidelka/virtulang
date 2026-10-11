import { useEffect, useState } from 'react';
import { ar } from '../i18n/ar';
import { Tx, type Sel } from '../components/Tx';
import { navigate } from '../router';
import { useProgress } from '../store/useProgress';
import { TopBar } from '../components/TopBar';
import { DesertMap } from '../components/DesertMap';

export function MapScreen() {
  const progress = useProgress();
  const [toast, setToast] = useState<Sel | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      <TopBar />
      <p className="map-hello"><Tx t={(d) => d.map.hello(progress.name)} /></p>
      <div className="map-wrap">
        <DesertMap
          progress={progress}
          onRegion={(region, locked) =>
            locked ? setToast(() => (d: typeof ar) => d.map.lockedToast(region.requiredLevel!)) : navigate(`/region/${region.id}`)
          }
        />
      </div>
      {toast && (
        <div className="toast" role="status">
          <Tx t={toast} />
        </div>
      )}
    </>
  );
}
