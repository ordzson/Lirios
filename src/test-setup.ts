// Global setup for `ng test` (Vitest on jsdom 28). Wired in angular.json
// (architect.test.options.setupFiles).
//
// jsdom has no HTMLDialogElement.showModal/show/close. This minimal stand-in only
// lets components that wrap a native <dialog> mount and toggle: it flips `open`
// and dispatches `close`. Focus trapping, Esc and focus return are NOT emulated;
// those are verified in a real browser (`verify:flows`, F4 and F7). PLAN.md §4.3.

if (typeof HTMLDialogElement !== 'undefined') {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
    showModal?: () => void;
    show?: () => void;
    close?: (returnValue?: string) => void;
  };

  if (typeof proto.showModal !== 'function') {
    proto.showModal = function showModal(this: HTMLDialogElement): void {
      this.setAttribute('open', '');
    };
  }

  if (typeof proto.show !== 'function') {
    proto.show = function show(this: HTMLDialogElement): void {
      this.setAttribute('open', '');
    };
  }

  if (typeof proto.close !== 'function') {
    proto.close = function close(this: HTMLDialogElement, returnValue?: string): void {
      if (!this.hasAttribute('open')) return;
      if (returnValue !== undefined) this.returnValue = returnValue;
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
}

export {};
