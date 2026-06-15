import React, { useState, useRef } from 'react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { encryptData } from '../utils/crypto';
import { 
  User, Mail, Phone, MapPin, CheckSquare, Square, 
  Upload, CloudUpload, ArrowRight, ShieldCheck, Heart, AlertCircle, RefreshCw 
} from 'lucide-react';
import VerificationLetter from './VerificationLetter';

export default function RegistrationForm() {
  // Field States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [preferredCauses, setPreferredCauses] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  
  // File Upload State
  const [govIdName, setGovIdName] = useState('');
  const [govIdData, setGovIdData] = useState(''); // Base64 representation
  const [isDragging, setIsDragging] = useState(false);
  
  // UX / UI Flow States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registeredName, setRegisteredName] = useState('');
  const [registeredCity, setRegisteredCity] = useState('');
  const [showCertificate, setShowCertificate] = useState(false);

  // Field Validation Errors State
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Options Definitions
  const causeOptions = ['Menstrual Hygiene', 'Food Distribution', 'Education', 'Crowdfunding'];
  const skillOptions = ['Digital Marketing', 'Event Planning', 'Logistics', 'Public Speaking', 'Social Advocacy'];
  const availabilityOptions = ['Weekdays', 'Weekends', 'Evenings', 'Any'];

  // Toggle helpers
  const handleToggleCause = (cause: string) => {
    setPreferredCauses(prev => 
      prev.includes(cause) ? prev.filter(c => c !== cause) : [...prev, cause]
    );
  };

  const handleToggleSkill = (skill: string) => {
    setSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleToggleAvailability = (option: string) => {
    setAvailability(prev => 
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  // Convert File to Base64 with compression checks
  const processFile = (file: File) => {
    setValidationErrors(prev => ({ ...prev, govId: '' }));

    // File validation: PDF / PNG / JPG
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setValidationErrors(prev => ({ ...prev, govId: 'Only PDF, JPG, and PNG files are allowed.' }));
      return;
    }

    // Size limit check: 2MB (2,097,152 bytes)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setValidationErrors(prev => ({ ...prev, govId: 'File is too large. Maximum allowed size is 2MB.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && typeof reader.result === 'string') {
        setGovIdName(file.name);
        setGovIdData(reader.result); // Base64 string including header prefix
      }
    };
    reader.onerror = () => {
      setValidationErrors(prev => ({ ...prev, govId: 'Failed to read file contents.' }));
    };
    reader.readAsDataURL(file);
  };

  // Drag-and-drop Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Strict Frontend Input Validation
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!fullName || fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.email = 'Please provide a valid email address.';
    }

    const phoneRegex = /^[+]?[0-9\s-]{10,20}$/;
    if (!phone || !phoneRegex.test(phone.replace(/\s+/g, ''))) {
      errors.phone = 'Please provide a valid 10-20 digit contact number.';
    }

    if (!city || city.trim().length < 2) {
      errors.city = 'Please indicate your city (at least 2 letters).';
    }

    if (preferredCauses.length === 0) {
      errors.preferredCauses = 'Please choose at least one Preferred Cause.';
    }

    if (skills.length === 0) {
      errors.skills = 'Please choose at least one volunteer skill.';
    }

    if (availability.length === 0) {
      errors.availability = 'Please indicate your availability.';
    }

    if (!govIdData || !govIdName) {
      errors.govId = 'Government ID proof document is required and must be compulsory uploaded for onboarding security.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // 1. Generate unique alphanumeric ID matching validation '^[a-zA-Z0-9_\-]+$'
      const volunteerId = 'vol-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);

      // 2. Client-Side Cryptographic Encryption of Sensitive PII
      const encryptedEmail = encryptData(email);
      const encryptedPhone = encryptData(phone);
      const encryptedGovIdData = govIdData ? encryptData(govIdData) : '';

      // 3. Construct Payload conforming strictly to firebase-blueprint entity rules
      // Note: Temporal integrity rule matches 'request.time == incoming().createdAt'
      const payload = {
        fullName: fullName.trim(),
        email: encryptedEmail,     // Cryptographically Encrypted PII
        phone: encryptedPhone,     // Cryptographically Encrypted PII
        city: city.trim(),
        preferredCauses,
        skills,
        availability,
        encrypted: true,           // Flag verifying cryptographic ciphering is complete
        createdAt: serverTimestamp(), // Utilize Firestore serverTimestamp to match request.time strictly
        status: 'observation'      // Initial state under admin observation before approval
      };

      // Add file attachment metadata safely if uploaded
      const finalPayload = govIdName ? { 
        ...payload, 
        govIdName, 
        govIdData: encryptedGovIdData // Cryptographically Encrypted File data
      } : payload;

      // 4. Save to firestore under /volunteers collection
      const docRef = doc(db, 'volunteers', volunteerId);
      await setDoc(docRef, finalPayload);

      // Success UX: Reset form fields, cache values for appreciation certificate, and open certificate modal
      setRegisteredName(fullName.trim());
      setRegisteredCity(city.trim());
      
      // Cleanup Fields
      setFullName('');
      setEmail('');
      setPhone('');
      setCity('');
      setPreferredCauses([]);
      setSkills([]);
      setAvailability([]);
      setGovIdName('');
      setGovIdData('');

      setShowCertificate(true);
    } catch (err: any) {
      console.error("Submission Failure: ", err);
      try {
        // Enforce diagnostic mapping error logs format as per guidelines
        handleFirestoreError(err, OperationType.CREATE, 'volunteers');
      } catch (mappedError: any) {
        setSubmitError("We couldn't process your registration due to a Firestore security or database constraint.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 relative flex flex-col animate-in fade-in duration-300">
      
      {/* Decorative Branding Heading */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-teal-600 font-mono block mb-1">Spread Hope</span>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Volunteer Enrollment</h2>
          <p className="text-xs text-slate-500 mt-1">Lend your wings to those in need. Simple security credentials required.</p>
        </div>
        <div className="p-2.5 bg-teal-50 rounded-xl">
          <Heart className="w-5 h-5 text-teal-600 fill-teal-100 animate-pulse" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1">
        
        {/* Basic Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* Full Name */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              Full Name <span className="text-teal-500 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setValidationErrors(prev => ({ ...prev, fullName: '' }));
              }}
              className={`w-full px-3 py-2 bg-slate-50 border ${
                validationErrors.fullName ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 focus:border-teal-500'
              } rounded-lg text-sm outline-none transition-all placeholder:text-slate-400 focus:bg-white`}
            />
            {validationErrors.fullName && (
              <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {validationErrors.fullName}</p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Mail className="w-3 h-3 text-slate-400" />
              Email Address <span className="text-teal-500 font-bold">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. rahul@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setValidationErrors(prev => ({ ...prev, email: '' }));
              }}
              className={`w-full px-3 py-2 bg-slate-50 border ${
                validationErrors.email ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 focus:border-teal-500'
              } rounded-lg text-sm outline-none transition-all placeholder:text-slate-400 focus:bg-white`}
            />
            {validationErrors.email && (
              <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {validationErrors.email}</p>
            )}
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" />
              Contact Phone <span className="text-teal-500 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setValidationErrors(prev => ({ ...prev, phone: '' }));
              }}
              className={`w-full px-3 py-2 bg-slate-50 border ${
                validationErrors.phone ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 focus:border-teal-500'
              } rounded-lg text-sm outline-none transition-all placeholder:text-slate-400 focus:bg-white`}
            />
            {validationErrors.phone && (
              <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {validationErrors.phone}</p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              City <span className="text-teal-500 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kanpur"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setValidationErrors(prev => ({ ...prev, city: '' }));
              }}
              className={`w-full px-3 py-2 bg-slate-50 border ${
                validationErrors.city ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 focus:border-teal-500'
              } rounded-lg text-sm outline-none transition-all placeholder:text-slate-400 focus:bg-white`}
            />
            {validationErrors.city && (
              <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {validationErrors.city}</p>
            )}
          </div>

        </div>

        {/* Multi-Selects Segment */}
        <div className="space-y-3.5">
          
          {/* Preferred Causes */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Preferred Causes <span className="text-teal-500 font-bold">*</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {causeOptions.map(cause => {
                const selected = preferredCauses.includes(cause);
                return (
                  <button
                    key={cause}
                    type="button"
                    onClick={() => {
                      handleToggleCause(cause);
                      setValidationErrors(prev => ({ ...prev, preferredCauses: '' }));
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left border text-[11px] font-bold transition-all cursor-pointer ${
                      selected ? 'bg-teal-50 text-teal-700 border-teal-300 ring-1 ring-teal-500/10' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {selected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                    <span>{cause}</span>
                  </button>
                );
              })}
            </div>
            {validationErrors.preferredCauses && (
              <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {validationErrors.preferredCauses}</p>
            )}
          </div>

          {/* Skills */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Volunteer Skills <span className="text-teal-500 font-bold">*</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {skillOptions.map(skill => {
                const selected = skills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => {
                      handleToggleSkill(skill);
                      setValidationErrors(prev => ({ ...prev, skills: '' }));
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left border text-[11px] font-bold transition-all cursor-pointer ${
                      selected ? 'bg-indigo-50 text-indigo-800 border-indigo-200 ring-1 ring-indigo-550/10' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {selected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                    <span>{skill}</span>
                  </button>
                );
              })}
            </div>
            {validationErrors.skills && (
              <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {validationErrors.skills}</p>
            )}
          </div>

          {/* Availability */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Availability <span className="text-teal-500 font-bold">*</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {availabilityOptions.map(avail => {
                const selected = availability.includes(avail);
                return (
                  <button
                    key={avail}
                    type="button"
                    onClick={() => {
                      handleToggleAvailability(avail);
                      setValidationErrors(prev => ({ ...prev, availability: '' }));
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left border text-[11px] font-bold transition-all cursor-pointer ${
                      selected ? 'bg-orange-50 text-orange-850 border-orange-200 ring-1 ring-orange-500/10' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {selected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                    <span>{avail}</span>
                  </button>
                );
              })}
            </div>
            {validationErrors.availability && (
              <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {validationErrors.availability}</p>
            )}
          </div>

        </div>

        {/* Drag and Drop File Upload for Government ID */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Government ID Verification <span className="text-red-500">*</span> <span className="text-slate-400 font-bold uppercase tracking-tight text-[9px] text-teal-600">(COMPULSORY ATTACHMENT)</span> <span className="text-slate-400 font-normal normal-case block sm:inline sm:ml-1">(PDF, JPG, PNG only. Max 2MB)</span>
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[90px] ${
              isDragging ? 'bg-teal-50/50 border-teal-500' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  processFile(e.target.files[0]);
                }
              }}
              accept=".pdf,image/png,image/jpeg,image/jpg"
              className="hidden"
            />
            {govIdName ? (
              <div className="flex flex-col items-center gap-1">
                <div className="p-2 bg-teal-100 rounded-xl text-teal-700">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-slate-800 block max-w-[200px] truncate">{govIdName}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGovIdName('');
                      setGovIdData('');
                    }}
                    className="text-[10px] text-red-500 font-bold hover:underline mt-0.5 cursor-pointer"
                  >
                    Remove attachment
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <CloudUpload className="w-6 h-6 text-teal-600/75" />
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Drag & Drop ID proof here</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">or click to browse local files</span>
                </div>
              </div>
            )}
          </div>
          {validationErrors.govId && (
            <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {validationErrors.govId}</p>
          )}
        </div>

        {/* Global Submit Error notice */}
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Complete Registration Action */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md shadow-teal-100 transition-all disabled:opacity-55 cursor-pointer disabled:cursor-not-allowed group mt-2"
          id="btn-register-volunteer"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              Processing...
            </>
          ) : (
            <>
              Submit Application
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>

      </form>

      {/* Floating security notice */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
        <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
        <span>End-to-End Cryptographically Encrypted (AES-256)</span>
      </div>

      {/* SUCCESS CERTIFICATE MODAL */}
      {showCertificate && (
        <VerificationLetter
          volunteerName={registeredName}
          volunteerCity={registeredCity}
          onClose={() => setShowCertificate(false)}
        />
      )}

    </div>
  );
}
