import { styled } from '../../stitches.config';

export const HR = styled('hr', {
  height: 1,
  width: '100%',
  border: 'none',
  background: '$border',
  marginTop: '$lg',
  marginBottom: '$md',

  variants: {
    noMargin: {
      true: {
        marginTop: '0',
        marginBottom: '0',
      },
    },
  },
});

export default HR;
