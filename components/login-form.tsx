"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });

    if (error) {
      setErrorMessage(error.message ?? "Sign in failed. Please try again.");
      setIsSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="flex items-center gap-4">
        {/* `fill` + object-contain keeps the logo's own shape inside the box. */}
        <div className="relative size-12 shrink-0">
          <Image
            src="/logo.png"
            alt="Centralized Monitoring Platform logo"
            fill
            sizes="48px"
            loading="eager"
            className="object-contain"
          />
        </div>
        <div className="flex flex-col gap-1">
          <CardTitle>CRM</CardTitle>
          <CardDescription>
            Sign in to continue
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          {errorMessage && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Altrex Digital Platform Pvt. Ltd.
        </p>
        <p className="text-sm text-muted-foreground">
          Centralized Monitoring Platform · Secure Access
        </p>
      </CardFooter>
    </Card>
  );
}