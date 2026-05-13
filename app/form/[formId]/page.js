import { Topbar } from "@/components/layout/topbar";

export default async function FormPage({ params }) {
  const { formId } = await params;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#161616] text-white">
      <Topbar />
      <main className="grid flex-1 place-items-center p-6">
        <div className="text-center">
          <p className="text-sm font-medium text-[#a3a3a3]">Form</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{formId}</h1>
        </div>
      </main>
    </div>
  );
}
