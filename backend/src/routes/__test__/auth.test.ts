import { describe, expect, test, beforeAll, afterAll } from "bun:test";

import { createApp } from "@/app.server";
import { rawDb } from "@/db/index.db";
import migrate from "@/db/migration.db";
import { resolveBackendPath } from "@/lib/path.utils";

migrate();

const app = createApp();

const registerUser = async (username: string, password: string) => {
  const form = new FormData();
  form.append("username", username);
  form.append("password", password);
  form.append(
    "avatar",
    new File(
      [await Bun.file("test/fixtures/avatar.png").arrayBuffer()],
      "avatar.png",
      {
        type: "image/png",
      }
    )
  );

  const res = await app.handle(
    new Request("http://localhost/auth/register", {
      body: form,
      method: "POST",
    })
  );
  const cookie = res.headers.get("set-cookie")?.split(";")[0] ?? "";
  return { cookie, res };
};

const authedRequest = (path: string, cookie: string, init?: RequestInit) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      ...init,
      headers: { ...init?.headers, Cookie: cookie },
    })
  );

beforeAll(async () => {
  const fixture = resolveBackendPath("test/fixtures/avatar.png");
  const src = resolveBackendPath("../frontend/src/assets/hero.png");
  if (!(await Bun.file(fixture).exists()) && (await Bun.file(src).exists())) {
    await Bun.write(fixture, await Bun.file(src).arrayBuffer());
  }
});

describe("Auth", () => {
  test("register creates user and sets session cookie", async () => {
    const { res, cookie } = await registerUser("TESTUSER", "password123");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user).toBeDefined();
    expect(body.user.username).toBe("TESTUSER");
    expect(body.user.id).toBeTypeOf("number");
    expect(body.user.passwordHash).toBeUndefined();
    expect(cookie).toContain("session=");
  });

  test("duplicate username returns 409", async () => {
    const { res } = await registerUser("TESTUSER", "anotherpass");
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Username already exists");
  });

  test("register rejects non-image avatar", async () => {
    const form = new FormData();
    form.append("username", "BADAVATAR");
    form.append("password", "password123");
    form.append(
      "avatar",
      new File(["not an image"], "bad.txt", { type: "text/plain" })
    );

    const res = await app.handle(
      new Request("http://localhost/auth/register", {
        body: form,
        method: "POST",
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("login with valid credentials", async () => {
    const res = await app.handle(
      new Request("http://localhost/auth/login", {
        body: JSON.stringify({ password: "password123", username: "testuser" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.username).toBe("TESTUSER");
    expect(res.headers.get("set-cookie")).toContain("session=");
  });

  test("login with wrong password returns 401", async () => {
    const res = await app.handle(
      new Request("http://localhost/auth/login", {
        body: JSON.stringify({ password: "wrongpass", username: "TESTUSER" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid credentials");
  });

  test("me returns current user with cookie", async () => {
    const { cookie } = await registerUser("MEUSER", "password123");
    const res = await authedRequest("/auth/me", cookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.username).toBe("MEUSER");
  });

  test("me without cookie returns 401", async () => {
    const res = await app.handle(new Request("http://localhost/auth/me"));
    expect(res.status).toBe(401);
  });

  test("logout clears session cookie", async () => {
    const { cookie } = await registerUser("LOGOUTUSER", "password123");
    const res = await authedRequest("/auth/logout", cookie, { method: "POST" });
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("session=");
    expect(setCookie).toMatch(/Max-Age=0|Expires=/u);
  });
});

describe("Avatars", () => {
  test("serves 120x120 webp thumbnail", async () => {
    const { cookie } = await registerUser("AVUSER", "password123");
    const meRes = await authedRequest("/auth/me", cookie);
    const me = await meRes.json();
    const { id } = me.user;

    const res = await app.handle(
      new Request(`http://localhost/users/${id}/avatar?size=thumb`)
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect(res.headers.get("Cache-Control")).toContain("immutable");

    const buffer = Buffer.from(await res.arrayBuffer());
    const meta = await new Bun.Image(buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(120);
    expect(meta.height).toBe(120);
  });

  test("serves 420x420 png full size", async () => {
    const { cookie } = await registerUser("AVFULL", "password123");
    const meRes = await authedRequest("/auth/me", cookie);
    const me = await meRes.json();
    const { id } = me.user;

    const res = await app.handle(
      new Request(`http://localhost/users/${id}/avatar?size=full`)
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  test("unknown user returns 404", async () => {
    const res = await app.handle(
      new Request("http://localhost/users/999999/avatar?size=thumb")
    );
    expect(res.status).toBe(404);
  });
});

afterAll(() => {
  rawDb.run("DELETE FROM users");
});
