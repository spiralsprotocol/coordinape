import assert from 'assert';
import React, { useState } from 'react';

import { claimsUnwrappedAmount } from 'common-lib/distributions';
import { isUserAdmin } from 'lib/users';
import { getDisplayTokenString } from 'lib/vaults/tokens';
import uniqBy from 'lodash/uniqBy';
import { DateTime } from 'luxon';
import { useQuery, useQueryClient } from 'react-query';
import { useParams } from 'react-router-dom';

import { DISTRIBUTION_TYPE } from '../../config/constants';
import { useSelectedCircle } from '../../recoilState';
import { paths } from '../../routes/paths';
import { LoadingModal } from 'components';
import { QUERY_KEY_MAIN_HEADER } from 'components/MainLayout/getMainHeaderData';
import { useApiAdminCircle, useContracts } from 'hooks';
import useConnectedAddress from 'hooks/useConnectedAddress';
import { AppLink, BackButton, Box, Text } from 'ui';
import { SingleColumnLayout } from 'ui/layouts';

import { AllocationsTable } from './AllocationsTable';
import { DistributionForm } from './DistributionForm';
import type { Gift } from './queries';
import { getEpochData } from './queries';

export function DistributionsPage() {
  const { epochId } = useParams();
  const address = useConnectedAddress();
  const contracts = useContracts();
  const queryClient = useQueryClient();

  const {
    isIdle,
    isLoading,
    isError,
    error,
    data: epoch,
    refetch: refetchDistributions,
  } = useQuery(
    ['distributions', epochId],
    () => getEpochData(Number.parseInt(epochId || '0'), address, contracts),
    {
      enabled: !!address,
      retry: false,
      select: d => {
        if (d.circle)
          d.circle.organization.vaults = d.circle?.organization.vaults.map(
            v => {
              v.symbol = getDisplayTokenString(v);

              return v;
            }
          );
        return d;
      },
      refetchOnWindowFocus: false,
      notifyOnChangeProps: ['data'],
    }
  );

  const [formGiftAmount, setFormGiftAmount] = useState<string>('0');
  const [giftVaultId, setGiftVaultId] = useState<string>('');
  const { users: circleUsers, circleId } = useSelectedCircle();
  const { downloadCSV } = useApiAdminCircle(circleId);

  if (isIdle || isLoading) return <LoadingModal visible />;

  let epochError;
  if (isError) epochError = (error as any).message;

  if (!epoch?.id)
    return (
      <SingleColumnLayout>
        <Text p as="p">
          Epoch not found
        </Text>
        <Text size="small">{epochError}</Text>
      </SingleColumnLayout>
    );

  // remove deleted users' (where recipient doesn't exist) allocations from token gifts
  const gifts = epoch.token_gifts?.filter((g: Gift) => g.recipient) || [];
  const totalGive = gifts.reduce((t, g) => t + g.tokens, 0) || 0;

  assert(epoch.circle);
  const circle = epoch.circle;
  if (!isUserAdmin(circle.users[0])) {
    epochError = 'You are not an admin of this circle.';
  } else if (!epoch.ended) {
    epochError = 'This epoch has not ended yet.';
  }

  const circleDist = epoch.distributions.find(
    d =>
      d.distribution_type === DISTRIBUTION_TYPE.GIFT ||
      d.distribution_type === DISTRIBUTION_TYPE.COMBINED
  );
  const fixedDist = epoch.distributions.find(
    d =>
      d.distribution_type === DISTRIBUTION_TYPE.FIXED ||
      d.distribution_type === DISTRIBUTION_TYPE.COMBINED
  );

  const usersWithGiftnFixedAmounts = circleUsers
    .filter(u => {
      return (
        (fixedDist &&
          fixedDist.claims.some(c => c.profile_id === u.profile?.id)) ||
        (circle.fixed_payment_token_type && u.fixed_payment_amount) ||
        epoch.token_gifts?.some(g => g.recipient?.id === u.id && g.tokens > 0)
      );
    })
    .map(user => {
      const receivedGifts = epoch.token_gifts?.filter(
        g => g.recipient_id === user.id
      );

      const circleDistClaimAmount = circleDist?.claims.find(
        c => c.profile_id === user.profile?.id
      )?.new_amount;

      const { circleClaimed, fixedPayment } = claimsUnwrappedAmount({
        address: user.address,
        fixedDistDecimals: fixedDist?.vault.decimals,
        fixedGifts: fixedDist?.distribution_json.fixedGifts,
        fixedDistPricePerShare: fixedDist?.pricePerShare,
        circleDistDecimals: circleDist?.vault.decimals,
        circleDistClaimAmount,
        circleDistPricePerShare: circleDist?.pricePerShare,
        circleFixedGifts: circleDist?.distribution_json.fixedGifts,
      });
      return {
        id: user.id,
        name: user.name,
        address: user.address,
        fixedPaymentAmount: user.fixed_payment_amount ?? 0,
        fixedPaymentClaimed: fixedPayment,
        avatar: user.profile?.avatar,
        givers: receivedGifts?.length || 0,
        received: receivedGifts?.reduce((t, g) => t + g.tokens, 0) || 0,
        circleClaimed,
        combinedClaimed: fixedPayment + circleClaimed,
      };
    });

  const usersWithReceivedAmounts = uniqBy(
    gifts.map(g => g.recipient),
    'id'
  ).map(user => ({
    ...user,
    received:
      epoch.token_gifts
        ?.filter(g => g.recipient?.id === user?.id)
        .reduce((t, g) => t + g.tokens, 0) || 0,
  }));

  const vaults = circle.organization.vaults || [];
  const giftVault = vaults.find(v => v.id.toString() === giftVaultId);
  const fixedVault = vaults.find(v => v.id === circle.fixed_payment_vault_id);
  const tokenName = circleDist
    ? getDisplayTokenString(circleDist.vault)
    : giftVault
    ? getDisplayTokenString(giftVault)
    : '';
  const fixedTokenName = fixedDist
    ? getDisplayTokenString(fixedDist.vault)
    : fixedVault
    ? getDisplayTokenString(fixedVault)
    : '';

  const startDate = DateTime.fromISO(epoch.start_date);
  const endDate = DateTime.fromISO(epoch.end_date);

  const refetch = () => {
    refetchDistributions();
    queryClient.invalidateQueries(QUERY_KEY_MAIN_HEADER);
  };

  return (
    <SingleColumnLayout>
      <AppLink to={paths.history(circle.id)}>
        <BackButton />
      </AppLink>
      <Text h1 css={{ '@sm': { display: 'block' } }}>
        Distributions&nbsp;
        <Text normal>
          Epoch {epoch.number}: {startDate.toFormat('MMM d')} -{' '}
          {endDate.toFormat(endDate.month === startDate.month ? 'd' : 'MMM d')}
        </Text>
      </Text>
      <Box css={{ maxWidth: '712px' }}>
        <Text p as="p" css={{ my: '$md' }}>
          Please enter your budget for the epoch and review the distribution
          details below. If all looks good, approve the distribution so that
          contributors can claim their funds.
        </Text>
        <Text p as="p">
          Please note: Each token distribution requires a separate transaction.
          If you choose the same token, you can combine Gift Circle and Fixed
          Payment transactions. If you choose a token that you don&apos;t have a
          vault for, you can export the distribution to a CSV.
        </Text>
      </Box>
      {epochError ? (
        <Text
          css={{
            fontSize: '$h3',
            fontWeight: '$semibold',
            textAlign: 'center',
            display: 'block',
            mt: '$md',
            color: '$alert',
          }}
        >
          {epochError}
        </Text>
      ) : (
        <>
          <Box css={{ mt: '$lg' }}>
            <DistributionForm
              circleDist={circleDist}
              fixedDist={fixedDist}
              giftVaultId={giftVaultId}
              formGiftAmount={formGiftAmount}
              epoch={epoch}
              users={usersWithReceivedAmounts}
              setAmount={setFormGiftAmount}
              setGiftVaultId={setGiftVaultId}
              vaults={vaults}
              circleUsers={circleUsers}
              refetch={refetch}
              totalGive={totalGive}
            />
          </Box>
          <AllocationsTable
            epoch={epoch}
            users={usersWithGiftnFixedAmounts}
            tokenName={tokenName}
            totalGive={totalGive}
            formGiftAmount={Number(formGiftAmount)}
            fixedTokenName={fixedTokenName}
            giveTokenName={circle.token_name}
            downloadCSV={downloadCSV}
            circleDist={circleDist}
            fixedDist={fixedDist}
          />
        </>
      )}
    </SingleColumnLayout>
  );
}
