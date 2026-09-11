import { StrictMode, useState, type ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useFocusTrap } from '../useFocusTrap';

function Trap({ children, label = 'Test dialog', sheet = false }: { children?: ReactNode; label?: string; sheet?: boolean }) {
  const ref = useFocusTrap<HTMLDivElement>({ layer: sheet ? 'sheet' : 'dialog' });
  return <div ref={ref} role="dialog" aria-label={label}>{children}</div>;
}

describe('modal keyboard focus', () => {
  it('skips hidden, disabled, inert and collapsed controls and wraps in both directions', async () => {
    const user = userEvent.setup();
    render(<Trap>
      <div hidden><button>Hidden</button></div>
      <div style={{ display: 'none' }}><button>CSS hidden</button></div>
      <button style={{ visibility: 'hidden' }}>Invisible</button>
      <div inert><button>Inert</button></div>
      <fieldset disabled><button>Disabled field</button></fieldset>
      <input type="hidden" />
      <button tabIndex={-1}>Not in tab order</button>
      <button>First</button>
      <details><summary>Options</summary><button>Collapsed option</button></details>
      <button>Last</button>
      <button disabled>Disabled last</button>
    </Trap>);
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await user.tab();
    expect(screen.getByText('Options')).toHaveFocus();
    await user.click(screen.getByText('Options'));
    screen.getByText('Options').focus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Collapsed option' })).toHaveFocus();
  });

  it('treats a closed summary as the last tab stop, not its hidden contents', async () => {
    const user = userEvent.setup();
    render(<Trap><button>First</button><details><summary>Options</summary><button>Hidden option</button></details></Trap>);
    await user.tab({ shift: true });
    expect(screen.getByText('Options')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('holds focus in a dialog with no usable controls', async () => {
    const user = userEvent.setup();
    render(<><button>Outside</button><Trap><button disabled>Busy</button></Trap></>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveFocus();
    await user.tab();
    expect(dialog).toHaveFocus();
    await user.tab({ shift: true });
    expect(dialog).toHaveFocus();
    screen.getByRole('button', { name: 'Outside' }).focus();
    expect(dialog).toHaveFocus();
  });

  it('recovers when the focused action disappears', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Trap><button>First</button><button>Last</button></Trap>);
    screen.getByRole('button', { name: 'Last' }).focus();
    rerender(<Trap><button>First</button></Trap>);
    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('returns to the opener through nested dialogs without fighting the parent trap', async () => {
    const user = userEvent.setup();
    function Nested() {
      const [outer, setOuter] = useState(false);
      const [inner, setInner] = useState(false);
      return <>
        <button onClick={() => setOuter(true)}>Open</button>
        {outer && <Trap label="Outer">
          <button onClick={() => setInner(true)}>Open inner</button>
          <button onClick={() => setOuter(false)}>Close outer</button>
          {inner && <Trap label="Inner"><button onClick={() => setInner(false)}>Close inner</button></Trap>}
        </Trap>}
      </>;
    }
    render(<StrictMode><Nested /></StrictMode>);
    await user.click(screen.getByRole('button', { name: 'Open', exact: true }));
    expect(screen.getByRole('button', { name: 'Open inner' })).toHaveFocus();
    await user.keyboard('{Enter}');
    const inner = screen.getByRole('dialog', { name: 'Inner' });
    await user.tab();
    expect(within(inner).getByRole('button')).toHaveFocus();
    screen.getByRole('button', { name: 'Close outer' }).focus();
    expect(within(inner).getByRole('button')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Open inner' })).toHaveFocus();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Open', exact: true })).toHaveFocus();
  });

  it('gives an initially mounted child ownership even when its effect runs first', () => {
    render(<Trap label="Outer"><button>Outer action</button><Trap label="Inner"><button>Inner action</button></Trap></Trap>);
    expect(screen.getByRole('button', { name: 'Inner action' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Inner action' })).toHaveFocus();
  });

  it('does not let a responsive sheet steal focus from an existing dialog', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<><Trap><button>Dialog action</button></Trap></>);
    rerender(<><Trap><button>Dialog action</button></Trap><Trap sheet label="Sheet"><button>Sheet action</button></Trap></>);
    expect(screen.getByRole('button', { name: 'Dialog action' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Dialog action' })).toHaveFocus();
  });

  it('falls back to the editor when a transient menu opener has been removed', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const { rerender } = render(<><div id="dm-canvas-area" tabIndex={-1} /><Trap><button>Close</button></Trap></>);
    opener.remove();
    const canvas = document.getElementById('dm-canvas-area')!;
    rerender(<><div id="dm-canvas-area" tabIndex={-1} /></>);
    expect(canvas).toHaveFocus();
  });
});
