import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform, Linking } from 'react-native';

/**
 * Downloads a file to the device and prompts the user to save/share it.
 * Works on iOS, Android, and Web.
 * 
 * @param {string} url - The URL of the file to download.
 * @param {string} fileName - The desired name for the downloaded file.
 * @returns {Promise<{success: boolean, error?: any}>}
 */
export const downloadFile = async (url, fileName) => {
  if (!url) return { success: false, error: 'No URL provided' };

  try {
    // 1. Handle Web
    if (Platform.OS === 'web') {
      // On web, we can just open the URL. 
      // Most browsers will download it if it has the correct headers, 
      // or open it in a new tab where the user can save it.
      await Linking.openURL(url);
      return { success: true };
    }

    // 2. Handle Mobile (iOS/Android)
    const fileUri = `${FileSystem.documentDirectory}${fileName || 'document'}`;
    
    // Download the file
    const downloadResult = await FileSystem.downloadAsync(url, fileUri);
    
    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }

    // Check if sharing is available
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Sharing is not available on this device');
    }

    // Prompt user to save/share
    // On iOS, this opens the share sheet which includes "Save to Files"
    // On Android, it opens the intent chooser
    await Sharing.shareAsync(downloadResult.uri, {
      mimeType: downloadResult.headers['content-type'] || 'application/octet-stream',
      dialogTitle: fileName || 'Shkarko dokumentin',
      UTI: 'public.item' // iOS Universal Type Identifier
    });

    return { success: true };
  } catch (error) {
    console.error('File download error:', error);
    return { success: false, error };
  }
};
