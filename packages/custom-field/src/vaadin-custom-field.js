/**
 * @license
 * Copyright (c) 2019 - 2022 Vaadin Ltd.
 * This program is available under Apache License Version 2.0, available at https://vaadin.com/license/
 */
import { FlattenedNodesObserver } from '@polymer/polymer/lib/utils/flattened-nodes-observer.js';
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { ElementMixin } from '@vaadin/component-base/src/element-mixin.js';
import { FocusMixin } from '@vaadin/component-base/src/focus-mixin.js';
import { KeyboardMixin } from '@vaadin/component-base/src/keyboard-mixin.js';
import { TooltipController } from '@vaadin/component-base/src/tooltip-controller.js';
import { FieldMixin } from '@vaadin/field-base/src/field-mixin.js';
import { ThemableMixin } from '@vaadin/vaadin-themable-mixin/vaadin-themable-mixin.js';

/**
 * Default implementation of the parse function that creates individual field
 * values from the single component value.
 * @param value
 * @returns {*}
 */
const defaultParseValue = (value) => {
  return value.split('\t');
};

/**
 * Default implementation of the format function that creates a single component
 * value from individual field values.
 * @param inputValues
 * @returns {*}
 */
const defaultFormatValue = (inputValues) => {
  return inputValues.join('\t');
};

/**
 * `<vaadin-custom-field>` is a web component for wrapping multiple components as a single field.
 *
 * ```
 * <vaadin-custom-field label="Appointment time">
 *   <vaadin-date-picker></vaadin-date-picker>
 *   <vaadin-time-picker></vaadin-time-picker>
 * </vaadin-custom-field>
 * ```
 *
 * ### Styling
 *
 * The following shadow DOM parts are available for styling:
 *
 * Part name            | Description
 * ---------------------|----------------
 * `label`              | The slotted label element wrapper
 * `helper-text`        | The slotted helper text element wrapper
 * `error-message`      | The slotted error message element wrapper
 * `required-indicator` | The `required` state indicator element
 *
 * The following state attributes are available for styling:
 *
 * Attribute           | Description                               | Part name
 * --------------------|-------------------------------------------|------------
 * `invalid`           | Set when the element is invalid           | :host
 * `focused`           | Set when the element is focused           | :host
 * `has-label`         | Set when the element has a label          | :host
 * `has-value`         | Set when the element has a value          | :host
 * `has-helper`        | Set when the element has helper text      | :host
 * `has-error-message` | Set when the element has an error message | :host
 *
 * You may also manually set `disabled` or `readonly` attribute on this component to make the label
 * part look visually the same as on a `<vaadin-text-field>` when it is disabled or readonly.
 *
 * See [Styling Components](https://vaadin.com/docs/latest/styling/custom-theme/styling-components) documentation.
 *
 * @fires {Event} change - Fired when the user commits a value change for any of the internal inputs.
 * @fires {Event} internal-tab - Fired on Tab keydown triggered from the internal inputs, meaning focus will not leave the inputs.
 * @fires {CustomEvent} invalid-changed - Fired when the `invalid` property changes.
 * @fires {CustomEvent} value-changed - Fired when the `value` property changes.
 * @fires {CustomEvent} validated - Fired whenever the field is validated.
 *
 * @extends HTMLElement
 * @mixes FieldMixin
 * @mixes FocusMixin
 * @mixes ElementMixin
 * @mixes KeyboardMixin
 * @mixes ThemableMixin
 */
class CustomField extends FieldMixin(FocusMixin(KeyboardMixin(ThemableMixin(ElementMixin(PolymerElement))))) {
  static get is() {
    return 'vaadin-custom-field';
  }

  static get template() {
    return html`
      <style>
        :host {
          display: inline-flex;
        }

        :host::before {
          content: '\\2003';
          width: 0;
          display: inline-block;
          /* Size and position this element on the same vertical position as the input-field element
           to make vertical align for the host element work as expected */
        }

        :host([hidden]) {
          display: none !important;
        }

        .vaadin-custom-field-container {
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        .inputs-wrapper {
          flex: none;
        }
      </style>

      <div class="vaadin-custom-field-container">
        <div part="label" on-click="focus">
          <slot name="label"></slot>
          <span part="required-indicator" aria-hidden="true"></span>
        </div>

        <div class="inputs-wrapper" on-change="__onInputChange">
          <slot id="slot"></slot>
        </div>

        <div part="helper-text">
          <slot name="helper"></slot>
        </div>

        <div part="error-message">
          <slot name="error-message"></slot>
        </div>
      </div>

      <slot name="tooltip"></slot>
    `;
  }

  static get properties() {
    return {
      /**
       * The name of the control, which is submitted with the form data.
       */
      name: String,

      /**
       * The value of the field. When wrapping several inputs, it will contain `\t`
       * (Tab character) as a delimiter indicating parts intended to be used as the
       * corresponding inputs values.
       * Use the [`formatValue`](#/elements/vaadin-custom-field#property-formatValue)
       * and [`parseValue`](#/elements/vaadin-custom-field#property-parseValue)
       * properties to customize this behavior.
       */
      value: {
        type: String,
        observer: '__valueChanged',
        notify: true,
      },

      /**
       * Array of available input nodes
       * @type {!Array<!HTMLElement> | undefined}
       */
      inputs: {
        type: Array,
        readOnly: true,
      },

      /**
       * A function to format the values of the individual fields contained by
       * the custom field into a single component value. The function receives
       * an array of all values of the individual fields in the order of their
       * presence in the DOM, and must return a single component value.
       * This function is called each time a value of an internal field is
       * changed.
       *
       * Example:
       * ```js
       * customField.formatValue = (fieldValues) => {
       *   return fieldValues.join("-");
       * }
       * ```
       * @type {!CustomFieldFormatValueFn | undefined}
       */
      formatValue: {
        type: Function,
      },

      /**
       * A function to parse the component value into values for the individual
       * fields contained by the custom field. The function receives the
       * component value, and must return an array of values for the individual
       * fields in the order of their presence in the DOM.
       * The function is called each time the value of the component changes.
       *
       * Example:
       * ```js
       * customField.parseValue = (componentValue) => {
       *   return componentValue.split("-");
       * }
       * ```
       * @type {!CustomFieldParseValueFn | undefined}
       */
      parseValue: {
        type: Function,
      },
    };
  }

