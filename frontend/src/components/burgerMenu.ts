export function setupBurgerMenu(): void {
    requestAnimationFrame(() => {
        const burgerButton = document.getElementById("burger-button");
        const menu = document.getElementById("menu");

        if (burgerButton && menu) {
            if (!burgerButton.hasAttribute("data-listener-attached")) {
                burgerButton.addEventListener("click", () => {
                    menu.classList.toggle("hidden");
                });
                burgerButton.setAttribute("data-listener-attached", "true");
            }
        } else {
        }
    });
}