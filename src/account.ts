const ACCOUNTS_FILE = "./accounts.json";

const Accounts = Bun.file(ACCOUNTS_FILE);

export const initAccounts = async (): Promise<void> => {
  if (!(await Accounts.exists())) {
    Accounts.write("{}");
  }
};

export const getAccountBalance = async (playerId: string): Promise<number> => {
  console.log("getAccountBalance")
  const accounts: Record<string, number> = await Accounts.json();
  console.log("getAccountBalance :: next")
  if (accounts[playerId]) return accounts[playerId];

  accounts[playerId] = 0;
  console.log("getAccountBalance :: next")
  await Accounts.write(JSON.stringify(accounts));
  console.log("getAccountBalance :: next")

  return 0;
};

export const setAccountBalance = async (
  playerId: string,
  balance: number,
): Promise<void> => {
  console.log("setAccountBalance")
  const accounts: Record<string, number> = await Accounts.json();
  console.log("setAccountBalance :: next")
  accounts[playerId] = balance;

  await Accounts.write(JSON.stringify(accounts));
  console.log("setAccountBalance :: next")
};
