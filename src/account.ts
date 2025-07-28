const ACCOUNTS_FILE = "./accounts.json";

const Accounts = Bun.file(ACCOUNTS_FILE);

export const initAccounts = async (): Promise<void> => {
  if (!(await Accounts.exists())) {
    Accounts.write("{}");
  }
};

export const getAccountBalance = async (playerId: string): Promise<number> => {
  const accounts: Record<string, number> = await Accounts.json();
  if (accounts[playerId]) return accounts[playerId];

  accounts[playerId] = 0;
  await Accounts.write(JSON.stringify(accounts));

  return 0;
};

export const setAccountBalance = async (
  playerId: string,
  balance: number,
): Promise<void> => {
  const accounts: Record<string, number> = await Accounts.json();
  accounts[playerId] = balance;

  await Accounts.write(JSON.stringify(accounts));
};
