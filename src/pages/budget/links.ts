import { href } from '../../router';

export type ItemTab = 'overview' | 'payments' | 'documents' | 'delivery' | 'installation' | 'messages' | 'issues' | 'warranty' | 'photos';

export const budgetHref = () => href('/budget');
export const itemHref = (id: string, tab: ItemTab = 'overview') => href(tab === 'overview' ? `/budget/items/${id}` : `/budget/items/${id}/${tab}`);
export const vendorHref = (id: string) => href(`/budget/vendors/${id}`);
export const documentHref = (id: string) => href(`/budget/documents/${id}`);
