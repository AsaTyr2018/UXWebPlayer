import { describe, expect, it } from 'vitest';
import '../../src/admin/components/admin-app';

describe('ux-admin-app', () => {
  it('renders stat cards based on demo template data', async () => {
    const element = document.createElement('ux-admin-app');
    document.body.appendChild(element);

    await (element as any).updateComplete;

    const statCards = element.shadowRoot?.querySelectorAll('.stat-card');
    expect(statCards?.length).toBe(4);
  });

  it('lists the publishing queue entries', async () => {
    const element = document.createElement('ux-admin-app');
    document.body.appendChild(element);

    await (element as any).updateComplete;

    const rows = element.shadowRoot?.querySelectorAll('tbody tr');
    expect(rows?.length).toBe(4);
  });
});
