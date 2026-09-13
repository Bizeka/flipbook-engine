import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface BizekaOptions {
    allowDownload?: boolean;
    allowShare?: boolean;
    showThumbs?: boolean;
    primaryColor?: string;
    onDownload?: (url: string) => void;
}

export class BizekaFlipEngine {
    private totalPages = 0;
    private aspectRatio = 0;
    private pdfDoc: any = null;
    private container: HTMLElement | null = null;
    private book: HTMLElement | null = null;
    private state = { currentPage: 1, isSingle: false, isZoomed: false };
    private renderedPages: Map<number, boolean> = new Map();
    private touchStart = 0;

    constructor(private selector: string, private options: BizekaOptions = {}) {
        this.options = {
            showThumbs: true,
            primaryColor: '#7367f0',
            ...options
        };
    }

    public async init(pdfUrl: string) {
        this.container = document.querySelector(this.selector) as HTMLElement;
        if (!this.container) return;

        this.renderLoader();

        try {
            const loadingTask = pdfjsLib.getDocument(pdfUrl);
            this.pdfDoc = await loadingTask.promise;
            this.totalPages = this.pdfDoc.numPages;

            const firstPage = await this.pdfDoc.getPage(1);
            const viewport = firstPage.getViewport({ scale: 1 });
            this.aspectRatio = viewport.height / viewport.width;

            this.renderBaseLayout();
            this.initEvents();
            this.recalculateLayout();

            await this.goToPage(1);
            if (this.options.showThumbs) this.generateThumbnails();

            this.hideLoader();
        } catch (e) {
            console.error("BiZeka Engine Error:", e);
        }
    }

    private renderLoader() {
        const loader = document.createElement('div');
        loader.id = 'bk-loader';
        loader.style.cssText = `position:absolute; inset:0; background:#282c3e; display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:9999; color:white; transition: opacity 0.5s;`;
        loader.innerHTML = `<div style="width:40px; height:40px; border:3px solid rgba(255,255,255,0.1); border-top-color:${this.options.primaryColor}; border-radius:50%; animation:bk-spin 0.8s linear infinite;"></div><style>@keyframes bk-spin { to { transform: rotate(360deg); } }</style>`;
        this.container!.appendChild(loader);
    }

