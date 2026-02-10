import type { DriveAdapter } from '../types';
import type { OAuthTokens, DriveFile, DriveFolder } from '@/types';

export class RealDriveAdapter implements DriveAdapter {
  private accessToken: string | null = null;

  async connect(credentials: OAuthTokens): Promise<void> {
    this.accessToken = credentials.access_token;
  }

  async listFolders(parentId?: string): Promise<DriveFolder[]> {
    const query = parentId
      ? `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      : `'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&orderBy=name`,
      { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
    );
    const data = await response.json();
    return (data.files || []).map((f: { id: string; name: string }) => ({ id: f.id, name: f.name, path: `/${f.name}` }));
  }

  async listFiles(folderId: string): Promise<DriveFile[]> {
    const query = `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed=false`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,thumbnailLink,webViewLink,size,createdTime)&orderBy=createdTime desc`,
      { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
    );
    const data = await response.json();
    return (data.files || []).map((f: Record<string, string>) => ({
      id: f.id, name: f.name, mimeType: f.mimeType, thumbnailUrl: f.thumbnailLink || null,
      webViewLink: f.webViewLink || null, size: parseInt(f.size || '0'), createdTime: f.createdTime,
    }));
  }

  async getFileUrl(fileId: string): Promise<string> {
    return `https://drive.google.com/uc?id=${fileId}&export=view`;
  }

  async getThumbnailUrl(fileId: string): Promise<string> {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
  }
}
