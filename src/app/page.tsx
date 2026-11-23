import { Suspense } from 'react';
import { TiaDasApp } from '@/components/TiaDasApp';

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
          Loading TIA-DAS...
        </div>
      }
    >
      <TiaDasApp />
    </Suspense>
  );
}
