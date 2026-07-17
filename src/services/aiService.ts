/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';

const API_KEY = process.env.GEMINI_API_KEY;

export const aiService = {
  isAvailable(): boolean {
    return !!API_KEY;
  },

  /** Generate draft deskripsi event dalam Bahasa Indonesia menggunakan Gemini. */
  async generateEventDescription(title: string, category: string, location?: string): Promise<string> {
    if (!API_KEY) {
      throw new Error('GEMINI_API_KEY belum dikonfigurasi. Tambahkan ke file .env.local.');
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Tulis deskripsi menarik untuk event kampus dalam Bahasa Indonesia (2-3 paragraf, tanpa heading, tanpa markdown).
Judul event: "${title}"
Kategori: ${category}${location ? `\nLokasi: ${location}` : ''}

Deskripsi harus mengajak mahasiswa untuk hadir, menjelaskan manfaat mengikuti event, dan diakhiri call-to-action singkat.`,
    });
    const text = response.text?.trim();
    if (!text) throw new Error('AI tidak mengembalikan hasil. Coba lagi.');
    return text;
  },
};
