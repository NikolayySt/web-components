/**
 * @license
 * Copyright (c) 2015 - 2022 Vaadin Ltd.
 * This program is available under Apache License Version 2.0, available at https://vaadin.com/license/
 */
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { generateUniqueId } from '@vaadin/component-base/src/unique-id-utils.js';
import { Virtualizer } from '@vaadin/component-base/src/virtualizer.js';
import { ComboBoxPlaceholder } from './vaadin-combo-box-placeholder.js';

/**
 * Element for internal use only.
 *
 * @extends HTMLElement
 * @private
 */
export class ComboBoxScroller extends PolymerElement {
  static get is() {
    return 'vaadin-combo-box-scroller';
  }

  static get template() {
    return html`
      <style>
        :host {
          display: block;
          min-height: 1px;
          overflow: auto;

          /* Fixes item background from getting on top of scrollbars on Safari */
          transform: translate3d(0, 0, 0);

          /* Enable momentum scrolling on iOS */
          -webkit-overflow-scrolling: touch;

          /* Fixes scrollbar disappearing when 'Show scroll bars: Always' enabled in Safari */
          box-shadow: 0 0 0 white;
        }

        #selector {
          border-width: var(--_vaadin-combo-box-items-container-border-width);
          border-style: var(--_vaadin-combo-box-items-container-border-style);
          border-color: var(--_vaadin-combo-box-items-container-border-color);
        }
      </style>
      <div id="selector">
        <slot></slot>
      </div>
    `;
  }

  static get properties() {
    return {
      /**
       * A full set of items to filter the visible options from.
       * Set to an empty array when combo-box is not opened.
       */
      items: {
        type: Array,
        observer: '__itemsChanged',
      },

      /**
       * Index of an item that has focus outline and is scrolled into view.
       * The actual focus still remains in the input field.
       */
      focusedIndex: {
        type: Number,
        observer: '__focusedIndexChanged',
      },

      /**
       * Set to true while combo-box fetches new page from the data provider.
       */
      loading: {
        type: Boolean,
        observer: '__loadingChanged',
      },

      /**
       * Whether the combo-box is currently opened or not. If set to false,
       * calling `scrollIntoView` does not have any effect.
       */
      opened: {
        type: Boolean,
        observer: '__openedChanged',
      },

      /**
       * The selected item from the `items` array.
       */
      selectedItem: {
        type: Object,
        observer: '__selectedItemChanged',
      },

      /**
       * Path for the id of the item, used to detect whether the item is selected.
       */
      itemIdPath: {
        type: String,
      },

      /**
       * Reference to the combo-box, used by the item elements.
       */
      comboBox: {
        type: Object,
      },

      /**
       * Function used to set a label for every combo-box item.
       */
      getItemLabel: {
        type: Object,
      },

      /**
       * Function used to render the content of every combo-box item.
       */
      renderer: {
        type: Object,
        observer: '__rendererChanged',
      },

      /**
       * Used to propagate the `theme` attribute from the host element.
       */
      theme: {
        type: String,
      },
    };
  }

  constructor() {
    super();
    this.__boundOnItemClick = this.__onItemClick.bind(this);
  }

  __openedChanged(opened) {
    if (opened) {
      this.requestContentUpdate();
    }
  }

  /** @protected */
  ready() {
    super.ready();

    // Ensure every instance has unique ID
    this.id = `${this.localName}-${generateUniqueId()}`;

    // Allow extensions to customize tag name for the items
    this.__hostTagName = this.constructor.is.replace('-scroller', '');

    this.setAttribute('role', 'listbox');

    this.addEventListener('click', (e) => e.stopPropagation());

    this.__patchWheelOverScrolling();

    this.__virtualizer = new Virtualizer({
      createElements: this.__createElements.bind(this),
      updateElement: this.__updateElement.bind(this),
      elementsContainer: this,
      scrollTarget: this,
      scrollContainer: this.$.selector,
    });
  }

  requestContentUpdate() {
    this.__virtualizer.update();
  }

  scrollIntoView(index) {
    if (!(this.opened && index >= 0)) {
      return;
    }

    const visibleItemsCount = this._visibleItemsCount();

    let targetIndex = index;

    if (index > this.__virtualizer.lastVisibleIndex - 1) {
      // Index is below the bottom, scrolling down. Make the item appear at the bottom.
      // First scroll to target (will be at the top of the scroller) to make sure it's rendered.
      this.__virtualizer.scrollToIndex(index);
      // Then calculate the index for the following scroll (to get the target to bottom of the scroller).
      targetIndex = index - visibleItemsCount + 1;
    } else if (index > this.__virtualizer.firstVisibleIndex) {
      // The item is already visible, scrolling is unnecessary per se. But we need to trigger iron-list to set
      // the correct scrollTop on the scrollTarget. Scrolling to firstVisibleIndex.
      targetIndex = this.__virtualizer.firstVisibleIndex;
    }
    this.__virtualizer.scrollToIndex(Math.max(0, targetIndex));

    // Sometimes the item is partly below the bottom edge, detect and adjust.
    const lastPhysicalItem = [...this.children].find(
      (el) => !el.hidden && el.index === this.__virtualizer.lastVisibleIndex,
    );
    if (!lastPhysicalItem || index !== lastPhysicalItem.index) {
      return;
    }
    const lastPhysicalItemRect = lastPhysicalItem.getBoundingClientRect();
    const scrollerRect = this.getBoundingClientRect();
    const scrollTopAdjust = lastPhysicalItemRect.bottom - scrollerRect.bottom + this._viewportTotalPaddingBottom;
    if (scrollTopAdjust > 0) {
      this.scrollTop += scrollTopAdjust;
    }
  }

  /** @private */
  __getAriaRole(itemIndex) {
    return itemIndex !== undefined ? 'option' : false;
  }

