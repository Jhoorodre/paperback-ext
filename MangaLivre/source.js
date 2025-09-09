(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Sources = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MangaLivre = exports.MangaLivreInfo = void 0;

const ML_DOMAIN = 'https://mangalivre.tv';
const SEARCH_ENDPOINT = '/pesquisar';
const POPULAR_ENDPOINT = '/home';

exports.MangaLivreInfo = {
    version: '1.0.0',
    name: 'MangaLivre',
    icon: 'icon.png',
    author: 'Jhoorodre',
    authorWebsite: 'https://github.com/Jhoorodre',
    description: 'Extension for MangaLivre - Brazilian manga source',
    contentRating: 'EVERYONE',
    websiteBaseURL: ML_DOMAIN,
    intents: 5, // MANGA_CHAPTERS | HOMEPAGE_SECTIONS
    sourceTags: [
        {
            text: 'Portuguese',
            type: 'info',
        },
        {
            text: 'Brazilian',
            type: 'default',
        },
    ],
};

class MangaLivre {
    constructor(cheerio) {
        this.cheerio = cheerio;
    }

    getMangaShareUrl(mangaId) {
        // Decodificar a URL da base64
        return atob(mangaId);
    }

    async getMangaDetails(mangaId) {
        console.log('[MANGALIVRE] Getting manga details for:', mangaId);
        // Decodificar a URL da base64
        const url = atob(mangaId);
        const request = {
            url: url,
            method: 'GET',
        };

        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return this.parseMangaDetails($, mangaId);
    }

    async getChapters(mangaId) {
        console.log('[MANGALIVRE] Getting chapters for:', mangaId);
        // Decodificar a URL da base64
        const url = atob(mangaId);
        const request = {
            url: url,
            method: 'GET',
        };

        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return this.parseChapters($, mangaId);
    }

    async getChapterDetails(mangaId, chapterId) {
        console.log('[MANGALIVRE] Getting chapter details for:', mangaId, chapterId);
        const url = `${ML_DOMAIN}/manga/${mangaId}/capitulo/${chapterId}/`;
        const request = {
            url: url,
            method: 'GET',
        };

        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return this.parseChapterDetails($, mangaId, chapterId);
    }

    async getSearchResults(query) {
        console.log('[MANGALIVRE] Searching for:', query.title);
        const url = `${ML_DOMAIN}${SEARCH_ENDPOINT}?q=${encodeURIComponent(query.title ?? '')}`;
        const request = {
            url: url,
            method: 'GET',
        };

        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        const results = this.parseSearch($);
        
        return {
            results: results,
            metadata: undefined
        };
    }

    async getHomePageSections(sectionCallback) {
        console.log('[MANGALIVRE] Getting homepage sections');
        const url = `${ML_DOMAIN}${POPULAR_ENDPOINT}`;
        const request = {
            url: url,
            method: 'GET',
        };

        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        const results = this.parseSearch($);
        
        const section = {
            id: 'popular',
            title: 'Popular no MangaLivre',
            items: results,
        };
        
        sectionCallback(section);
    }

    parseMangaDetails($, mangaId) {
        console.log('[MANGALIVRE] Parsing manga details for:', mangaId);
        const selectors = {
            title: ['.post-title h1', '.entry-title', '.manga-title h1', 'h1.title'],
            image: ['.wp-post-image', '.manga-cover img', '.post-thumb img', '.entry-image img'],
            description: ['.entry-content p', '.manga-summary', '.post-content p', '.description'],
            author: ['.manga-author', '.author', '.post-author'],
        };

        let title = '';
        for (const selector of selectors.title) {
            const element = $(selector).first();
            if (element.length && element.text().trim()) {
                title = element.text().trim();
                break;
            }
        }

        let image = '';
        for (const selector of selectors.image) {
            const element = $(selector).first();
            if (element.length) {
                image = element.attr('src') ?? element.attr('data-src') ?? '';
                if (image && !image.startsWith('http')) {
                    image = image.startsWith('/') ? ML_DOMAIN + image : ML_DOMAIN + '/' + image;
                }
                if (image) {
                    image = image.replace(/\?resize=[^&]*&ssl=1/g, '');
                    image = image.replace(/\?resize=[^&]*/g, '');
                    image = image.replace(/&ssl=1/g, '');
                    break;
                }
            }
        }

        let desc = '';
        for (const selector of selectors.description) {
            const elements = $(selector);
            if (elements.length) {
                desc = elements.first().text().trim();
                if (desc) break;
            }
        }

        let author = '';
        for (const selector of selectors.author) {
            const element = $(selector).first();
            if (element.length && element.text().trim()) {
                author = element.text().trim();
                break;
            }
        }

        console.log(`[MANGALIVRE] Parsed details - Title: ${title}`);
        return {
            id: mangaId,
            titles: [title || 'Unknown Title'],
            image: image || '',
            author: author || 'Unknown Author',
            artist: author || 'Unknown Artist',
            desc: desc || 'No description available',
            tags: [],
        };
    }

    parseChapters($, mangaId) {
        console.log('[MANGALIVRE] Parsing chapters for:', mangaId);
        const chapters = [];
        const chapterSelectors = [
            '.wp-manga-chapter a',
            '.chapter-list a',
            '.manga-chapters a',
            '.chapters a',
            '.episode-list a',
            'a[href*="/capitulo/"]',
            'a[href*="/chapter/"]',
        ];

        let foundChapters = false;
        for (const selector of chapterSelectors) {
            const elements = $(selector);
            console.log(`[MANGALIVRE] Trying chapter selector "${selector}": found ${elements.length} elements`);
            if (elements.length > 0) {
                foundChapters = true;
                elements.each((index, element) => {
                    const $el = $(element);
                    const href = $el.attr('href');
                    const chapterText = $el.text().trim();
                    if (href) {
                        const chapterId = href.replace(/^.*\/capitulo\/([^/]+)\/?.*$/, '$1');
                        const chapterNum = chapterText.match(/(\d+(?:\.\d+)?)/);
                        const chapNum = chapterNum ? parseFloat(chapterNum[1]) : index + 1;
                        console.log(`[MANGALIVRE] Found chapter ${chapNum}: ${chapterId}`);
                        chapters.push({
                            id: chapterId,
                            name: chapterText || `Capítulo ${chapNum}`,
                            chapNum: chapNum,
                            langCode: 'pt-br',
                            time: new Date(),
                        });
                    }
                });
                if (chapters.length > 0) {
                    console.log(`[MANGALIVRE] Found ${chapters.length} chapters with selector "${selector}"`);
                    break;
                }
            }
        }

        if (!foundChapters || chapters.length === 0) {
            console.log('[MANGALIVRE] No chapters found, creating placeholder');
            chapters.push({
                id: 'cap-1',
                name: 'Capítulo 1',
                chapNum: 1,
                langCode: 'pt-br',
                time: new Date(),
            });
        }

        chapters.sort((a, b) => b.chapNum - a.chapNum);
        console.log(`[MANGALIVRE] Final chapters count: ${chapters.length}`);
        return chapters;
    }

    parseChapterDetails($, mangaId, chapterId) {
        console.log('[MANGALIVRE] Parsing chapter details for:', chapterId);
        const pages = [];
        const imageSelectors = [
            '.reading-content img',
            '.page-break img',
            '.manga-page img',
            'img[src*="_resultado.webp"]',
            'img[src*="cdn.mangalivre"]',
            '.chapter-content img',
            '.entry-content img',
        ];

        let foundImages = false;
        for (const selector of imageSelectors) {
            const imageElements = $(selector);
            console.log(`[MANGALIVRE] Trying image selector "${selector}": found ${imageElements.length} elements`);
            if (imageElements.length > 0) {
                foundImages = true;
                imageElements.each((i, element) => {
                    let src = $(element).attr('src') ?? $(element).attr('data-src') ?? $(element).attr('data-lazy-src');
                    if (src) {
                        if (!src.startsWith('http')) {
                            src = src.startsWith('/') ? ML_DOMAIN + src : ML_DOMAIN + '/' + src;
                        }
                        if (src.includes('_resultado') ||
                            src.includes('cdn.mangalivre') ||
                            src.match(/\d+\.(jpg|jpeg|png|webp)/i)) {
                            console.log(`[MANGALIVRE] Found page ${i + 1}:`, src);
                            pages.push(src);
                        }
                    }
                });
                if (pages.length > 0) {
                    console.log(`[MANGALIVRE] Found ${pages.length} pages with selector "${selector}"`);
                    break;
                }
            }
        }

        console.log(`[MANGALIVRE] Final pages count: ${pages.length}`);
        return {
            id: chapterId,
            mangaId: mangaId,
            pages: pages,
        };
    }

    parseSearch($) {
        const results = [];
        console.log('[MANGALIVRE] Parsing search results...');
        
        // Seletores corretos para mangalivre.tv
        $('.manga__item').each((_, element) => {
            const $el = $(element);
            
            // Buscar título no link dentro de h2
            const $titleLink = $el.find('.manga__content h2 a').first();
            const title = $titleLink.text().trim();
            const href = $titleLink.attr('href');
            
            // Buscar imagem no thumb
            const $img = $el.find('.manga__thumb img').first();
            let image = $img.attr('src') ?? $img.attr('data-src') ?? $img.attr('data-lazy-src');
            
            // Processar URL da imagem
            if (image && !image.startsWith('http')) {
                image = ML_DOMAIN + (image.startsWith('/') ? image : '/' + image);
            }
            if (image) {
                image = image.replace(/\?resize=[^&]*&ssl=1/g, '');
                image = image.replace(/\?resize=[^&]*/g, '');
                image = image.replace(/&ssl=1/g, '');
            }
            
            if (title && href) {
                // Usar URL completa como o MangaKatana faz
                const fullUrl = href.startsWith('http') ? href : `https://mangalivre.tv${href}`;
                const mangaId = btoa(fullUrl); // Codificar em base64
                console.log(`[MANGALIVRE] Found manga: ${title} (URL: ${fullUrl}, ID: ${mangaId})`);
                results.push({
                    id: mangaId,
                    title: title, // Corrigido para title ao invés de titles array
                    image: image ?? '',
                });
            }
        });
        
        console.log(`[MANGALIVRE] Parsed ${results.length} manga results`);
        return results;
    }
}

exports.MangaLivre = MangaLivre;

},{}]},{},[1])(1)
});