import asyncio
from playwright.async_api import async_playwright

CAPSULE = 'div.absolute.z-30.w-max:has(button:has-text("框选编辑"))'

async def nav_items(page):
    return await page.locator(f'{CAPSULE} button').evaluate_all(
        'els => els.map(e => (e.getAttribute("title") || e.textContent || "").trim())')

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width': 1504, 'height': 940})
        await page.goto('http://localhost:4619/', wait_until='networkidle')
        await page.click('aside nav button:has-text("设计工作台")')
        await page.wait_for_timeout(800)

        # open video tool and generate prompt-only video
        await page.locator('button:has-text("视频生成")').first.click()
        await page.wait_for_timeout(500)
        await page.locator('[data-genbar] textarea').fill('模特缓步转身，裙摆自然飘动')
        await page.locator("[data-genbar] button").last.click()
        await page.wait_for_timeout(3200)

        # close module on blank canvas
        await page.mouse.click(700, 260)
        await page.wait_for_timeout(400)

        # find the video card (contains 视频 badge) and click its center
        cards = page.locator('div[data-card]')
        n = await cards.count()
        video_idx = None
        for i in range(n):
            if '视频 ·' in await cards.nth(i).inner_html():
                video_idx = i
        print('total cards:', n, '| video card idx:', video_idx)
        vc = cards.nth(video_idx)
        box = await vc.bounding_box()
        print('video card box:', box)
        await page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        await page.wait_for_timeout(500)
        items = await nav_items(page)
        print('VIDEO card navbar:', items)
        await page.screenshot(path='/tmp/v3_navbar_video.png')

        # deselect, upload a plain image card, then select it
        await page.mouse.click(300, 200)
        await page.wait_for_timeout(300)
        await page.locator('input[accept="image/*"]').first.set_input_files('/tmp/test_img.png')
        await page.wait_for_timeout(600)
        n = await cards.count()
        for i in range(n):
            if i == video_idx:
                continue
            c = cards.nth(i)
            if '视频 ·' in await c.inner_html():
                continue
            b = await c.bounding_box()
            if not b:
                continue
            await page.mouse.click(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2)
            await page.wait_for_timeout(400)
            items2 = await nav_items(page)
            print('IMAGE card navbar:', items2)
            await page.screenshot(path='/tmp/v3_navbar_image.png')
            break

        await browser.close()

asyncio.run(main())
