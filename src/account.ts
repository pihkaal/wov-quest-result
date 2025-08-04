const ACCOUNTS_FILE = "./.cache/accounts.json";

export const initAccounts = async (): Promise<void> => {
  if (!(await Bun.file(ACCOUNTS_FILE).exists())) {
    Bun.file(ACCOUNTS_FILE).write("{}");
  }
};

export const getAccountBalance = async (playerId: string): Promise<number> => {
  const accounts: Record<string, number> = await Bun.file(ACCOUNTS_FILE).json();
  if (accounts[playerId]) return accounts[playerId];

  accounts[playerId] = 0;
  await Bun.file(ACCOUNTS_FILE).write(JSON.stringify(accounts));

  return 0;
};

export const setAccountBalance = async (
  playerId: string,
  balance: number,
): Promise<void> => {
  const accounts: Record<string, number> = await Bun.file(ACCOUNTS_FILE).json();
  accounts[playerId] = balance;

  await Bun.file(ACCOUNTS_FILE).write(JSON.stringify(accounts));
};