    private hideLoader() {
        const loader = document.getElementById('bk-loader');
        if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.remove(), 500); }
    }

    private renderBaseLayout() {
        const style = `
            <style>
                .bk-main-area { background: #282c3e; overflow: hidden; position: relative; flex: 1; display: flex; align-items: center; justify-content: center; touch-action: none; }
                .bk-toolbar { height: 60px; background: rgba(47, 51, 73, 0.95); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; gap: 12px; border-top: 1px solid rgba(255,255,255,0.1); z-index: 1000; }
                .bk-btn { background: rgba(115, 103, 240, 0.1); border: 1px solid rgba(115, 103, 240, 0.2); color: ${this.options.primaryColor}; padding: 8px 14px; border-radius: 8px; cursor: pointer; transition: 0.2s; font-size: 16px; line-height: 1; }
                .bk-btn:hover { background: ${this.options.primaryColor}; color: white; transform: translateY(-2px); }
                .bk-page-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 45px; height: 45px; background: rgba(0,0,0,0.3); color: white; border: none; border-radius: 50%; cursor: pointer; z-index: 100; display: flex; align-items: center; justify-content: center; transition: 0.3s; opacity: 0; }
                .bk-main-area:hover .bk-page-nav { opacity: 1; }
                .bk-settings-panel { position: absolute; bottom: 75px; right: 20px; background: #2f3349; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); display: none; z-index: 2000; min-width: 180px; }
                .setting-item { display: flex; align-items: center; justify-content: space-between; color: #b4b7bd; margin-bottom: 8px; font-size: 13px; }
                .bk-thumbs { height: 100px; background: #2f3349; display: ${this.options.showThumbs ? 'flex' : 'none'}; overflow-x: auto; padding: 10px; gap: 12px; border-top: 1px solid rgba(255,255,255,0.1); scroll-behavior: smooth; }
                .thumb-img { height: 100%; border-radius: 4px; cursor: pointer; border: 2px solid #444; transition: 0.3s; box-sizing: border-box; }
                .thumb-active { border-color: ${this.options.primaryColor} !important; box-shadow: 0 0 10px ${this.options.primaryColor}; transform: scale(0.95); }
                .bk-page { box-shadow: 0 0 25px rgba(0,0,0,0.3); background: white; position: absolute; backface-visibility: hidden; transition: transform 0.6s ease-in-out; cursor: zoom-in; }
                .zoomed { transform: scale(3) !important; z-index: 5000 !important; cursor: grab !important; transition: none !important; }
            </style>
        `;

        this.container!.innerHTML = style + `
            <div class="bk-main-area" id="bk-area">
                <button class="bk-page-nav" id="nav-prev" style="left:20px;">❮</button>
                <div class="bk-book" id="bk-book" style="position:relative; transform-style:preserve-3d;"></div>
                <button class="bk-page-nav" id="nav-next" style="right:20px;">❯</button>
                <div class="bk-settings-panel" id="settings-panel">
                    <div class="setting-item"><span>Thumbnails</span> <input type="checkbox" id="toggle-thumbs" ${this.options.showThumbs ? 'checked' : ''}></div>
                    <div class="setting-item"><span>Single Page</span> <input type="checkbox" id="toggle-single"></div>
                </div>
            </div>
            <div class="bk-toolbar">
                <button class="bk-btn" id="bk-prev">Geri</button>
                <span id="bk-page-info" style="color:#b4b7bd; font-family:monospace;">1 / ${this.totalPages}</span>
                <button class="bk-btn" id="bk-next">İleri</button>
                <button class="bk-btn" id="bk-fullscreen">⛶</button>
                <button class="bk-btn" id="btn-settings">⚙</button>
                ${this.options.allowDownload ? `<button class="bk-btn" id="bk-download">⬇</button>` : ''}
            </div>
            <div class="bk-thumbs" id="bk-thumbs"></div>
        `;
        this.book = this.container!.querySelector('.bk-book') as HTMLElement;
    }

    public async goToPage(num: number) {
        if (this.state.isZoomed) this.toggleZoom();
        let target = num;
        if (!this.state.isSingle) {
            target = (num <= 1) ? 1 : (num % 2 === 0 ? num : num - 1);
        }
        target = Math.max(1, Math.min(target, this.totalPages));
        this.state.currentPage = target;

        const loadRange = [target - 1, target, target + 1, target + 2];
        for (const n of loadRange) {
            if (n >= 1 && n <= this.totalPages) await this.renderHighResPage(n);
        }
        this.updateUI();
        this.cleanupMemory(target);
    }

    private async renderHighResPage(num: number) {
        if (this.renderedPages.has(num)) return;

        let div = this.book!.querySelector(`.page-${num}`) as HTMLElement;
        if (!div) {
            div = document.createElement('div');
            div.className = `bk-page page-${num} ${num % 2 === 0 ? 'even' : 'odd'}`;
            div.onclick = (e) => this.handlePageClick(e, num);
            this.book!.appendChild(div);
        }

        const page = await this.pdfDoc.getPage(num);
        const divHeight = this.book!.offsetHeight;
        const viewportRaw = page.getViewport({ scale: 1 });
        // Zoom kalitesi için 3x render alıyoruz
        const dynamicScale = (divHeight / viewportRaw.height) * 3;

        const viewport = page.getViewport({ scale: dynamicScale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        canvas.style.width = '100%'; canvas.style.height = '100%';

        await page.render({ canvasContext: canvas.getContext('2d')!, viewport: viewport }).promise;
        div.innerHTML = '';
        div.appendChild(canvas);
        this.renderedPages.set(num, true);
    }

    private handlePageClick(e: MouseEvent, num: number) {
        if (this.state.isZoomed) { this.toggleZoom(); return; }
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width * 0.15) this.prev();
        else if (x > rect.width * 0.85) this.next();
        else this.toggleZoom(e);
    }

    private toggleZoom(e?: MouseEvent) {
        this.state.isZoomed = !this.state.isZoomed;
        const area = document.getElementById('bk-area')!;
        if (this.state.isZoomed) {
            this.book!.classList.add('zoomed');
            area.onmousemove = (moveE) => this.handlePanning(moveE);
        } else {
            this.book!.classList.remove('zoomed');
            this.book!.style.transform = (this.state.currentPage === 1 && !this.state.isSingle) ? "translateX(-25%)" : "translateX(0)";
            this.book!.style.top = '0';
            area.onmousemove = null;
        }
    }

    private handlePanning(e: MouseEvent) {
        if (!this.state.isZoomed) return;
        const area = document.getElementById('bk-area')!;
        const rect = area.getBoundingClientRect();

        // Mouse'un area içindeki %lik konumu
        const mouseX = (e.clientX - rect.left) / rect.width;
        const mouseY = (e.clientY - rect.top) / rect.height;

        // Sayfayı mouse yönünün tersine kaydır (Parallax etkisi)
        const moveX = (0.5 - mouseX) * 100; // % olarak kayma
        const moveY = (0.5 - mouseY) * 150;

        const baseTranslate = (this.state.currentPage === 1 && !this.state.isSingle) ? -25 : 0;
        this.book!.style.transform = `scale(3) translate(${baseTranslate + moveX}%, ${moveY}px)`;
    }

    private updateUI() {
        const pages = this.book!.querySelectorAll('.bk-page');
        const isSingle = this.state.isSingle;

        pages.forEach((p: any) => {
            const num = parseInt(p.className.match(/page-(\d+)/)![1]);
            const style = p.style;
            style.width = isSingle ? '100%' : '50%';
            style.height = '100%';
            style.transformOrigin = (num % 2 === 0) ? 'right center' : 'left center';

            if (isSingle) {
                style.display = (num === this.state.currentPage) ? 'block' : 'none';
                style.transform = 'none'; style.left = '0'; style.zIndex = '100';
            } else {
                style.display = 'block';
                style.left = (num % 2 === 0) ? '0' : '50%';
                if (num < this.state.currentPage) {
                    style.transform = (num % 2 === 0) ? "rotateY(0deg)" : "rotateY(-180deg)";
                    style.zIndex = 100 + num;
                } else if (num === this.state.currentPage || num === this.state.currentPage + 1) {
                    if (this.state.currentPage === 1 && num === 2) {
                        style.transform = "rotateY(180deg)"; style.zIndex = 1;
                    } else {
                        style.transform = "rotateY(0deg)"; style.zIndex = 1000;
                    }
                } else {
                    style.transform = (num % 2 === 0) ? "rotateY(180deg)" : "rotateY(0deg)";
                    style.zIndex = 100 - num;
                }
            }
        });

        if (!isSingle && !this.state.isZoomed) {
            this.book!.style.transform = (this.state.currentPage === 1) ? "translateX(-25%)" : "translateX(0)";
        }

        this.updateThumbnails();
        const info = document.getElementById('bk-page-info');
        if (info) info.textContent = `${this.state.currentPage} / ${this.totalPages}`;
    }

    private updateThumbnails() {
        const isSingle = this.state.isSingle;
        const current = this.state.currentPage;

        this.container!.querySelectorAll('.thumb-img').forEach((img: any) => {
            const n = parseInt(img.className.match(/thumb-page-(\d+)/)![1]);
            let isActive = false;

            if (isSingle) {
                isActive = (n === current);
            } else {
                if (current === 1) isActive = (n === 1);
                else isActive = (n === current || n === current + 1);
            }

            img.classList.toggle('thumb-active', isActive);
            if (isActive) img.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        });
    }

    private cleanupMemory(current: number) {
        this.renderedPages.forEach((_, num) => {
            if (Math.abs(num - current) > 4) {
                const div = this.book!.querySelector(`.page-${num}`) as HTMLElement;
                if (div) {
                    const canvas = div.querySelector('canvas');
                    if (canvas) { canvas.width = 0; canvas.height = 0; canvas.remove(); }
                    div.remove();
                }
                this.renderedPages.delete(num);
            }
        });
    }

    private recalculateLayout() {
        const area = this.container!.querySelector('.bk-main-area') as HTMLElement;
        const h = area.offsetHeight * 0.82;
        this.state.isSingle = (window.innerWidth < window.innerHeight);
        const w = this.state.isSingle ? (h / this.aspectRatio) : (h / this.aspectRatio) * 2;
        this.book!.style.width = `${w}px`;
        this.book!.style.height = `${h}px`;
        this.updateUI();
    }

    private initEvents() {
        window.addEventListener('resize', () => this.recalculateLayout());
        document.getElementById('nav-next')!.onclick = () => this.next();
        document.getElementById('nav-prev')!.onclick = () => this.prev();
        document.getElementById('bk-next')!.onclick = () => this.next();
        document.getElementById('bk-prev')!.onclick = () => this.prev();

        document.getElementById('bk-fullscreen')!.onclick = () => {
            if (!document.fullscreenElement) this.container!.requestFullscreen();
            else document.exitFullscreen();
        };

        document.getElementById('btn-settings')!.onclick = () => {
            const p = document.getElementById('settings-panel')!;
            p.style.display = p.style.display === 'block' ? 'none' : 'block';
        };

        document.getElementById('toggle-thumbs')!.onchange = (e: any) => {
            document.getElementById('bk-thumbs')!.style.display = e.target.checked ? 'flex' : 'none';
        };

        document.getElementById('toggle-single')!.onchange = (e: any) => {
            this.state.isSingle = e.target.checked; this.recalculateLayout();
        };

        if (this.options.allowDownload) {
            document.getElementById('bk-download')!.onclick = () => {
                const url = this.pdfDoc.url;
                const fileName = url.split('/').pop().split('?')[0] || 'katalog.pdf';
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', fileName);
                document.body.appendChild(link);
                link.click();
                link.remove();
            };
        }
    }

    public next() { this.goToPage(this.state.currentPage + (this.state.isSingle || this.state.currentPage === 1 ? 1 : 2)); }
    public prev() { this.goToPage(this.state.currentPage - (this.state.isSingle || this.state.currentPage <= 2 ? 1 : 2)); }

    private async generateThumbnails() {
        const thumbArea = document.getElementById('bk-thumbs');
        for (let i = 1; i <= this.totalPages; i++) {
            const page = await this.pdfDoc.getPage(i);
            const vp = page.getViewport({ scale: 0.2 });
            const canvas = document.createElement('canvas');
            canvas.width = vp.width; canvas.height = vp.height;
            await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
            const img = document.createElement('img');
            img.src = canvas.toDataURL('image/jpeg', 0.6);
            img.className = 'thumb-img thumb-page-' + i;
            img.onclick = () => this.goToPage(i);
            thumbArea?.appendChild(img);
            canvas.width = 0; canvas.height = 0;
        }
    }
}

(window as any).BizekaFlipEngine = { BizekaFlipEngine: BizekaFlipEngine };