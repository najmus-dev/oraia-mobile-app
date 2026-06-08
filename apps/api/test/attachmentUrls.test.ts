import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractUploadedAttachmentUrls } from '../src/lib/attachmentUrls';
import { parseMessageAttachments } from '../src/lib/parseMessageAttachments';

describe('extractUploadedAttachmentUrls', () => {
  it('reads uploadedFiles object values', () => {
    const urls = extractUploadedAttachmentUrls({
      uploadedFiles: {
        a: 'https://cdn.example.com/a.jpg',
        b: { url: 'https://cdn.example.com/b.png' },
      },
    });
    assert.deepEqual(urls, [
      'https://cdn.example.com/a.jpg',
      'https://cdn.example.com/b.png',
    ]);
  });

  it('reads urls array', () => {
    const urls = extractUploadedAttachmentUrls({
      urls: ['https://x.com/1.jpg', 'https://x.com/2.jpg'],
    });
    assert.equal(urls.length, 2);
  });
});

describe('parseMessageAttachments', () => {
  it('parses string urls', () => {
    assert.deepEqual(parseMessageAttachments(['https://a.com/x.png']), [
      'https://a.com/x.png',
    ]);
  });

  it('parses object urls', () => {
    assert.deepEqual(parseMessageAttachments([{ url: 'https://a.com/x.png' }]), [
      'https://a.com/x.png',
    ]);
  });
});
