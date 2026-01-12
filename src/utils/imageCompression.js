import imageCompression from 'browser-image-compression';

/**
 * Compress an image file before uploading to Firebase Storage
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - Compressed image file
 */
export const compressImage = async (file, options = {}) => {
  // Skip compression for non-image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Default compression options
  const defaultOptions = {
    maxSizeMB: 1, // Maximum file size in MB (1MB)
    maxWidthOrHeight: 1920, // Maximum width or height (Full HD)
    useWebWorker: true, // Use web worker for better performance
    fileType: file.type, // Maintain original file type
  };

  const compressionOptions = { ...defaultOptions, ...options };

  try {
    console.log('Original file size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

    const compressedFile = await imageCompression(file, compressionOptions);

    console.log('Compressed file size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('Compression ratio:', ((1 - compressedFile.size / file.size) * 100).toFixed(2), '%');

    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    // Return original file if compression fails
    return file;
  }
};

/**
 * Compress multiple files
 * @param {File[]} files - Array of files to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File[]>} - Array of compressed files
 */
export const compressMultipleFiles = async (files, options = {}) => {
  const compressionPromises = files.map(file => compressImage(file, options));
  return Promise.all(compressionPromises);
};

/**
 * Check if file needs compression based on size
 * @param {File} file - File to check
 * @param {number} thresholdMB - Size threshold in MB (default 0.5MB)
 * @returns {boolean}
 */
export const shouldCompress = (file, thresholdMB = 0.5) => {
  return file.type.startsWith('image/') && (file.size / 1024 / 1024) > thresholdMB;
};
