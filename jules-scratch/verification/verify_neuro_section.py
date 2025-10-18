from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.goto("file:///app/index.html")
    page.locator("#neuro").scroll_into_view_if_needed()
    page.wait_for_timeout(5000)  # Wait for 5 seconds for the Spline viewer to load
    page.screenshot(path="jules-scratch/verification/neuro_section.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)