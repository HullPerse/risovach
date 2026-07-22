import { Outlet } from "@tanstack/react-router";

function App() {
  return (
    <main
      className="h-screen w-screen bg-background relative overflow-hidden"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='1.5' fill='%23000000' fill-opacity='0.5' /%3E%3C/svg%3E")`,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Outlet />
    </main>
  );
}

export default App;