  /** @protected */
  connectedCallback() {
    super.connectedCallback();

    if (this.__observer) {
      this.__observer.connect();
    }
  }

  /** @protected */
  disconnectedCallback() {
    super.disconnectedCallback();

    if (this.__observer) {
      this.__observer.disconnect();
    }
  }

  /** @protected */
  ready() {
    super.ready();

    // See https://github.com/vaadin/vaadin-web-components/issues/94
    this.setAttribute('role', 'group');

    this.ariaTarget = this;

    this.__setInputsFromSlot();
    this.__observer = new FlattenedNodesObserver(this.$.slot, () => {
      this.__setInputsFromSlot();
    });

    this._tooltipController = new TooltipController(this);
    this.addController(this._tooltipController);
    this._tooltipController.setShouldShow((target) => {
      const inputs = target.inputs || [];
      return !inputs.some((el) => el.opened);
    });
  }

  /** @protected */
  focus() {
    if (this.inputs && this.inputs[0]) {
      this.inputs[0].focus();
    }
  }

  /**
   * Override method inherited from `FocusMixin` to validate on blur.
   * @param {boolean} focused
   * @protected
   */
  _setFocused(focused) {
    super._setFocused(focused);

    if (!focused) {
      this.validate();
    }
  }

  /**
   * Override method inherited from `FocusMixin` to not remove focused
   * state when focus moves to another input in the custom field.
   * @param {FocusEvent} event
   * @return {boolean}
   * @protected
   */
  _shouldRemoveFocus(event) {
    const { relatedTarget } = event;
    return !this.inputs.some((el) => relatedTarget === (el.focusElement || el));
  }

  /**
   * Returns true if the current inputs values satisfy all constraints (if any).
   *
   * @return {boolean}
   */
  checkValidity() {
    const invalidFields = this.inputs.filter((input) => !(input.validate || input.checkValidity).call(input));

    if (invalidFields.length || (this.required && !this.value.trim())) {
      // Either 1. one of the input fields is invalid or
      // 2. the custom field itself is required but doesn't have a value
      return false;
    }
    return true;
  }

  /**
   * @param {KeyboardEvent} e
   * @protected
   * @override
   */
  _onKeyDown(e) {
    if (e.key === 'Tab') {
      if (
        (this.inputs.indexOf(e.target) < this.inputs.length - 1 && !e.shiftKey) ||
        (this.inputs.indexOf(e.target) > 0 && e.shiftKey)
      ) {
        this.dispatchEvent(new CustomEvent('internal-tab'));
      } else {
        // FIXME(yuriy): remove this workaround when value should not be updated before focusout
        this.__setValue();
      }
    }
  }

  /** @private */
  __onInputChange(event) {
    // Stop native change events
    event.stopPropagation();

    this.__setValue();
    this.validate();
    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        cancelable: false,
        detail: {
          value: this.value,
        },
      }),
    );
  }

  /** @private */
  __setValue() {
    this.__settingValue = true;
    const formatFn = this.formatValue || defaultFormatValue;
    this.value = formatFn.apply(this, [this.inputs.map((input) => input.value)]);
    this.__settingValue = false;
  }

  /**
   * Like querySelectorAll('*') but also gets all elements through any nested slots recursively
   * @private
   */
  __queryAllAssignedElements(elem) {
    const result = [];
    let elements;
    if (elem.tagName === 'SLOT') {
      elements = elem.assignedElements({ flatten: true });
    } else {
      result.push(elem);
      elements = Array.from(elem.children);
    }
    elements.forEach((elem) => result.push(...this.__queryAllAssignedElements(elem)));
    return result;
  }

  /** @private */
  __isInput(node) {
    const isSlottedInput = node.getAttribute('slot') === 'input' || node.getAttribute('slot') === 'textarea';
    return !isSlottedInput && (node.validate || node.checkValidity);
  }

  /** @private */
  __getInputsFromSlot() {
    return this.__queryAllAssignedElements(this.$.slot).filter((node) => this.__isInput(node));
  }

  /** @private */
  __setInputsFromSlot() {
    this._setInputs(this.__getInputsFromSlot());
    this.__setValue();
  }

  /** @private */
  __toggleHasValue(value) {
    this.toggleAttribute('has-value', value !== null && value.trim() !== '');
  }

  /** @private */
  __valueChanged(value, oldValue) {
    if (this.__settingValue || !this.inputs) {
      return;
    }

    this.__toggleHasValue(value);

    const parseFn = this.parseValue || defaultParseValue;
    const valuesArray = parseFn.apply(this, [value]);
    if (!valuesArray || valuesArray.length === 0) {
      console.warn('Value parser has not provided values array');
      return;
    }

    this.inputs.forEach((input, id) => {
      input.value = valuesArray[id];
    });
    if (oldValue !== undefined) {
      this.validate();
    }
  }

  /**
   * Fired when the user commits a value change for any of the internal inputs.
   *
   * @event change
   */
}

customElements.define(CustomField.is, CustomField);

export { CustomField };
