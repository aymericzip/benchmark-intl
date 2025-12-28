# Intlayer vs Native Intl: Performance Benchmark

This project is a React-based benchmark designed to measure and visualize the performance impact of creating `Intl` instances (Internationalization API) during component rendering.

It compares the **Native `Intl` API** against **`Intlayer`'s Cached Intl** implementation under high-stress rendering scenarios.

## Important Configuration Note

**This test benchmarks the performance of Intlayer versus Native Intl.**

> **⚠️ Execute this WITHOUT the React Compiler.**
>
> The React Compiler levels out performance metrics by optimizing Native API usage, while significantly slowing down Intlayer's performance due to proxy overhead optimization conflicts.
>
> The performance difference is most notable in:
> - Non-V8 browsers (Firefox, Safari).
> - Applications using FormatJS polyfills (e.g., React Native).
> - Low-end devices where object instantiation is costly.

## The Problem

In JavaScript, creating new instances of `Intl` objects (like `DateTimeFormat`, `NumberFormat`, or `DisplayNames`) is computationally expensive. The engine must:
1. Parse the locale string.
2. Load heavy CLDR data.
3. Resolve fallback chains.

In React applications, if `new Intl.*` is called inside a component body, this heavy process runs **on every render**.

```tsx
// 🐢 Slow on large lists
const MyComponent = ({ date }) => {
  // Re-instantiated every render!
  const formatter = new Intl.DateTimeFormat('en', { month: 'long' });

  return <span>{formatter.format(date)}</span>;
}