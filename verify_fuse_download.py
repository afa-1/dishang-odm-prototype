import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 1504, 'height': 940}, accept_downloads=True)
        page = await ctx.new_page()
        await page.goto('http://localhost:4619/', wait_until='networkidle')
        await page.click('aside nav button:has-text("设计工作台")')
        await page.wait_for_timeout(800)

        # upload an image card
        inp = page.locator('input[accept="image/*"]').first
        await inp.set_input_files('/tmp/test_img.png')
        await page.wait_for_timeout(600)
        box = await page.locator('div[data-card]').first.bounding_box()
        cx, cy = box['x'] + box['width']/2, box['y'] + box['height']/2
        print('card box:', {k: round(v) for k, v in box.items()})

        # enter pen mode (shortcut E) and draw a diagonal stroke across the card
        await page.keyboard.press('e')
        await page.wait_for_timeout(400)
        await page.mouse.move(box['x'] + box['width']*0.15, box['y'] + box['height']*0.2)
        await page.mouse.down()
        await page.mouse.move(box['x'] + box['width']*0.85, box['y'] + box['height']*0.8, steps=20)
        await page.mouse.up()
        await page.wait_for_timeout(300)
        # second stroke
        await page.mouse.move(box['x'] + box['width']*0.85, box['y'] + box['height']*0.15)
        await page.mouse.down()
        await page.mouse.move(box['x'] + box['width']*0.15, box['y'] + box['height']*0.6, steps=20)
        await page.mouse.up()
        await page.wait_for_timeout(300)
        await page.screenshot(path='/tmp/fuse_drawn.png')

        # fuse strokes into the card
        fuse = page.locator('button[title*="融合"]')
        print('fuse enabled:', await fuse.is_enabled())
        await fuse.click()
        await page.wait_for_timeout(400)
        # exit pen mode (auto-save)
        await page.keyboard.press('e')
        await page.wait_for_timeout(400)
        await page.screenshot(path='/tmp/fuse_done.png')

        # select the card and download via capsule
        await page.mouse.click(cx, cy)
        await page.wait_for_timeout(500)
        async with page.expect_download() as dl_info:
            await page.locator('div.absolute.z-30.w-max button[title="下载"]').click()
        dl = await dl_info.value
        await dl.save_as('/tmp/fused_download.png')
        print('downloaded:', dl.suggested_filename)
        await b.close()

asyncio.run(main())
