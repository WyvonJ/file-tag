import { MemoryRouter, Routes, Route } from 'react-router-dom';
import App from "../App";

export default function Router() {

  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<App/>}>
        </Route>
      </Routes>
    </MemoryRouter>
  );
}
