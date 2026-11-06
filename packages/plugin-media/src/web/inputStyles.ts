/** Styles of <np-media-input>, light and dark (`dark` class on an ancestor) */

import { css } from 'lit';

export const mediaInputStyles = css`
  :host {
    display: block;
  }
  .container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Gallery */
  .gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .drop-zone:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }
  .gallery-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 120px;
  }
  .alt-input {
    width: 100%;
    box-sizing: border-box;
    font: inherit;
    font-size: 0.75rem;
    padding: 0.25rem 0.375rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: #fff;
    color: #1f2937;
  }
  :host-context(.dark) .alt-input {
    border-color: #4b5563;
    background: #374151;
    color: #f3f4f6;
  }
  .gallery-card {
    position: relative;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
    width: 120px;
    height: 90px;
    background: #f3f4f6;
  }
  .gallery-card img,
  .gallery-card video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .gallery-card .badge {
    position: absolute;
    bottom: 4px;
    left: 4px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    padding: 0 4px;
    border-radius: 3px;
    font-size: 0.7rem;
  }
  .gallery-card .placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    color: #6b7280;
    padding: 0.25rem;
    word-break: break-all;
    text-align: center;
  }
  .gallery-card .remove-btn {
    position: absolute;
    top: 2px;
    right: 2px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    cursor: pointer;
    font-size: 0.8rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .gallery-card .remove-btn:hover {
    background: rgba(220, 38, 38, 0.8);
  }

  /* Drop zone */
  .drop-zone {
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    padding: 1.5rem 1rem;
    text-align: center;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .drop-zone:hover,
  .drop-zone.dragover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.04);
  }
  .drop-zone.uploading {
    border-color: #a5b4fc;
    opacity: 0.7;
    pointer-events: none;
  }
  .drop-icon {
    font-size: 1.75rem;
    margin-bottom: 0.25rem;
  }
  .drop-text {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }
  .drop-hint {
    font-size: 0.75rem;
    color: #9ca3af;
    margin: 0.25rem 0 0;
  }
  .file-input {
    display: none;
  }

  /* URL input */
  .url-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .separator {
    font-size: 0.75rem;
    color: #9ca3af;
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.05em;
  }
  .url-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    outline: none;
    transition: border-color 0.15s;
  }
  .url-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
  }

  /* Progress & status */
  .progress-bar {
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: #6366f1;
    transition: width 0.3s;
    border-radius: 2px;
  }
  .upload-status {
    font-size: 0.75rem;
    color: #6b7280;
    text-align: center;
  }
  .error {
    font-size: 0.8125rem;
    color: #dc2626;
    padding: 0.5rem 0.75rem;
    background: #fef2f2;
    border-radius: 6px;
    border: 1px solid #fecaca;
  }
  .hint {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .quality {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: #4b5563;
  }
  .quality select {
    padding: 0.25rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    color: inherit;
    font: inherit;
  }

  .cancel-btn {
    margin-left: 0.5rem;
    padding: 0.125rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    color: #374151;
    font: inherit;
    cursor: pointer;
  }
  :host-context(.dark) .cancel-btn {
    border-color: #4b5563;
    background: #374151;
    color: #f3f4f6;
  }

  :host-context(.dark) .gallery-card {
    border-color: #4b5563;
    background: #374151;
  }
  :host-context(.dark) .gallery-card .placeholder,
  :host-context(.dark) .drop-text,
  :host-context(.dark) .upload-status,
  :host-context(.dark) .quality {
    color: #9ca3af;
  }
  :host-context(.dark) .drop-zone {
    border-color: #4b5563;
  }
  :host-context(.dark) .drop-zone:hover,
  :host-context(.dark) .drop-zone.dragover {
    border-color: #4f46e5;
    background: rgba(79, 70, 229, 0.12);
  }
  :host-context(.dark) .url-input,
  :host-context(.dark) .quality select {
    border-color: #4b5563;
    background: #374151;
    color: #f3f4f6;
  }
  :host-context(.dark) .progress-bar {
    background: #4b5563;
  }
  :host-context(.dark) .error {
    background: #450a0a;
    border-color: #dc2626;
    color: #fca5a5;
  }
`;
