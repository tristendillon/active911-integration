"use client";

import React from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CADDetails, NarrativeEntry } from '@/lib/cad-details-parser';

interface CADDetailsDisplayProps {
  details: CADDetails;
}

const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return '';
  try {
    const parts = timestamp.split(' ');
    if (parts.length === 2) {
      const [datePart, timePart] = parts;
      return `${datePart} at ${timePart}`;
    }
    return timestamp;
  } catch {
    return timestamp;
  }
};

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

export default function CADDetailsDisplay({ details }: CADDetailsDisplayProps) {
  const { patientInfo, narrative } = details;

  const hasPatientInfo = patientInfo && (
    patientInfo.age ||
    patientInfo.gender ||
    patientInfo.conscious !== null ||
    patientInfo.breathing !== null ||
    (patientInfo.detailedStatus && patientInfo.detailedStatus.length > 0)
  );

  const hasNarrative = narrative && narrative.length > 0;

  return (
    <Card className="w-full bg-zinc-900 border-zinc-800 p-0 gap-0">
      <CardContent className="p-1">
        <div className="flex justify-between items-center px-5 py-3">
          <h2 className="text-lg font-semibold text-white">CAD Details</h2>
          {details.code && (
            <Badge className={`${getCodeBadgeColor(details.codeType)} rounded px-3 py-1`}>
              {getCodeTypeLabel(details.codeType)}
            </Badge>
          )}
        </div>

        {hasPatientInfo && (
          <section className="px-4 pb-2 border-b border-zinc-800">
            <h3 className="text-md font-semibold text-white mb-4">Patient Information</h3>
            <div className="space-y-3 grid grid-cols-2 gap-4">
              {patientInfo.age && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400">Age</h4>
                  <p className="text-white">{patientInfo.age}</p>
                </div>
              )}
              {patientInfo.conscious !== null && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400">Conscious</h4>
                  <p>
                    {patientInfo.conscious
                      ? <Badge className="bg-green-500 text-white">Yes</Badge>
                      : <Badge className="bg-red-500 text-white">No</Badge>}
                  </p>
                </div>
              )}
              {patientInfo.gender && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400">Gender</h4>
                  <p className="text-white">{patientInfo.gender}</p>
                </div>
              )}

              {patientInfo.breathing !== null && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400">Breathing</h4>
                  <p>
                    {patientInfo.breathing
                      ? <Badge className="bg-green-500 text-white">Yes</Badge>
                      : <Badge className="bg-red-500 text-white">No</Badge>}
                  </p>
                </div>
              )}
              {patientInfo.detailedStatus?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400">Status Details</h4>
                  <ul className="list-disc pl-5 text-white">
                    {patientInfo.detailedStatus.map((status, idx) => (
                      <li key={idx}>{status}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {hasNarrative && (
          <section className="px-4 py-2 border-b border-zinc-800">
            <h3 className="text-md font-semibold text-white mb-4">Narrative</h3>
            <div className="divide-y divide-zinc-800">
              {narrative.map((entry: NarrativeEntry, index: number) => (
                <div key={index} className="py-3">
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
          </section>
        )}

        <section className="px-4 py-2">
          <h3 className="text-md font-semibold text-white mb-4">Summary</h3>

          {details.chiefComplaint && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-zinc-400">Chief Complaint</h4>
              <p className="text-white">{details.chiefComplaint}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-sm font-medium text-zinc-400">Location</h4>
              <p className="text-white">{details.location || details.address || 'No location available'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-zinc-400">Contact Info</h4>
              <p className="text-white"><span className="text-zinc-400">Caller:</span> {details.caller || 'Unknown'}</p>
              <p className="text-white"><span className="text-zinc-400">Phone:</span> {details.phone || 'Not provided'}</p>
            </div>
          </div>

          {details.callerStatement && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-zinc-400">Caller Statement</h4>
              <p className="text-white">{details.callerStatement}</p>
            </div>
          )}

          {details.responseUnit && (
            <div>
              <h4 className="text-sm font-medium text-zinc-400">Response Unit</h4>
              <p className="text-white">{details.responseUnit}</p>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
