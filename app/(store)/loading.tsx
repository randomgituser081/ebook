import { BookLoader } from "@/component/BookLoader";

export default function StoreLoading() {
  return (
    <div className="grain relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1c0b16] text-white">
      <div className="animate-orb-a absolute -left-24 top-10 h-96 w-96 rounded-full bg-brand-magenta/30 blur-[110px]" />
      <BookLoader label="Opening the bookstore" />
    </div>
  );
}
