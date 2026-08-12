import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/curator")) {
    return NextResponse.next();
  }

  if (process.env.CURATOR_ENABLED !== "true") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const token = process.env.CURATOR_TOKEN;
  if (!token) {
    return NextResponse.next();
  }

  if (pathname === "/curator/login") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("curator_token")?.value;
  if (cookie === token) {
    return NextResponse.next();
  }

  const login = new URL("/curator/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/curator/:path*"],
};
