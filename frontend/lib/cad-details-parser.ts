/**
 * Fixed CAD Details Parser that correctly handles empty fields
 */

export interface CADDetails {
  // Core incident information
  incidentNumber: string;
  code: string;
  codeType: string;
  date: string;
  time: string;
  zone: string;

  // Contact information
  caller: string;
  phone: string;
  contactList: Contact[];
  emailAddresses: string[];

  // Narrative content
  narrative: NarrativeEntry[];
  chiefComplaint: string;
  callerStatement: string;

  // Patient information
  patientInfo: PatientInfo;

  // Response information
  responseUnit: string;

  // ProQA information
  proqaCode: string;
  proqaSuffix: string;
  proqaSuffixText: string;
  proqaBulletPoints: string[];

  // Location information
  address: string;
  location: string;

  // Additional details
  additionalDetails: string[];

  // Original text
  originalText: string;
}

export interface NarrativeEntry {
  timestamp: string;
  operator: string;
  text: string;
  edited: boolean;
}

export interface PatientInfo {
  age: string;
  gender: string;
  conscious: boolean | null;
  breathing: boolean | null;
  detailedStatus: string[];
}

export interface Contact {
  name: string;
  phone: string;
  role?: string;
}

/**
 * Parses the details field from a CAD call, with improved handling of empty fields
 * @param details The raw CAD call details text
 * @returns A structured object containing the parsed details
 */
