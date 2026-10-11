import { useEffect } from 'react';
import { match, useLocation } from './router';
import { actions, useProgress } from './store/useProgress';
import { Login } from './screens/Login';
import { AvatarPick } from './screens/AvatarPick';
import { MapScreen } from './screens/MapScreen';
import { RegionScreen } from './screens/RegionScreen';
import { ActivityScreen } from './screens/ActivityScreen';
import { ActivityDone } from './screens/ActivityDone';
import { Profile } from './screens/Profile';
import { TeacherDashboard } from './screens/TeacherDashboard';
import { BotFab } from './components/BotFab';

function StudentRoutes({ pathname, query }: ReturnType<typeof useLocation>) {
  let p;
  if ((p = match('/region/:id', pathname))) return <RegionScreen id={p.id} />;
  if ((p = match('/activity/:id', pathname))) return <ActivityScreen key={p.id} id={p.id} />;
  if ((p = match('/done/:id', pathname))) return <ActivityDone id={p.id} query={query} />;
  if (match('/profile', pathname)) return <Profile />;
  return <MapScreen />;
}

export default function App() {
  const loc = useLocation();
  const progress = useProgress();
  const loggedIn = !!progress.name;

  useEffect(() => {
    if (loggedIn) actions.checkStreak();
  }, [loggedIn]);

  if (loc.pathname === '/teacher') return <TeacherDashboard />;

  let screen;
  if (!loggedIn) screen = <Login />;
  else if (!progress.avatarId) screen = <AvatarPick />;
  else screen = <StudentRoutes {...loc} />;

  return (
    <div className="app">
      {screen}
      <BotFab />
    </div>
  );
}
