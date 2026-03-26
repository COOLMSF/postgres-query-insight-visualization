import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "@/pages/Home";
import SessionDetail from "@/pages/SessionDetail";
import Compare from "@/pages/Compare";
import History from "@/pages/History";
import Statistics from "@/pages/Statistics";
import PGSourceCompile from "@/pages/PGSourceCompile";
import DashboardLayout from "@/components/DashboardLayout";

function Router() {
  return (
    <Switch>
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/session/:id" component={SessionDetail} />
            <Route path="/compare" component={Compare} />
            <Route path="/history" component={History} />
            <Route path="/statistics" component={Statistics} />
            <Route path="/pg-source" component={PGSourceCompile} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
