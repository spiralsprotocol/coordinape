import { useState, useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { isUserAdmin } from 'lib/users';
import { SubmitHandler, useController, useForm } from 'react-hook-form';
import { useQueryClient } from 'react-query';
import { styled } from 'stitches.config';
import { z } from 'zod';

import { FormInputField, makeTable } from 'components';
import {
  USER_COORDINAPE_ADDRESS,
  USER_ROLE_ADMIN,
  USER_ROLE_COORDINAPE,
} from 'config/constants';
import { zEthAddress } from 'forms/formHelpers';
import { useApeSnackbar, useApiAdminCircle, useNavigation } from 'hooks';
import useMobileDetect from 'hooks/useMobileDetect';
import { Check, X, Slash, Info } from 'icons/__generated';
import { CircleSettingsResult } from 'pages/CircleAdminPage/getCircleSettings';
import {
  FixedPaymentResult,
  QUERY_KEY_FIXED_PAYMENT,
} from 'pages/CircleAdminPage/getFixedPayment';
import { EXTERNAL_URL_WHY_COORDINAPE_IN_CIRCLE, paths } from 'routes/paths';
import {
  AppLink,
  Avatar,
  Box,
  Button,
  CheckBox,
  Divider,
  Flex,
  Form,
  FormLabel,
  Link,
  Modal,
  Tooltip,
  Text,
  ToggleButton,
} from 'ui';
import { TwoColumnLayout } from 'ui/layouts';
import { shortenAddress } from 'utils';

import { IDeleteUser } from '.';

import { IUser } from 'types';

const GIFT_CIRCLE_DOCS_URL =
  'https://docs.coordinape.com/info/documentation/gift_circle';

const TD = styled('td', {});
const TR = styled('tr', {});

const headerStyles = {
  color: '$secondaryText',
  textTransform: 'uppercase',
  fontSize: '$small',
  fontWeight: '$bold',
  lineHeight: '$shorter',
};

const schema = z
  .object({
    name: z.string().refine(val => val.trim().length >= 3, {
      message: 'Name must be at least 3 characters long.',
    }),
    address: zEthAddress,
    non_giver: z.boolean(),
    fixed_non_receiver: z.boolean(),
    non_receiver: z.boolean(),
    role: z.boolean(),
    starting_tokens: z.number(),
    fixed_payment_amount: z.number(),
  })
  .strict();

type EditUserFormSchema = z.infer<typeof schema>;

const makeCoordinape = (circleId: number): IUser => {
  return {
    circle_id: circleId,
    created_at: new Date().toString(),
    epoch_first_visit: false,
    give_token_received: 0,
    id: -1,
    isCircleAdmin: false,
    isCoordinapeUser: true,
    deleted_at: new Date().toString(),
    teammates: [],
    updated_at: '',
    name: 'Coordinape',
    address: USER_COORDINAPE_ADDRESS,
    role: 2,
    non_receiver: false,
    fixed_non_receiver: false,
    starting_tokens: 0,
    non_giver: true,
    give_token_remaining: 0,
    bio: 'Coordinape is the platform you’re using right now! We currently offer our service for free and invite people to allocate to us from within your circles. All funds received go towards funding the team and our operations.',
  };
};

const coordinapeTooltipContent = () => {
  return (
    <Box
      css={{
        m: '$sm',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Text size="large" css={{ my: '$md' }}>
        Why is Coordinape in your circle?
      </Text>
      <p>
        We&apos;re experimenting with the gift circle mechanism as our revenue
        model. By default, Coordinape appears in your circle and any user can
        allocate to Coordinape. To show or hide the Coordinape user, use the
        links on the right side of this row.
      </p>
      <a
        href={EXTERNAL_URL_WHY_COORDINAPE_IN_CIRCLE}
        target="_blank"
        rel="noreferrer"
      >
        Let us know what you think
      </a>
    </Box>
  );
};

const UserName = ({ user }: { user: IUser }) => {
  const { getToProfile } = useNavigation();

  return (
    <Box
      css={{
        height: '$2xl',
        alignItems: 'center',

        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        width: '100%',
      }}
    >
      <Avatar
        path={user?.profile?.avatar}
        name={user?.name}
        size="small"
        onClick={getToProfile(user.address)}
        css={{ mr: '$sm' }}
      />
      <Text
        css={{
          display: 'block',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {user.name}{' '}
        {user.role === USER_ROLE_COORDINAPE ? (
          <Tooltip content={coordinapeTooltipContent()}>
            <Info size="sm" />
          </Tooltip>
        ) : (
          ''
        )}
      </Text>
    </Box>
  );
};

const MemberRow = ({
  user,
  myUser: me,
  isAdmin,
  fixedPaymentToken,
  availableInVault,
  fixedPayment,
  tokenName,
  setDeleteUserDialog,
  setLeaveCircleDialog,
  circleId,
}: {
  user: IUser;
  myUser: IUser;
  isAdmin: boolean;
  fixedPaymentToken?: string;
  availableInVault: string;
  fixedPayment?: FixedPaymentResult;
  tokenName: string | undefined;
  setDeleteUserDialog: (u: IDeleteUser) => void;
  setLeaveCircleDialog: (u: IDeleteUser) => void;
  circleId: number;
}) => {
  // const { getToProfile } = useNavigation();
  const { isMobile } = useMobileDetect();

  const [open, setOpen] = useState(false);
  const [showOptOutChangeWarning, setShowOptOutChangeWarning] = useState(false);
  const [hasAcceptedOptOutWarning, setHasAcceptedOptOutWarning] =
    useState(false);

  const { showInfo } = useApeSnackbar();
  const { updateUser, restoreCoordinape, deleteUser } =
    useApiAdminCircle(circleId);
  const queryClient = useQueryClient();

  const { control, handleSubmit, watch, setValue, reset } =
    useForm<EditUserFormSchema>({
      resolver: zodResolver(schema),
      mode: 'all',
    });

  const { field: userRole } = useController({
    name: 'role',
    control,
    defaultValue: user.role === 1 ? true : false,
  });

  const { field: nonGiver } = useController({
    name: 'non_giver',
    control,
    defaultValue: user.non_giver,
  });

  const { field: nonReceiver } = useController({
    name: 'non_receiver',
    control,
    defaultValue: user.non_receiver,
  });

  const { field: fixedNonReceiver } = useController({
    name: 'fixed_non_receiver',
    control,
    defaultValue: user.fixed_non_receiver,
  });

  const watchFixedPaymentAmount = watch('fixed_payment_amount');

  const fixedPaymentTotal = (
    fixedPaymentAmount: number
  ): { fixedTotal: number; fixedReceivers: number } => {
    let fixedTotal = fixedPayment?.fixedPaymentTotal ?? 0;
    let fixedReceivers = fixedPayment?.fixedPaymentNumber ?? 0;
    if (!user.fixed_payment_amount && fixedPaymentAmount > 0) {
      fixedTotal = fixedPayment?.fixedPaymentTotal + fixedPaymentAmount;
      fixedReceivers = (fixedPayment?.fixedPaymentNumber ?? 0) + 1;
    } else if (user.fixed_payment_amount && fixedPaymentAmount > 0) {
      fixedTotal =
        fixedPayment?.fixedPaymentTotal +
        (fixedPaymentAmount - (user.fixed_payment_amount ?? 0));
      fixedReceivers = fixedPayment?.fixedPaymentNumber ?? 1;
    }
    return {
      fixedTotal,
      fixedReceivers,
    };
  };

  const isOptedOut = !!user.fixed_non_receiver || !!user.non_receiver;
  const hasGiveAllocated = !!user.give_token_received;

  const onSubmit: SubmitHandler<EditUserFormSchema> = async data => {
    try {
      const hasOptOutChanged = isOptedOut !== !!data?.fixed_non_receiver;
      const showWarning =
        hasOptOutChanged && hasGiveAllocated && !hasAcceptedOptOutWarning;

      if (showWarning) {
        setShowOptOutChangeWarning(true);
      } else {
        setShowOptOutChangeWarning(false);
        updateUser(user.address, { ...data, role: data.role ? 1 : 0 })
          .then(() => {
            showInfo('Saved changes');
            queryClient.invalidateQueries(QUERY_KEY_FIXED_PAYMENT);
          })
          .catch(console.warn);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <>
      <TR
        key={user.id}
        css={
          user.deleted_at !== null
            ? {
                '> td': { opacity: 0.3 },
                '> td.normal': { opacity: 1 },
              }
            : {}
        }
      >
        <TD css={{ width: '20%' }} align="left">
          <UserName user={user} />
        </TD>
        {isAdmin && !isMobile && <TD>{shortenAddress(user.address)}</TD>}

        {!isMobile && (
          <>
            <TD
              css={{
                textAlign: 'center !important',
                minWidth: '$4xl',
              }}
            >
              {!user.non_giver ? (
                <Check size="lg" color="complete" />
              ) : (
                <X size="lg" color="neutral" />
              )}
            </TD>
            <TD
              css={{
                textAlign: 'center !important',
                minWidth: '$4xl',
              }}
            >
              {user.fixed_non_receiver ? (
                <Slash color="alert" />
              ) : user.non_receiver ? (
                <X size="lg" color="neutral" />
              ) : (
                <Check size="lg" color="complete" />
              )}
            </TD>
          </>
        )}
        {!!fixedPaymentToken && isAdmin && (
          <TD css={{ textAlign: 'center !important' }}>
            {user.fixed_payment_amount === 0 ? '0' : user.fixed_payment_amount}{' '}
            {fixedPaymentToken}
          </TD>
        )}
        <TD
          css={{
            textAlign: 'center !important',
            minWidth: '$4xl',
          }}
        >
          {user.role === USER_ROLE_ADMIN ? (
            <Check size="lg" color="complete" />
          ) : (
            <X size="lg" color="neutral" />
          )}
        </TD>
        {isAdmin && (
          <>
            <TD
              css={{
                textAlign: 'center !important',
              }}
            >
              {!user.non_giver ||
              user.starting_tokens - user.give_token_remaining != 0
                ? `${user.starting_tokens - user.give_token_remaining}/${
                    user.starting_tokens
                  }`
                : '-'}
            </TD>
            <TD
              css={{
                textAlign: 'center !important',
              }}
            >
              {user.give_token_received === 0 &&
              (!!user.fixed_non_receiver || !!user.non_receiver)
                ? '-'
                : user.give_token_received}
            </TD>
          </>
        )}
        <TD>
          {isAdmin ? (
            user.role !== 2 ? (
              <Button
                color="primary"
                size="small"
                outlined
                css={{ mr: 0, ml: 'auto ', whiteSpace: 'nowrap' }}
                onClick={() => {
                  setOpen(prevState => !prevState);
                }}
              >
                {isMobile ? ' Manage' : 'Manage Member'}
              </Button>
            ) : (
              <Tooltip content={coordinapeTooltipContent()}>
                <Button
                  color="neutral"
                  size="small"
                  outlined
                  css={{ mr: 0, ml: 'auto ', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    const shouldEnable = user.deleted_at !== null;
                    const confirm = window.confirm(
                      `${
                        shouldEnable ? 'Enable' : 'Disable'
                      } Coordinape in this circle?`
                    );
                    if (confirm) {
                      shouldEnable
                        ? restoreCoordinape(circleId).catch(e =>
                            console.error(e)
                          )
                        : deleteUser(user.address);
                    }
                  }}
                >
                  {user.deleted_at === null ? 'Disable' : 'Enable'}
                </Button>
              </Tooltip>
            )
          ) : (
            user.id === me.id && (
              <Button
                color="destructive"
                size="small"
                outlined
                css={{
                  mr: 0,
                  ml: 'auto ',
                  height: '$lg',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => {
                  setLeaveCircleDialog({
                    name: user.name,
                    address: user.address,
                  });
                }}
              >
                Leave Circle
              </Button>
            )
          )}
        </TD>
      </TR>
      {open && (
        <TR key={user.address}>
          <TD colSpan={isMobile ? 6 : 9}>
            <Form>
              <Text h3 semibold css={{ my: '$md' }}>
                {user.name} Member Settings
              </Text>
              <Flex
                alignItems="center"
                css={{
                  justifyContent: 'space-between',
                  gap: '$lg',
                  flexWrap: 'wrap',
                }}
              >
                <Flex css={{ gap: '$lg', flexWrap: 'wrap' }}>
                  <FormInputField
                    id="name"
                    name="name"
                    control={control}
                    defaultValue={user.name}
                    label="Member Name"
                    infoTooltip="Member Displayed Name"
                    showFieldErrors
                  />
                  <FormInputField
                    id="address"
                    name="address"
                    control={control}
                    defaultValue={user.address}
                    label="Wallet Address"
                    infoTooltip="Member ETH address used to login and receive tokens"
                    showFieldErrors
                    css={{ minWidth: '420px', '@sm': { minWidth: 0 } }}
                  />
                  <Flex column alignItems="center" css={{ gap: '$md' }}>
                    <FormLabel type="label">
                      Circle Admin{' '}
                      <Tooltip
                        css={{ ml: '$xs' }}
                        content={
                          <div>
                            {' '}
                            As a Circle Admin, you will be able to edit Circle
                            Settings, Edit Epoch settings, edit your users, and
                            create new circles.{' '}
                          </div>
                        }
                      >
                        <Info size="sm" />
                      </Tooltip>
                    </FormLabel>
                    <CheckBox {...userRole} />
                  </Flex>
                </Flex>
                <Button
                  color="destructive"
                  size="medium"
                  outlined
                  css={{ height: '$lg', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    user.id === me.id
                      ? setLeaveCircleDialog({
                          name: user.name,
                          address: user.address,
                        })
                      : setDeleteUserDialog({
                          name: user.name,
                          address: user.address,
                        });
                  }}
                >
                  {user.id === me.id ? 'Leave Circle' : 'Delete Member'}
                </Button>
              </Flex>
              <TwoColumnLayout css={{ mt: '56px' }}>
                <Divider />
                <Divider />
                <Flex column css={{ mt: '-16px' }}>
                  <Text h3 css={{ mb: '$md', fontWeight: '$semibold' }}>
                    Gift Circle
                  </Text>
                  <Flex css={{ gap: '$md', mb: '$md', flexWrap: 'wrap' }}>
                    <Flex column css={{ gap: '$xs' }}>
                      <FormLabel type="label">
                        Give Tokens?
                        <Tooltip
                          content={
                            <div>
                              Gives the member the ability to reward circle
                              members with giving{' '}
                              <Link href={GIFT_CIRCLE_DOCS_URL} target="_blank">
                                Learn More
                              </Link>
                            </div>
                          }
                        >
                          <Info size="sm" />
                        </Tooltip>
                      </FormLabel>
                      <Flex css={{ gap: '$sm', flexWrap: 'wrap' }}>
                        <ToggleButton
                          color="complete"
                          active={!nonGiver.value}
                          name={nonGiver.name}
                          onClick={e => {
                            e.preventDefault();
                            setValue('non_giver', false, { shouldDirty: true });
                          }}
                        >
                          <Check size="lg" /> Give
                        </ToggleButton>
                        <ToggleButton
                          color="destructive"
                          active={nonGiver.value}
                          name={nonGiver.name}
                          onClick={e => {
                            e.preventDefault();
                            setValue('non_giver', true, { shouldDirty: true });
                          }}
                        >
                          <X size="lg" /> No Give
                        </ToggleButton>
                      </Flex>
                    </Flex>
                    <Flex column css={{ gap: '$xs' }}>
                      <FormLabel type="label">
                        Receive Tokens?
                        <Tooltip
                          content={
                            <div>
                              Allows the Contributor to get paid based on the
                              amount of giving allocated by circle members.{' '}
                              <Link href={GIFT_CIRCLE_DOCS_URL} target="_blank">
                                Learn More
                              </Link>
                            </div>
                          }
                        >
                          <Info size="sm" />
                        </Tooltip>
                      </FormLabel>
                      <Flex css={{ flexWrap: 'wrap', gap: '$sm' }}>
                        <ToggleButton
                          color="complete"
                          active={!nonReceiver.value && !fixedNonReceiver.value}
                          name={nonReceiver.name}
                          onClick={e => {
                            e.preventDefault();
                            setValue('non_receiver', false, {
                              shouldDirty: true,
                            });
                            setValue('fixed_non_receiver', false, {
                              shouldDirty: true,
                            });
                          }}
                        >
                          <Check size="lg" /> Receive Give
                        </ToggleButton>
                        <ToggleButton
                          color="destructive"
                          active={nonReceiver.value && !fixedNonReceiver.value}
                          name={nonReceiver.name}
                          onClick={e => {
                            e.preventDefault();
                            setValue('non_receiver', true, {
                              shouldDirty: true,
                            });
                            setValue('fixed_non_receiver', false, {
                              shouldDirty: true,
                            });
                          }}
                        >
                          <X size="lg" /> Refuse Give
                        </ToggleButton>
                        <ToggleButton
                          color="destructive"
                          active={fixedNonReceiver.value}
                          name={fixedNonReceiver.name}
                          onClick={e => {
                            e.preventDefault();
                            setValue('fixed_non_receiver', true, {
                              shouldDirty: true,
                            });
                            setValue('non_receiver', false, {
                              shouldDirty: true,
                            });
                          }}
                        >
                          <Slash size="lg" /> Block
                        </ToggleButton>
                      </Flex>
                    </Flex>
                  </Flex>
                  <FormInputField
                    id="give_allotment"
                    name="starting_tokens"
                    number
                    control={control}
                    defaultValue={user.starting_tokens}
                    label="Give Allotment"
                    infoTooltip="The maximum amount of giving a user can allocate in an epoch"
                    showFieldErrors
                    css={{ width: '140px' }}
                  />
                </Flex>
                <Flex column css={{ mt: '-16px' }}>
                  <Text h3 css={{ mb: '$md', fontWeight: '$semibold' }}>
                    Fixed Payment
                  </Text>
                  <Flex
                    css={{ gap: '$md', flexWrap: 'wrap' }}
                    disabled={!fixedPaymentToken}
                  >
                    <FormInputField
                      id="fixed_payment_amount"
                      name="fixed_payment_amount"
                      number
                      control={control}
                      defaultValue={user.fixed_payment_amount}
                      label="Member Fixed Payment"
                      infoTooltip="Fixed Amount tokens allocated to this user regardless of gives received"
                      showFieldErrors
                      css={{ width: '190px' }}
                    />
                    <Flex column>
                      <Text
                        variant="label"
                        css={{ mb: '$xs', whiteSpace: 'nowrap' }}
                      >
                        Members
                      </Text>
                      <Text size="medium">
                        {
                          fixedPaymentTotal(watchFixedPaymentAmount)
                            .fixedReceivers
                        }
                      </Text>
                    </Flex>
                    <Flex column>
                      <Text
                        variant="label"
                        css={{ mb: '$xs', whiteSpace: 'nowrap' }}
                      >
                        Fixed Payments Total
                      </Text>
                      <Text size="medium">{`${
                        fixedPaymentTotal(watchFixedPaymentAmount).fixedTotal
                      } ${fixedPaymentToken ?? ''}`}</Text>
                    </Flex>
                    <Flex column>
                      <Text
                        css={{ mb: '$xs', whiteSpace: 'nowrap' }}
                        variant="label"
                      >
                        Available in Vault
                      </Text>{' '}
                      <Text size="medium">{`${availableInVault ?? ''} ${
                        fixedPaymentToken ?? ''
                      }`}</Text>
                    </Flex>
                  </Flex>
                  <Box css={{ fontSize: '$small', alignSelf: 'flex-end' }}>
                    Edit Fixed Payment Token in{' '}
                    <AppLink
                      to={paths.circleAdmin(user.circle_id)}
                      css={{ textDecoration: 'none' }}
                    >
                      <Text inline css={{ color: '$primary' }}>
                        Circle Settings
                      </Text>
                    </AppLink>
                  </Box>
                </Flex>
              </TwoColumnLayout>
              <Flex
                css={{
                  mt: '$lg',
                  mb: '$2xl',
                  gap: '$md',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  outlined
                  color="neutral"
                  size="medium"
                  css={{ whiteSpace: 'nowrap' }}
                  onClick={e => {
                    e.preventDefault();
                    reset();
                  }}
                >
                  Discard Changes
                </Button>
                <Button
                  outlined
                  color="complete"
                  size="medium"
                  css={{
                    justifySelf: 'end',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={handleSubmit(onSubmit)}
                >
                  Save Changes
                </Button>
              </Flex>
              <Modal
                onOpenChange={() => {
                  setHasAcceptedOptOutWarning(true);
                  setShowOptOutChangeWarning(false);
                }}
                open={!hasAcceptedOptOutWarning && showOptOutChangeWarning}
                title={`This user has ${tokenName || 'GIVE'} allocated.`}
              >
                <Flex column alignItems="start" css={{ gap: '$md' }}>
                  <Text p>
                    Changing their opt-in status will remove all{' '}
                    {tokenName || 'GIVE'} allocated to them. This cannot be
                    undone.
                  </Text>
                  <Button
                    color="primary"
                    onClick={() => {
                      setHasAcceptedOptOutWarning(true);
                      setShowOptOutChangeWarning(false);
                    }}
                  >
                    I Understand
                  </Button>
                </Flex>
              </Modal>
            </Form>
          </TD>
        </TR>
      )}
    </>
  );
};

export const MembersTable = ({
  visibleUsers,
  myUser: me,
  circle,
  filter,
  perPage,
  availableInVault,
  fixedPayment,
  setDeleteUserDialog,
  setLeaveCircleDialog,
}: {
  visibleUsers: IUser[];
  myUser: IUser;
  circle: CircleSettingsResult;
  filter: (u: IUser) => boolean;
  perPage: number;
  availableInVault: string;
  fixedPayment?: FixedPaymentResult;
  setDeleteUserDialog: (u: IDeleteUser) => void;
  setLeaveCircleDialog: (u: IDeleteUser) => void;
}) => {
  const { isMobile } = useMobileDetect();
  const isAdmin = isUserAdmin(me);

  const [view, setView] = useState<IUser[]>([]);

  const coordinapeUser = useMemo(() => makeCoordinape(circle.id), [circle]);

  const users: IUser[] = useMemo(() => {
    if (
      !visibleUsers.some(u => u.address === coordinapeUser.address) &&
      visibleUsers.length > 0
    ) {
      return [...visibleUsers, coordinapeUser];
    }
    return visibleUsers;
  }, [circle, visibleUsers, coordinapeUser]);

  useEffect(() => {
    const filtered = filter ? users.filter(filter) : users;
    setView(filtered);
  }, [users, perPage, filter, circle]);

  const MemberTable = makeTable<IUser>('MemberTable');

  const headers = [
    { title: 'Name', css: headerStyles },
    { title: 'ETH WALLET', css: headerStyles, isHidden: !isAdmin || isMobile },
    {
      title: 'Give',
      css: {
        ...headerStyles,
        textAlign: 'center !important',
      },
      isHidden: isMobile,
    },
    {
      title: 'Receive',
      css: { ...headerStyles, textAlign: 'center' },
      isHidden: isMobile,
    },
    {
      title: 'Fixed Payment',
      css: { ...headerStyles, textAlign: 'center' },
      isHidden: !circle.fixed_payment_token_type || !isAdmin,
    },
    { title: 'Discord Linked', css: { ...headerStyles }, isHidden: true },
    {
      title: 'Admin',
      css: {
        ...headerStyles,
        textAlign: 'center !important',
      },
    },
    {
      title: `${circle.tokenName} sent`,
      css: { ...headerStyles, textAlign: 'center' },
      isHidden: !isAdmin,
    },
    {
      title: `${circle.tokenName} received`,
      css: { ...headerStyles, textAlign: 'center' },
      isHidden: !isAdmin,
    },
    {
      title: 'Actions',
      css: { ...headerStyles, textAlign: 'right' },
    },
  ];

  return (
    <>
      <MemberTable
        key={circle.id}
        headers={headers}
        data={view}
        startingSortIndex={0}
        perPage={perPage}
        sortByColumn={(index: number) => {
          if (index === 0) return (u: IUser) => u.name.toLowerCase();
          if (index === 1) return (u: IUser) => u.address.toLowerCase();
          if (index === 2) return (u: IUser) => u.non_giver;
          if (index === 3) return (u: IUser) => u.non_receiver;
          if (index === 4) return (u: IUser) => u.fixed_payment_amount;
          if (index === 6) return (u: IUser) => u.isCircleAdmin;
          if (index === 7)
            return (u: IUser) =>
              !u.non_giver ? u.starting_tokens - u.give_token_remaining : -1;
          if (index === 8)
            return (u: IUser) =>
              !!u.fixed_non_receiver || !!u.non_receiver
                ? -1
                : u.give_token_received;
          return (u: IUser) => u.name.toLowerCase();
        }}
      >
        {member => (
          <MemberRow
            isAdmin={isAdmin}
            key={member.id}
            user={member}
            fixedPaymentToken={circle.fixed_payment_token_type}
            fixedPayment={fixedPayment}
            availableInVault={availableInVault}
            tokenName={circle.tokenName}
            myUser={me}
            setDeleteUserDialog={setDeleteUserDialog}
            setLeaveCircleDialog={setLeaveCircleDialog}
            circleId={circle.id}
          />
        )}
      </MemberTable>
    </>
  );
};
