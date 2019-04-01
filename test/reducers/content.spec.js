import settings from 'electron-settings';
import content from '../../app/reducers/content';
import {
  SWITCH_ACTIVE_VIEW,
  MOVE_CURSOR_UP,
  MOVE_CURSOR_DOWN
} from '../../app/utils/types';

describe('reducers', () => {
  describe('content', () => {
    // https://github.com/nathanbuchar/electron-settings/issues/94
    beforeEach(() => {
      settings.deleteAll();
    });

    it('should handle initial state', () => {
      expect(content(undefined, {})).toMatchSnapshot();
    });

    it('should handle SWITCH_ACTIVE_VIEW', () => {
      const prevState = {
        activeView: 'left',
      };
      const action = {
        type: SWITCH_ACTIVE_VIEW
      };
      expect(content(prevState, action)).toMatchSnapshot();
    });

    it('should handle MOVE_CURSOR_UP', () => {
      const prevState = {
        "actionState": "INIT",
        "left": {
          "position": 1,
        },
      };
      const action = {
        type: MOVE_CURSOR_UP,
        viewPosition: 'left',
      };
      expect(content(prevState, action)).toMatchSnapshot();
    });

    it('should handle MOVE_CURSOR_DOWN', () => {
      const prevState = {
        "actionState": "INIT",
        "left": {
          "position": 0,
        },
      };
      const action = {
        type: MOVE_CURSOR_DOWN,
        viewPosition: 'left',
      };
      expect(content(prevState, action)).toMatchSnapshot();
    });

    it('should handle unknown action type', () => {
      expect(content(undefined, { type: 'unknown' })).toMatchSnapshot();
    });
  });
});
