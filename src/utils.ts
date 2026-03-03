const verifyAuthToken = (token: string, env: any) => {
  console.log('verifyAuthToken', token === env.AUTH_TOKEN);
  return token === env.AUTH_TOKEN;
};

export { verifyAuthToken };