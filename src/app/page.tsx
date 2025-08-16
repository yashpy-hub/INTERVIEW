import { InterviewContainer } from '@/components/interview-container';
import { Icons } from '@/components/icons';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 w-full border-b bg-card">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex gap-2 items-center">
            <Icons.logo className="h-6 w-6 text-primary" />
            <p className="font-bold text-lg">YASHINTERVIEW</p>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <InterviewContainer />
      </main>
    </div>
  );
}
