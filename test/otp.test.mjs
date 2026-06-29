/**
 * otp.test.mjs — OTP extraction test suite
 *
 * Tests the extractOtp and extractVerification functions against
 * real-world email patterns: 2FA codes, verification links,
 * magic links, and edge cases.
 *
 * Run: node --test test/otp.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Inline OTP extractor (matches otp.js logic) ──

const OTP_PATTERNS = [
  /(?:verification|confirm|otp|code|pin|token)[^\d]*(\d{4,8})/gi,
  /(\d{4,8})[^\d]*(?:is your|verification|code|otp)/gi,
  /(?:code|otp|pin)[:\s]*(\d{4,8})/gi,
  /(\d{6})/g,  // bare 6-digit code fallback
];

function extractOtp(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  for (const pattern of OTP_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) return match[1];
  }
  return null;
}

const LINK_PATTERNS = [
  /href="(https?:\/\/[^"]*(?:verify|confirm|activate|auth|login|signup|validate)[^"]*)"/gi,
  /href="(https?:\/\/[^"]*token=[^"&]*)/gi,
];

function extractVerification(html) {
  for (const pattern of LINK_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(html);
    if (match) return match[1].replace(/&amp;/g, '&');
  }
  return null;
}

// ── Test fixtures ──

describe('extractOtp', () => {
  it('extracts 6-digit code from "Your code is 123456"', () => {
    assert.equal(extractOtp('Your code is 123456'), '123456');
  });

  it('extracts from "OTP: 987654"', () => {
    assert.equal(extractOtp('OTP: 987654'), '987654');
  });

  it('extracts from "Your verification code: 555123"', () => {
    assert.equal(extractOtp('Your verification code: 555123'), '555123');
  });

  it('extracts 4-digit PIN', () => {
    assert.equal(extractOtp('Your pin is 4321'), '4321');
  });

  it('extracts 8-digit token', () => {
    assert.equal(extractOtp('Enter token: 12345678'), '12345678');
  });

  it('strips HTML tags before matching', () => {
    assert.equal(extractOtp('<p>Your code is <b>654321</b></p>'), '654321');
  });

  it('handles nested HTML with whitespace', () => {
    assert.equal(extractOtp('<div>\n  <span>OTP:</span>\n  <strong>111222</strong>\n</div>'), '111222');
  });

  it('extracts from "123456 is your verification code"', () => {
    assert.equal(extractOtp('123456 is your verification code'), '123456');
  });

  it('returns null for no numeric code', () => {
    assert.equal(extractOtp('Welcome! No code here.'), null);
  });

  it('returns null for empty string', () => {
    assert.equal(extractOtp(''), null);
  });

  it('returns null for short digits', () => {
    assert.equal(extractOtp('Code: 12'), null);
  });
});

describe('extractVerification', () => {
  it('extracts verify link', () => {
    const html = '<a href="https://example.com/verify?token=abc123">Verify</a>';
    assert.ok(extractVerification(html).includes('verify'));
  });

  it('extracts confirm link', () => {
    const html = '<a href="https://example.com/confirm/account?id=99">Confirm</a>';
    assert.ok(extractVerification(html).includes('confirm'));
  });

  it('handles &amp; in URLs', () => {
    const html = '<a href="https://example.com/verify?t=abc&amp;u=123">Link</a>';
    const result = extractVerification(html);
    assert.ok(result.includes('&u=123'));
    assert.ok(!result.includes('&amp;'));
  });

  it('returns null for plain content', () => {
    assert.equal(extractVerification('Just a plain text email'), null);
  });
});
