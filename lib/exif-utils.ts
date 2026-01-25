import exifr from 'exifr'

export interface EXIFData {
  // Camera & Settings
  make?: string
  model?: string
  software?: string
  lensModel?: string
  focalLength?: number
  focalLengthIn35mmFormat?: number
  iso?: number
  fNumber?: number
  exposureTime?: number
  exposureMode?: string
  whiteBalance?: string
  flash?: string

  // Image Properties
  width?: number
  height?: number
  orientation?: number
  colorSpace?: string

  // GPS Data
  latitude?: number
  longitude?: number
  altitude?: number
  gpsTimestamp?: string

  // Date/Time
  dateTimeOriginal?: string
  dateTimeDigitized?: string
  modifyDate?: string

  // Additional Metadata
  artist?: string
  copyright?: string
  userComment?: string
  imageDescription?: string
}

/**
 * Extract comprehensive EXIF data from an image file
 */
export async function extractEXIF(file: File): Promise<EXIFData> {
  try {
    const exif = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      interop: true,
      ifd0: true,
      ifd1: true,
      iptc: true,
      jfif: true,
      ihdr: true,
      xmp: true,
      icc: true
    })

    if (!exif) {
      return {}
    }

    // Map EXIF fields to our structure
    const exifData: EXIFData = {
      // Camera info
      make: exif.Make || exif.make,
      model: exif.Model || exif.model,
      software: exif.Software || exif.software,
      lensModel: exif.LensModel || exif.lensModel,

      // Camera settings
      focalLength: exif.FocalLength || exif.focalLength,
      focalLengthIn35mmFormat: exif.FocalLengthIn35mmFormat,
      iso: exif.ISO || exif.ISOSpeedRatings,
      fNumber: exif.FNumber || exif.fNumber,
      exposureTime: exif.ExposureTime || exif.exposureTime,
      exposureMode: exif.ExposureMode,
      whiteBalance: exif.WhiteBalance,
      flash: exif.Flash,

      // Image properties
      width: exif.ImageWidth || exif.ExifImageWidth,
      height: exif.ImageHeight || exif.ExifImageHeight,
      orientation: exif.Orientation,
      colorSpace: exif.ColorSpace,

      // GPS data
      latitude: exif.latitude,
      longitude: exif.longitude,
      altitude: exif.GPSAltitude || exif.altitude,
      gpsTimestamp: exif.GPSTimeStamp,

      // Dates
      dateTimeOriginal: exif.DateTimeOriginal || exif.CreateDate,
      dateTimeDigitized: exif.DateTimeDigitized,
      modifyDate: exif.ModifyDate,

      // Metadata
      artist: exif.Artist || exif.Creator,
      copyright: exif.Copyright,
      userComment: exif.UserComment,
      imageDescription: exif.ImageDescription || exif.Description
    }

    // Remove undefined values
    Object.keys(exifData).forEach(key => {
      if (exifData[key as keyof EXIFData] === undefined) {
        delete exifData[key as keyof EXIFData]
      }
    })

    return exifData
  } catch (error) {
    console.error('Error extracting EXIF data:', error)
    return {}
  }
}

/**
 * Extract GPS coordinates from EXIF data
 */
export async function extractGPSFromEXIF(file: File): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const gps = await exifr.gps(file)
    if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
      return {
        latitude: gps.latitude,
        longitude: gps.longitude
      }
    }
    return null
  } catch (error) {
    console.error('Error extracting GPS from EXIF:', error)
    return null
  }
}

/**
 * Extract date taken from EXIF data
 */
export async function extractDateFromEXIF(file: File): Promise<Date | null> {
  try {
    const exif = await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate'] })
    if (exif) {
      const dateStr = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate
      if (dateStr) {
        // EXIF dates are in format: "2024:01:15 14:30:45"
        const normalizedDate = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
        return new Date(normalizedDate)
      }
    }
    return null
  } catch (error) {
    console.error('Error extracting date from EXIF:', error)
    return null
  }
}

/**
 * Extract camera settings summary
 */
export async function extractCameraSettings(file: File): Promise<string> {
  try {
    const exif = await exifr.parse(file, {
      pick: ['Make', 'Model', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'ISOSpeedRatings']
    })

    if (!exif) {
      return 'No camera data available'
    }

    const parts: string[] = []

    if (exif.Make && exif.Model) {
      parts.push(`${exif.Make} ${exif.Model}`)
    }

    if (exif.FocalLength) {
      parts.push(`${exif.FocalLength}mm`)
    }

    if (exif.FNumber) {
      parts.push(`f/${exif.FNumber}`)
    }

    if (exif.ExposureTime) {
      const shutter = exif.ExposureTime < 1
        ? `1/${Math.round(1 / exif.ExposureTime)}`
        : `${exif.ExposureTime}`
      parts.push(`${shutter}s`)
    }

    const iso = exif.ISO || exif.ISOSpeedRatings
    if (iso) {
      parts.push(`ISO ${iso}`)
    }

    return parts.length > 0 ? parts.join(' | ') : 'No camera data available'
  } catch (error) {
    console.error('Error extracting camera settings:', error)
    return 'Error reading camera data'
  }
}

/**
 * Format EXIF data for display
 */
export function formatEXIFForDisplay(exifData: EXIFData): Record<string, string> {
  const formatted: Record<string, string> = {}

  if (exifData.make && exifData.model) {
    formatted['Camera'] = `${exifData.make} ${exifData.model}`
  }

  if (exifData.lensModel) {
    formatted['Lens'] = exifData.lensModel
  }

  if (exifData.focalLength) {
    formatted['Focal Length'] = exifData.focalLengthIn35mmFormat
      ? `${exifData.focalLength}mm (${exifData.focalLengthIn35mmFormat}mm equiv)`
      : `${exifData.focalLength}mm`
  }

  if (exifData.fNumber) {
    formatted['Aperture'] = `f/${exifData.fNumber}`
  }

  if (exifData.exposureTime) {
    const shutter = exifData.exposureTime < 1
      ? `1/${Math.round(1 / exifData.exposureTime)}s`
      : `${exifData.exposureTime}s`
    formatted['Shutter Speed'] = shutter
  }

  if (exifData.iso) {
    formatted['ISO'] = `ISO ${exifData.iso}`
  }

  if (exifData.width && exifData.height) {
    formatted['Dimensions'] = `${exifData.width} × ${exifData.height}`
  }

  if (exifData.dateTimeOriginal) {
    formatted['Date Taken'] = new Date(exifData.dateTimeOriginal).toLocaleString()
  }

  if (exifData.latitude && exifData.longitude) {
    formatted['GPS'] = `${exifData.latitude.toFixed(6)}, ${exifData.longitude.toFixed(6)}`
  }

  if (exifData.software) {
    formatted['Software'] = exifData.software
  }

  return formatted
}

/**
 * Check if an image has EXIF data
 */
export async function hasEXIF(file: File): Promise<boolean> {
  try {
    const exif = await exifr.parse(file, { pick: ['Make'] })
    return !!exif
  } catch {
    return false
  }
}
