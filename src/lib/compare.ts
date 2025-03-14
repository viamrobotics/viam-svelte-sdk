export const comparePartIds = (current: string[], last: string[]) => {
  const currentSet = new Set(current);
  const lastSet = new Set(last);

  const added = current.filter((item) => !lastSet.has(item));
  const removed = last.filter((item) => !currentSet.has(item));
  const unchanged = current.filter((item) => lastSet.has(item));

  return { added, removed, unchanged };
};
