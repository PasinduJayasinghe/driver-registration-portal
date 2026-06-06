import LoginForm from "./LoginForm";

export const metadata = {
  title: "Admin Login | Fenix Cars",
};

export default async function AdminLoginPage({ searchParams }) {
  const params = await searchParams;
  const next = typeof params?.next === "string" ? params.next : "/admin";

  return (
    <main className="flex-grow flex flex-col items-center justify-center px-margin-mobile md:px-margin-desktop py-stack-lg max-w-container-max mx-auto w-full">
      <div className="w-full max-w-md text-center mb-stack-lg">
        <h1 className="text-display-lg text-primary tracking-tight mb-stack-sm uppercase font-extrabold">
          FENIX CARS
        </h1>
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-stack-sm">
          Admin Sign In
        </h2>
        <p className="text-body-lg text-on-surface-variant">
          Sign in to review driver registrations.
        </p>
      </div>

      <div className="w-full max-w-md bg-surface-container-lowest shadow-md rounded-xl p-stack-lg border-t-4 border-primary">
        <LoginForm next={next} />
      </div>
    </main>
  );
}
