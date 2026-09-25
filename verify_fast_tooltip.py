import asyncio, time
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width': 1504, 'height': 940})
        await page.goto('http://localhost:4619/', wait_until='networkidle')
        await page.click('aside nav button:has-text("设计工作台")')
        await page.wait_for_timeout(800)

        # hover over an icon button with title (theme toggle)
        btn = page.locator('button[title="网格吸附已关闭 · 点击开启"]').first
        box = await btn.bounding_box()
        print('hover target:', await btn.get_attribute('title'), box)
        t0 = time.time()
        await page.mouse.move(box['x'] + box['width']/2, box['y'] + box['height']/2)
        # poll for tooltip appearance
        shown_at = None
        for _ in range(40):
            await page.wait_for_timeout(25)
            if await page.locator('.fast-tip').count():
                shown_at = (time.time() - t0) * 1000
                break
        print('tooltip appeared after ~%.0f ms' % shown_at if shown_at else 'NOT SHOWN')
        if shown_at:
            print('tip text:', await page.locator('.fast-tip').inner_text())
            print('native title stripped:', await btn.get_attribute('title'))
            print('data-tip:', await btn.get_attribute('data-tip'))
            print('aria-label:', await btn.get_attribute('aria-label'))
            await page.screenshot(path='/tmp/fast_tip_1.png', clip={'x': box['x']-140, 'y': 0, 'width': 420, 'height': 160})

        # move away -> should hide quickly
        await page.mouse.move(700, 400)
        await page.wait_for_timeout(200)
        print('after mouse-out, tip count:', await page.locator('.fast-tip').count())

        # second hover on a canvas toolbar icon (bottom bar)
        btn2 = page.locator('button[title]').last
        b2 = await btn2.bounding_box()
        t = await btn2.get_attribute('title')
        await page.mouse.move(b2['x'] + b2['width']/2, b2['y'] + b2['height']/2)
        await page.wait_for_timeout(300)
        c = await page.locator('.fast-tip').count()
        print('second icon tip shown:', c, '| text:', await page.locator('.fast-tip').inner_text() if c else t)

        await browser.close()

asyncio.run(main())
