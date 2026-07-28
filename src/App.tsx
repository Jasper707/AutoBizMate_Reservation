import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ServicesPage } from "./pages/ServicesPage";

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link>{" "}
        <Link to="/services">Services</Link>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;