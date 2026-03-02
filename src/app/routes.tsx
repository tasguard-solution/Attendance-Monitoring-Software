import { createBrowserRouter } from "react-router";
import { OrgLogin } from "./components/OrgLogin";
import { EmployeeLogin } from "./components/EmployeeLogin";
import { OrgDashboard } from "./components/OrgDashboard";
import { EmployeeScanner } from "./components/EmployeeScanner";
import { LandingPage } from "./components/LandingPage";
import { AdminLogin } from "./components/AdminLogin";
import { AdminDashboard } from "./components/AdminDashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/org/login",
    Component: OrgLogin,
  },
  {
    path: "/org/dashboard",
    Component: OrgDashboard,
  },
  {
    path: "/employee/login",
    Component: EmployeeLogin,
  },
  {
    path: "/employee/scanner",
    Component: EmployeeScanner,
  },
  {
    path: "/admin/login-page",
    Component: AdminLogin,
  },
  {
    path: "/admin/dashboard",
    Component: AdminDashboard,
  },
]);
