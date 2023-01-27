/* eslint-disable no-undef */
import {jest} from '@jest/globals'
import winston from 'winston';
import { logFormat } from '../logs.js';

describe('test log format', () => {
  afterEach(() => {
    jest.resetModules();
  });

  test('should return expected log format', () => {
    const mockFormatInfo = {
      level: 'info',
      message: `unit-test-message`,
    };

    const result = winston.format.printf(logFormat.template(mockFormatInfo));
    expect(typeof result).toBe('object');
    expect(JSON.parse(result.template).level).toEqual('info');
    expect(JSON.parse(result.template).message).toEqual('unit-test-message');
    expect(
      Object.prototype.hasOwnProperty.call(JSON.parse(result.template), 'timestamp'),
    ).toBeTruthy();
  });
});
