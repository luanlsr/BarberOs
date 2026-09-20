import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

export async function GET() {
  const icon = await readFile(join(process.cwd(), 'app', 'icon.svg'));
  return new NextResponse(icon, {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': 'image/svg+xml; charset=utf-8',
    },
  });
}
