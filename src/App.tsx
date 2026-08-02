import AuthProvider from "./providers/AuthProvider";
import ThemeProvider from "./providers/ThemeProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./containers/layout/Layout";

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary title="Neo4j Browser 3D crashed">
        <AuthProvider>
          <Layout />
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
