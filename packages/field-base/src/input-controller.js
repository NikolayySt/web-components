/**
 * @license
 * Copyright (c) 2021 - 2022 Vaadin Ltd.
 * This program is available under Apache License Version 2.0, available at https://vaadin.com/license/
 */
import { SlotController } from '@vaadin/component-base/src/slot-controller.js';

/**
 * A controller to create and initialize slotted `<input>` element.
 */
export class InputController extends SlotController {
  constructor(host, callback) {
    super(host, 'input', 'input', {
      initializer: (node, host) => {
        if (host.value) {
          node.setAttribute('value', host.value);
        }
        if (host.type) {
          node.setAttribute('type', host.type);
        }

        // Ensure every instance has unique ID
        node.id = this.defaultId;

        if (typeof callback === 'function') {
          callback(node);
        }
      },
      useUniqueId: true,
    });
  }
}
