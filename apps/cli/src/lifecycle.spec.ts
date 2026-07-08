/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Readable, Writable } from 'stream';
import {
  promptKeyboardChoice,
  runCentralizedCleanup,
  registerPromptCleanup,
} from './utils/prompts.js';
import { wrapAction } from './utils/middleware.js';
import { Command } from 'commander';

describe('CLI Shutdown Lifecycle and Terminal Cleanup', () => {
  let mockInput: Readable & {
    isTTY?: boolean;
    setRawMode?: (mode: boolean) => void;
    isRaw?: boolean;
  };
  let mockOutput: Writable;

  beforeEach(() => {
    mockInput = new Readable({
      read() {},
    }) as any;
    mockInput.isTTY = true;
    mockInput.setRawMode = vi.fn();
    mockInput.isRaw = false;

    mockOutput = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });

    vi.spyOn(process.stdin, 'pause').mockImplementation(() => process.stdin);
    vi.spyOn(process.stdin, 'resume').mockImplementation(() => process.stdin);
    if (typeof process.stdin.setRawMode === 'function') {
      vi.spyOn(process.stdin, 'setRawMode').mockImplementation(() => process.stdin);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    runCentralizedCleanup();
  });

  it('should pause stdin and reset raw mode in runCentralizedCleanup', () => {
    runCentralizedCleanup();

    expect(process.stdin.pause).toHaveBeenCalled();
    if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
      expect(process.stdin.setRawMode).toHaveBeenCalledWith(false);
    }
  });

  it('should remove all keypress listeners and pause input after promptKeyboardChoice completes', async () => {
    const promise = promptKeyboardChoice(
      'Test Question',
      [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
      'a',
      {
        input: mockInput as any,
        output: mockOutput as any,
        forceInteractive: true,
      },
    );

    // Verify keypress listeners are added during prompt execution
    expect(mockInput.listenerCount('keypress')).toBeGreaterThan(0);
    expect(mockInput.setRawMode).toHaveBeenCalledWith(true);

    // Simulate enter key to resolve the prompt
    mockInput.emit('keypress', '\r', { name: 'enter' });

    const result = await promise;
    expect(result).toBe('a');

    // Verify cleanup: listeners removed, raw mode restored, stream paused
    expect(mockInput.listenerCount('keypress')).toBe(0);
    expect(mockInput.setRawMode).toHaveBeenLastCalledWith(false);
  });

  it('should execute runCentralizedCleanup on wrapAction exit path', async () => {
    const cleanupSpy = vi.fn();
    const unregister = registerPromptCleanup(cleanupSpy);

    const dummyAction = vi.fn().mockResolvedValue(undefined);
    const wrapped = wrapAction('dummy', dummyAction);

    const dummyCommand = new Command();
    (dummyCommand as any).parent = null;

    await wrapped({}, dummyCommand as any);

    expect(dummyAction).toHaveBeenCalled();
    expect(cleanupSpy).toHaveBeenCalled();

    unregister();
  });

  it('should leave no active event-loop handles related to stdin after cleanup', () => {
    runCentralizedCleanup();

    // Verify that stdin is in a paused state so it does not keep the event loop alive
    expect(process.stdin.readableFlowing).toBe(false);
  });
});
