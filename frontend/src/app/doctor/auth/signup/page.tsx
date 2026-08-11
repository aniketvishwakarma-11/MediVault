"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Stethoscope, User, Mail, Lock, Phone, FileCheck, Building, Award, CheckCircle2, ArrowRight, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function DoctorSignupPage() {
  const router = useRouter();
  const { setDemoUser } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "Dr. Sarah Jenkins",
    email: "dr.jenkins@medivault.org",
    phone: "+1 (555) 345-6789",
    password: "doctorPass123!",
    licenseNumber: "MD-994820-US",
    registrationCouncil: "American Board of Internal Medicine",
    specialization: "Internal Medicine & Cardiology",
    experienceYears: "14",
    hospitalAffiliation: "St. Jude Memorial Hospital",
    clinicName: "Jenkins Medical Associates",
    address: "100 Medical Center Way, Boston MA",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) {
      setStep(2);
      return;
    }
    setSubmitted(true);
  };

  const handleContinueToPortal = () => {
    setDemoUser("doctor");
    router.push("/doctor/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative font-body">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
              <Stethoscope className="w-7 h-7" />
            </div>
            <div className="text-left">
              <h1 className="font-heading font-black text-2xl text-white tracking-tight">
                MediVault <span className="text-cyan-400">EMR</span>
              </h1>
              <p className="text-xs text-slate-400">Doctor Credentialing & Registration</p>
            </div>
          </Link>
        </div>

        {submitted ? (
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl backdrop-blur-xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="font-heading font-bold text-2xl text-white">Application Submitted for Review</h2>
              <p className="text-sm text-slate-300 max-w-lg mx-auto">
                Your medical license credentials <span className="text-cyan-400 font-mono">{formData.licenseNumber}</span> have been recorded in the MediVault Verification Registry.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2 text-slate-400">
              <div className="flex justify-between">
                <span>Verification Status:</span>
                <span className="text-amber-400 font-bold">PENDING ADMIN AUDIT</span>
              </div>
              <div className="flex justify-between">
                <span>Medical Council:</span>
                <span className="text-slate-200">{formData.registrationCouncil}</span>
              </div>
              <div className="flex justify-between">
                <span>Specialization:</span>
                <span className="text-slate-200">{formData.specialization}</span>
              </div>
            </div>

            <button
              onClick={handleContinueToPortal}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Explore Doctor Portal in Demo Mode</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-6">
            {/* Step indicator */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className={`flex items-center gap-2 text-xs font-bold ${step === 1 ? "text-cyan-400" : "text-slate-500"}`}>
                <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">1</span>
                <span>Personal & Account Info</span>
              </div>
              <div className={`flex items-center gap-2 text-xs font-bold ${step === 2 ? "text-cyan-400" : "text-slate-500"}`}>
                <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">2</span>
                <span>Medical License & Hospital</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Professional Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Account Password</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Medical License Number</label>
                      <input
                        type="text"
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Registration Council</label>
                      <input
                        type="text"
                        name="registrationCouncil"
                        value={formData.registrationCouncil}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Specialization</label>
                      <input
                        type="text"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Experience (Years)</label>
                      <input
                        type="number"
                        name="experienceYears"
                        value={formData.experienceYears}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Hospital / Clinic Affiliation</label>
                    <input
                      type="text"
                      name="hospitalAffiliation"
                      value={formData.hospitalAffiliation}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Document upload simulation */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center space-y-2">
                    <Upload className="w-6 h-6 text-cyan-400 mx-auto" />
                    <div className="text-xs font-semibold text-slate-200">Upload Medical License & Govt ID PDF</div>
                    <div className="text-[10px] text-slate-500">Supported formats: PDF, PNG, JPG (Max 15MB)</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                {step === 2 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  className="ml-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 hover:brightness-110 flex items-center gap-2"
                >
                  <span>{step === 1 ? "Next: Verification Details" : "Submit Credentialing Application"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
