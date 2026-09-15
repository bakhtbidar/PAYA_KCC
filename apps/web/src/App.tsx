import { Routes, Route } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import { Shell } from './components/Shell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { RestaurantDetailPage } from './pages/RestaurantDetailPage';
import { EquipmentDetailPage } from './pages/EquipmentDetailPage';
import { UsersPage } from './pages/UsersPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { PerformMaintenancePage } from './pages/PerformMaintenancePage';
import { WorkOrderDetailPage } from './pages/WorkOrderDetailPage';

function Protected({ children, roles }: { children: React.ReactNode; roles?: ('ADMIN' | 'PROJECT_ENGINEER' | 'TECHNICIAN' | 'CUSTOMER' | 'AUTHORITY')[] }) {
  return (
    <RequireAuth roles={roles}>
      <Shell>{children}</Shell>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <DashboardPage />
          </Protected>
        }
      />
      <Route
        path="/customers"
        element={
          <Protected roles={['ADMIN', 'PROJECT_ENGINEER']}>
            <CustomersPage />
          </Protected>
        }
      />
      <Route
        path="/customers/:id"
        element={
          <Protected roles={['ADMIN', 'PROJECT_ENGINEER']}>
            <CustomerDetailPage />
          </Protected>
        }
      />
      <Route
        path="/restaurants/:id"
        element={
          <Protected>
            <RestaurantDetailPage />
          </Protected>
        }
      />
      <Route
        path="/equipment/:id"
        element={
          <Protected>
            <EquipmentDetailPage />
          </Protected>
        }
      />
      <Route
        path="/work-orders/:id"
        element={
          <Protected>
            <WorkOrderDetailPage />
          </Protected>
        }
      />
      <Route
        path="/perform-maintenance/:workOrderId"
        element={
          <RequireAuth roles={['ADMIN', 'PROJECT_ENGINEER', 'TECHNICIAN']}>
            <PerformMaintenancePage />
          </RequireAuth>
        }
      />
      <Route
        path="/users"
        element={
          <Protected roles={['ADMIN']}>
            <UsersPage />
          </Protected>
        }
      />
      <Route
        path="/audit-log"
        element={
          <Protected roles={['ADMIN', 'PROJECT_ENGINEER']}>
            <AuditLogPage />
          </Protected>
        }
      />
    </Routes>
  );
}
