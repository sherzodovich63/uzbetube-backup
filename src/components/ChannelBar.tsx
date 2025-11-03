"use client";

import { useTranslations } from "next-intl";

type Channel = {
  name: string;
  avatar?: string;
  verified?: boolean;
  followers?: number;
};

export default function ChannelBar({
  channel,
  views,
  publishedAt,
  onSubscribeAction,
}: {
  channel: Channel;
  views?: number;
  publishedAt?: string;
  onSubscribeAction?: () => void;
}) {
  const t = useTranslations("movie");

  const initials =
    channel?.name?.trim()?.slice(0, 2).toUpperCase() || "UZ";

  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        {channel.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.avatar}
            alt={channel.name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-[#151519] grid place-items-center text-xs font-semibold">
            {initials}
          </div>
        )}

        <div className="leading-tight">
          <div className="text-sm font-semibold">{channel.name}</div>
          <div className="text-xs text-white/60">
            {typeof views === "number" ? t("views", { count: views }) : null}
            {publishedAt ? ` • ${publishedAt}` : ""}
          </div>
        </div>

        <button
          onClick={onSubscribeAction}
          className="ml-2 h-9 px-3 rounded-xl bg-[#e11d48] hover:bg-[#cc0f3e] text-white text-sm"
        >
          {t("subscribe")}
        </button>
      </div>
    </div>
  );
}