function parseCADDetails(details: string): CADDetails {
  if (!details) {
    throw new Error("No details provided");
  }

  const result: CADDetails = {
    // Core incident information
    incidentNumber: "",
    code: "",
    codeType: "",
    date: "",
    time: "",
    zone: "",

    // Contact information
    caller: "",
    phone: "",
    contactList: [],
    emailAddresses: [],

    // Narrative content
    narrative: [],
    chiefComplaint: "",
    callerStatement: "",

    // Patient information
    patientInfo: {
      age: "",
      gender: "",
      conscious: null,
      breathing: null,
      detailedStatus: []
    },

    // Response information
    responseUnit: "",

    // ProQA information
    proqaCode: "",
    proqaSuffix: "",
    proqaSuffixText: "",
    proqaBulletPoints: [],

    // Location information
    address: "",
    location: "",

    // Additional details
    additionalDetails: [],

    // Original text
    originalText: details
  };

  // Extract narrative entries
  const narrativeRegex = /(\d{2}\/\d{2}\/\d{2}\s\d{2}:\d{2}:\d{2})(?:\s+\(edited[^)]+\))?\s+([^:]+):\s*([^\r\n]+)/g;
  let narrativeMatch;

  while ((narrativeMatch = narrativeRegex.exec(details)) !== null) {
    const isEdited = narrativeMatch[0].includes("(edited");

    result.narrative.push({
      timestamp: narrativeMatch[1],
      operator: narrativeMatch[2],
      text: narrativeMatch[3].trim(),
      edited: isEdited
    });
  }

  // Extract standard metadata fields with improved empty field handling
  const extractors = {
    incidentNumber: (text: string): string => {
      // Look for INCIDENT or INCIDENT# fields and handle multi-value format
      const match = /INCIDENT(?:#)?:\s*([^,\r\n]+)/i.exec(text);
      if (match && match[1]) {
        // Handle format like "INCIDENT: 25E1524,250000941"
        const parts = match[1].split(',');
        return parts[0].trim();
      }
      return "";
    },

    code: (text: string): string => {
      // Extract the CODE field
      const match = /\bCODE:\s*([^,\r\n]+)/i.exec(text);
      return match ? match[1].trim() : "";
    },

    codeType: (text: string): string => {
      // Extract the code type (single letter like 'f', 'l', etc.)
      const match = /\bCODE:\s*([a-z])\b/i.exec(text);
      return match ? match[1].toLowerCase() : "";
    },

    date: (text: string): string => {
      const match = /DATE:\s*([^,\r\n]+)/i.exec(text);
      return match ? match[1].trim() : "";
    },

    time: (text: string): string => {
      const match = /TIME:\s*([^,\r\n]+)/i.exec(text);
      return match ? match[1].trim() : "";
    },

    zone: (text: string): string => {
      const match = /ZONE:\s*([^,\r\n]+)/i.exec(text);
      return match ? match[1].trim() : "";
    },

    caller: (text: string): string => {
      // Primary: CALLER field, fallback: Contact field if it contains a value
      const callerMatch = /CALLER:\s*([^,\r\n]+)/i.exec(text);
      if (callerMatch && callerMatch[1] && callerMatch[1].trim() !== "" && !callerMatch[1].includes("Contact:")) {
        return callerMatch[1].trim();
      }

      const contactMatch = /Contact:\s*([^,\r\n]+)/i.exec(text);
      // Only use Contact if it contains an actual value, not just an empty field
      if (contactMatch && contactMatch[1] && contactMatch[1].trim() !== "" && !contactMatch[1].includes("Phone:")) {
        return contactMatch[1].trim();
      }

      return "";
    },

    phone: (text: string): string => {
      // Look for Phone or PH fields with actual values
      const match = /(?:Phone|PH):\s*([^,\r\n]+)/i.exec(text);
      if (match && match[1] && match[1].trim() !== "" &&
          !match[1].includes("INCIDENT:") && !match[1].includes("CODE:")) {
        return match[1].trim();
      }
      return "";
    },

    chiefComplaint: (text: string): string => {
      const match = /Chief Complaint:\s*([^\r\n]+)/i.exec(text);
      return match ? match[1].trim() : "";
    },

    callerStatement: (text: string): string => {
      const match = /Caller Statement:\s*([^\r\n]+)/i.exec(text);
      return match ? match[1].trim() : "";
    },

    responseUnit: (text: string): string => {
      const match = /Unit Response:\s*([^\r\n]+)/i.exec(text);
      return match ? match[1].trim() : "";
    },

    patientInfo: (text: string): void => {
      // Extract patient information with patterns we've seen in the data
      const patientMatch = /(\d+)-year-old,\s*(Male|Female|[^,]+),\s*(Conscious|Not Conscious|[^,]+),\s*(Breathing|Not Breathing|[^.\r\n]+)/i.exec(text);

      if (patientMatch) {
        result.patientInfo.age = patientMatch[1] || "";
        result.patientInfo.gender = patientMatch[2] || "";
        result.patientInfo.conscious = patientMatch[3] === "Conscious" ? true :
                                      patientMatch[3] === "Not Conscious" ? false : null;
        result.patientInfo.breathing = patientMatch[4] === "Breathing" ? true :
                                      patientMatch[4] === "Not Breathing" ? false : null;
      } else {
        // Try the shorthand format (e.g., 30YOM)
        const shortMatch = /(\d+)(?:YO|Y\/O)([MF])/i.exec(text);
        if (shortMatch) {
          result.patientInfo.age = shortMatch[1];
          result.patientInfo.gender = shortMatch[2].toUpperCase() === 'M' ? 'Male' : 'Female';
        }
      }
    },

    location: (): void => {
      // Look for specific location indicators in narrative texts
      for (const entry of result.narrative) {
        const locationText = entry.text;

        // Look for location patterns in narrative entries
        if (locationText.includes("DRIVEWAY") ||
            locationText.includes("BACKYARD") ||
            locationText.includes("BATHROOM") ||
            locationText.includes("BEDROOM") ||
            locationText.includes("KITCHEN")) {
          result.location = locationText;
          break;
        }
      }
    }
  };

  // Apply all extractors
  result.incidentNumber = extractors.incidentNumber(details);
  result.code = extractors.code(details);
  result.codeType = extractors.codeType(details);
  result.date = extractors.date(details);
  result.time = extractors.time(details);
  result.zone = extractors.zone(details);
  result.caller = extractors.caller(details);
  result.phone = extractors.phone(details);
  result.chiefComplaint = extractors.chiefComplaint(details);
  result.callerStatement = extractors.callerStatement(details);
  result.responseUnit = extractors.responseUnit(details);
  extractors.patientInfo(details);
  extractors.location();

  // Extract additional details
  const lines = details.split(/\r\n|\r|\n/).filter(line => line.trim() !== '');
  const patternedLines = new Set<string>();

  // Mark lines that match our patterns
  for (const line of lines) {
    if (line.match(narrativeRegex) ||
        line.match(/INCIDENT(?:#)?:|CODE:|DATE:|TIME:|ZONE:|CALLER:|ProQA Code:|Unit Response:|Chief Complaint:|Caller Statement:/i) ||
        line.match(/\d+-year-old,.+(Male|Female).+(Conscious|Not Conscious).+(Breathing|Not Breathing)/i)) {
      patternedLines.add(line);
    }

    // Specifically mark empty Contact: and Phone: lines
    if (line.match(/^Contact:\s*$/i) || line.match(/^Phone:\s*$/i)) {
      patternedLines.add(line);
    }
  }

  // Add narrative content to additionalDetails if not already captured elsewhere
  for (const entry of result.narrative) {
    if (!result.location &&
        !result.chiefComplaint &&
        entry.text.trim().length > 0 &&
        !entry.text.includes("Chief Complaint:") &&
        !entry.text.includes("Caller Statement:")) {
      result.additionalDetails.push(entry.text);
    }
  }

  return result;
}

/**
 * Helper function to clean up the results for display
 * Removes empty fields to make the output more readable
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanResult(result: CADDetails): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(result)) {
    // Skip empty strings, arrays, and objects
    if (value === null || value === undefined || value === "") {
      continue;
    }

    if (Array.isArray(value) && value.length === 0) {
      continue;
    }

    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) {
      continue;
    }

    // Include non-empty values
    cleaned[key] = value;
  }

  // Special handling for patientInfo
  if (result.patientInfo) {
    const hasPatientInfo =
      result.patientInfo.age ||
      result.patientInfo.gender ||
      result.patientInfo.conscious !== null ||
      result.patientInfo.breathing !== null ||
      (result.patientInfo.detailedStatus && result.patientInfo.detailedStatus.length > 0);

    if (hasPatientInfo) {
      cleaned.patientInfo = {};

      if (result.patientInfo.age) cleaned.patientInfo.age = result.patientInfo.age;
      if (result.patientInfo.gender) cleaned.patientInfo.gender = result.patientInfo.gender;
      if (result.patientInfo.conscious !== null) cleaned.patientInfo.conscious = result.patientInfo.conscious;
      if (result.patientInfo.breathing !== null) cleaned.patientInfo.breathing = result.patientInfo.breathing;
      if (result.patientInfo.detailedStatus && result.patientInfo.detailedStatus.length > 0) {
        cleaned.patientInfo.detailedStatus = result.patientInfo.detailedStatus;
      }
    }
  }

  return cleaned;
}

/**
 * Extract the most critical information for a quick summary
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCADCallSummary(details: CADDetails): Record<string, any> {
  return {
    incidentNumber: details.incidentNumber,
    date: details.date,
    time: details.time,
    code: details.code,
    chiefComplaint: details.chiefComplaint,
    callerStatement: details.callerStatement,
    location: details.location || "",
    caller: details.caller,
    phone: details.phone,
    narrativeSummary: details.narrative.length > 0 ? details.narrative[0].text : ''
  };
}


// Export functions for use in applications
export {
  parseCADDetails,
  cleanResult,
  getCADCallSummary,
};