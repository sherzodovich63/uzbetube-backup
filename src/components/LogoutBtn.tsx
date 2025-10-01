"use client";

export function LogoutBtn() {
  const logout = async () => {
    // backend route: /api/session/logout
    await fetch("/api/session/logout", { method: "POST" });
    location.href = "/"; // bosh sahifaga qaytaramiz
  };

  return (
    <button
      onClick={logout}
      className="px-3 py-2 rounded bg-white text-black hover:bg-gray-200"
    >
      Chiqish
    </button>
  );
}