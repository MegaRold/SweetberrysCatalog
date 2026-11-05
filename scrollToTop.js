const scrollToTopButton = document.querySelector(".scroll-to-top");

function updateScrollToTopButton() {
    scrollToTopButton.hidden = window.scrollY < 300;
}

window.addEventListener("scroll", updateScrollToTopButton, { passive: true });
updateScrollToTopButton();

scrollToTopButton.addEventListener("click", () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth"
    });
});
