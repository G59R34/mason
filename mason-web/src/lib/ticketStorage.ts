export const CURRENT_TICKET_KEY = 'ms_conversation_id';
export const TICKET_LIST_KEY = 'ms_ticket_ids';
export const CUSTOMER_NAME_KEY = 'ms_customer_name';

export function addTicketIdToStorage(id: string) {
  try {
    const ids = JSON.parse(localStorage.getItem(TICKET_LIST_KEY) || '[]').filter(Boolean) as string[];
    if (!ids.includes(id)) ids.unshift(id);
    localStorage.setItem(TICKET_LIST_KEY, JSON.stringify(ids.slice(0, 20)));
  } catch {
    localStorage.setItem(TICKET_LIST_KEY, JSON.stringify([id]));
  }
}
