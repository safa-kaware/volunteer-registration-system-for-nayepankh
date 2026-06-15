export interface Volunteer {
  id: string;
  fullName: string;
  email: string; // Sensitive PII
  phone: string; // Sensitive PII
  city: string;
  preferredCauses: string[];
  skills: string[];
  availability: string[];
  govIdName?: string; // Sensitive PII
  govIdData?: string; // Sensitive Base64 PII
  encrypted?: boolean; // Flag if fields are client-side encrypted
  createdAt: string; // ISO string or Server Timestamp representation
  status?: 'pending' | 'approved' | 'observation' | 'rejected'; // Administrative workflow status
}

export interface AdminInfo {
  uid: string;
  email: string;
  role: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}
