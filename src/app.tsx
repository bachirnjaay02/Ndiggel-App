import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import AdminLayout from './components/layouts/AdminLayout';
import MemberLayout from './components/layouts/MemberLayout';
import DashboardScreen from './screens/admin/DashboardScreen';
import MembersScreen from './screens/admin/MembersScreen';
import FinanceScreen from './screens/admin/FinanceScreen';
import SettingsScreen from './screens/admin/SettingsScreen';
import HomeScreen from './screens/member/HomeScreen';
import PayScreen from './screens/member/PayScreen';
import HistoryScreen from './screens/member/HistoryScreen';
import ProfileScreen from './screens/member/ProfileScreen';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardScreen />} />
          <Route path="members"  element={<MembersScreen />} />
          <Route path="finance"  element={<FinanceScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>
        <Route path="/member" element={<MemberLayout />}>
          <Route index element={<HomeScreen />} />
          <Route path="pay"     element={<PayScreen />} />
          <Route path="history" element={<HistoryScreen />} />
          <Route path="profile" element={<ProfileScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
