import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar.jsx';
import AvanceVuelos from './pages/AvanceVuelos.jsx';
import DetalleVuelo from './pages/DetalleVuelo.jsx';
import DetalleAWB from './pages/DetalleAWB.jsx';

export default function App() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/vuelos" replace />} />
          <Route path="/vuelos" element={<AvanceVuelos />} />
          <Route path="/vuelos/:manifiesto" element={<DetalleVuelo />} />
          <Route path="/awb/:id" element={<DetalleAWB />} />
        </Routes>
      </main>
    </div>
  );
}
