import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Sin `globals: true`, testing-library no desmonta solo entre pruebas.
afterEach(() => cleanup());
