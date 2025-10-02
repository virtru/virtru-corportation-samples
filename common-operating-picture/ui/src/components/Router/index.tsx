import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { pages, paths } from './config';
import { Dashboard } from '@/pages/Dashboard';

const configRoutes = pages.map(p => ({
  path: p.path,
  element: p.component ? <p.component /> : null,
}));

const browserRouter = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      // todo: add this to the config with a hideFromMenu flag or something similar
      {
        path: paths.Home,
        element: <Dashboard />,
      },
      ...configRoutes,
    ],
  },
]);

export function Router() {
  return <RouterProvider router={browserRouter} />;
}
