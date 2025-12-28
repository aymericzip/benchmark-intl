/**
 * This test benchmarks the performance of Intlayer versus Native Intl.
 *
 * Execute this WITHOUT the React Compiler.
 * The React Compiler levels out performance metrics by optimizing Native API usage,
 * while significantly slowing down Intlayer's performance.
 *
 * The performance difference is most notable in:
 * - Non-V8 browsers (Firefox, Safari).
 * - Applications using FormatJS polyfills (https://formatjs.github.io/docs/polyfills/) (e.g., React Native).
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Intl as CachedIntl, Locales } from "intlayer";
import {
  type FC,
  type HTMLAttributes,
  memo,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type IntlConstructor = typeof globalThis.Intl | typeof CachedIntl;

// --- Helper ---
const shuffleArray = (array: string[], limit?: number) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }
  return limit ? shuffled.slice(0, limit) : shuffled;
};

// --- CARD COMPONENT ---
const LocalCard: FC<{
  locale: string;
  displayLocale: string;
  IntlConstructor: IntlConstructor;
  renderKey: number;
}> = ({ locale, displayLocale, IntlConstructor, renderKey, ...props }) => {
  const formatter = new IntlConstructor.DateTimeFormat(displayLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    calendar: "gregory",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "short", // Shortened to fit better
  });

  // Create Base Date
  const dynamicDate = new Date();

  // Generate a unique number from the locale string (e.g., "fr-FR" = 450)
  // This ensures every card in the list has a DIFFERENT start date.
  const uniqueOffset = locale
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Apply Shifts:
  // - renderKey * 365: Changes the year every time you click the button.
  // - uniqueOffset: Changes the day/month based on the card's content.
  dynamicDate.setDate(dynamicDate.getDate() + renderKey * 365 + uniqueOffset);

  const label = formatter.format(dynamicDate);

  return (
    <div
      className="group z-10 mx-4 inline-flex shrink-0 transition-transform duration-300 hover:scale-105"
      {...props}
    >
      <div className="flex flex-row items-center gap-5 rounded-xl bg-neutral-900/90 p-3 backdrop-blur-md">
        <span className="flex text-nowrap font-medium text-xs">{label}</span>
      </div>
    </div>
  );
};

// --- LIST WRAPPER ---
const LocalCardList: FC<{
  localeList: string[];
  displayLocale: string;
  IntlConstructor: IntlConstructor;
  renderKey: number;
  className?: string;
}> = memo(
  ({
    localeList,
    displayLocale,
    IntlConstructor,
    renderKey,
    className,
    ...props
  }) => (
    <div className="relative flex w-full overflow-hidden" {...props}>
      <div
        className={cn(
          "mx-auto inline-flex shrink-0 flex-col gap-2 will-change-transform",
          className
        )}
      >
        {localeList.map((locale, index) => (
          <LocalCard
            // Combined key ensures complete unmount/remount on every update
            key={`${locale}-${index}-${renderKey}`}
            locale={locale}
            displayLocale={displayLocale}
            IntlConstructor={IntlConstructor}
            renderKey={renderKey}
          />
        ))}
      </div>
    </div>
  )
);

// --- DATA PREP ---
const NUM_OF_ITEMS = 50;
const allLocales = Object.values(Locales.ALL_LOCALES);
const arrayOfLocale: string[][] = new Array(20)
  .fill(0)
  .map(() => shuffleArray(allLocales, NUM_OF_ITEMS));

// --- RENDERER ---
const LanguageSectionRenderer: FC<
  HTMLAttributes<HTMLElement> & {
    displayLocale: string;
    IntlConstructor: IntlConstructor;
    label: string;
    renderKey: number;
  }
> = ({
  className,
  displayLocale,
  IntlConstructor,
  label,
  renderKey,
  ...props
}) => {
  const [localeList] = useState<string[][]>(arrayOfLocale);

  if (localeList.length === 0) return null;

  return (
    <section
      className={cn(
        "my-4 w-full overflow-hidden border-neutral-200/10 border-t py-4",
        className
      )}
      {...props}
    >
      <div className="mb-2 text-center text-neutral-400 text-xs uppercase tracking-widest">
        {label}
      </div>
      <div className="flex flex-col gap-2">
        {localeList.map((row, i) => (
          <LocalCardList
            key={i}
            localeList={row}
            displayLocale={displayLocale}
            IntlConstructor={IntlConstructor}
            renderKey={renderKey}
          />
        ))}
      </div>
    </section>
  );
};

// --- BENCHMARK CONTROLLER ---
export const BenchmarkController = () => {
  const [nativeLocale, setNativeLocale] = useState("en");
  const [intlayerLocale, setIntlayerLocale] = useState("en");

  const [nativeRenderKey, setNativeRenderKey] = useState(0);
  const [intlayerRenderKey, setIntlayerRenderKey] = useState(0);

  const [nativeTime, setNativeTime] = useState(0);
  const [intlayerTime, setIntlayerTime] = useState(0);

  const startTimeRef = useRef<number>(0);
  const activeBenchmarkRef = useRef<"native" | "intlayer" | null>(null);

  useLayoutEffect(() => {
    if (startTimeRef.current > 0 && activeBenchmarkRef.current) {
      const duration = performance.now() - startTimeRef.current;
      if (activeBenchmarkRef.current === "native") setNativeTime(duration);
      else setIntlayerTime(duration);

      startTimeRef.current = 0;
      activeBenchmarkRef.current = null;
    }
  });

  const triggerSwitch = (type: "native" | "intlayer") => {
    const nextLocale = Math.random() > 0.5 ? "fr" : "de";

    activeBenchmarkRef.current = type;
    startTimeRef.current = performance.now();

    if (type === "native") {
      setNativeLocale(nextLocale);
      setNativeRenderKey((k) => k + 1);
    } else {
      setIntlayerLocale(nextLocale);
      setIntlayerRenderKey((k) => k + 1);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center pt-10">
      <div className="fixed top-20 z-50 flex gap-8 rounded-xl border border-neutral-800 bg-neutral-900/90 p-6 text-white backdrop-blur-md">
        <div className="text-center">
          <h3 className="font-bold text-green-400">Intlayer (Cached)</h3>
          <div className="font-mono text-4xl">
            {intlayerTime.toFixed(1)}
            <span className="text-sm">ms</span>
          </div>
          <div className="mt-1 text-neutral-500 text-xs">
            Run #{intlayerRenderKey}
          </div>
          <button
            className="mt-2 bg-green-600 text-white hover:bg-green-500"
            onClick={() => triggerSwitch("intlayer")}
          >
            Run Test
          </button>
        </div>
        <div className="w-px bg-white/20"></div>
        <div className="text-center">
          <h3 className="font-bold text-red-400">Native (Unoptimized)</h3>
          <div className="font-mono text-4xl">
            {nativeTime.toFixed(1)}
            <span className="text-sm">ms</span>
          </div>
          <div className="mt-1 text-neutral-500 text-xs">
            Run #{nativeRenderKey}
          </div>
          <button
            className="mt-2 bg-red-600 text-white hover:bg-red-500"
            onClick={() => triggerSwitch("native")}
          >
            Run Test
          </button>
        </div>
      </div>

      <div className="mt-40 flex w-full flex-row opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0">
        <LanguageSectionRenderer
          label="Intlayer Area"
          displayLocale={intlayerLocale}
          IntlConstructor={CachedIntl}
          renderKey={intlayerRenderKey}
        />
        <LanguageSectionRenderer
          label="Native Area"
          displayLocale={nativeLocale}
          IntlConstructor={globalThis.Intl}
          renderKey={nativeRenderKey}
        />
      </div>
    </div>
  );
};
