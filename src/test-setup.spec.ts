describe('test-setup: HTMLDialogElement stand-in', () => {
  it('showModal opens and close closes, dispatching close once', () => {
    const dialog = document.createElement('dialog');
    document.body.append(dialog);
    const onClose = vi.fn();
    dialog.addEventListener('close', onClose);

    dialog.showModal();
    expect(dialog.open).toBe(true);

    dialog.close('done');
    expect(dialog.open).toBe(false);
    expect(dialog.returnValue).toBe('done');
    expect(onClose).toHaveBeenCalledTimes(1);

    dialog.close();
    expect(onClose).toHaveBeenCalledTimes(1);
    dialog.remove();
  });
});
