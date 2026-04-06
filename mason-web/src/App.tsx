import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { GalleryPage } from './pages/GalleryPage';
import { WhyPage } from './pages/WhyPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { ForumsPage } from './pages/ForumsPage';
import { Pricing } from './pages/Pricing';
import { ContactPage } from './pages/ContactPage';
import { NutForMePage } from './pages/NutForMePage';
import { GamePage } from './pages/GamePage';
import { LegacyRedirect } from './pages/LegacyRedirect';
import { NotFound } from './pages/NotFound';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'gallery', element: <GalleryPage /> },
      { path: 'why', element: <WhyPage /> },
      { path: 'reviews', element: <ReviewsPage /> },
      { path: 'forums', element: <ForumsPage /> },
      { path: 'pricing', element: <Pricing /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'nutforme', element: <NutForMePage /> },
      { path: 'account', element: <LegacyRedirect href="/account.html" /> },
      { path: 'order', element: <LegacyRedirect href="/order.html" /> },
      { path: 'game', element: <GamePage /> },
      { path: 'music', element: <LegacyRedirect href="/music.html" /> },
      { path: 'session', element: <LegacyRedirect href="/sessionchat.html" /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
