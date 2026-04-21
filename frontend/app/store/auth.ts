let accessToken: string | null = null;
let userId: number | null = null;
let username: string | null = null;

export const AuthStore = {
  setToken: (token: string) => { accessToken = token; },
  getToken: () => accessToken,
  setUser: (id: number, name: string) => { userId = id; username = name; },
  getUserId: () => userId,
  clear: () => { accessToken = null; userId = null; username = null; },
};
