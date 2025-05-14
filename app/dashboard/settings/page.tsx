"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  Building,
  Mail,
  Key,
  Globe,
  Layers,
  Webhook,
  BellRing,
  ShieldCheck,
  Save,
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("account");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and email marketing preferences
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="md:w-64 space-y-1">
          <SettingsNavButton
            icon={<User className="h-4 w-4" />}
            label="Account"
            isActive={activeTab === "account"}
            onClick={() => setActiveTab("account")}
          />
          <SettingsNavButton
            icon={<Building className="h-4 w-4" />}
            label="Organization"
            isActive={activeTab === "organization"}
            onClick={() => setActiveTab("organization")}
          />
          <SettingsNavButton
            icon={<Mail className="h-4 w-4" />}
            label="Email Settings"
            isActive={activeTab === "email"}
            onClick={() => setActiveTab("email")}
          />
          <SettingsNavButton
            icon={<Key className="h-4 w-4" />}
            label="API Keys"
            isActive={activeTab === "api"}
            onClick={() => setActiveTab("api")}
          />
          <SettingsNavButton
            icon={<Globe className="h-4 w-4" />}
            label="Custom Domain"
            isActive={activeTab === "domain"}
            onClick={() => setActiveTab("domain")}
          />
          <SettingsNavButton
            icon={<Layers className="h-4 w-4" />}
            label="Integrations"
            isActive={activeTab === "integrations"}
            onClick={() => setActiveTab("integrations")}
          />
          <SettingsNavButton
            icon={<Webhook className="h-4 w-4" />}
            label="Webhooks"
            isActive={activeTab === "webhooks"}
            onClick={() => setActiveTab("webhooks")}
          />
          <SettingsNavButton
            icon={<BellRing className="h-4 w-4" />}
            label="Notifications"
            isActive={activeTab === "notifications"}
            onClick={() => setActiveTab("notifications")}
          />
          <SettingsNavButton
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Security"
            isActive={activeTab === "security"}
            onClick={() => setActiveTab("security")}
          />
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "account" && <AccountSettings />}
          {activeTab === "email" && <EmailSettings />}
          {activeTab === "api" && <ApiKeySettings />}
          {activeTab === "organization" && <OrganizationSettings />}
          {activeTab === "domain" && <DomainSettings />}
          {activeTab === "integrations" && <IntegrationsSettings />}
          {activeTab === "webhooks" && <WebhookSettings />}
          {activeTab === "notifications" && <NotificationSettings />}
          {activeTab === "security" && <SecuritySettings />}
        </div>
      </div>
    </div>
  );
}

interface SettingsNavButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function SettingsNavButton({
  icon,
  label,
  isActive,
  onClick,
}: SettingsNavButtonProps) {
  return (
    <button
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm w-full ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary"
      }`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Different settings sections
function AccountSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>
          Update your personal account information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              defaultValue="John Doe"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border rounded-md"
              defaultValue="john.doe@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border rounded-md"
              placeholder="••••••••••••"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to keep your current password
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="timezone">
              Timezone
            </label>
            <select
              id="timezone"
              className="w-full px-3 py-2 border rounded-md"
              defaultValue="UTC"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmailSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Settings</CardTitle>
        <CardDescription>
          Configure your email sending preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="from-name">
              Default From Name
            </label>
            <input
              id="from-name"
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              defaultValue="EmailPro Marketing"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="reply-to">
              Default Reply-To Email
            </label>
            <input
              id="reply-to"
              type="email"
              className="w-full px-3 py-2 border rounded-md"
              defaultValue="support@example.com"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="footer">
              Default Email Footer
            </label>
            <textarea
              id="footer"
              className="w-full px-3 py-2 border rounded-md h-24"
              defaultValue="© 2023 Email Pro Marketing. All rights reserved."
            />
          </div>
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="track-opens"
            className="mt-1"
            defaultChecked
          />
          <div>
            <label className="font-medium" htmlFor="track-opens">
              Track Email Opens
            </label>
            <p className="text-sm text-muted-foreground">
              Collect data on whether recipients open your emails
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="track-clicks"
            className="mt-1"
            defaultChecked
          />
          <div>
            <label className="font-medium" htmlFor="track-clicks">
              Track Link Clicks
            </label>
            <p className="text-sm text-muted-foreground">
              Collect data on links clicked within your emails
            </p>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ApiKeySettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>
          Generate and manage API keys for programmatic access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button>Generate New API Key</Button>
        <p className="text-sm text-muted-foreground">
          No API keys have been generated yet.
        </p>
      </CardContent>
    </Card>
  );
}

function OrganizationSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
        <CardDescription>Manage your organization profile</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="org-name">
              Organization Name
            </label>
            <input
              id="org-name"
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              defaultValue="Acme Inc."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="website">
              Website
            </label>
            <input
              id="website"
              type="url"
              className="w-full px-3 py-2 border rounded-md"
              defaultValue="https://example.com"
            />
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DomainSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Domain Settings</CardTitle>
        <CardDescription>
          Configure custom domains for better deliverability
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          No custom domains configured. Add a domain to improve email
          deliverability.
        </p>
        <Button>Add Custom Domain</Button>
      </CardContent>
    </Card>
  );
}

function IntegrationsSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>
          Connect with other services and platforms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Available integrations will appear here.
        </p>
      </CardContent>
    </Card>
  );
}

function WebhookSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhooks</CardTitle>
        <CardDescription>
          Manage webhook endpoints for real-time events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button>Add Webhook Endpoint</Button>
        <p className="text-sm text-muted-foreground">No webhooks configured.</p>
      </CardContent>
    </Card>
  );
}

function NotificationSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>
          Manage how and when you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="campaign-complete"
            className="mt-1"
            defaultChecked
          />
          <div>
            <label className="font-medium" htmlFor="campaign-complete">
              Campaign Completion
            </label>
            <p className="text-sm text-muted-foreground">
              Get notified when an email campaign finishes sending
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="import-complete"
            className="mt-1"
            defaultChecked
          />
          <div>
            <label className="font-medium" htmlFor="import-complete">
              Import Completion
            </label>
            <p className="text-sm text-muted-foreground">
              Get notified when a contact import completes
            </p>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SecuritySettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>Manage your account security settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2">
          <input type="checkbox" id="two-factor" className="mt-1" />
          <div>
            <label className="font-medium" htmlFor="two-factor">
              Two-Factor Authentication
            </label>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button variant="destructive">Log Out All Devices</Button>
        </div>
      </CardContent>
    </Card>
  );
}
