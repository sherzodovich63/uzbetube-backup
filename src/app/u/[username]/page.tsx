import Link from "next/link";
import Image from "next/image";
import { adminDb } from "@/lib/firebase-admin";
import { getUserByUsername, countFollowers, countFollowing } from "@/lib/user";
import FollowButton from "./FollowButton";

export default async function UserPage({ params }: { params: { username: string } }) {
  const user = await getUserByUsername(params.username.toLowerCase());
  if (!user) return <div className="p-6">Foydalanuvchi topilmadi</div>;

  // Videolar: sendagi movie/videos qayerda tursa, shu yerda o‘qiysiz.
  // Masalan: `videos` kolleksiyasi (egalik bilan):
  const videosSnap = await adminDb.collection("videos")
    .where("ownerUid", "==", user.uid)
    .orderBy("createdAt", "desc").limit(24).get();
  const videos = videosSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  const followers = await countFollowers(user.uid);
  const following = await countFollowing(user.uid);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative h-20 w-20 rounded-full overflow-hidden bg-neutral-800">
          {user.image ? <Image src={user.image} alt="avatar" fill className="object-cover" /> : null}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">@{user.username}</h1>
          {user.bio ? <p className="text-sm text-neutral-500">{user.bio}</p> : null}
          <div className="mt-2 text-sm text-neutral-500 flex gap-4">
            <span>{followers} obunachi</span>
            <span>{following} obuna</span>
            <span>{videos.length} video</span>
          </div>
        </div>
        <FollowButton username={user.username}/>
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {videos.map((v) => (
          <Link key={v.id} href={`/movie/${v.slug || v.id}`} className="rounded-xl border border-neutral-800 p-2 hover:bg-neutral-900">
            <div className="aspect-video rounded-lg bg-neutral-800 mb-2 overflow-hidden">
              {v.thumb && <img src={v.thumb} alt={v.title} className="w-full h-full object-cover" />}
            </div>
            <div className="text-sm font-medium line-clamp-2">{v.title}</div>
            <div className="text-xs text-neutral-500">{new Date(v.createdAt).toLocaleDateString()}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
