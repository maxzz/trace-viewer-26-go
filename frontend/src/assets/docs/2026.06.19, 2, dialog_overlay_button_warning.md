# Dialog overlay button warning
_Exported on 6/19/2026 at 14:44:58 PDT from Cursor (3.8.11)_

---

**User**

DOM Path: div.data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed in.et-0 z-50 bg-black/5 dark:bg-black/10 backdrop-blur-[.7px]
Position: top=0px, left=0px, width=1121px, height=1093px
React Component: Primitive.div
HTML Element: <div data-state="open" data-slot="dialog-overlay" class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/5 dark:bg-black/10 backdrop-blur-[.7px]" style="pointer-events: auto;" data-aria-hidden="true" aria-hidden="true" data-cursor-element-id="cursor-el-1"></div> when click on this button the warning appears how to fix it?

---

**Cursor**

Investigating the dialog overlay and button click behavior in the codebase.


Found a related fix in the color picker. Checking how dialogs are opened and whether the aria-hidden focus warning is the issue.


Identifying the cause: dialogs use `onOpenAutoFocus={(e) => e.preventDefault()}`, so the clicked button keeps focus while Radix marks the page `aria-hidden` — triggering the browser warning. Applying the same blur pattern used in the color picker, centralized in `DialogContent`.


Focusing the dialog panel when auto-focus is prevented is better than blurring — it keeps focus inside the dialog without jumping to an input.


The browser console warning is:

**"Blocked aria-hidden on an element because its descendant retained focus."**

It happens when you click a button (e.g. the chevron on the highlight toggle) to open a dialog. Radix marks the page behind the dialog as `aria-hidden`, but the clicked button still has focus — and that button is inside the hidden region.

## Root cause

The edit dialogs use `onOpenAutoFocus={(e) => e.preventDefault()}` to avoid auto-focusing the first input. That keeps focus on the trigger button outside the dialog, which triggers the warning when the overlay opens.

This same issue was already handled in the color picker:

```66:66:frontend/src/components/ui/local-ui/color-picker-popup.tsx
            onClick={(e) => { e.currentTarget.blur(); setTimeout(() => onClick(), 50); }} // to avoid "Blocked aria-hidden on an element because its descendant retained focus."
```

## Fix applied

`DialogContent` now moves focus into the dialog panel when auto-focus is prevented, instead of leaving it on the trigger:

```71:76:frontend/src/components/ui/shadcn/dialog.tsx
    function handleOpenAutoFocus(e: Event) {
        onOpenAutoFocus?.(e);
        if (e.defaultPrevented) {
            (e.currentTarget as HTMLElement).focus();
        }
    }
```

This applies to all dialogs (Highlights, Filters, etc.) without changing each one individually. Focus lands on the dialog container (not an input), so the warning should stop and keyboard navigation still works.

Reload the app and open the Highlights or Filters dialog again — the console warning should be gone. If you still see it for a specific button, tell me which one and we can trace that path.

