import DriverRegistrationForm from "@/components/DriverRegistrationForm";

export const metadata = {
  title: "Driver Registration | Fenix Cars",
};

export default function Home() {
  return (
    <>
      <main className="flex-grow flex flex-col items-center justify-center px-margin-mobile md:px-margin-desktop py-stack-lg max-w-container-max mx-auto w-full">
        <div className="w-full max-w-md text-center mb-stack-lg">
          <h1 className="text-display-lg text-primary tracking-tight mb-stack-sm uppercase font-extrabold">
            FENIX CARS
          </h1>
          <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-stack-sm">
            Employee Registration
          </h2>
          <p className="text-body-lg text-on-surface-variant">
            Submit your details for admin approval.
          </p>
        </div>

        <DriverRegistrationForm />
      </main>

      <footer className="bg-surface w-full mt-auto border-t border-outline-variant flex flex-col md:flex-row items-center px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-2 justify-center">
        <div className="text-headline-md font-black text-primary">
          FENIX CARS
        </div>
      </footer>
    </>
  );
}
