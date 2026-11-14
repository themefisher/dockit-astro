export type SidebarSide = "left" | "right";

export const SIDEBAR_STORAGE_KEYS = {
  leftCollapsed: "dockit-left-sidebar-collapsed",
  rightCollapsed: "dockit-right-sidebar-collapsed",
  leftWidth: "dockit-left-sidebar-width",
  rightWidth: "dockit-right-sidebar-width",
} as const;

export const SIDEBAR_LIMITS: Record<
  SidebarSide,
  { min: number; max: number; defaultWidth: number; cssVar: string }
> = {
  left: {
    min: 200,
    max: 480,
    defaultWidth: 320,
    cssVar: "--dockit-left-sidebar-width",
  },
  right: {
    min: 180,
    max: 420,
    defaultWidth: 260,
    cssVar: "--dockit-right-sidebar-width",
  },
};

let globalListenersBound = false;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors (e.g. private browsing restrictions)
  }
}

function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

/** Clamp a sidebar width in pixels to the allowed bounds for its side. */
export function clampSidebarWidth(side: SidebarSide, width: number): number {
  const { min, max } = SIDEBAR_LIMITS[side];
  return Math.round(Math.min(max, Math.max(min, width)));
}

function getCollapsedAttrKey(side: SidebarSide): "leftSidebarCollapsed" | "rightSidebarCollapsed" {
  return side === "left" ? "leftSidebarCollapsed" : "rightSidebarCollapsed";
}

function getWidthStorageKey(side: SidebarSide): string {
  return side === "left" ? SIDEBAR_STORAGE_KEYS.leftWidth : SIDEBAR_STORAGE_KEYS.rightWidth;
}

function getCollapsedStorageKey(side: SidebarSide): string {
  return side === "left"
    ? SIDEBAR_STORAGE_KEYS.leftCollapsed
    : SIDEBAR_STORAGE_KEYS.rightCollapsed;
}

function getTargetElement(side: SidebarSide): HTMLElement | null {
  if (side === "left") {
    return document.getElementById("starlight__sidebar");
  }
  return document.querySelector<HTMLElement>(".right-sidebar-panel .sl-container");
}

function getCurrentWidth(side: SidebarSide): number {
  const inlineValue = document.documentElement.style.getPropertyValue(
    SIDEBAR_LIMITS[side].cssVar
  );
  const parsedInline = Number.parseFloat(inlineValue);
  if (Number.isFinite(parsedInline) && parsedInline > 0) {
    return clampSidebarWidth(side, parsedInline);
  }

  const target = getTargetElement(side);
  if (target) {
    const measured = target.getBoundingClientRect().width;
    if (measured > 0) {
      return clampSidebarWidth(side, measured);
    }
  }

  return SIDEBAR_LIMITS[side].defaultWidth;
}

function syncAccessibilityAttributes(): void {
  const root = document.documentElement;
  const sides: SidebarSide[] = ["left", "right"];

  for (const side of sides) {
    const isCollapsed = root.dataset[getCollapsedAttrKey(side)] === "true";
    const toggles = document.querySelectorAll<HTMLElement>(
      `[data-sidebar-toggle="${side}"]`
    );
    toggles.forEach((btn) => {
      btn.setAttribute("aria-expanded", String(!isCollapsed));
      const label =
        side === "left"
          ? isCollapsed
            ? "Show navigation sidebar"
            : "Collapse navigation sidebar"
          : isCollapsed
            ? "Show table of contents"
            : "Collapse table of contents";
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    });

    const handle = document.querySelector<HTMLElement>(
      `[data-sidebar-resize="${side}"]`
    );
    if (handle) {
      const { min, max } = SIDEBAR_LIMITS[side];
      handle.setAttribute("aria-valuemin", String(min));
      handle.setAttribute("aria-valuemax", String(max));
      handle.setAttribute("aria-valuenow", String(getCurrentWidth(side)));
    }
  }
}

/** Apply saved collapse states and widths from localStorage to the document root. */
export function applySidebarPreferences(): void {
  const root = document.documentElement;
  const sides: SidebarSide[] = ["left", "right"];

  for (const side of sides) {
    const collapsed = readStorage(getCollapsedStorageKey(side)) === "true";
    const attrKey = getCollapsedAttrKey(side);
    if (collapsed) {
      root.dataset[attrKey] = "true";
    } else {
      delete root.dataset[attrKey];
    }

    const savedWidth = readStorage(getWidthStorageKey(side));
    const parsedWidth = savedWidth ? Number.parseFloat(savedWidth) : Number.NaN;
    if (Number.isFinite(parsedWidth) && parsedWidth > 0) {
      const clamped = clampSidebarWidth(side, parsedWidth);
      root.style.setProperty(SIDEBAR_LIMITS[side].cssVar, `${clamped}px`);
    } else {
      root.style.removeProperty(SIDEBAR_LIMITS[side].cssVar);
    }
  }

  syncAccessibilityAttributes();
}

