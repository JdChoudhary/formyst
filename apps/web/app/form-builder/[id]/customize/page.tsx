import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import CustomizeClient from "./customize-client";

export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export default async function CustomizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader />
        </div>
      }
    >
      <CustomizeClient id={id} />
    </Suspense>
  );
}
