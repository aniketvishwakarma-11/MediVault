"use client";

import React, { useState } from "react";
import { Bell, ShieldCheck, AlertTriangle, Key, Pill, CheckCircle2, Clock } from "lucide-react";

export default function DoctorNotificationsPage() {
  const [notifications, setNotifications] = useState([
    {
      id: "notif-1",
      type: "CONSENT_APPROVED",
      title: "Patient Granted Record Access",
      message: "Alex Morgan approved your consent request for 30 days clinical view.",
      time: "10 mins ago",
      isRead: false,
    },
    {
      id: "notif-2",
      type: "CRITICAL_ALERT",
      title: "Critical Laboratory Parameter Flagged",
      message: "Hemoglobin 10.2 g/dL detected for Alex Morgan (PAT-1001). Low iron alert.",
      time: "1 hour ago",
      isRead: false,
    },
    {
      id: "notif-3",
      type: "EMERGENCY_ACCESS",
      title: "Emergency Terminal Override Used",
      message: "Emergency QR override access authorized. Audit hash 0xa7f8... broadcasted.",
      time: "3 hours ago",
      isRead: true,
    },
    {
      id: "notif-4",
      type: "FOLLOW_UP",
      title: "Upcoming Patient Follow-up Due",
      message: "Eleanor Vance is scheduled for acute rhinitis follow-up evaluation tomorrow.",
      time: "Yesterday",
      isRead: true,
    },
  ]);

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="space-y-6 font-body pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="font-heading font-black text-2xl text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-[#0891B2]" /> Clinical Notifications Center
          </h1>
          <p className="text-xs text-[#475569] mt-1">
            Real-time alerts for consent approvals, emergency overrides, critical lab results, and follow-ups.
          </p>
        </div>

        <button
          onClick={markAllRead}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-[#0891B2] hover:bg-cyan-50 transition-colors min-h-[38px]"
        >
          Mark All as Read
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-5 rounded-2xl border transition-all flex items-start gap-4 ${
              n.isRead
                ? "bg-slate-50/80 border-slate-200/70 text-[#475569]"
                : "bg-white border-cyan-200/90 shadow-xs text-[#0F172A]"
            }`}
          >
            <div className="p-2.5 rounded-xl bg-cyan-50 text-[#0891B2] border border-cyan-200 shrink-0">
              {n.type === "CONSENT_APPROVED" && <ShieldCheck className="w-5 h-5 text-[#22C55E]" />}
              {n.type === "CRITICAL_ALERT" && <AlertTriangle className="w-5 h-5 text-rose-600" />}
              {n.type === "EMERGENCY_ACCESS" && <Key className="w-5 h-5 text-amber-600" />}
              {n.type === "FOLLOW_UP" && <Clock className="w-5 h-5 text-[#0891B2]" />}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-center">
                <h3 className="font-heading font-bold text-sm text-[#0F172A]">{n.title}</h3>
                <span className="text-[10px] text-slate-400 font-mono font-medium">{n.time}</span>
              </div>
              <p className="text-xs text-[#475569] font-medium">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
