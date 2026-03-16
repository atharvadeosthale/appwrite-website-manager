import { HashRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'
import { RefreshContext, useRefreshProvider } from './hooks/useRefreshKey'
import { AiTasksProvider } from './hooks/useAiTasks'
import { CoverAuditProvider } from './hooks/useCoverAudit'
import WelcomePage from './pages/WelcomePage'
import DashboardLayout from './components/layout/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import AuthorListPage from './pages/AuthorListPage'
import CreateAuthorPage from './pages/CreateAuthorPage'
import NotionImportPage from './pages/NotionImportPage'
import SanitizePage from './pages/SanitizePage'
import CategoryListPage from './pages/CategoryListPage'
import BlogListPage from './pages/BlogListPage'
import CreateBlogPage from './pages/CreateBlogPage'
import EditBlogPage from './pages/EditBlogPage'
import BulkGenerationPage from './pages/BulkGenerationPage'
import SetupWizardPage from './pages/SetupWizardPage'
import { AITaskLauncher } from './components/shared/AITaskLauncher'

function App(): React.JSX.Element {
  const refreshValue = useRefreshProvider()

  return (
    <RefreshContext.Provider value={refreshValue}>
      <ToastProvider>
        <AiTasksProvider>
          <CoverAuditProvider>
            <HashRouter>
              <Routes>
                <Route path="/" element={<WelcomePage />} />
                <Route path="/setup" element={<SetupWizardPage />} />
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="authors" element={<AuthorListPage />} />
                  <Route path="authors/create" element={<CreateAuthorPage />} />
                  <Route path="blogs" element={<BlogListPage />} />
                  <Route path="blogs/create" element={<CreateBlogPage />} />
                  <Route path="blogs/:slug/edit" element={<EditBlogPage />} />
                  <Route path="bulk-generation" element={<BulkGenerationPage />} />
                  <Route path="import-notion" element={<NotionImportPage />} />
                  <Route path="sanitize" element={<SanitizePage />} />
                  <Route path="categories" element={<CategoryListPage />} />
                </Route>
              </Routes>
            </HashRouter>
            <AITaskLauncher />
          </CoverAuditProvider>
        </AiTasksProvider>
      </ToastProvider>
    </RefreshContext.Provider>
  )
}

export default App
