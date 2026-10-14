import { BookLoader } from "@/component/BookLoader";

/** Skeleton in the shape of the book page, so the layout doesn't jump when it loads. */
export default function BookLoading() {
  return (
    <div className="grain relative isolate min-h-screen overflow-hidden bg-[#1c0b16] pb-20 pt-28 text-white sm:pt-36">
      <div className="animate-orb-a absolute -left-40 -top-10 -z-10 h-[36rem] w-[36rem] rounded-full bg-brand-magenta/25 blur-[120px]" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div className="order-2 space-y-5 lg:order-1">
          <div className="shimmer h-4 w-24 rounded-full" />
          <div className="shimmer h-6 w-32 rounded-full" />
          <div className="shimmer h-14 w-full max-w-lg rounded-2xl" />
          <div className="shimmer h-14 w-3/4 max-w-md rounded-2xl" />
          <div className="shimmer h-5 w-full max-w-md rounded-full" />
          <div className="shimmer h-12 w-40 rounded-2xl" />
          <div className="shimmer h-14 w-64 rounded-full" />
        </div>
        <div className="order-1 mx-auto flex aspect-[3/4] w-[58%] max-w-[360px] items-center justify-center rounded-r-2xl rounded-l-md bg-white/5 ring-1 ring-white/10 sm:w-[42%] lg:order-2 lg:w-full">
          <BookLoader label="Opening the book" />
        </div>
      </div>
    </div>
  );
}
