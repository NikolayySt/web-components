/**
 * @license
 * Copyright (c) 2017 - 2022 Vaadin Ltd.
 * This program is available under Apache License Version 2.0, available at https://vaadin.com/license/
 */
import type { TemplateResult } from 'lit';
import type { DirectiveResult } from 'lit/directive.js';
import { LitRendererDirective } from '@vaadin/lit-renderer';
import type { ContextMenu, ContextMenuRendererContext } from '../vaadin-context-menu.js';

export type ContextMenuLitRenderer = (context: ContextMenuRendererContext, menu: ContextMenu) => TemplateResult;

export class ContextMenuRendererDirective extends LitRendererDirective<ContextMenu, ContextMenuLitRenderer> {
  /**
   * Adds the renderer callback to the context-menu.
   */
  addRenderer(): void;

  /**
   * Runs the renderer callback on the context-menu.
   */
  runRenderer(): void;

  /**
   * Removes the renderer callback from the context-menu.
   */
  removeRenderer(): void;
}

/**
 * A Lit directive for populating the content of the context-menu.
 *
 * The directive accepts a renderer callback returning a Lit template and assigns it to the context-menu
 * via the `renderer` property. The renderer is called once to populate the content when assigned
 * and whenever a single dependency or an array of dependencies changes.
 * It is not guaranteed that the renderer will be called immediately (synchronously) in both cases.
 *
 * Dependencies can be a single value or an array of values.
 * Values are checked against previous values with strict equality (`===`),
 * so the check won't detect nested property changes inside objects or arrays.
 * When dependencies are provided as an array, each item is checked against the previous value
 * at the same index with strict equality. Nested arrays are also checked only by strict
 * equality.
 *
 * Example of usage:
 * ```js
 * `<vaadin-context-menu
 *   ${contextMenuRenderer((context, menu) => html`...`)}
 * ></vaadin-context-menu>`
 * ```
 *
 * @param renderer the renderer callback that returns a Lit template.
 * @param dependencies a single dependency or an array of dependencies
 *                     which trigger a re-render when changed.
 */
export declare function contextMenuRenderer(
  renderer: ContextMenuLitRenderer,
  dependencies?: unknown,
): DirectiveResult<typeof ContextMenuRendererDirective>;
