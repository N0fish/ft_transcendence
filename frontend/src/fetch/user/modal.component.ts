export class Modal {
    private modalElement: HTMLDivElement;
    private contentElement: HTMLDivElement;
    private closeButton: HTMLButtonElement;
    private backdrop: HTMLDivElement;
    
    constructor(title: string) {
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'fixed inset-0 z-50 flex items-center justify-center';
        this.modalElement.style.display = 'none';
        
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'fixed inset-0 bg-black bg-opacity-50';
        this.backdrop.addEventListener('click', () => this.close());
        
        const modalDialog = document.createElement('div');
        modalDialog.className = 'relative w-full max-w-2xl max-h-full mx-auto';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'relative bg-gray-800 rounded-lg shadow-lg';
        
        const modalHeader = document.createElement('div');
        modalHeader.className = 'flex items-center justify-between p-4 border-b border-gray-600';
        
        const modalTitle = document.createElement('h3');
        modalTitle.className = 'text-xl font-semibold text-white';
        modalTitle.textContent = title;
        
        this.closeButton = document.createElement('button');
        this.closeButton.type = 'button';
        this.closeButton.className = 'text-gray-400 bg-transparent hover:bg-gray-600 hover:text-white rounded-lg text-sm p-1.5 ml-auto inline-flex items-center';
        this.closeButton.innerHTML = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>';
        this.closeButton.addEventListener('click', () => this.close());
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(this.closeButton);
        
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'p-6 space-y-6 max-h-[70vh] overflow-y-auto';
        
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(this.contentElement);
        modalDialog.appendChild(modalContent);
        
        this.modalElement.appendChild(this.backdrop);
        this.modalElement.appendChild(modalDialog);
        
        document.body.appendChild(this.modalElement);
    }
    
    setContent(content: string): void {
        this.contentElement.innerHTML = content;
    }
    
    open(): void {
        this.modalElement.style.display = 'flex';
        document.body.classList.add('overflow-hidden');
    }
    
    close(): void {
        this.modalElement.style.display = 'none';
        document.body.classList.remove('overflow-hidden');
    }
    
    isOpen(): boolean {
        return this.modalElement.style.display === 'flex';
    }
    
    destroy(): void {
        if (this.modalElement.parentNode) {
            document.body.removeChild(this.modalElement);
        }
    }
}