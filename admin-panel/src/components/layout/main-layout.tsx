
import { Sidebar } from "./sidebar";
import { Outlet } from "react-router-dom";

export function MainLayout() {
  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
