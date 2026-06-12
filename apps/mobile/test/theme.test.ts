import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { palette } from '../src/theme/palette';
import { brand } from '../src/theme/brand';
import { darkColors } from '../src/theme/colorsDark';
import { lightColors } from '../src/theme/colorsLight';
import { createTheme } from '../src/theme/createTheme';

describe('brand palette', () => {
  it('matches ORAIA brand identity hex values', () => {
    assert.equal(palette.richIndigo, '#2F2D79');
    assert.equal(palette.deepNavy, '#0E1323');
    assert.equal(palette.wisteria, '#A696C8');
    assert.equal(palette.pastelLavender, '#D4B7D8');
  });
});

describe('brand copy', () => {
  it('exposes product name and taglines', () => {
    assert.equal(brand.productName, 'ORAIA CRM');
    assert.match(brand.tagline, /Smart Growth Partner/i);
  });
});

describe('color schemes', () => {
  it('dark theme uses navy shell', () => {
    assert.equal(darkColors.shell, palette.deepNavy);
    assert.equal(darkColors.isDark, true);
  });

  it('light theme uses indigo shell chrome', () => {
    assert.equal(lightColors.shell, palette.richIndigo);
    assert.equal(lightColors.isDark, false);
  });

  it('createTheme returns semantic accents', () => {
    const dark = createTheme('dark');
    const light = createTheme('light');
    assert.equal(dark.colors.info, palette.wisteria);
    assert.equal(light.colors.info, palette.richIndigo);
    assert.ok(dark.shadows.card.shadowOpacity);
    assert.ok(light.radius.md === 12);
  });

  it('foreground tokens adapt per scheme', () => {
    const dark = createTheme('dark');
    const light = createTheme('light');
    assert.equal(dark.colors.foreground, palette.white);
    assert.equal(light.colors.foreground, palette.deepNavy);
    assert.equal(dark.colors.shellForeground, palette.white);
    assert.equal(light.colors.shellForeground, palette.white);
    assert.equal(dark.colors.text, palette.white);
    assert.equal(light.colors.text, palette.deepNavy);
  });

  it('sheet surface adapts per scheme', () => {
    const dark = createTheme('dark');
    const light = createTheme('light');
    assert.equal(dark.colors.sheet, dark.colors.shellElevated);
    assert.equal(light.colors.sheet, palette.white);
  });

  it('input placeholders match surface muted text', () => {
    const dark = createTheme('dark');
    const light = createTheme('light');
    assert.equal(dark.colors.inputPlaceholder, dark.colors.foregroundMuted);
    assert.equal(light.colors.inputPlaceholder, light.colors.foregroundMuted);
    assert.equal(light.colors.formCardMuted, 'rgba(14, 19, 35, 0.65)');
  });

  it('scrim tokens pair readable foreground and spinner colors', () => {
    const dark = createTheme('dark');
    const light = createTheme('light');
    assert.equal(light.colors.scrimForeground, palette.deepNavy);
    assert.equal(light.colors.scrimSpinner, palette.richIndigo);
    assert.equal(dark.colors.scrimForeground, palette.white);
    assert.equal(dark.colors.scrimSpinner, palette.wisteria);
  });
});
