import { Layout } from './components/Layout';
import { useRoute } from './router';
import { HomePage } from './pages/HomePage';
import { RoomsPage } from './pages/RoomsPage';
import { RoomPage } from './pages/room/RoomPage';
import { MeasurementsPage } from './pages/MeasurementsPage';
import { PhotosPage } from './pages/PhotosPage';
import { DesignsPage } from './pages/designs/DesignsPage';
import { DesignDetailPage } from './pages/designs/DesignDetailPage';
import { ComparePage } from './pages/designs/ComparePage';
import { BudgetPage } from './pages/budget/BudgetPage';
import { ItemPage } from './pages/budget/ItemPage';
import { VendorPage } from './pages/budget/VendorPage';
import { DocumentPage } from './pages/budget/Documents';
import { SettingsPage } from './pages/SettingsPage';
import { FloorPlanPage } from './pages/FloorPlanPage';
import { StoreProvider } from './data/store';
import { CloudProvider } from './cloud/CloudProvider';
import { SyncPage } from './pages/SyncPage';

function Page({ path }: { path: string }) {
  const roomMatch = path.match(/^\/rooms\/([\w-]+)(?:\/(\w+))?$/);
  if (roomMatch) return <RoomPage roomId={roomMatch[1]} tab={roomMatch[2]} />;

  const itemMatch = path.match(/^\/budget\/items\/([\w-]+)(?:\/(\w+))?$/);
  if (itemMatch) return <ItemPage itemId={itemMatch[1]} tab={itemMatch[2]} />;
  const vendorMatch = path.match(/^\/budget\/vendors\/([\w-]+)$/);
  if (vendorMatch) return <VendorPage vendorId={vendorMatch[1]} />;
  const docMatch = path.match(/^\/budget\/documents\/([\w-]+)$/);
  if (docMatch) return <DocumentPage docId={docMatch[1]} />;

  const compareMatch = path.match(/^\/designs\/compare\/([\w-]+)$/);
  if (compareMatch) return <ComparePage roomId={compareMatch[1]} />;
  const designMatch = path.match(/^\/designs\/([\w-]+)$/);
  if (designMatch) return <DesignDetailPage designId={designMatch[1]} />;

  switch (path) {
    case '/rooms': return <RoomsPage />;
    case '/floor-plan': return <FloorPlanPage />;
    case '/measurements': return <MeasurementsPage />;
    case '/photos': return <PhotosPage />;
    case '/designs': return <DesignsPage />;
    case '/budget': return <BudgetPage />;
    case '/settings': return <SettingsPage />;
    case '/sync': return <SyncPage />;
    default: return <HomePage />;
  }
}

export default function App() {
  const path = useRoute();
  return (
    <StoreProvider>
      <CloudProvider>
        <Layout path={path}>
          <Page path={path} />
        </Layout>
      </CloudProvider>
    </StoreProvider>
  );
}
