import { formatFileSize, formatDuration, generateId, truncateText } from '../helpers'

describe('Helper Functions', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1048576)).toBe('1 MB')
      expect(formatFileSize(1073741824)).toBe('1 GB')
    })
  })

  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(formatDuration(0)).toBe('0:00')
      expect(formatDuration(30)).toBe('0:30')
      expect(formatDuration(90)).toBe('1:30')
      expect(formatDuration(3661)).toBe('61:01')
    })
  })

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
      expect(id1.length).toBeGreaterThan(0)
    })
  })

  describe('truncateText', () => {
    it('should truncate text correctly', () => {
      expect(truncateText('Hello World', 20)).toBe('Hello World')
      expect(truncateText('This is a very long text', 10)).toBe('This is...')
      expect(truncateText('Short', 10)).toBe('Short')
    })
  })
})