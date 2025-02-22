import React from 'react';

import { DateTime } from 'luxon';

import { makeStyles, Button } from '@material-ui/core';

import { ReactComponent as EditProfileSVG } from 'assets/svgs/button/edit-profile.svg';
import {
  ApeInfoTooltip,
  ProfileSocialIcons,
  ThreeDotMenu,
  ProfileSkills,
  ReadMore,
} from 'components';
import { USER_ROLE_ADMIN, USER_ROLE_COORDINAPE } from 'config/constants';
import { useNavigation } from 'hooks';
import { useContributions } from 'hooks/useContributions';
import { useSelectedCircle } from 'recoilState';
import { useSetEditProfileOpen } from 'recoilState/ui';
import { EXTERNAL_URL_WHY_COORDINAPE_IN_CIRCLE } from 'routes/paths';
import { Flex, Avatar } from 'ui';

import { CardInfoText } from './CardInfoText';
import { ContributionSummary } from './ContributionSummary';
import { GiftInput } from './GiftInput';

import { ISimpleGift, ISimpleGiftUser } from 'types';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 330,
    height: 452,
    margin: theme.spacing(1),
    padding: theme.spacing(1.3, 1.3, 2),
    background: theme.colors.surface,
    borderRadius: 10.75,
  },
  topRow: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: '1fr 60px 1fr',
  },
  moreContainer: {
    justifySelf: 'end',
    margin: theme.spacing(0.7),
  },
  name: {
    display: '-webkit-box',
    '-webkit-line-clamp': 4,
    '-webkit-box-orient': 'vertical',
    wordBreak: 'break-word',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    gridColumn: '1 / 4',
    textAlign: 'center',
    margin: theme.spacing(0.5, 0),
    fontSize: 24,
    fontWeight: 600,
    color: theme.colors.text,
  },
  tooltipLink: {
    display: 'block',
    margin: theme.spacing(2, 0, 0),
    textAlign: 'center',
    color: theme.colors.link,
  },
  tooltip: {
    fontWeight: 400,
    color: theme.colors.text,
  },
  skillContainer: {
    gridColumn: '1 / 4',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  bio: {
    flexGrow: 1,
    fontSize: 14,
    fontWeight: 600,
    color: 'rgba(81, 99, 105, 0.5)',
    textAlign: 'center',
    WebkitLineClamp: 4,
    wordBreak: 'break-word',
    width: '100%',
    overflowY: 'auto',
    marginBottom: 12,
  },
  editButton: {
    margin: theme.spacing(7, 0, 2),
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(81, 99, 105, 0.5)',
    '&:hover': {
      background: 'none',
      textDecoration: 'underline',
    },
  },
}));

const ProfileCardInner = ({
  user,
  disabled,
  isMe,
  tokenName = 'GIVE',
  gift,
  setGift,
}: {
  user: ISimpleGiftUser;
  disabled?: boolean;
  isMe?: boolean;
  tokenName?: string;
  gift?: ISimpleGift;
  setGift: (gift: ISimpleGift) => void;
}) => {
  const classes = useStyles();
  const { getToProfile } = useNavigation();
  const setEditProfileOpen = useSetEditProfileOpen();

  const userBioTextLength = user?.bio?.length ?? 0;
  const skillsLength = user?.profile?.skills?.length ?? 0;

  const hideUserBio =
    (userBioTextLength > 93 && skillsLength > 2) || userBioTextLength > 270;

  const epochs = useSelectedCircle().circleEpochsStatus;
  const now = DateTime.now().toISO();
  const contributions = useContributions({
    address: user.address,
    // run a query that will return nothing if no epoch is active
    startDate:
      epochs.previousEpochEndedOn ||
      (epochs.currentEpoch?.startDate &&
        epochs.currentEpoch.startDate.minus({ months: 1 }).toISO()) ||
      now,
    endDate: epochs.currentEpoch?.end_date || now,
  });

  const updateGift = ({ note, tokens }: { note?: string; tokens?: number }) => {
    setGift({
      user,
      note: note === undefined ? gift?.note || '' : note,
      tokens: tokens === undefined ? gift?.tokens || 0 : tokens,
    });
  };

  return (
    <div className={classes.root} data-testid="profileCard">
      <div className={classes.topRow}>
        <Flex />
        <Avatar
          path={user.profile?.avatar}
          name={user.name}
          onClick={getToProfile(user.address)}
        />
        <div className={classes.moreContainer}>
          <ThreeDotMenu
            actions={[
              // FIXME need to pick a circle context
              // {
              //   label: 'View on Graph',
              //   onClick: getToMap({ highlight: user.address }),
              // },
              {
                label: 'View Profile',
                onClick: getToProfile(isMe ? 'me' : user.address),
              },
            ]}
          />
        </div>
        <span className={classes.name}>
          {user.name}
          <Flex alignItems="center" css={{ justifyContent: 'center' }}>
            {user.profile && <ProfileSocialIcons profile={user.profile} />}
          </Flex>
          {user.role === USER_ROLE_COORDINAPE && (
            <ApeInfoTooltip classes={{ tooltip: classes.tooltip }}>
              <b>Why is Coordinape in my circle?</b>
              <div>
                To date Coordinape has offered our service for free. We decided
                that using the gift circle mechanism as our revenue model might
                make a lot of sense, so we’re trying that out.
              </div>
              <a
                href={EXTERNAL_URL_WHY_COORDINAPE_IN_CIRCLE}
                rel="noreferrer"
                target="_blank"
                className={classes.tooltipLink}
              >
                Let us know what you think
              </a>
            </ApeInfoTooltip>
          )}
        </span>

        <div className={classes.skillContainer}>
          <ProfileSkills
            skills={user?.profile?.skills ?? []}
            isAdmin={user.role === USER_ROLE_ADMIN}
            max={3}
          />
        </div>
      </div>

      <div className={classes.bio}>
        {contributions?.length ? (
          <ContributionSummary contributions={contributions} />
        ) : isMe && !user.bio ? (
          'Your Epoch Statement is Blank'
        ) : (
          <ReadMore isHidden={hideUserBio}>{user.bio}</ReadMore>
        )}
      </div>

      {!disabled && !isMe && (
        <GiftInput
          tokens={
            user.fixed_non_receiver || user.non_receiver
              ? undefined
              : gift?.tokens || 0
          }
          note={gift?.note ?? ''}
          updateGift={updateGift}
          tokenName={tokenName}
        />
      )}

      {isMe && !!user.fixed_non_receiver && (
        <CardInfoText tooltip="">
          Your administrator opted you out of receiving. You can still
          distribute as normal.
        </CardInfoText>
      )}

      {isMe && !user.fixed_non_receiver && !!user.non_receiver && (
        <CardInfoText tooltip="">
          You are opted out of receiving ${tokenName}. Navigate to My Epoch and
          opt in to receive.
        </CardInfoText>
      )}

      {isMe && (
        <Button
          variant="text"
          className={classes.editButton}
          onClick={() => setEditProfileOpen(true)}
        >
          <EditProfileSVG />
          Edit My Profile
        </Button>
      )}
    </div>
  );
};

export const ProfileCard = React.memo(ProfileCardInner);
ProfileCard.displayName = 'ProfileCard';
