import { redirect } from "next/navigation";

export default function AdminPage() {
  // Admin rootga kirgan foydalanuvchini avtomatik upload sahifasiga yo‘naltiramiz
  redirect("/admin/upload");
}
