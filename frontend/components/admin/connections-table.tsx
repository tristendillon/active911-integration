"use client"

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, RefreshCw, Clock, Users } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { useConnections } from '@/hooks/use-connections';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ConnectionTableProps {
  password: string;
}

export function ConnectionsTable({ password }: ConnectionTableProps) {
  const { isLoading, connections, refreshConnections } = useConnections(password);

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  const renderConnectionsTable = (connectionType: 'dashboard' | 'client') => (
    <Card className="w-full shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">
            {connectionType === 'dashboard' ? 'Dashboard' : 'Client'} Connections
          </CardTitle>
          <CardDescription>
            {connectionType === 'dashboard'
              ? 'Admin dashboard connections to the server'
              : 'Client connections to the server'}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshConnections}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Loading connections...</p>
          </div>
        ) : connections[connectionType].length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">No {connectionType} connections found</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead>Metadata</TableHead>
                  <TableHead>Remote Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections[connectionType].sort((a, b) => b.connected_at.localeCompare(a.connected_at)).map((connection) => (
                  <TableRow key={connection.id}>
                    <TableCell
                      className="font-mono text-xs"
                      title={connection.id}
                    >
                      {connection.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {connection.is_authenticated ? (
                        <Badge className="bg-green-500 hover:bg-green-600">Authenticated</Badge>
                      ) : (
                        <Badge variant="secondary">Guest</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                        {formatDate(connection.connected_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Activity className="h-4 w-4 mr-1 text-muted-foreground" />
                        {formatDate(connection.last_activity)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">
                        Sent: {connection.messages_sent}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        Received: {connection.messages_received}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <SyntaxHighlighter
                        className=""
                        language="json"
                        style={vscDarkPlus}
                      >
                        {JSON.stringify(connection.metadata, null, 2)}
                      </SyntaxHighlighter>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {connection.remote_addr}
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-4">
        <Users className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Connection Manager</h1>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="client">Client</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          {renderConnectionsTable('dashboard')}
        </TabsContent>
        <TabsContent value="client">
          {renderConnectionsTable('client')}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConnectionsTable;