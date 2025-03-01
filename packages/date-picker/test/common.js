import { fire, listenOnce, makeSoloTouchEvent, mousedown, nextRender } from '@vaadin/testing-helpers';
import { flush } from '@polymer/polymer/lib/utils/flush.js';
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';

export function activateScroller(scroller) {
  scroller.active = true;
  // Setting `active` triggers `_finishInit` using afterNextRender
  return new Promise((resolve) => {
    afterNextRender(scroller, () => {
      scroller._debouncerUpdateClones.flush();
      resolve();
    });
  });
}

export function getDefaultI18n() {
  return {
    monthNames: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    firstDayOfWeek: 0,
    today: 'Today',
    cancel: 'Cancel',
    formatDate(d) {
      return `${d.month + 1}/${d.day}/${d.year}`;
    },
    formatTitle(monthName, fullYear) {
      return `${monthName} ${fullYear}`;
    },
  };
}

export async function open(datepicker) {
  datepicker.open();
  await waitForOverlayRender();
}

export async function waitForOverlayRender() {
  // First, wait for vaadin-overlay-open event
  await nextRender();

  // Then wait for scrollers to fully render
  await nextRender();

  // Force dom-repeat to render table elements
  flush();
}

export function close(datepicker) {
  return new Promise((resolve) => {
    listenOnce(datepicker.$.overlay, 'vaadin-overlay-close', resolve);
    datepicker.close();
  });
}

export function idleCallback() {
  return new Promise((resolve) => {
    window.requestIdleCallback ? window.requestIdleCallback(resolve) : setTimeout(resolve, 16);
  });
}

/**
 * Emulates clicking outside the dropdown overlay
 */
export function outsideClick() {
  // Move focus to body
  document.body.tabIndex = 0;
  // Clear keyboardActive flag
  mousedown(document.body);
  document.body.focus();
  document.body.tabIndex = -1;
  // Outside click
  document.body.click();
}

/**
 * Emulates a touch on the target resulting in clicking and focusing it.
 */
export function touchTap(target) {
  const start = makeSoloTouchEvent('touchstart', null, target);
  const end = makeSoloTouchEvent('touchend', null, target);
  if (!start.defaultPrevented && !end.defaultPrevented) {
    target.click();
    target.focus();
  }
}

export function monthsEqual(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
}

export function getFirstVisibleItem(scroller, bufferOffset) {
  const children = [];
  bufferOffset = bufferOffset || 0;

  scroller._buffers.forEach((buffer) => {
    [...buffer.children].forEach((slot) => {
      children.push(slot._itemWrapper);
    });
  });
  const scrollerRect = scroller.getBoundingClientRect();
  return children.reduce((prev, current) => {
    return Math.floor(current.getBoundingClientRect().top) - Math.floor(scrollerRect.top + bufferOffset) <= 0
      ? current
      : prev;
  });
}

export function getFocusedMonth(overlayContent) {
  const months = Array.from(overlayContent.querySelectorAll('vaadin-month-calendar'));
  return months.find((month) => {
    const focused = month.shadowRoot.querySelector('[part~="focused"]');
    return !!focused;
  });
}

export function getFocusedCell(overlayContent) {
  const months = Array.from(overlayContent.querySelectorAll('vaadin-month-calendar'));

  // Date that is currently focused
  let focusedCell;

  for (let i = 0; i < months.length; i++) {
    focusedCell = months[i].shadowRoot.querySelector('[part~="focused"]');

    if (focusedCell) {
      break;
    }
  }

  return focusedCell;
}

/**
 * Waits for the scroll to finish in the date-picker overlay content.
 *
 * @param {HTMLElement} overlayContent
 */
export async function waitForScrollToFinish(overlayContent) {
  if (overlayContent._revealPromise) {
    // The overlay content is scrolling.
    await overlayContent._revealPromise;
  }

  await nextRender(overlayContent);
}

/**
 * Emulates the user filling in something in the date-picker input.
 *
 * @param {Element} datePicker
 * @param {string} value
 */
export function setInputValue(datePicker, value) {
  datePicker.inputElement.value = value;
  fire(datePicker.inputElement, 'input');
}
