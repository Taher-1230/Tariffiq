import { Route, Routes } from "react-router-dom"

import { AuthProvider } from "@/context/AuthContext"
import { AppLayout } from "@/components/layout/AppLayout"
import ClassifyPage from "@/pages/ClassifyPage"
import HistoryPage from "@/pages/HistoryPage"
import ReferencePage from "@/pages/ReferencePage"

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ClassifyPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/reference" element={<ReferencePage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
