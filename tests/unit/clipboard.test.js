import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { copyToClipboard } from '../../src/utils.js';

describe('copyToClipboard', () => {
  let writeText, execCommand, body, element, originals;
  beforeEach(() => {
    originals = Object.fromEntries(['navigator', 'window', 'document'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    writeText = mock.fn(async () => {});
    execCommand = mock.fn(() => true);
    body = {
      appendChild: mock.fn(node => { node.parentNode = body; }),
      removeChild: mock.fn(node => { node.parentNode = null; }),
    };
    element = { value: '', style: {}, focus: mock.fn(), select: mock.fn(), parentNode: null };
    for (const [key, value] of Object.entries({
      navigator: { clipboard: { writeText } }, window: { isSecureContext: true },
      document: { body, createElement: mock.fn(() => element), execCommand },
    })) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  });
  afterEach(() => {
    mock.restoreAll();
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });

  for (const text of ['Build ✓', '']) it(`should copy ${JSON.stringify(text)} via the secure API and return true`, async () => {
    assert.equal(await copyToClipboard(text), true);
    assert.equal(writeText.mock.callCount(), 1);
    assert.deepEqual(writeText.mock.calls[0].arguments, [text]);
    assert.equal(execCommand.mock.callCount(), 0);
  });
  it('should fall back when the secure API rejects and clean up the temporary element', async () => {
    writeText.mock.mockImplementation(async () => { throw new Error('Permission denied'); });
    assert.equal(await copyToClipboard('Pipeline'), true);
    assert.equal(execCommand.mock.callCount(), 1);
    assert.deepEqual(execCommand.mock.calls[0].arguments, ['copy']);
    assert.equal(element.value, 'Pipeline');
    assert.equal(element.parentNode, null);
    assert.equal(body.removeChild.mock.callCount(), 1);
  });
  it('should use the fallback in an insecure context without calling the secure API', async () => {
    window.isSecureContext = false;
    assert.equal(await copyToClipboard('text'), true);
    assert.equal(writeText.mock.callCount(), 0);
    assert.deepEqual(execCommand.mock.calls[0].arguments, ['copy']);
    assert.equal(element.parentNode, null);
  });
  it('should return false when the fallback reports failure', async () => {
    globalThis.navigator = {};
    execCommand.mock.mockImplementation(() => false);
    assert.equal(await copyToClipboard('text'), false);
    assert.equal(element.parentNode, null);
  });
  it('should return false and remove the element when the fallback throws', async () => {
    writeText.mock.mockImplementation(async () => { throw new Error('Denied'); });
    execCommand.mock.mockImplementation(() => { throw new Error('Copy failed'); });
    assert.equal(await copyToClipboard('text'), false);
    assert.equal(body.removeChild.mock.callCount(), 1);
    assert.equal(element.parentNode, null);
  });
  it('should return false when DOM creation fails', async () => {
    globalThis.navigator = {};
    document.createElement.mock.mockImplementation(() => { throw new Error('No DOM'); });
    assert.equal(await copyToClipboard('text'), false);
    assert.equal(body.appendChild.mock.callCount(), 0);
  });
  for (const text of [null, undefined, -1, {}, [], true]) it(`should reject non-string ${JSON.stringify(text)} without external API calls`, async () => {
    assert.equal(await copyToClipboard(text), false);
    assert.equal(writeText.mock.callCount(), 0);
    assert.equal(document.createElement.mock.callCount(), 0);
  });
});
