export * from './circleId';
export * from './contracts';
export * from './tokens';

// the list of tokens that we support depositing as simple tokens.
export enum Asset {
  DAI = 'DAI',
  USDC = 'USDC',
  USDT = 'USDT',
  YFI = 'YFI',
  WETH = 'WETH',
  GETH = 'Green ETH',
}

// the list of tokens that we support depositing into Yearn through our vaults.
// other tokens can be used ("simple tokens") but they won't be deposited into
// Yearn.
export enum YearnAsset {
  DAI = 'DAI',
  USDC = 'USDC',
  USDT = 'USDT',
  YFI = 'YFI',
  WETH = 'WETH',
}
