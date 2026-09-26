import { href } from '../../router';

export type ItemTab = 'overview' | 'payments' | 'photos';

export const budgetHref = () => href('/budget');
export const itemHref = (id: string, tab: ItemTab = 'overview') => href(tab === 'overview' ? `/budget/items/${id}` : `/budget/items/${id}/${tab}`);
export const vendorHref = (id: string) => href(`/budget/vendors/${id}`);
