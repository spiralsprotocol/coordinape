import {
  CircularProgress,
  Modal,
  Typography,
  makeStyles,
} from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  modal: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    outline: 'none',
    padding: theme.spacing(4),
    userSelect: `none`,
    textAlign: 'center',
  },
  title: {
    fontSize: 16,
    textAlign: 'center',
    color: theme.colors.secondaryText,
    fontWeight: 500,
    marginTop: 16,
  },
}));

export const LoadingModal = (props: {
  visible: boolean;
  onClose?: () => void;
  text?: string;
  note?: string;
}) => {
  const classes = useStyles();
  const { onClose, text, visible } = props;

  return (
    <Modal
      className={classes.modal}
      disableBackdropClick
      onClose={onClose}
      open={visible}
    >
      <div
        className={classes.content}
        data-note={`loading-${props.note || ''}`}
      >
        <CircularProgress size={80} />
        {text && (
          <Typography className={classes.title} component="div">
            {text}
          </Typography>
        )}
      </div>
    </Modal>
  );
};
