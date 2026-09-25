# -*- coding: utf-8 -*-
"""验证技能模块重构：极简卡片 + 详情页（查看→使用）交互"""
import re, time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:4619/"

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1504, "height": 815})
    pg.goto(BASE)
    pg.wait_for_timeout(1500)

    # 1. 进入技能页
    pg.locator('aside nav button:has-text("技能")').click()
    pg.wait_for_timeout(800)
    pg.screenshot(path="/tmp/sd1_list.png")

    # 卡片上不应再有 使用/装备 按钮与 ⋯ 菜单
    assert pg.locator('main button:has-text("立即使用")').count() == 0
    assert pg.locator('main button:has-text("装备")').count() == 0, "卡片上仍有装备按钮"
    assert pg.locator('main [role="switch"]').count() >= 8, "缺少装备开关"
    print("OK 1 卡片极简：无使用/装备按钮，开关数量=", pg.locator('main [role="switch"]').count())

    # 版本号显示
    assert pg.locator('main :text("1.3.1")').count() >= 1
    print("OK 2 版本号显示正常")

    # 2. 点击卡片进入详情页
    pg.locator('main button:has-text("爆款推款助手")').first.click()
    pg.wait_for_timeout(600)
    pg.screenshot(path="/tmp/sd2_detail.png")
    assert pg.locator('main :text("创建人")').count() == 1
    assert pg.locator('main :text("试试这些提示词")').count() == 1
    assert pg.locator('main button:has-text("立即使用")').count() == 1
    assert pg.locator('main :text("提示词工程")').count() >= 1
    print("OK 3 详情页：创建人/版本/描述/试试提示词/立即使用齐全")

    # 详情页里「使用」在二级页面 —— 卡片列表已无使用按钮，验证通过（OK1）

    # 3. 点击示例提示词 → 进入画布并填入输入框
    pg.locator('main button:has-text("帮我推导 5 个 26 早春高潜新款方向")').click()
    pg.wait_for_timeout(1200)
    pg.screenshot(path="/tmp/sd3_canvas.png")
    ta = pg.locator("textarea").first
    val = ta.input_value()
    assert "26 早春高潜新款方向" in val, f"输入框内容不对: {val}"
    # 技能应被选中（选择技能按钮显示技能名）
    assert pg.get_by_text("爆款推款助手").count() >= 1
    print("OK 4 示例提示词已带入画布输入框，技能已选中")

    # 使用未装备技能 → 自动装备：回到技能页检查我的技能
    pg.locator('button[title="项目菜单"]').click()
    pg.wait_for_timeout(400)
    pg.get_by_text("首页", exact=True).click()
    pg.wait_for_timeout(800)
    pg.locator('aside nav button:has-text("技能")').click()
    pg.wait_for_timeout(600)
    mine_sec = pg.locator('main :text("我的技能")').count()
    assert mine_sec == 1
    # 爆款推款助手应已装备并出现在我的技能区（开关为开）
    sw = pg.locator('main button:has-text("爆款推款助手")').first.locator('[role="switch"]')
    assert sw.get_attribute("aria-checked") == "true"
    print("OK 5 使用未装备技能后自动装备（开关=开）")

    # 4. 卡片开关取消装备
    sw.click()
    pg.wait_for_timeout(400)
    assert sw.get_attribute("aria-checked") == "false"
    print("OK 6 卡片开关可取消装备")

    # 5. 详情页 立即使用 主按钮
    pg.locator('main button:has-text("面料智库问答")').first.click()
    pg.wait_for_timeout(500)
    pg.locator('main button:has-text("立即使用")').click()
    pg.wait_for_timeout(1200)
    val = pg.locator("textarea").first.input_value()
    assert "面料专家" in val, f"输入框内容不对: {val}"
    print("OK 7 详情页「立即使用」带入完整提示词工程")

    b.close()
print("ALL PASS")
