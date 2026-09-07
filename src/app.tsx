import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppProviders } from "./components/providers";
import AppLayout from "./components/layout/AppLayout";
import IndexPage from "./pages/index";
import CampaignsPage from "./pages/campaigns/index";
import NewCampaignPage from "./pages/campaigns/new";
import CampaignDetailPage from "./pages/campaigns/detail";
import CustomersPage from "./pages/customers/index";
import ImportCustomersPage from "./pages/customers/import";
import CallsPage from "./pages/calls/index";
import VoiceAgentsPage from "./pages/voice-agents/index";
import NewVoiceAgentPage from "./pages/voice-agents/new";
import MonitoringPage from "./pages/monitoring";
import ReportsPage from "./pages/reports";
import SettingsPage from "./pages/settings";
import CallSimulatorPage from "./pages/call-simulator";
import NotFoundPage from "./pages/not-found";
import "./app.css";

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter basename={import.meta.env.VITE_BASE}>
        <Routes>
          <Route path="/" element={<LayoutWrapper><IndexPage /></LayoutWrapper>} />
          <Route path="/campaigns" element={<LayoutWrapper><CampaignsPage /></LayoutWrapper>} />
          <Route path="/campaigns/new" element={<LayoutWrapper><NewCampaignPage /></LayoutWrapper>} />
          <Route path="/campaigns/:id" element={<LayoutWrapper><CampaignDetailPage /></LayoutWrapper>} />
          <Route path="/customers" element={<LayoutWrapper><CustomersPage /></LayoutWrapper>} />
          <Route path="/customers/import" element={<LayoutWrapper><ImportCustomersPage /></LayoutWrapper>} />
          <Route path="/calls" element={<LayoutWrapper><CallsPage /></LayoutWrapper>} />
          <Route path="/voice-agents" element={<LayoutWrapper><VoiceAgentsPage /></LayoutWrapper>} />
          <Route path="/voice-agents/new" element={<LayoutWrapper><NewVoiceAgentPage /></LayoutWrapper>} />
          <Route path="/monitoring" element={<LayoutWrapper><MonitoringPage /></LayoutWrapper>} />
          <Route path="/reports" element={<LayoutWrapper><ReportsPage /></LayoutWrapper>} />
          <Route path="/settings" element={<LayoutWrapper><SettingsPage /></LayoutWrapper>} />
          <Route path="/call-simulator" element={<LayoutWrapper><CallSimulatorPage /></LayoutWrapper>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}
