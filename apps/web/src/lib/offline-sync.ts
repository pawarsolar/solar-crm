import { get, set } from 'idb-keyval';

export interface QueuedAction {
  id: string;
  endpoint: string;
  method: string;
  body: any;
  createdAt: number;
}

const QUEUE_KEY = 'solar_offline_queue';

export async function getOfflineQueue(): Promise<QueuedAction[]> {
  const queue = await get<QueuedAction[]>(QUEUE_KEY);
  return queue || [];
}

export async function enqueueOfflineAction(action: Omit<QueuedAction, 'id' | 'createdAt'>) {
  const queue = await getOfflineQueue();
  const newAction: QueuedAction = {
    ...action,
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    createdAt: Date.now(),
  };
  queue.push(newAction);
  await set(QUEUE_KEY, queue);
  return newAction;
}

export async function flushOfflineQueue(
  executeRequest: (endpoint: string, method: string, body: any) => Promise<any>,
): Promise<number> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return 0;

  let successful = 0;
  const remaining: QueuedAction[] = [];

  for (const item of queue) {
    try {
      await executeRequest(item.endpoint, item.method, item.body);
      successful++;
    } catch {
      remaining.push(item);
    }
  }

  await set(QUEUE_KEY, remaining);
  return successful;
}
