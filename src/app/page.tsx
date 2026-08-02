"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const TRADES = [
  { name: "Plumbing", icon: "🔧" },
  { name: "Carpentry", icon: "🪚" },
  { name: "Painting", icon: "🎨" },
  { name: "Masonry", icon: "🧱" },
];

interface WorkerProfile {
  id: string;
  name: string;
  phone: string;
  aadhar: string;
  address: string;
  trade: string;
}

interface Job {
  id: string;
  trade: string;
  address: string;
  wage: number;
  status: string;
  customerName?: string;
  customerPhone?: string;
  customerLat?: number | null;
  customerLng?: number | null;
}

const STORAGE_KEY = "dihadi_worker";

export default function WorkerPage() {
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [workerStatus, setWorkerStatus] = useState<string>("pending");
  const [online, setOnline] = useState(false);
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [acceptedJobs, setAcceptedJobs] = useState<Job[]>([]);
  const [alertJob, setAlertJob] = useState<Job | null>(null);

  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAadhar, setRegAadhar] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regTrade, setRegTrade] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState("");

  const isValidPhone = useCallback((phone: string) => /^[0-9]{10}$/.test(phone), []);
  const isValidAadhar = useCallback((aadhar: string) => /^[0-9]{12}$/.test(aadhar), []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setProfile(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    const unsub = onSnapshot(doc(db, "workers", profile.id), (snap) => {
      if (snap.exists()) {
        setWorkerStatus(snap.data().status || "pending");
      }
    });
    return () => unsub();
  }, [profile?.id]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (!regName || !isValidPhone(regPhone) || !isValidAadhar(regAadhar) || !regAddress || !regTrade) {
      setRegError("Please enter all fields (10-digit phone, 12-digit Aadhar).");
      return;
    }
    setRegSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, "workers"), {
        name: regName,
        phone: regPhone,
        aadhar: regAadhar,
        address: regAddress,
        trade: regTrade,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      const p: WorkerProfile = {
        id: docRef.id,
        name: regName,
        phone: regPhone,
        aadhar: regAadhar,
        address: regAddress,
        trade: regTrade,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      setProfile(p);
    } catch (err) {
      console.error(err);
      alert("Registration failed. Check your Firebase config.");
    } finally {
      setRegSubmitting(false);
    }
  };

  const isBlocked = workerStatus === "blocked";

  useEffect(() => {
    if (!online || !profile || isBlocked) {
      setPendingJobs([]);
      setAlertJob(null);
      return;
    }
    const q = query(
      collection(db, "jobs"),
      where("status", "==", "pending"),
      where("trade", "==", profile.trade)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const jobs: Job[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<Job, "id">;
        jobs.push({ id: doc.id, ...data });
      });
      setPendingJobs(jobs);
    });
    return () => unsub();
  }, [online, profile, isBlocked]);

  useEffect(() => {
    if (pendingJobs.length > 0 && !alertJob) {
      setAlertJob(pendingJobs[0]);
    }
  }, [pendingJobs, alertJob]);

  useEffect(() => {
    if (!profile?.id) return;
    const q = query(
      collection(db, "jobs"),
      where("status", "==", "accepted"),
      where("workerId", "==", profile.id)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const jobs: Job[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<Job, "id">;
        jobs.push({ id: doc.id, ...data });
      });
      setAcceptedJobs(jobs);
    });
    return () => unsub();
  }, [profile?.id]);

  const acceptJob = useCallback(async (jobId: string) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, "jobs", jobId), {
        status: "accepted",
        workerId: profile.id,
        workerName: profile.name,
        workerPhone: profile.phone,
        acceptedAt: serverTimestamp(),
      });
      setAlertJob(null);
    } catch (err) {
      console.error(err);
    }
  }, [profile]);

  const dismissAlert = useCallback(() => {
    setAlertJob(null);
  }, []);

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-yellow-50 text-gray-900 flex flex-col p-4">
        <div className="max-w-sm w-full mx-auto mt-8">
          <div className="text-center mb-6">
            <Image src="/Dihadi.png" alt="Dihadi" width={140} height={48} className="mx-auto" priority />
            <p className="text-gray-500 text-sm mt-1">Register to start receiving jobs</p>
          </div>
          <form onSubmit={handleRegister} className="bg-white rounded-2xl p-6 space-y-4 shadow-xl border border-gray-100">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <input
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                maxLength={10}
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit phone number"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Aadhar Number</label>
              <input
                type="tel"
                maxLength={12}
                value={regAadhar}
                onChange={(e) => setRegAadhar(e.target.value.replace(/\D/g, ""))}
                placeholder="12-digit Aadhar number"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your Address</label>
              <textarea
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                placeholder="Your home address"
                rows={2}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Trade</label>
              <div className="grid grid-cols-2 gap-2">
                {TRADES.map(({ name, icon }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setRegTrade(name)}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border transition flex items-center justify-center gap-2 ${
                      regTrade === name
                        ? "bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-transparent shadow-lg"
                        : "bg-white text-gray-700 border-gray-200 hover:border-yellow-400"
                    }`}
                  >
                    <span>{icon}</span>
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {regError && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{regError}</p>
            )}

            <button
              type="submit"
              disabled={regSubmitting || !regName || !regPhone || !regAadhar || !regAddress || !regTrade}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-white py-3.5 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
            >
              {regSubmitting ? "Registering..." : "Register"}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Your account must be approved by admin before jobs appear.
            </p>
          </form>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Blocked</h1>
        <p className="text-gray-500 text-sm text-center mb-6 max-w-xs">
          Your account has been blocked by the admin. Contact support for help.
        </p>
        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            setProfile(null);
            setOnline(false);
          }}
          className="w-full max-w-xs bg-gradient-to-r from-yellow-500 to-amber-600 text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform"
        >
          Register Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <header className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Image src="/Dihadi.png" alt="Dihadi" width={100} height={34} priority />
          <div>
            <h1 className="text-lg font-black text-gray-900 leading-tight">Worker</h1>
            <p className="text-xs text-gray-500">{profile.name} &middot; {profile.trade}</p>
          </div>
        </div>
        <button
          onClick={() => setOnline(!online)}
          disabled={workerStatus !== "approved"}
          className={`relative w-20 h-10 rounded-full transition-all ${
            online
              ? "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]"
              : workerStatus === "approved"
                ? "bg-gray-200"
                : "bg-gray-100"
          } disabled:cursor-not-allowed`}
        >
          <span
            className={`absolute top-1.5 left-1.5 w-7 h-7 bg-white rounded-full shadow-md transition-transform ${
              online ? "translate-x-10" : "translate-x-0"
            }`}
          />
        </button>
      </header>

      {workerStatus !== "approved" && (
        <div className="px-5 py-3 bg-yellow-50 border-b border-yellow-100">
          <p className="text-sm text-yellow-800 font-medium">
            ⏳ Your account is awaiting admin approval. You can&apos;t go online yet.
          </p>
        </div>
      )}

      <div className="px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            className={`w-4 h-4 rounded-full ${
              online
                ? "bg-yellow-400 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.6)]"
                : "bg-gray-300"
            }`}
          />
          <span className="text-base font-bold tracking-wide text-gray-700">
            {online ? "ONLINE — Listening for jobs..." : "OFFLINE"}
          </span>
        </div>
      </div>

      {acceptedJobs.length > 0 && (
        <div className="px-5 pb-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
            Accepted Jobs
          </h2>
          <div className="space-y-3">
            {acceptedJobs.map((job) => {
              const mapsUrl =
                job.customerLat && job.customerLng
                  ? `https://www.google.com/maps/dir/?api=1&destination=${job.customerLat},${job.customerLng}`
                  : null;
              return (
                <div key={job.id} className="bg-white rounded-2xl p-5 border border-yellow-300 shadow-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider">Accepted</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Customer</span>
                      <span className="font-bold text-gray-900">{job.customerName || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Phone</span>
                      <a href={`tel:${job.customerPhone}`} className="font-bold text-yellow-600 underline">
                        {job.customerPhone || "N/A"}
                      </a>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Trade</span>
                      <span className="font-semibold text-gray-700">{job.trade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Wage</span>
                      <span className="font-bold text-gray-900">₹{job.wage}/day</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-1">Address</span>
                      <span className="text-gray-600">{job.address}</span>
                    </div>
                  </div>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-bold bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                    >
                      Navigate
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 px-5 pb-6">
        {online && pendingJobs.length === 0 && acceptedJobs.length === 0 && (
          <p className="text-gray-400 text-center mt-20 text-lg font-semibold">No pending jobs yet.</p>
        )}
        {!online && acceptedJobs.length === 0 && (
          <p className="text-gray-300 text-center mt-20 text-lg font-semibold">
            Toggle online to start receiving job alerts.
          </p>
        )}
      </div>

      {alertJob && (
        <div className="fixed inset-0 bg-black/40 z-50 flex flex-col justify-end">
          <div className="bg-white rounded-t-2xl p-6 w-full shadow-2xl border-t border-gray-100 animate-slide-up">
            <div className="flex justify-center mb-4">
              <span className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </div>
            <div className="text-4xl text-center mb-3">🔔</div>
            <h2 className="text-xl font-black text-center mb-1 text-gray-900">New Job Available!</h2>
            <p className="text-center text-gray-500 text-sm mb-5">{alertJob.trade}</p>

            <div className="bg-gray-50 rounded-xl p-5 mb-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Trade</span>
                <span className="font-bold text-gray-900">{alertJob.trade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Wage</span>
                <span className="font-bold text-gray-900">₹{alertJob.wage}/day</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Address</span>
                <span className="text-gray-600">{alertJob.address}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={dismissAlert}
                className="flex-1 py-4 rounded-xl text-base font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
              >
                Skip
              </button>
              <button
                onClick={() => acceptJob(alertJob.id)}
                className="flex-1 py-4 rounded-xl text-xl font-black bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:from-yellow-400 hover:to-amber-500 active:scale-95 transition-all shadow-lg"
              >
                ACCEPT JOB
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
