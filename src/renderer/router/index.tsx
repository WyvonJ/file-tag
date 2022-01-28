import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TagManager from "../pages/TagManager";
import FileManager from "../pages/FileManager";

const routes = [
  {
    path: "/",
    component: <TagManager />,
  },
  {
    path: "/TagManager",
    component: <TagManager />,
  },
  {
    path: "/FileManager",
    component: <FileManager />,
  },
];

export default function Router({ children }) {
  // const navigate = useNavigate()
  return (
    <MemoryRouter>
      {
        children(() => {})
      }
      <Routes>
        {routes.map(({ path, component }) => (
          <Route path={path} element={component} key={path} />
        ))}
      </Routes>
    </MemoryRouter>
  );
}
