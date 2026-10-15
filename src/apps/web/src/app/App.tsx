import { BrowserRouter, Route, Routes } from "react-router-dom";

function Inicio() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Rumbo</h1>
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
      </Routes>
    </BrowserRouter>
  );
}
