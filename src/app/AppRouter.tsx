import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { ProtectedStaffLayout } from '../components/layout/ProtectedStaffLayout'
import { PublicLayout } from '../components/layout/PublicLayout'
import { AboutPage } from '../pages/AboutPage'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { StaffPage } from '../pages/StaffPage'
import { UnauthorizedPage } from '../pages/UnauthorizedPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedStaffLayout />}>
            <Route path="staff" element={<StaffPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
