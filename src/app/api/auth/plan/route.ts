import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, toPublicUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const plan = body?.plan;
    if (plan !== 'free' && plan !== 'premium') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: sessionUser.id },
      data: { plan },
    });

    return NextResponse.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error('Plan update error:', error);
    return NextResponse.json(
      { error: 'Something went wrong updating your plan. Please try again.' },
      { status: 500 }
    );
  }
}