/** Toggle a sidebar between collapsed and expanded, persisting to localStorage. */
export function toggleSidebar(side: SidebarSide): void {
  const attrKey = getCollapsedAttrKey(side);
  const nextCollapsed = document.documentElement.dataset[attrKey] !== "true";
  if (nextCollapsed) {
    document.documentElement.dataset[attrKey] = "true";
    writeStorage(getCollapsedStorageKey(side), "true");
  } else {
    delete document.documentElement.dataset[attrKey];
    writeStorage(getCollapsedStorageKey(side), "false");
  }
  syncAccessibilityAttributes();
}

/** Set and optionally persist a sidebar width in pixels. */
export function setSidebarWidth(
  side: SidebarSide,
  width: number,
  persist = true
): number {
  const clamped = clampSidebarWidth(side, width);
  document.documentElement.style.setProperty(
    SIDEBAR_LIMITS[side].cssVar,
    `${clamped}px`
  );
  if (persist) {
    writeStorage(getWidthStorageKey(side), String(clamped));
  }
  const handle = document.querySelector<HTMLElement>(
    `[data-sidebar-resize="${side}"]`
  );
  if (handle) {
    handle.setAttribute("aria-valuenow", String(clamped));
  }
  return clamped;
}

/** Reset a sidebar back to its default CSS width and clear the saved override. */
export function resetSidebarWidth(side: SidebarSide): void {
  removeStorage(getWidthStorageKey(side));
  document.documentElement.style.removeProperty(SIDEBAR_LIMITS[side].cssVar);
  syncAccessibilityAttributes();
}

function bindResizeHandle(handle: HTMLElement): void {
  if (handle.dataset.dockitBound === "true") return;
  handle.dataset.dockitBound = "true";

  const side = handle.dataset.sidebarResize as SidebarSide | undefined;
  if (side !== "left" && side !== "right") return;

  let activePointerId: number | null = null;
  let startX = 0;
  let startWidth = SIDEBAR_LIMITS[side].defaultWidth;
  let latestWidth = startWidth;

  const endResize = (persist: boolean) => {
    if (activePointerId === null) return;
    activePointerId = null;
    delete document.documentElement.dataset.resizing;
    delete handle.dataset.active;
    if (persist) {
      setSidebarWidth(side, latestWidth, true);
    }
  };

  handle.addEventListener("pointerdown", (event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    startX = event.clientX;
    startWidth = getCurrentWidth(side);
    latestWidth = startWidth;
    activePointerId = event.pointerId;
    handle.setPointerCapture(event.pointerId);
    document.documentElement.dataset.resizing = "true";
    handle.dataset.active = "true";
  });

  handle.addEventListener("pointermove", (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) return;
    const isRtl = document.documentElement.dir === "rtl";
    const rawDelta = event.clientX - startX;
    const direction = side === "left" ? (isRtl ? -1 : 1) : isRtl ? 1 : -1;
    latestWidth = setSidebarWidth(side, startWidth + rawDelta * direction, false);
  });

  handle.addEventListener("pointerup", (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) return;
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
    endResize(true);
  });

  handle.addEventListener("pointercancel", (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) return;
    endResize(false);
  });

  handle.addEventListener("dblclick", () => {
    resetSidebarWidth(side);
  });

  handle.addEventListener("keydown", (event: KeyboardEvent) => {
    const step = event.shiftKey ? 32 : 16;
    const isRtl = document.documentElement.dir === "rtl";
    const direction = side === "left" ? (isRtl ? -1 : 1) : isRtl ? 1 : -1;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setSidebarWidth(side, getCurrentWidth(side) + step * direction, true);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSidebarWidth(side, getCurrentWidth(side) - step * direction, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      resetSidebarWidth(side);
    }
  });
}

/** Initialize sidebar toggle delegation, resize handles, and view-transition sync. */
export function initSidebarLayout(): void {
  applySidebarPreferences();

  document
    .querySelectorAll<HTMLElement>("[data-sidebar-resize]")
    .forEach(bindResizeHandle);

  if (globalListenersBound) return;
  globalListenersBound = true;

  document.addEventListener("click", (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const toggleBtn = target?.closest<HTMLElement>("[data-sidebar-toggle]");
    if (!toggleBtn) return;

    const side = toggleBtn.dataset.sidebarToggle;
    if (side === "left" || side === "right") {
      toggleSidebar(side);
    }
  });

  document.addEventListener("astro:after-swap", () => {
    applySidebarPreferences();
  });

  document.addEventListener("astro:page-load", () => {
    applySidebarPreferences();
    document
      .querySelectorAll<HTMLElement>("[data-sidebar-resize]")
      .forEach(bindResizeHandle);
  });
}
