import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import PieChartContainer from './PieChartContainer';

describe('insider transaction chart with React 19 and Recharts 3', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    vi.stubGlobal('ResizeObserver', class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback([{ target, contentRect: { width: 600, height: 300 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect() {}
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, width: 600, height: 300, top: 0, left: 0, bottom: 300, right: 600,
      toJSON() { return {}; },
    });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders real chart sectors and transaction labels, excluding zero values', async () => {
    const { container } = render(<PieChartContainer title="Insider activity" data={[
      { code: 'P', shares: 20 }, { code: 'S', shares: 10 }, { code: 'G', shares: 0 },
    ]} dataKey="shares" nameKey="code" colors={['green', 'red']} />);

    expect(screen.getByRole('heading', { name: 'Insider activity' })).toBeInTheDocument();
    expect(screen.getByText('Purchase')).toBeInTheDocument();
    expect(screen.getByText('Sale')).toBeInTheDocument();
    expect(screen.queryByText('Gift')).not.toBeInTheDocument();
    await waitFor(() => expect(container.querySelectorAll('.recharts-pie-sector').length).toBe(2));
  });

  it('handles an empty transaction history', () => {
    render(<PieChartContainer title="No transactions" data={[]} dataKey="shares" nameKey="code" colors={['green']} />);
    expect(screen.getByRole('heading', { name: 'No transactions' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
