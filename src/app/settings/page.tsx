"use client";
import { useState } from "react";

export default function SettingsPage() {
  const [form, setForm] = useState({ username: "", name: "", bio: "", image: "" });
  const [msg, setMsg] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await res.json();
    setMsg(res.ok ? "Saqlandi" : j?.error || "Xatolik");
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Profil sozlamalari</h1>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Username</label>
          <input className="w-full rounded-xl border border-neutral-700 bg-transparent p-3"
                 placeholder="masalan: uzbetube_user"
                 value={form.username}
                 onChange={(e)=>setForm({...form, username: e.target.value.toLowerCase()})} />
        </div>
        <div>
          <label className="block text-sm mb-1">Ism</label>
          <input className="w-full rounded-xl border border-neutral-700 bg-transparent p-3"
                 value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})}/>
        </div>
        <div>
          <label className="block text-sm mb-1">Bio</label>
          <textarea className="w-full rounded-xl border border-neutral-700 bg-transparent p-3" rows={3}
                    value={form.bio} onChange={(e)=>setForm({...form, bio: e.target.value})}/>
        </div>
        <div>
          <label className="block text-sm mb-1">Avatar URL</label>
          <input className="w-full rounded-xl border border-neutral-700 bg-transparent p-3"
                 value={form.image} onChange={(e)=>setForm({...form, image: e.target.value})}/>
        </div>
        <button className="rounded-xl bg-rose-600 px-5 py-3">Saqlash</button>
        {msg && <p className="text-sm text-neutral-400 mt-2">{msg}</p>}
      </form>
    </div>
  );
}
