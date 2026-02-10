import type { DriveAdapter } from '../types';
import type { OAuthTokens, DriveFile, DriveFolder } from '@/types';

export class MockDriveAdapter implements DriveAdapter {
  async connect(_credentials: OAuthTokens): Promise<void> {}

  async listFolders(_parentId?: string): Promise<DriveFolder[]> {
    return [
      { id: 'folder_1', name: 'Marketing Assets', path: '/Marketing Assets' },
      { id: 'folder_2', name: 'Product Photos', path: '/Product Photos' },
      { id: 'folder_3', name: 'Brand Kit', path: '/Brand Kit' },
      { id: 'folder_4', name: 'Ad Creatives', path: '/Ad Creatives' },
    ];
  }

  async listFiles(_folderId: string): Promise<DriveFile[]> {
    return [
      { id: 'file_1', name: 'hero-banner.jpg', mimeType: 'image/jpeg', thumbnailUrl: null, webViewLink: null, size: 245000, createdTime: '2024-01-15T10:30:00Z' },
      { id: 'file_2', name: 'product-showcase.png', mimeType: 'image/png', thumbnailUrl: null, webViewLink: null, size: 189000, createdTime: '2024-01-16T14:20:00Z' },
      { id: 'file_3', name: 'lifestyle-photo.jpg', mimeType: 'image/jpeg', thumbnailUrl: null, webViewLink: null, size: 312000, createdTime: '2024-01-17T09:15:00Z' },
      { id: 'file_4', name: 'promo-video.mp4', mimeType: 'video/mp4', thumbnailUrl: null, webViewLink: null, size: 5240000, createdTime: '2024-01-18T16:45:00Z' },
      { id: 'file_5', name: 'testimonial-graphic.png', mimeType: 'image/png', thumbnailUrl: null, webViewLink: null, size: 156000, createdTime: '2024-01-19T11:00:00Z' },
      { id: 'file_6', name: 'logo-dark.svg', mimeType: 'image/svg+xml', thumbnailUrl: null, webViewLink: null, size: 8500, createdTime: '2024-01-10T08:00:00Z' },
    ];
  }

  async getFileUrl(_fileId: string): Promise<string> {
    return 'https://placehold.co/800x600/1a1a2e/7c3aed?text=Demo+Asset';
  }

  async getThumbnailUrl(_fileId: string): Promise<string> {
    return 'https://placehold.co/200x200/1a1a2e/7c3aed?text=Thumb';
  }
}
