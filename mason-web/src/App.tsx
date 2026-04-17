import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SiteOnePage } from './pages/SiteOnePage';
import { GamePage } from './pages/GamePage';
import { AccountPage } from './pages/AccountPage';
import { LegacyRedirect } from './pages/LegacyRedirect';
import { NotFound } from './pages/NotFound';
import { SchedulePage } from './pages/SchedulePage';
import { UserTicketsPage } from './pages/UserTicketsPage';
import { DiscographyPage } from './pages/DiscographyPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <SiteOnePage /> },
      { path: 'gallery', element: <Navigate to={{ pathname: '/', hash: 'gallery' }} replace /> },
      { path: 'why', element: <Navigate to={{ pathname: '/', hash: 'about' }} replace /> },
      { path: 'reviews', element: <Navigate to={{ pathname: '/', hash: 'reviews' }} replace /> },
      { path: 'forums', element: <Navigate to={{ pathname: '/', hash: 'forums' }} replace /> },
      { path: 'pricing', element: <Navigate to={{ pathname: '/', hash: 'pricing' }} replace /> },
      { path: 'contact', element: <Navigate to={{ pathname: '/', hash: 'contact' }} replace /> },
      { path: 'nutforme', element: <Navigate to={{ pathname: '/', hash: 'music' }} replace /> },
      { path: 'account', element: <AccountPage /> },
      { path: 'tickets', element: <UserTicketsPage /> },
      { path: 'order', element: <LegacyRedirect href="/order.html" /> },
      { path: 'game', element: <GamePage /> },
      { path: 'schedule', element: <SchedulePage /> },
      { path: 'discography', element: <DiscographyPage /> },
      { path: 'music', element: <LegacyRedirect href="/music.html" /> },
      { path: 'session', element: <LegacyRedirect href="/sessionchat.html" /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
