export function showError(element: HTMLElement, message: string): void {
    element.textContent = message;
    element.style.color = 'red';
    element.style.display = 'block';
}

export function showSuccess(element: HTMLElement, message: string): void {
    element.textContent = message;
    element.style.color = 'green';
    element.style.display = 'block';
}

export function clearError(element: HTMLElement | null): void {
    if (!element) return;

    element.textContent = '';
    element.style.display = 'none';
}