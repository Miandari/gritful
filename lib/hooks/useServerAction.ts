import toast from 'react-hot-toast';

export function useServerAction<T extends (...args: any[]) => Promise<any>>(
  action: T
) {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | undefined> => {
    if (!navigator.onLine) {
      toast.error('You are offline');
      return undefined;
    }
    try {
      return await action(...args);
    } catch (e) {
      if (!navigator.onLine) {
        toast.error('You are offline');
        return undefined;
      }
      throw e;
    }
  };
}
