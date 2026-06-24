import { Platform } from 'react-native';

export interface PickedText {
  name: string;
  text: string;
}
export interface PickedBinary {
  name: string;
  bytes: Uint8Array;
}

/** Save text to a file: a download on web, a share sheet on native. */
export async function saveTextFile(
  filename: string,
  content: string,
  mimeType = 'application/json',
): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }
  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const file = new File(Paths.cache, filename);
  try {
    file.create({ overwrite: true });
  } catch {
    // already exists — fine, we overwrite below
  }
  file.write(content);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType });
  }
}

function pickWeb(
  mode: 'text' | 'binary',
  accept: string[],
): Promise<PickedText | PickedBinary | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept.join(',');
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      if (mode === 'text') {
        reader.onload = () => resolve({ name: f.name, text: String(reader.result) });
        reader.readAsText(f);
      } else {
        reader.onload = () =>
          resolve({ name: f.name, bytes: new Uint8Array(reader.result as ArrayBuffer) });
        reader.readAsArrayBuffer(f);
      }
    };
    input.click();
  });
}

/** Let the user pick a text file (JSON/CSV/TSV) and return its contents. */
export async function pickTextFile(
  accept: string[] = ['.json', '.csv', '.tsv', 'text/*', 'application/json'],
): Promise<PickedText | null> {
  if (Platform.OS === 'web') {
    return pickWeb('text', accept) as Promise<PickedText | null>;
  }
  const DocumentPicker = await import('expo-document-picker');
  const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
  if (res.canceled) return null;
  const asset = res.assets[0];
  const { File } = await import('expo-file-system');
  return { name: asset.name, text: await new File(asset.uri).text() };
}

/** Let the user pick a binary file (e.g. .apkg) and return its bytes. */
export async function pickBinaryFile(
  accept: string[] = ['.apkg', 'application/zip'],
): Promise<PickedBinary | null> {
  if (Platform.OS === 'web') {
    return pickWeb('binary', accept) as Promise<PickedBinary | null>;
  }
  const DocumentPicker = await import('expo-document-picker');
  const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
  if (res.canceled) return null;
  const asset = res.assets[0];
  const { File } = await import('expo-file-system');
  return { name: asset.name, bytes: await new File(asset.uri).bytes() };
}
