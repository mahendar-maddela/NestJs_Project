import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Browser, PaperFormat } from 'puppeteer';

export interface GeneratePdfOptions {
  format?: PaperFormat;
}

/** Mirrors legacy `utils/globalInvoicePdf.js`'s use of `html-pdf-node` — renders HTML to a PDF buffer via headless Chrome. */
@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browserPromise: Promise<Browser> | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      const puppeteer = await import('puppeteer');
      this.browserPromise = puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    }
    return this.browserPromise;
  }

  async generatePdfFromHtml(html: string, options: GeneratePdfOptions = {}): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const buffer = await page.pdf({ format: options.format ?? 'A3', printBackground: true });
      return Buffer.from(buffer);
    } finally {
      await page.close();
    }
  }

  async onModuleDestroy() {
    if (this.browserPromise) {
      try {
        const browser = await this.browserPromise;
        await browser.close();
      } catch (error) {
        this.logger.warn(`Failed to close Puppeteer browser cleanly: ${(error as Error).message}`);
      }
    }
  }
}
