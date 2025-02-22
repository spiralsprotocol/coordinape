import assert from 'assert';

import type { Web3Provider } from '@ethersproject/providers';
import * as Sentry from '@sentry/react';
import { Web3ReactContextInterface } from '@web3-react/core/dist/types';

import { useApiBase, useRecoilLoadCatch } from 'hooks';
import { useApeSnackbar } from 'hooks/useApeSnackbar';
import { rSelectedCircleIdSource } from 'recoilState/app';
import { rApiManifest, rApiFullCircle } from 'recoilState/db';

import { connectors } from './connectors';
import { login } from './login';
import { setAuthToken } from './token';
import { rWalletAuth } from './useWalletAuth';

import { EConnectorNames } from 'types';

export const clearStateAfterLogout = (set: any) => {
  // this triggers logout via recoil's effects_UNSTABLE
  set(rWalletAuth, { authTokens: {} });
  set(rApiFullCircle, new Map());
  set(rApiManifest, undefined);
  set(rSelectedCircleIdSource, undefined);
};

export const useFinishAuth = () => {
  const { showError } = useApeSnackbar();
  const { fetchManifest } = useApiBase();

  // FIXME it's a bit inconsistent that this catches its own errors instead of
  // delegating to useRecoilLoadCatch. but we should probably just not use
  // useRecoilLoadCatch at all and instead just get the walletAuth data from an
  // ordinary useRecoilValue hook in RequireAuth
  return useRecoilLoadCatch(
    ({ set }) =>
      async ({
        web3Context,
        authTokens,
      }: {
        web3Context: Web3ReactContextInterface<Web3Provider>;
        authTokens: Record<string, string | undefined>;
      }) => {
        const { connector, account: address, library } = web3Context;
        assert(address && library);

        try {
          const connectorName = Object.entries(connectors).find(
            ([, c]) => connector?.constructor === c.constructor
          )?.[0] as EConnectorNames;

          let token = authTokens[address];
          if (!token) {
            token = (await login(address, library)).token;
            setAuthToken(token);
          }

          if (!token) return false;

          // Send a truncated address to sentry to help us debug customer issues
          Sentry.setTag(
            'address_truncated',
            address.substr(0, 8) + '...' + address.substr(address.length - 8, 8)
          );
          const newWalletAuth = {
            connectorName,
            address,
            authTokens: { ...authTokens, [address]: token },
          };
          set(rWalletAuth, newWalletAuth);

          // passing in newWalletAuth because Recoil snapshot is not updated yet
          return new Promise(res =>
            setTimeout(() =>
              fetchManifest(newWalletAuth)
                .then(res)
                .catch(() => {
                  // FIXME don't logout if request timed out
                  // we had a cached token & it's invalid
                  clearStateAfterLogout(set);
                  res(false);
                })
            )
          );
        } catch (e: any) {
          if (
            [/User denied message signature/].some(r => e.message?.match(r))
          ) {
            return false;
          }

          // for debugging this issue
          // eslint-disable-next-line no-console
          console.info(e);
          showError(`Failed to login: ${e.message || e}`);
        }
      },
    [],
    { who: 'finishAuth' }
  );
};
