"use client";

import React from 'react';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { CADDetails, NarrativeEntry } from '@/lib/cad-details-parser';

interface CADDetailsDisplayProps {
  details: CADDetails;
}

/**
 * Format timestamp to a more readable format
 */
const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return '';

  // Handle different date formats
  try {
    // If it's in MM/DD/YY HH:MM:SS format
    const parts = timestamp.split(' ');
    if (parts.length === 2) {
      const datePart = parts[0];
      const timePart = parts[1];
      return `${datePart} at ${timePart}`;
    }
    return timestamp;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return timestamp;
  }
};

/**
 * Displays critical information from a CAD call
 */
export default function CADDetailsDisplay({ details }: CADDetailsDisplayProps) {
  const getCodeTypeLabel = (codeType: string) => {
    const codeTypes: Record<string, string> = {
      'f': 'Fire',
      'm': 'Medical',
      't': 'Traffic',
      'p': 'Police',
      's': 'Special',
      'h': 'Hazmat',
    };

    return codeTypes[codeType?.toLowerCase()] || 'Unknown';
  };

  const getCodeBadgeColor = (codeType: string) => {
    const codeTypeColors: Record<string, string> = {
      'f': 'bg-red-500 text-white',
      'm': 'bg-blue-500 text-white',
      't': 'bg-yellow-500 text-white',
      'p': 'bg-indigo-500 text-white',
      's': 'bg-purple-500 text-white',
      'h': 'bg-green-500 text-white',
    };

    return codeTypeColors[codeType?.toLowerCase()] || 'bg-gray-500 text-white';
  };

  // Determine if we should show Patient Info tab
  const hasPatientInfo = details.patientInfo && (
    details.patientInfo.age ||
    details.patientInfo.gender ||
    details.patientInfo.conscious !== null ||
    details.patientInfo.breathing !== null ||
    (details.patientInfo.detailedStatus && details.patientInfo.detailedStatus.length > 0)
  );

  // Determine if we should show Narrative tab
  const hasNarrative = details.narrative && details.narrative.length > 0;

  // Calculate which tabs to show
  const tabValues = ["summary"];
  if (hasPatientInfo) tabValues.push("patient");
  if (hasNarrative) tabValues.push("narrative");

  return (
    <div className="w-full">
      <Card className="w-full bg-zinc-900 border-zinc-800 gap-3">
        <CardContent className="p-1">
          {tabValues.length > 1 ? (
            <Tabs defaultValue={tabValues.includes("patient") ? "patient" : tabValues.includes("narrative") ? "narrative" : "summary"} className="w-full">
              <div className="flex justify-between items-center px-5">
                <TabsList className="bg-zinc-800 rounded-none border-b border-zinc-700 p-0 h-auto">
                  {tabValues.includes("summary") && (
                    <TabsTrigger value="summary" className="rounded-none py-2 px-4 data-[state=active]:bg-zinc-900">Summary</TabsTrigger>
                  )}
                  {tabValues.includes("patient") && (
                    <TabsTrigger value="patient" className="rounded-none py-2 px-4 data-[state=active]:bg-zinc-900">Patient Info</TabsTrigger>
                  )}
                  {tabValues.includes("narrative") && (
                    <TabsTrigger value="narrative" className="rounded-none py-2 px-4 data-[state=active]:bg-zinc-900">Narrative</TabsTrigger>
                  )}
                </TabsList>
                {details.code && (
                  <Badge className={`${getCodeBadgeColor(details.codeType)} rounded px-3 py-1`}>
                    {getCodeTypeLabel(details.codeType)}
                  </Badge>
                )}
              </div>

              <TabsContent value="summary" className="m-0">
                {details.chiefComplaint && (
                  <div className="p-4 bg-opacity-10 border-b border-opacity-20">
                    <h3 className="text-sm font-medium text-zinc-400 mb-2">Chief Complaint</h3>
                    <p>{details.chiefComplaint}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  <div className="p-4 border-b md:border-r border-zinc-800">
                    <h3 className="text-sm font-medium text-zinc-400 mb-2">Location</h3>
                    <p className="text-white">{details.location || details.address || 'No location available'}</p>
                  </div>

                  <div className="p-4 border-b border-zinc-800">
                    <h3 className="text-sm font-medium text-zinc-400 mb-2">Contact Info</h3>
                    <p className="text-white"><span className="text-zinc-400">Caller:</span> {details.caller || 'Unknown'}</p>
                    <p className="text-white"><span className="text-zinc-400">Phone:</span> {details.phone || 'Not provided'}</p>
                  </div>
                </div>

                {details.callerStatement && (
                  <div className="p-4 border-b border-zinc-800">
                    <h3 className="text-sm font-medium text-zinc-400 mb-2">Caller Statement</h3>
                    <p className="text-white">{details.callerStatement}</p>
                  </div>
                )}

                {details.responseUnit && (
                  <div className="p-4 border-b border-zinc-800">
                    <h3 className="text-sm font-medium text-zinc-400 mb-2">Response Unit</h3>
                    <p className="text-white">{details.responseUnit}</p>
                  </div>
                )}
              </TabsContent>

              {hasPatientInfo && (
                <TabsContent value="patient" className="m-0 p-4">
                  <div className="space-y-3">
                    {details.patientInfo.age && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-400">Age</h3>
                        <p className="text-white">{details.patientInfo.age}</p>
                      </div>
                    )}
                    {details.patientInfo.gender && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-400">Gender</h3>
                        <p className="text-white">{details.patientInfo.gender}</p>
                      </div>
                    )}
                    {details.patientInfo.conscious !== null && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-400">Conscious</h3>
                        <p>
                          {details.patientInfo.conscious
                            ? <Badge className="bg-green-500 text-white">Yes</Badge>
                            : <Badge className="bg-red-500 text-white">No</Badge>}
                        </p>
                      </div>
                    )}
                    {details.patientInfo.breathing !== null && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-400">Breathing</h3>
                        <p>
                          {details.patientInfo.breathing
                            ? <Badge className="bg-green-500 text-white">Yes</Badge>
                            : <Badge className="bg-red-500 text-white">No</Badge>}
                        </p>
                      </div>
                    )}
                    {details.patientInfo.detailedStatus && details.patientInfo.detailedStatus.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-400">Status Details</h3>
                        <ul className="list-disc pl-5 text-white">
                          {details.patientInfo.detailedStatus.map((status, idx) => (
                            <li key={idx}>{status}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {hasNarrative && (
                <TabsContent value="narrative" className="m-0">
                  <div className="divide-y divide-zinc-800">
                    {details.narrative.map((entry: NarrativeEntry, index: number) => (
                      <div key={index} className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                          <span className="font-medium text-zinc-300">{formatTimestamp(entry.timestamp)}</span>
                          <span className="text-sm text-zinc-500">{entry.operator}</span>
                        </div>
                        <p className="text-white">
                          {entry.text}
                          {entry.edited && (
                            <Badge variant="outline" className="ml-2 text-xs border-zinc-600">
                              Edited
                            </Badge>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          ) : (
            // Simple display without tabs if only summary tab would be shown
            <div>
              {details.chiefComplaint && (
                <div className="p-4 bg-amber-50 bg-opacity-10 border-b border-amber-900 border-opacity-20 text-amber-100">
                  <p>{details.chiefComplaint}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="p-4 border-b md:border-r border-zinc-800">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Location</h3>
                  <p className="text-white">{details.location || details.address || 'No location available'}</p>
                </div>

                <div className="p-4 border-b border-zinc-800">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Contact Info</h3>
                  <p className="text-white"><span className="text-zinc-400">Caller:</span> {details.caller || 'Unknown'}</p>
                  <p className="text-white"><span className="text-zinc-400">Phone:</span> {details.phone || 'Not provided'}</p>
                </div>
              </div>

              {details.callerStatement && (
                <div className="p-4 border-b border-zinc-800">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Caller Statement</h3>
                  <p className="text-white">{details.callerStatement}</p>
                </div>
              )}

              {details.responseUnit && (
                <div className="p-4 border-b border-zinc-800">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Response Unit</h3>
                  <p className="text-white">{details.responseUnit}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className=" border-zinc-800 text-sm text-zinc-500">
          <p>Zone: {details.zone || 'Unknown'}</p>
        </CardFooter>
      </Card>
    </div>
  );
}