  /** @private */
  __getAriaSelected(focusedIndex, itemIndex) {
    return this.__isItemFocused(focusedIndex, itemIndex).toString();
  }

  /** @private */
  __isItemFocused(focusedIndex, itemIndex) {
    return !this.loading && focusedIndex === itemIndex;
  }

  /** @private */
  __isItemSelected(item, selectedItem, itemIdPath) {
    if (item instanceof ComboBoxPlaceholder) {
      return false;
    } else if (itemIdPath && item !== undefined && selectedItem !== undefined) {
      return this.get(itemIdPath, item) === this.get(itemIdPath, selectedItem);
    }
    return item === selectedItem;
  }

  /** @private */
  __itemsChanged(items) {
    if (this.__virtualizer && items) {
      this.__virtualizer.size = items.length;
      this.__virtualizer.flush();
      // Ensure the total count of items is properly announced.
      this.setAttribute('aria-setsize', items.length);
      this.requestContentUpdate();
    }
  }

  /** @private */
  __loadingChanged() {
    this.requestContentUpdate();
  }

  /** @private */
  __selectedItemChanged() {
    this.requestContentUpdate();
  }

  /** @private */
  __focusedIndexChanged(index, oldIndex) {
    if (index !== oldIndex) {
      this.requestContentUpdate();
    }

    // Do not jump back to the previously focused item while loading
    // when requesting next page from the data provider on scroll.
    if (index >= 0 && !this.loading) {
      this.scrollIntoView(index);
    }
  }

  /** @private */
  __rendererChanged(renderer, oldRenderer) {
    if (renderer || oldRenderer) {
      this.requestContentUpdate();
    }
  }

  /** @private */
  __createElements(count) {
    return [...Array(count)].map(() => {
      const item = document.createElement(`${this.__hostTagName}-item`);
      item.addEventListener('click', this.__boundOnItemClick);
      // Negative tabindex prevents the item content from being focused.
      item.tabIndex = '-1';
      item.style.width = '100%';
      return item;
    });
  }

  /** @private */
  __updateElement(el, index) {
    const item = this.items[index];
    const focusedIndex = this.focusedIndex;

    el.setProperties({
      item,
      index,
      label: this.getItemLabel(item),
      selected: this.__isItemSelected(item, this.selectedItem, this.itemIdPath),
      renderer: this.renderer,
      focused: this.__isItemFocused(focusedIndex, index),
    });

    el.id = `${this.__hostTagName}-item-${index}`;
    el.setAttribute('role', this.__getAriaRole(index));
    el.setAttribute('aria-selected', this.__getAriaSelected(focusedIndex, index));
    el.setAttribute('aria-posinset', index + 1);

    if (this.theme) {
      el.setAttribute('theme', this.theme);
    } else {
      el.removeAttribute('theme');
    }

    if (item instanceof ComboBoxPlaceholder) {
      this.__requestItemByIndex(index);
    }
  }

  /** @private */
  __onItemClick(e) {
    this.dispatchEvent(new CustomEvent('selection-changed', { detail: { item: e.currentTarget.item } }));
  }

  /**
   * We want to prevent the kinetic scrolling energy from being transferred from the overlay contents over to the parent.
   * Further improvement ideas: after the contents have been scrolled to the top or bottom and scrolling has stopped, it could allow
   * scrolling the parent similarly to touch scrolling.
   */
  __patchWheelOverScrolling() {
    this.$.selector.addEventListener('wheel', (e) => {
      const scrolledToTop = this.scrollTop === 0;
      const scrolledToBottom = this.scrollHeight - this.scrollTop - this.clientHeight <= 1;
      if (scrolledToTop && e.deltaY < 0) {
        e.preventDefault();
      } else if (scrolledToBottom && e.deltaY > 0) {
        e.preventDefault();
      }
    });
  }

  get _viewportTotalPaddingBottom() {
    if (this._cachedViewportTotalPaddingBottom === undefined) {
      const itemsStyle = window.getComputedStyle(this.$.selector);
      this._cachedViewportTotalPaddingBottom = [itemsStyle.paddingBottom, itemsStyle.borderBottomWidth]
        .map((v) => {
          return parseInt(v, 10);
        })
        .reduce((sum, v) => {
          return sum + v;
        });
    }

    return this._cachedViewportTotalPaddingBottom;
  }

  /**
   * Dispatches an `index-requested` event for the given index to notify
   * the data provider that it should start loading the page containing the requested index.
   *
   * The event is dispatched asynchronously to prevent an immediate page request and therefore
   * a possible infinite recursion in case the data provider implements page request cancelation logic
   * by invoking data provider page callbacks with an empty array.
   * The infinite recursion may occur otherwise since invoking a data provider page callback with an empty array
   * triggers a synchronous scroller update and, if the callback corresponds to the currently visible page,
   * the scroller will synchronously request the page again which may lead to looping in the end.
   * That was the case for the Flow counterpart:
   * https://github.com/vaadin/flow-components/issues/3553#issuecomment-1239344828
   */
  __requestItemByIndex(index) {
    requestAnimationFrame(() => {
      this.dispatchEvent(
        new CustomEvent('index-requested', {
          detail: {
            index,
            currentScrollerPos: this._oldScrollerPosition,
          },
        }),
      );
    });
  }

  /** @private */
  _visibleItemsCount() {
    // Ensure items are positioned
    this.__virtualizer.scrollToIndex(this.__virtualizer.firstVisibleIndex);
    const hasItems = this.__virtualizer.size > 0;
    return hasItems ? this.__virtualizer.lastVisibleIndex - this.__virtualizer.firstVisibleIndex + 1 : 0;
  }
}

customElements.define(ComboBoxScroller.is, ComboBoxScroller);
