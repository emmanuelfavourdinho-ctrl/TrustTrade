"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  type ForgotPasswordRequest,
  type LoginRequest,
} from "@trusttrade/shared";
import { ApiError } from "@/lib/api/client";
import {
  getCurrentUser,
  login as loginAccount,
  register as registerAccount,
  requestPasswordReset,
} from "@/lib/api/auth";
import { Button } from "@/components/ui/button";

type AuthMode = "login" | "register" | "forgot";
const registerFormSchema = registerRequestSchema
  .extend({ confirmPassword: z.string().min(1, "Confirm your password.") })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });
type RegisterFormValues = z.infer<typeof registerFormSchema>;

function Field({
  id,
  label,
  error,
  type = "text",
  autoComplete,
  ...props
}: {
  id: string;
  label: string;
  error?: string;
  type?: string;
  autoComplete?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-ink" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type === "password" && passwordVisible ? "text" : type}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`min-h-12 w-full border border-line bg-white px-3 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 ${
            type === "password" ? "pr-12" : ""
          }`}
          {...props}
        />
        {type === "password" && (
          <button
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 grid min-h-11 w-11 place-items-center text-muted hover:text-brand"
            onClick={() => setPasswordVisible((visible) => !visible)}
            type="button"
          >
            {passwordVisible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-700" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  console.error("Unexpected authentication form error.");
  return "Something went wrong. Please try again.";
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const [success, setSuccess] = useState("");
  const [requestError, setRequestError] = useState("");

  if (mode === "login") {
    return (
      <LoginForm
        onError={setRequestError}
        onSuccess={setSuccess}
        requestError={requestError}
        success={success}
      />
    );
  }
  if (mode === "register") {
    return (
      <RegisterForm
        onError={setRequestError}
        onSuccess={setSuccess}
        requestError={requestError}
        success={success}
      />
    );
  }
  return (
    <ForgotForm
      onError={setRequestError}
      onSuccess={setSuccess}
      requestError={requestError}
      success={success}
    />
  );
}

type FormFeedbackProps = {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  requestError: string;
  success: string;
};

function Feedback({ requestError, success }: Omit<FormFeedbackProps, "onError" | "onSuccess">) {
  if (requestError) {
    return (
      <p className="border-l-2 border-red-700 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900" role="alert">
        {requestError}
      </p>
    );
  }
  if (success) {
    return (
      <p className="border-l-2 border-brand bg-brand-soft px-4 py-3 text-sm leading-6 text-brand-dark" role="status">
        {success}
      </p>
    );
  }
  return null;
}

function LoginForm(props: FormFeedbackProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({ resolver: zodResolver(loginRequestSchema) });

  async function onSubmit(values: LoginRequest) {
    props.onError("");
    props.onSuccess("");
    try {
      await loginAccount(values);
      const user = await getCurrentUser();
      queryClient.setQueryData(["session", "current-user"], user);
      router.replace(user.role === "admin" ? "/admin" : user.role === "artisan" ? "/artisan/dashboard" : "/feed");
    } catch (error) {
      props.onError(getErrorMessage(error));
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
      <Feedback requestError={props.requestError} success={props.success} />
      <Field
        id="email"
        label="Email address"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <div className="flex justify-end">
        <Link className="min-h-11 py-3 text-sm font-medium text-brand hover:text-brand-dark" href="/forgot-password">
          Forgot password?
        </Link>
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function RegisterForm(props: FormFeedbackProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      role: "customer",
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    props.onError("");
    props.onSuccess("");
    try {
      const result = await registerAccount({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        role: values.role,
      });
      props.onSuccess(result.message ?? "Your account has been created. You can now sign in.");
    } catch (error) {
      props.onError(getErrorMessage(error));
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
      <Feedback requestError={props.requestError} success={props.success} />
      <Field
        id="fullName"
        label="Full name"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register("fullName")}
      />
      <Field
        id="email"
        label="Email address"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Field
        id="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <div>
        <label className="mb-2 block text-sm font-medium text-ink" htmlFor="role">
          I am joining as
        </label>
        <select
          id="role"
          className="min-h-12 w-full border border-line bg-white px-3 text-base text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          aria-invalid={Boolean(errors.role)}
          aria-describedby={errors.role ? "role-error" : undefined}
          {...register("role")}
        >
          <option value="customer">A customer</option>
          <option value="artisan">An artisan or professional</option>
        </select>
        {errors.role?.message && (
          <p className="mt-2 text-sm text-red-700" id="role-error">
            {errors.role.message}
          </p>
        )}
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
      {props.success && (
        <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand" href="/login">
          Go to sign in
        </Link>
      )}
    </form>
  );
}

function ForgotForm(props: FormFeedbackProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(forgotPasswordRequestSchema),
  });

  async function onSubmit(values: ForgotPasswordRequest) {
    props.onError("");
    props.onSuccess("");
    try {
      const result = await requestPasswordReset(values);
      props.onSuccess(
        result.message ??
          "If an account matches that email, password reset instructions will be sent.",
      );
    } catch (error) {
      props.onError(getErrorMessage(error));
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
      <Feedback requestError={props.requestError} success={props.success} />
      <Field
        id="email"
        label="Email address"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Sending request…" : "Send reset instructions"}
      </Button>
    </form>
  );
}
