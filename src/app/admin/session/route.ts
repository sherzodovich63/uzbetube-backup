import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
initAdmin();

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  const decoded = await getAuth().verifyIdToken(idToken);

  const ALLOWED = (process.env.ADMIN_UIDS || '').split(',').map(s=>s.trim()).filter(Boolean);
  if (!ALLOWED.includes(decoded.uid)) return NextResponse.json({ error:'Not admin' }, { status:403 });

  const expiresIn = 5 * 24 * 60 * 60 * 1000;
  const cookie = await getAuth().createSessionCookie(idToken, { expiresIn });

  const res = NextResponse.json({ ok:true });
  res.cookies.set('admin_session', cookie, { httpOnly:true, secure:true, sameSite:'lax', path:'/', maxAge:expiresIn/1000 });
  return res;
}
