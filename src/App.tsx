import { Layout } from './components/Layout';
import { useRoute } from './router';
import { HomePage } from './pages/HomePage';
import { RoomsPage } from './pages/RoomsPage';
import { RoomPage } from './pages/room/RoomPage';
import { MeasurementsPage } from './pages/MeasurementsPage';
import { PhotosPage } from './pages/PhotosPage';
import { DesignsPage } from './pages/DesignsPage';
import { BudgetPage } from './pages/BudgetPage';
import { SettingsPage } from './pages/SettingsPage';
import { StoreProvider } from './data/store';

function Page({ path }: { path: string }) {
  const roomMatch = path.match(/^\/rooms\/([\w-]+)(?:\/(\w+))?$/);
  if (roomMatch) return <RoomPage roomId={roomMatch[1]} tab={roomMatch[2]} />;

  switch (path) {
    case '/rooms': return <RoomsPage />;
    case '/measurements': return <MeasurementsPage />;
    case '/photos': return <PhotosPage />;
    case '/designs': return <DesignsPage />;
    case '/budget': return <BudgetPage />;
    case '/settings': return <SettingsPage />;
    default: return <HomePage />;
  }
}

export default function App() {
  const path = useRoute();
  return (
    <StoreProvider>
      <Layout path={path}>
        <Page path={path} />
      </Layout>
    </StoreProvider>
  );
}
