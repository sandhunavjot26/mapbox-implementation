"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { login } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("All fields required");
      return;
    }

    setIsLoading(true);
    try {
      await login(username.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiClientError) {
        const d = (err as ApiClientError & { detail?: unknown }).detail;
        let msg: string;
        if (typeof d === "string") msg = d;
        else if (Array.isArray(d))
          msg = (d as Array<{ msg?: string }>).map((e) => e?.msg ?? "").filter(Boolean).join("; ") || err.message;
        else if (d && typeof d === "object") msg = JSON.stringify(d);
        else msg = err.message ?? "Invalid credentials";
        setError(msg);
      } else {
        setError("Connection failed — check network");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col lg:flex-row">
      {/* Left section — image only */}
      <div className="relative w-full lg:w-[58%] min-h-[200px] lg:min-h-screen shrink-0">
        <Image
          src="/login-image.png"
          alt=""
          fill
          className="object-cover"
          priority
          sizes="(max-width: 1024px) 100vw, 58vw"
        />
      </div>

      {/* Right section — form */}
      <div
        className="flex-1 flex flex-col justify-center items-center self-stretch px-6 py-12 lg:py-0 lg:min-w-[min(480px,100%)] bg-[#0a0a0a]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(30,41,59,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(30,41,59,0.03) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="w-full max-w-[384px] flex flex-col gap-8">
          {/* Logo & subtitle */}
          <div className="flex flex-col gap-6">
            <Image
              src="/vector-wings-full.png"
              alt="DRIIF"
              width={130}
              height={60}
              priority
            />
            <p className="text-base text-slate-300 leading-5">
              Enter your credentials to access the platform.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-5">
              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="username"
                  className="text-sm text-slate-300 leading-5"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError("");
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-900 text-slate-100 text-base font-normal leading-5
                    placeholder:text-slate-500
                    shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)]
                    outline outline-1 outline-offset-[-1px] outline-slate-700
                    focus:outline-[#E7FF25] focus:outline-1 focus:outline-offset-[-1px]
                    transition-colors"
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-sm text-slate-300 leading-5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-900 text-slate-100 text-base font-normal leading-5
                      placeholder:text-slate-500
                      shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)]
                      outline outline-1 outline-offset-[-1px] outline-slate-700
                      focus:outline-[#E7FF25] focus:outline-1 focus:outline-offset-[-1px]
                      transition-colors"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex justify-between items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 focus:ring-[#E7FF25]/50 focus:ring-offset-0"
                  style={{ accentColor: "#E7FF25" }}
                />
                <span className="text-base text-slate-500">Remember me</span>
              </label>
              <a
                href="#"
                className="text-sm transition-colors hover:opacity-90"
                style={{ color: "#E7FF25" }}
                onClick={(e) => e.preventDefault()}
              >
                Forgot password?
              </a>
            </div>

            {/* Error */}
            {error && (
              <div className="px-3.5 py-2.5 bg-red-950/50 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Sign in button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 font-bold text-base uppercase shadow-sm
                focus:outline-none focus:ring-2 focus:ring-[#E7FF25]/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]
                transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#E7FF25", color: "#0a0a0a" }}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
