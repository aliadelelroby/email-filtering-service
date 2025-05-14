"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileSpreadsheet,
  Database,
  ArrowUpDown,
  Filter,
  Download,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

interface Metric {
  name: string;
  description: string;
  value: number;
  status: "success" | "warning" | "error";
}

interface DashboardMetrics {
  totalContacts: number;
  activeContacts: number;
  dataFieldsCount: number;
  lastImport: string | null;
  dataQuality: Metric[];
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/metrics");

        if (!response.ok) {
          throw new Error("Failed to fetch metrics");
        }

        const data = await response.json();
        setMetrics(data.metrics);
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  const formatLastImport = (date: string | null) => {
    if (!date) return "No imports yet";
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg">Loading dashboard metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Data Management Dashboard</h1>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {metrics?.totalContacts.toLocaleString() || 0}
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {metrics?.activeContacts.toLocaleString() || 0}
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Data Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {metrics?.dataFieldsCount || 0}
              </div>
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Import</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {metrics?.lastImport
                  ? formatLastImport(metrics.lastImport)
                  : "Never"}
              </div>
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common data management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 justify-start"
                asChild
              >
                <Link href="/dashboard/contacts">
                  <Users className="mr-3 h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Browse Contacts</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      View and manage all your contacts
                    </div>
                  </div>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 justify-start"
                asChild
              >
                <Link href="/dashboard/imports">
                  <FileSpreadsheet className="mr-3 h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">View Import History</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Check status of previous imports
                    </div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Data Quality Overview</CardTitle>
            <CardDescription>
              Summary of your contact data quality
            </CardDescription>
          </div>
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics?.dataQuality.map((metric) => (
                <TableRow key={metric.name}>
                  <TableCell>
                    <div className="font-medium">{metric.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {metric.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-full rounded-full overflow-hidden bg-muted`}
                      >
                        <Progress
                          value={
                            metric.status === "error"
                              ? metric.value
                              : metric.value
                          }
                          className={`h-full ${
                            metric.status === "success"
                              ? "bg-green-500"
                              : metric.status === "warning"
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-medium ${
                        metric.status === "success"
                          ? "text-green-500"
                          : metric.status === "warning"
                          ? "text-amber-500"
                          : "text-red-500"
                      }`}
                    >
                      {metric.value}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleString()}
          </div>
          <Button variant="outline" size="sm">
            Improve Data Quality
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
